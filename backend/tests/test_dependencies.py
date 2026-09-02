import uuid
from datetime import timedelta

import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials

from app.config import get_settings
from app.dependencies import get_current_user
from app.security import create_access_token


def _bearer(token: str) -> HTTPAuthorizationCredentials:
    """Build the credentials object ``HTTPBearer`` would parse from a header.

    :param token: The raw bearer token.
    :type token: str
    :returns: Parsed bearer credentials.
    :rtype: HTTPAuthorizationCredentials
    """
    return HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)


async def test_get_current_user_missing_credentials_raises_401() -> None:
    """Verify a missing ``Authorization`` header (``credentials=None``) is a 401."""
    with pytest.raises(HTTPException) as exc_info:
        await get_current_user(credentials=None, settings=get_settings())

    assert exc_info.value.status_code == 401
    assert exc_info.value.headers == {"WWW-Authenticate": "Bearer"}


async def test_get_current_user_invalid_token_raises_401() -> None:
    """Verify a garbage token is rejected as a 401, not an unhandled TokenError."""
    with pytest.raises(HTTPException) as exc_info:
        await get_current_user(credentials=_bearer("not-a-jwt"), settings=get_settings())

    assert exc_info.value.status_code == 401


async def test_get_current_user_valid_token_returns_claims() -> None:
    """Verify a token signed with the app's own key decodes to the right claims."""
    settings = get_settings()
    user_id = uuid.uuid4()
    token = create_access_token(user_id, settings.jwt_private_key_pem, ttl=timedelta(minutes=5))

    claims = await get_current_user(credentials=_bearer(token), settings=settings)

    assert claims.user_id == user_id
