import uuid
from collections.abc import Callable
from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient

from app.config import get_settings
from app.models import RefreshToken, User
from app.routers.auth import refresh
from app.schemas import RefreshRequest
from app.security import hash_refresh_token
from tests.fakes import FakeSession

_RAW_TOKEN = "the-raw-refresh-token"


def _make_stored_token(
    *,
    revoked: bool = False,
    expired: bool = False,
    is_active: bool = True,
    raw_token: str = _RAW_TOKEN,
) -> tuple[User, RefreshToken]:
    """Build a matching ``User``/``RefreshToken`` pair for a given raw token value.

    :param revoked: Whether the stored token should already be revoked.
    :type revoked: bool
    :param expired: Whether the stored token should already be expired.
    :type expired: bool
    :param is_active: Whether the associated user account is active.
    :type is_active: bool
    :param raw_token: The plaintext refresh token this row should hash from.
    :type raw_token: str
    :returns: A ``(user, stored_token)`` pair.
    :rtype: tuple[User, RefreshToken]
    """
    user = User(email="user@example.com", is_active=is_active)
    user.id = uuid.uuid4()
    now = datetime.now(UTC)
    stored = RefreshToken(
        user_id=user.id,
        token_hash=hash_refresh_token(raw_token),
        expires_at=now - timedelta(days=1) if expired else now + timedelta(days=29),
        revoked_at=now - timedelta(hours=1) if revoked else None,
    )
    stored.id = uuid.uuid4()
    return user, stored


def test_refresh_locks_the_token_row_for_update(
    session_client_factory: Callable[[FakeSession], TestClient],
) -> None:
    """Verify the initial token lookup uses FOR UPDATE (guards the rotation race).

    A regression test for the row lock itself, not just its observable
    effect — without this, a future refactor could drop ``.with_for_update()``
    and every other refresh test would keep passing against the fake session.
    """
    user, stored = _make_stored_token()
    session = FakeSession(execute_results=[stored, user])
    client = session_client_factory(session)

    client.post("/auth/refresh", json={"refresh_token": _RAW_TOKEN})

    lookup_stmt = session.executed_statements[0]
    assert lookup_stmt._for_update_arg is not None  # pylint: disable=protected-access


def test_refresh_rotates_valid_token(
    session_client_factory: Callable[[FakeSession], TestClient],
) -> None:
    """Verify a valid, unexpired token is rotated: old revoked, new issued."""
    user, stored = _make_stored_token()
    session = FakeSession(execute_results=[stored, user])
    client = session_client_factory(session)

    response = client.post("/auth/refresh", json={"refresh_token": _RAW_TOKEN})

    assert response.status_code == 200
    body = response.json()
    assert body["refresh_token"] != _RAW_TOKEN
    assert stored.revoked_at is not None
    assert session.committed is True
    assert len(session.added) == 1
    assert isinstance(session.added[0], RefreshToken)


def test_refresh_unknown_token_raises_401(
    session_client_factory: Callable[[FakeSession], TestClient],
) -> None:
    """Verify a token hash with no matching row is a plain 401."""
    session = FakeSession(execute_results=[None])
    client = session_client_factory(session)

    response = client.post("/auth/refresh", json={"refresh_token": "never-issued"})

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid or expired refresh token"
    assert session.added == []


def test_refresh_expired_token_raises_401_and_marks_revoked(
    session_client_factory: Callable[[FakeSession], TestClient],
) -> None:
    """Verify an expired-but-unrevoked token is rejected and cleaned up, not treated as theft."""
    _, stored = _make_stored_token(expired=True)
    session = FakeSession(execute_results=[stored])
    client = session_client_factory(session)

    response = client.post("/auth/refresh", json={"refresh_token": _RAW_TOKEN})

    assert response.status_code == 401
    assert stored.revoked_at is not None
    assert session.committed is True
    assert session.added == []


def test_refresh_reused_revoked_token_revokes_every_other_session(
    session_client_factory: Callable[[FakeSession], TestClient],
) -> None:
    """Verify reusing an already-revoked token is treated as theft: nukes every active session."""
    user, stored = _make_stored_token(revoked=True)
    other_active_1 = RefreshToken(user_id=user.id, token_hash="h1", expires_at=datetime.now(UTC))
    other_active_2 = RefreshToken(user_id=user.id, token_hash="h2", expires_at=datetime.now(UTC))
    session = FakeSession(execute_results=[stored, [other_active_1, other_active_2]])
    client = session_client_factory(session)

    response = client.post("/auth/refresh", json={"refresh_token": _RAW_TOKEN})

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid or expired refresh token"
    assert other_active_1.revoked_at is not None
    assert other_active_2.revoked_at is not None
    assert session.committed is True
    assert session.added == []


def test_refresh_disabled_account_raises_401_and_persists_revocation(
    session_client_factory: Callable[[FakeSession], TestClient],
) -> None:
    """Verify a disabled account can't renew its session via a still-valid refresh token."""
    user, stored = _make_stored_token(is_active=False)
    session = FakeSession(execute_results=[stored, user])
    client = session_client_factory(session)

    response = client.post("/auth/refresh", json={"refresh_token": _RAW_TOKEN})

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid or expired refresh token"
    # The old token is still revoked even though the new pair is rejected —
    # a disabled account shouldn't get a "free" extra use of the old token.
    assert stored.revoked_at is not None
    assert session.committed is True
    assert session.added == []


async def test_refresh_missing_user_raises_runtime_error(
    session_client_factory: Callable[[FakeSession], TestClient],
) -> None:
    """Verify the FK-guaranteed invariant fails loudly if it's ever violated.

    Exercises app.routers.auth.refresh directly (bypassing HTTP, since a
    RuntimeError here should surface as a 500, and TestClient's default
    error handling would swallow the assertion this test wants to make).
    """
    _, stored = _make_stored_token()
    session = FakeSession(execute_results=[stored, None])

    with pytest.raises(RuntimeError, match="refresh_tokens.user_id FK"):
        await refresh(
            RefreshRequest(refresh_token=_RAW_TOKEN),
            request=None,  # type: ignore[arg-type]
            db=session,  # type: ignore[arg-type]
            settings=get_settings(),
        )
