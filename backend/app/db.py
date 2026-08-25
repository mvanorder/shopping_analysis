"""Async SQLAlchemy engine/session setup and the declarative ORM base."""

from collections.abc import AsyncGenerator
from functools import lru_cache

from sqlalchemy import MetaData
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import get_settings

# Explicit naming convention so Alembic autogenerate produces stable,
# deterministic constraint/index names instead of DB-assigned ones (which
# differ across dialects and can't be reliably referenced from a downgrade).
# Note: "uq" only keys off the *first* column, so a second multi-column
# UniqueConstraint on the same table sharing that first column would collide
# — pass an explicit name= to UniqueConstraint if that ever comes up.
_NAMING_CONVENTION = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


@lru_cache
def get_engine():
    """Return the cached async SQLAlchemy engine.

    :returns: The process-wide ``AsyncEngine`` instance.
    :rtype: AsyncEngine
    """
    return create_async_engine(get_settings().database_url)  # pragma: no cover

@lru_cache
def get_sessionmaker():
    """Return the cached async session factory bound to the shared engine.

    :returns: A configured ``async_sessionmaker``.
    :rtype: async_sessionmaker[AsyncSession]
    """
    return async_sessionmaker(get_engine(), expire_on_commit=False)  # pragma: no cover


class Base(DeclarativeBase):  # pylint: disable=too-few-public-methods
    """Declarative base class for all ORM models in this app."""

    metadata = MetaData(naming_convention=_NAMING_CONVENTION)


# get_engine/get_sessionmaker/get_db are only exercised against a real
# Postgres instance; tests replace get_db entirely via
# app.dependency_overrides, so their bodies are excluded from coverage.
async def get_db() -> AsyncGenerator[AsyncSession]:
    """Yield a request-scoped async database session for dependency injection.

    :returns: An async generator yielding an ``AsyncSession`` per request.
    :rtype: AsyncGenerator[AsyncSession]
    """
    async with get_sessionmaker()() as session:  # pragma: no cover
        yield session  # pragma: no cover
