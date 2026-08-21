from collections.abc import AsyncGenerator
from functools import lru_cache

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import get_settings


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


class Base(DeclarativeBase):
    """Declarative base class for all ORM models in this app."""


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
