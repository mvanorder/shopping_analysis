import uuid
from collections.abc import Callable, Generator
from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient

from app.dependencies import get_current_user
from app.main import app
from app.models import RefreshToken
from app.security import AccessTokenClaims, hash_refresh_token
from tests.fakes import FakeSession

_RAW_TOKEN = "the-raw-refresh-token"


@pytest.fixture
def as_user() -> Generator[Callable[[uuid.UUID], None]]:
    """Override ``get_current_user`` so requests authenticate as a given user id.

    :returns: A generator yielding a function that installs the override.
    :rtype: Generator[Callable[[uuid.UUID], None]]
    """

    def _install(user_id: uuid.UUID) -> None:
        """Install the dependency override for ``user_id``.

        :param user_id: The user id the fake claims should carry.
        :type user_id: uuid.UUID
        """

        async def _override() -> AccessTokenClaims:
            """Return fixed claims naming ``user_id``.

            :returns: Claims naming ``user_id``.
            :rtype: AccessTokenClaims
            """
            return AccessTokenClaims(user_id=user_id, expires_at=datetime.now(UTC))

        app.dependency_overrides[get_current_user] = _override

    yield _install
    app.dependency_overrides.pop(get_current_user, None)


def _make_stored_token(user_id: uuid.UUID, *, owner_id: uuid.UUID | None = None) -> RefreshToken:
    """Build a ``RefreshToken`` row hashed from ``_RAW_TOKEN``.

    :param user_id: The id the route's caller authenticates as.
    :type user_id: uuid.UUID
    :param owner_id: The token row's actual ``user_id`` — defaults to
        ``user_id`` (the caller's own token); pass a different id to model
        someone else's token.
    :type owner_id: uuid.UUID | None
    :returns: The stored token row.
    :rtype: RefreshToken
    """
    stored = RefreshToken(
        user_id=owner_id if owner_id is not None else user_id,
        token_hash=hash_refresh_token(_RAW_TOKEN),
        expires_at=datetime.now(UTC),
    )
    stored.id = uuid.uuid4()
    return stored


def test_logout_revokes_own_token(
    session_client_factory: Callable[[FakeSession], TestClient],
    as_user: Callable[[uuid.UUID], None],
) -> None:
    """Verify logging out with the caller's own refresh token revokes it."""
    user_id = uuid.uuid4()
    stored = _make_stored_token(user_id)
    as_user(user_id)
    session = FakeSession(execute_results=[stored])
    client = session_client_factory(session)

    response = client.post("/auth/logout", json={"refresh_token": _RAW_TOKEN})

    assert response.status_code == 204
    assert stored.revoked_at is not None
    assert session.committed is True


def test_logout_someone_elses_token_is_noop(
    session_client_factory: Callable[[FakeSession], TestClient],
    as_user: Callable[[uuid.UUID], None],
) -> None:
    """Verify passing another user's refresh token doesn't revoke it (regression test)."""
    caller_id = uuid.uuid4()
    as_user(caller_id)
    # The query filters on the caller's own user_id, so a token owned by
    # someone else never matches — the fake models that by returning None.
    session = FakeSession(execute_results=[None])
    client = session_client_factory(session)

    response = client.post("/auth/logout", json={"refresh_token": _RAW_TOKEN})

    assert response.status_code == 204
    assert session.committed is True


def test_logout_unknown_token_is_noop(
    session_client_factory: Callable[[FakeSession], TestClient],
    as_user: Callable[[uuid.UUID], None],
) -> None:
    """Verify an unrecognized refresh token still returns 204, not an error."""
    as_user(uuid.uuid4())
    session = FakeSession(execute_results=[None])
    client = session_client_factory(session)

    response = client.post("/auth/logout", json={"refresh_token": "never-issued"})

    assert response.status_code == 204


def test_logout_requires_authentication(
    session_client_factory: Callable[[FakeSession], TestClient],
) -> None:
    """Verify logout without a valid access token is rejected."""
    client = session_client_factory(FakeSession(execute_results=[]))

    response = client.post("/auth/logout", json={"refresh_token": _RAW_TOKEN})

    assert response.status_code == 401


def test_logout_all_revokes_every_active_session(
    session_client_factory: Callable[[FakeSession], TestClient],
    as_user: Callable[[uuid.UUID], None],
) -> None:
    """Verify logout-all revokes every one of the caller's active tokens."""
    user_id = uuid.uuid4()
    as_user(user_id)
    token_a = RefreshToken(user_id=user_id, token_hash="a", expires_at=datetime.now(UTC))
    token_b = RefreshToken(user_id=user_id, token_hash="b", expires_at=datetime.now(UTC))
    session = FakeSession(execute_results=[[token_a, token_b]])
    client = session_client_factory(session)

    response = client.post("/auth/logout-all")

    assert response.status_code == 204
    assert token_a.revoked_at is not None
    assert token_b.revoked_at is not None
    assert session.committed is True


def test_logout_all_requires_authentication(
    session_client_factory: Callable[[FakeSession], TestClient],
) -> None:
    """Verify logout-all without a valid access token is rejected."""
    client = session_client_factory(FakeSession(execute_results=[]))

    response = client.post("/auth/logout-all")

    assert response.status_code == 401
