import uuid
from collections.abc import Callable

import pytest
from fastapi.testclient import TestClient

from app.models import AuthIdentity, User
from app.security import hash_password
from tests.fakes import FakeSession

_PASSWORD = "correct horse battery staple"


def _make_user_and_identity(*, is_active: bool = True) -> tuple[User, AuthIdentity]:
    """Build a matching ``User``/``AuthIdentity`` pair with a real password hash.

    :param is_active: Whether the user account should be active.
    :type is_active: bool
    :returns: A ``(user, identity)`` pair.
    :rtype: tuple[User, AuthIdentity]
    """
    user = User(email="user@example.com", is_active=is_active)
    user.id = uuid.uuid4()
    identity = AuthIdentity(
        user_id=user.id, provider="password", secret_hash=hash_password(_PASSWORD)
    )
    return user, identity


def test_login_success(session_client_factory: Callable[[FakeSession], TestClient]) -> None:
    """Verify correct credentials issue a token pair and update ``last_login_at``."""
    user, identity = _make_user_and_identity()
    session = FakeSession(execute_results=[user, identity])
    client = session_client_factory(session)

    response = client.post(
        "/auth/login", json={"email": "user@example.com", "password": _PASSWORD}
    )

    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]
    assert body["refresh_token"]
    assert body["expires_in"] == 15 * 60
    assert user.last_login_at is not None
    assert session.committed is True
    assert len(session.added) == 1


@pytest.mark.parametrize(
    ("execute_results_factory", "password"),
    [
        pytest.param(lambda: [None], _PASSWORD, id="unknown-email"),
        pytest.param(
            lambda: [_make_user_and_identity()[0], None], _PASSWORD, id="google-only-account"
        ),
        pytest.param(
            lambda: list(_make_user_and_identity()), "wrong password", id="wrong-password"
        ),
        pytest.param(
            lambda: list(_make_user_and_identity(is_active=False)),
            _PASSWORD,
            id="disabled-account",
        ),
    ],
)
def test_login_failures_share_generic_message(
    session_client_factory: Callable[[FakeSession], TestClient],
    execute_results_factory: Callable[[], list[object]],
    password: str,
) -> None:
    """Verify every failure mode returns the same 401 + message (anti-enumeration)."""
    session = FakeSession(execute_results=execute_results_factory())
    client = session_client_factory(session)

    response = client.post(
        "/auth/login", json={"email": "user@example.com", "password": password}
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid email or password"
    assert session.added == []
    assert session.committed is False
