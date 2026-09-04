import uuid
from collections.abc import Callable, Generator
from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient

from app.config import get_settings
from app.dependencies import get_current_user
from app.main import app
from app.models import User
from app.security import AccessTokenClaims, create_access_token
from tests.fakes import FakeSession


def _make_user(email: str, **overrides: object) -> User:
    """Build a ``User`` row with the columns ``UserProfile`` needs already set.

    A row built via the ORM constructor alone leaves server-defaulted
    columns (``created_at``, etc.) unset until a real flush/refresh; this
    fills them in so the fake session can stand in for one without a DB.

    :param email: The user's email address.
    :type email: str
    :param overrides: Any ``User`` field to override from its default here.
    :type overrides: object
    :returns: A fully-populated, unsaved ``User`` instance.
    :rtype: User
    """
    defaults: dict[str, object] = {
        "display_name": None,
        "avatar_url": None,
        "is_active": True,
        "email_verified": False,
        "is_superuser": False,
        "created_at": datetime.now(UTC),
        "last_login_at": None,
    }
    defaults.update(overrides)
    user = User(email=email, **defaults)
    user.id = uuid.uuid4()
    return user


@pytest.fixture
def current_user_override() -> Generator[Callable[[uuid.UUID], None]]:
    """Override ``get_current_user`` with fixed claims, isolating the route's own logic.

    :returns: A generator yielding a function that installs the override for
        a given user id.
    :rtype: Generator[Callable[[uuid.UUID], None]]
    """

    def _install(user_id: uuid.UUID) -> None:
        """Install the dependency override for ``user_id``.

        :param user_id: The user id the fake claims should carry.
        :type user_id: uuid.UUID
        """

        async def _override() -> AccessTokenClaims:
            """Return fixed claims in place of real token verification.

            :returns: Claims naming ``user_id``.
            :rtype: AccessTokenClaims
            """
            return AccessTokenClaims(user_id=user_id, expires_at=datetime.now(UTC))

        app.dependency_overrides[get_current_user] = _override

    yield _install
    app.dependency_overrides.pop(get_current_user, None)


def test_read_current_user_success(
    session_client_factory: Callable[[FakeSession], TestClient],
    current_user_override: Callable[[uuid.UUID], None],
) -> None:
    """Verify a found user is returned as the expected profile shape."""
    user = _make_user("me@example.com", display_name="Me")
    current_user_override(user.id)
    client = session_client_factory(FakeSession(execute_results=[user]))

    response = client.get("/users/me", headers={"Authorization": "Bearer irrelevant"})

    assert response.status_code == 200
    body = response.json()
    assert body["email"] == "me@example.com"
    assert body["display_name"] == "Me"


def test_read_current_user_deleted_user_raises_401(
    session_client_factory: Callable[[FakeSession], TestClient],
    current_user_override: Callable[[uuid.UUID], None],
) -> None:
    """Verify a token for a since-deleted user is rejected, not served/crashed."""
    current_user_override(uuid.uuid4())
    client = session_client_factory(FakeSession(execute_results=[None]))

    response = client.get("/users/me", headers={"Authorization": "Bearer irrelevant"})

    assert response.status_code == 401
    assert response.json()["detail"] == "User not found"


def test_read_current_user_missing_header_raises_401(
    session_client_factory: Callable[[FakeSession], TestClient],
) -> None:
    """Verify the real (non-overridden) auth dependency rejects a missing header."""
    client = session_client_factory(FakeSession(execute_results=[]))

    response = client.get("/users/me")

    assert response.status_code == 401


def test_read_current_user_end_to_end_with_real_token(
    session_client_factory: Callable[[FakeSession], TestClient],
) -> None:
    """Verify a real access token (no dependency overrides) authenticates end to end."""
    settings = get_settings()
    user = _make_user("e2e@example.com")
    token = create_access_token(user.id, settings.jwt_private_key_pem, ttl=timedelta(minutes=5))
    client = session_client_factory(FakeSession(execute_results=[user]))

    response = client.get("/users/me", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 200
    assert response.json()["email"] == "e2e@example.com"
