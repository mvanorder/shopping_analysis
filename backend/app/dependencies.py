"""FastAPI dependencies shared across protected routes."""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import Settings, get_settings
from app.security import AccessTokenClaims, TokenError, decode_access_token

# auto_error=False so a missing header reaches this function as None (for a
# consistent 401 body) instead of Starlette's own generic 403.
_bearer_scheme = HTTPBearer(auto_error=False)

_UNAUTHORIZED_HEADERS = {"WWW-Authenticate": "Bearer"}


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
    settings: Settings = Depends(get_settings),
) -> AccessTokenClaims:
    """Verify the request's bearer access token and return its claims.

    Uses ``HTTPBearer``, not ``OAuth2PasswordBearer`` — the latter assumes a
    spec-compliant form-encoded ``/token`` endpoint, but ``POST /auth/login``
    takes a JSON body, so ``OAuth2PasswordBearer`` would make an interactive
    API-docs "Authorize" button submit a form this API doesn't accept.

    :param credentials: The parsed ``Authorization: Bearer`` header, or
        ``None`` if it's missing or not a bearer scheme.
    :type credentials: HTTPAuthorizationCredentials | None
    :param settings: Application settings (the JWT public key).
    :type settings: Settings
    :raises HTTPException: 401 if the header is missing, or the token is
        invalid/expired/wrongly-signed.
    :returns: The verified token's claims.
    :rtype: AccessTokenClaims
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers=_UNAUTHORIZED_HEADERS,
        )
    try:
        return decode_access_token(credentials.credentials, settings.jwt_public_key_pem)
    except TokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token",
            headers=_UNAUTHORIZED_HEADERS,
        ) from exc
