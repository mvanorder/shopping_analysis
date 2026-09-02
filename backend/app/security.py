"""Password hashing and JWT/refresh-token helpers shared by the CLI and the auth API.

Pure crypto/token logic only — no FastAPI imports, no request handling. DB
access here is limited to the one write helper (:func:`upsert_password_identity`)
that both ``app.cli`` and the register/login routes need identically shaped.
"""

import hashlib
import secrets
import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError, VerifyMismatchError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import AuthIdentity, User

_password_hasher = PasswordHasher()

_JWT_ALGORITHM = "RS256"


def hash_password(password: str) -> str:
    """Hash a plaintext password with argon2.

    :param password: The plaintext password to hash.
    :type password: str
    :returns: An argon2 hash string suitable for ``auth_identities.secret_hash``.
    :rtype: str
    """
    return _password_hasher.hash(password)


def verify_password(secret_hash: str, password: str) -> bool:
    """Check a plaintext password against a stored argon2 hash.

    Wraps argon2's own exception types so callers never need to know them —
    a wrong password, a corrupt hash, and a hash from an unsupported scheme
    all just mean "no match."

    :param secret_hash: The stored hash, from :func:`hash_password`.
    :type secret_hash: str
    :param password: The plaintext password to check.
    :type password: str
    :returns: Whether ``password`` matches ``secret_hash``.
    :rtype: bool
    """
    try:
        return _password_hasher.verify(secret_hash, password)
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        return False


async def upsert_password_identity(session: AsyncSession, user: User, password_hash: str) -> None:
    """Create or update the ``password`` ``auth_identities`` row for a user.

    :param session: The database session to operate on.
    :type session: AsyncSession
    :param user: The user to attach the password identity to.
    :type user: User
    :param password_hash: An argon2 hash from :func:`hash_password`.
    :type password_hash: str
    """
    result = await session.execute(
        select(AuthIdentity).where(
            AuthIdentity.user_id == user.id, AuthIdentity.provider == "password"
        )
    )
    identity = result.scalar_one_or_none()
    if identity is None:
        session.add(
            AuthIdentity(
                user_id=user.id,
                provider="password",
                provider_user_id=str(user.id),
                secret_hash=password_hash,
            )
        )
    else:
        identity.secret_hash = password_hash


class TokenError(Exception):
    """A domain-level access-token failure: missing, malformed, expired, or unsigned by us.

    Framework-agnostic on purpose — :mod:`app.dependencies` is what maps this
    to an HTTP 401, so this module stays usable outside a request context
    (tests, scripts) without importing FastAPI.
    """


@dataclass(frozen=True)
class AccessTokenClaims:
    """The claims carried by a verified access token.

    :param user_id: The authenticated user's id (the token's ``sub``).
    :type user_id: uuid.UUID
    :param expires_at: When this token stops being valid.
    :type expires_at: datetime
    """

    user_id: uuid.UUID
    expires_at: datetime


def create_access_token(user_id: uuid.UUID, private_key_pem: str, *, ttl: timedelta) -> str:
    """Issue a short-lived, RS256-signed access token for a user.

    :param user_id: The user the token authenticates as.
    :type user_id: uuid.UUID
    :param private_key_pem: The PEM-encoded RSA private key to sign with
        (:attr:`app.config.Settings.jwt_private_key_pem`).
    :type private_key_pem: str
    :param ttl: How long the token should remain valid.
    :type ttl: timedelta
    :returns: The encoded JWT.
    :rtype: str
    """
    now = datetime.now(UTC)
    payload = {"sub": str(user_id), "iat": now, "exp": now + ttl}
    return jwt.encode(payload, private_key_pem, algorithm=_JWT_ALGORITHM)


def decode_access_token(token: str, public_key_pem: str) -> AccessTokenClaims:
    """Verify and decode an access token.

    Any problem with the *token* itself (expired, bad signature, malformed,
    a ``sub`` that isn't a UUID) raises :class:`TokenError`. A problem with
    the *key* we were given to verify against (e.g. malformed PEM) is a
    server misconfiguration, not a client error, and is deliberately left to
    propagate uncaught rather than being reported as an invalid token.

    :param token: The encoded JWT to verify.
    :type token: str
    :param public_key_pem: The PEM-encoded RSA public key to verify against
        (:attr:`app.config.Settings.jwt_public_key_pem`).
    :type public_key_pem: str
    :raises TokenError: If the token is missing, malformed, expired, has an
        invalid signature, or lacks a well-formed ``sub``/``exp`` claim.
    :returns: The token's claims.
    :rtype: AccessTokenClaims
    """
    try:
        payload = jwt.decode(token, public_key_pem, algorithms=[_JWT_ALGORITHM])
    except jwt.InvalidTokenError as exc:
        raise TokenError("invalid or expired access token") from exc

    try:
        user_id = uuid.UUID(payload["sub"])
        expires_at = datetime.fromtimestamp(payload["exp"], tz=UTC)
    except (KeyError, ValueError, TypeError) as exc:
        raise TokenError("access token is missing required claims") from exc

    return AccessTokenClaims(user_id=user_id, expires_at=expires_at)


def generate_refresh_token() -> str:
    """Generate a new opaque refresh token.

    Deliberately a plain random string, not a JWT — a refresh token's job is
    to be looked up by exact value, not decoded, so there are no claims to
    carry.

    :returns: A URL-safe random token with 256 bits of entropy.
    :rtype: str
    """
    return secrets.token_urlsafe(32)


def hash_refresh_token(token: str) -> str:
    """Hash a refresh token for storage in ``refresh_tokens.token_hash``.

    Deliberately SHA-256, not argon2: a refresh token from
    :func:`generate_refresh_token` is already 256 bits of uniform random
    data, not a low-entropy human password, so argon2's slow, memory-hard,
    per-call-salted design buys nothing here and actively gets in the way —
    ``POST /auth/refresh`` needs to find the row by exact hash equality
    (``WHERE token_hash = :hash``), which a salted hash can't support without
    an unnecessary full-table scan.

    :param token: The plaintext refresh token, from
        :func:`generate_refresh_token`.
    :type token: str
    :returns: The token's hex-encoded SHA-256 digest.
    :rtype: str
    """
    return hashlib.sha256(token.encode("utf-8")).hexdigest()
