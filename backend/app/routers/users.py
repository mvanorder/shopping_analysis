"""User-profile endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.dependencies import get_current_user
from app.models import User
from app.schemas import UserProfile
from app.security import AccessTokenClaims

router = APIRouter()


@router.get("/me", response_model=UserProfile, summary="Get the current user's profile")
async def read_current_user(
    claims: AccessTokenClaims = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Return the authenticated caller's own profile.

    Re-fetches the row by ``claims.user_id`` rather than trusting the
    token's cached claims for profile data, so a deleted account is caught
    here (401) instead of serving profile fields from stale claims. A
    disabled account is *not* rejected here — it's still returned, with
    ``is_active: false``, for the caller to act on; ``is_active`` is
    enforced at login/refresh (``_authenticate_password``, ``refresh``),
    not by hiding an authenticated user's own profile from them.

    :param claims: The verified access-token claims, injected via dependency.
    :type claims: AccessTokenClaims
    :param db: The database session, injected via dependency.
    :type db: AsyncSession
    :raises HTTPException: 401 if the token's user no longer exists.
    :returns: The caller's own user row.
    :rtype: User
    """
    result = await db.execute(select(User).where(User.id == claims.user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user
