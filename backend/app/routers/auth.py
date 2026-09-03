"""Authentication endpoints: register, login, refresh, logout (uac-design.md §1)."""

import logging
import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings, get_settings
from app.db import get_db
from app.dependencies import get_current_user
from app.models import AuthIdentity, RefreshToken, User
from app.schemas import (
    LoginRequest,
    LogoutRequest,
    RefreshRequest,
    RegisterRequest,
    RegisterResponse,
    TokenPairResponse,
)
from app.security import (
    AccessTokenClaims,
    create_access_token,
    generate_refresh_token,
    hash_password,
    hash_refresh_token,
    upsert_password_identity,
    verify_password,
)

logger = logging.getLogger(__name__)

router = APIRouter()

_INVALID_CREDENTIALS_DETAIL = "Invalid email or password"
_EMAIL_ALREADY_REGISTERED_DETAIL = "Email already registered"
_INVALID_REFRESH_TOKEN_DETAIL = "Invalid or expired refresh token"


def _get_client_meta(request: Request) -> tuple[str | None, str | None]:
    """Extract user-agent/IP metadata to store alongside a new refresh token.

    :param request: The incoming request.
    :type request: Request
    :returns: A ``(user_agent, ip_address)`` pair, either of which may be
        ``None`` (no ``User-Agent`` header, or no connecting client info
        available, as in some test/proxy setups).
    :rtype: tuple[str | None, str | None]
    """
    user_agent = request.headers.get("user-agent")
    ip_address = request.client.host if request.client else None
    return user_agent, ip_address


async def _issue_token_pair(
    db: AsyncSession,
    user: User,
    settings: Settings,
    *,
    user_agent: str | None,
    ip_address: str | None,
) -> TokenPairResponse:
    """Generate a new refresh token, stage it for insert, and mint a matching access token.

    Stages the new ``RefreshToken`` row via ``db.add`` but does not commit —
    callers (login, refresh) commit once, after any other state they change
    in the same request (``last_login_at``, revoking a rotated-out token) is
    staged too.

    :param db: The database session to stage the new refresh token on.
    :type db: AsyncSession
    :param user: The user the pair authenticates as.
    :type user: User
    :param settings: Application settings (JWT keys/TTLs).
    :type settings: Settings
    :param user_agent: The requesting client's ``User-Agent`` header, if any.
    :type user_agent: str | None
    :param ip_address: The requesting client's IP address, if known.
    :type ip_address: str | None
    :returns: The new access/refresh token pair.
    :rtype: TokenPairResponse
    """
    refresh_token = generate_refresh_token()
    db.add(
        RefreshToken(
            user_id=user.id,
            token_hash=hash_refresh_token(refresh_token),
            expires_at=datetime.now(UTC) + settings.refresh_token_ttl,
            user_agent=user_agent,
            ip_address=ip_address,
        )
    )
    access_token = create_access_token(
        user.id, settings.jwt_private_key_pem, ttl=settings.access_token_ttl
    )
    return TokenPairResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=int(settings.access_token_ttl.total_seconds()),
    )


async def _authenticate_password(db: AsyncSession, email: str, password: str) -> User | None:
    """Verify an email+password pair, returning the user on success.

    Deliberately returns the *same* outcome (``None``) for every failure
    mode — unknown email, an account with no password identity (Google-only),
    a wrong password, and a disabled account — so a caller can't distinguish
    "no such account" from "wrong password" from "your account is disabled."
    Does not implement constant-time protection against timing-based email
    enumeration — out of scope for this pass (uac-design.md §1
    "Authentication endpoints"; no rate-limiting exists yet either).

    :param db: The database session to query.
    :type db: AsyncSession
    :param email: The submitted email address.
    :type email: str
    :param password: The submitted plaintext password.
    :type password: str
    :returns: The authenticated user, or ``None`` on any failure.
    :rtype: User | None
    """
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if user is None:
        return None

    identity_result = await db.execute(
        select(AuthIdentity).where(
            AuthIdentity.user_id == user.id, AuthIdentity.provider == "password"
        )
    )
    identity = identity_result.scalar_one_or_none()
    if identity is None or identity.secret_hash is None:
        return None
    if not verify_password(identity.secret_hash, password):
        return None
    if not user.is_active:
        return None
    return user


@router.post(
    "/register",
    response_model=RegisterResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new account",
)
async def register(payload: RegisterRequest, db: AsyncSession = Depends(get_db)) -> User:
    """Create a new user account with a password identity.

    Leaves ``email_verified=False`` but does not block login on it —
    email verification is out of scope for this pass (uac-design.md §1
    "Account states"); the account behaves as fully active immediately.

    :param payload: The registration request body.
    :type payload: RegisterRequest
    :param db: The database session, injected via dependency.
    :type db: AsyncSession
    :raises HTTPException: 400 if the email is already registered — checked
        up front, and again via the unique-constraint race below (two
        concurrent registrations for the same not-yet-existing email).
    :returns: The newly created user.
    :rtype: User

    .. note::
        Unlike ``login``'s deliberately generic 401 (anti-enumeration), this
        does confirm whether an email is already registered — an accepted,
        conscious trade-off for this pass, not an oversight: a distinct
        "email taken" error is common/expected registration UX, and the
        enumeration risk here is lower-value to an attacker than at login
        (no password guess is validated). Revisit if that stops holding
        (uac-design.md §1).
    """
    existing = await db.execute(select(User).where(User.email == payload.email))
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(status_code=400, detail=_EMAIL_ALREADY_REGISTERED_DETAIL)

    user = User(email=payload.email, display_name=payload.display_name)
    db.add(user)
    try:
        await db.flush()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(status_code=400, detail=_EMAIL_ALREADY_REGISTERED_DETAIL) from exc

    await upsert_password_identity(db, user, hash_password(payload.password))
    await db.commit()
    return user


@router.post("/login", response_model=TokenPairResponse, summary="Log in with email and password")
async def login(
    payload: LoginRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> TokenPairResponse:
    """Verify credentials and issue an access/refresh token pair.

    :param payload: The login request body.
    :type payload: LoginRequest
    :param request: The incoming request (for user-agent/IP metadata).
    :type request: Request
    :param db: The database session, injected via dependency.
    :type db: AsyncSession
    :param settings: Application settings, injected via dependency.
    :type settings: Settings
    :raises HTTPException: 401 for any authentication failure — see
        :func:`_authenticate_password` for why these aren't distinguished.
    :returns: A new access/refresh token pair.
    :rtype: TokenPairResponse
    """
    # No rate-limiting on this endpoint yet, deliberately (uac-design.md
    # §1/§7 — no Redis exists to back one) — a Depends(...) here is where a
    # future rate limiter would slot in.
    user = await _authenticate_password(db, payload.email, payload.password)
    if user is None:
        raise HTTPException(status_code=401, detail=_INVALID_CREDENTIALS_DETAIL)

    user.last_login_at = datetime.now(UTC)
    user_agent, ip_address = _get_client_meta(request)
    token_pair = await _issue_token_pair(
        db, user, settings, user_agent=user_agent, ip_address=ip_address
    )
    await db.commit()
    return token_pair


async def _revoke_all_refresh_tokens(db: AsyncSession, user_id: uuid.UUID) -> None:
    """Revoke every currently-active refresh token for a user.

    Used when an already-revoked refresh token is presented again — a theft
    signal, since a legitimate client only ever holds the latest token in
    its chain. The whole account's sessions are invalidated, not just the
    one compromised token, since there's no way to tell which of the user's
    devices is the attacker's. A ``family_id`` column to scope this down to
    just the affected device chain is a deliberate follow-up, not built here
    (uac-design.md §1).

    :param db: The database session to operate on.
    :type db: AsyncSession
    :param user_id: The user whose sessions should all be revoked.
    :type user_id: uuid.UUID
    """
    result = await db.execute(
        select(RefreshToken).where(
            RefreshToken.user_id == user_id, RefreshToken.revoked_at.is_(None)
        )
    )
    now = datetime.now(UTC)
    for token in result.scalars():
        token.revoked_at = now


@router.post("/refresh", response_model=TokenPairResponse, summary="Rotate a refresh token")
async def refresh(
    payload: RefreshRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> TokenPairResponse:
    """Validate and rotate a refresh token, issuing a new access/refresh pair.

    Looked up by exact hash equality, not decoded — see
    :func:`app.security.hash_refresh_token` for why. Rotation semantics
    (uac-design.md §1): an unknown hash or an expired-but-unrevoked token is
    a plain 401; a token that's already been revoked (rotated out or
    logged out) being presented again is treated as reuse/theft and revokes
    every other active session for that user before returning the same 401.

    :param payload: The refresh request body.
    :type payload: RefreshRequest
    :param request: The incoming request (for user-agent/IP metadata).
    :type request: Request
    :param db: The database session, injected via dependency.
    :type db: AsyncSession
    :param settings: Application settings, injected via dependency.
    :type settings: Settings
    :raises HTTPException: 401 if the token is unknown, expired, or reused.
    :returns: A new access/refresh token pair.
    :rtype: TokenPairResponse
    """
    # No rate-limiting on this endpoint yet, deliberately (uac-design.md
    # §1/§7 — no Redis exists to back one) — a Depends(...) here is where a
    # future rate limiter would slot in.
    token_hash = hash_refresh_token(payload.refresh_token)
    # FOR UPDATE: without a row lock, two concurrent requests presenting the
    # same still-valid token both read revoked_at=None before either
    # commits, and both rotate it — spending one token twice. Locking here
    # makes the second request block until the first's UPDATE/commit lands,
    # so it then correctly sees the row already revoked and takes the reuse
    # (theft) branch below instead of also rotating successfully.
    result = await db.execute(
        select(RefreshToken).where(RefreshToken.token_hash == token_hash).with_for_update()
    )
    stored = result.scalar_one_or_none()
    if stored is None:
        raise HTTPException(status_code=401, detail=_INVALID_REFRESH_TOKEN_DETAIL)

    now = datetime.now(UTC)

    if stored.revoked_at is not None:
        await _revoke_all_refresh_tokens(db, stored.user_id)
        await db.commit()
        logger.warning("Refresh token reuse detected for user %s", stored.user_id)
        raise HTTPException(status_code=401, detail=_INVALID_REFRESH_TOKEN_DETAIL)

    if stored.expires_at <= now:
        stored.revoked_at = now
        await db.commit()
        raise HTTPException(status_code=401, detail=_INVALID_REFRESH_TOKEN_DETAIL)

    # Valid and unexpired: rotate. users.id ON DELETE CASCADEs into
    # refresh_tokens (app/models/user.py), so a row reaching this point is
    # guaranteed to still have its user.
    stored.revoked_at = now
    user_result = await db.execute(select(User).where(User.id == stored.user_id))
    user = user_result.scalar_one_or_none()
    if user is None:
        # Should be unreachable given the FK above; fail loudly rather than
        # silently continuing with a stripped-down assert (which -O would
        # skip entirely, turning this into a confusing AttributeError below).
        raise RuntimeError("refresh_tokens.user_id FK guarantees a matching users row")

    if not user.is_active:
        # Re-check here, not just at login: an access token carries no
        # DB-backed revocation, so refresh is the only later point that can
        # actually cut off a disabled account's existing session. Without
        # this, disabling a user would stop new logins but not renewals.
        await db.commit()  # persist the revocation above even though we reject
        raise HTTPException(status_code=401, detail=_INVALID_REFRESH_TOKEN_DETAIL)

    user_agent, ip_address = _get_client_meta(request)
    token_pair = await _issue_token_pair(
        db, user, settings, user_agent=user_agent, ip_address=ip_address
    )
    await db.commit()
    return token_pair


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT, summary="Log out one session")
async def logout(
    payload: LogoutRequest,
    claims: AccessTokenClaims = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Revoke one refresh token — the caller's own session only.

    A refresh token that doesn't exist, or belongs to a different user, is
    **not** an error: it's a silent no-op, still returning 204. This avoids
    both an information leak (whether that token exists, or whose it is)
    and a "log someone else out" primitive — without this, an authenticated
    caller could pass another user's refresh token and force that session
    closed.

    :param payload: The logout request body.
    :type payload: LogoutRequest
    :param claims: The verified access-token claims, injected via dependency.
    :type claims: AccessTokenClaims
    :param db: The database session, injected via dependency.
    :type db: AsyncSession
    """
    token_hash = hash_refresh_token(payload.refresh_token)
    result = await db.execute(
        select(RefreshToken).where(
            RefreshToken.token_hash == token_hash, RefreshToken.user_id == claims.user_id
        )
    )
    stored = result.scalar_one_or_none()
    if stored is not None:
        stored.revoked_at = datetime.now(UTC)
    await db.commit()


@router.post(
    "/logout-all",
    status_code=status.HTTP_204_NO_CONTENT,
    summary='Log out every session ("sign out all devices")',
)
async def logout_all(
    claims: AccessTokenClaims = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Revoke every refresh token for the caller ("sign out all devices").

    :param claims: The verified access-token claims, injected via dependency.
    :type claims: AccessTokenClaims
    :param db: The database session, injected via dependency.
    :type db: AsyncSession
    """
    await _revoke_all_refresh_tokens(db, claims.user_id)
    await db.commit()
