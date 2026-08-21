from pathlib import Path

import pytest

from app.config import Settings, get_settings


def test_db_password_from_postgres_password() -> None:
    """Verify ``_db_password`` returns the plain ``postgres_password`` value."""
    settings = Settings(_env_file=None, postgres_password="pw", postgres_password_file=None)

    assert settings._db_password == "pw"


def test_db_password_from_password_file(tmp_path: Path) -> None:
    """Verify ``_db_password`` reads and strips a configured password file.

    :param tmp_path: Pytest-provided temporary directory.
    :type tmp_path: Path
    """
    password_file = tmp_path / "password"
    password_file.write_text("filepw\n")
    settings = Settings(
        _env_file=None, postgres_password=None, postgres_password_file=str(password_file)
    )

    assert settings._db_password == "filepw"


def test_db_password_file_missing_raises() -> None:
    """Verify a nonexistent ``postgres_password_file`` raises ``ValueError``."""
    settings = Settings(
        _env_file=None,
        postgres_password=None,
        postgres_password_file="C:/nonexistent/password/path",
    )

    with pytest.raises(ValueError, match="Could not read POSTGRES_PASSWORD_FILE"):
        _ = settings._db_password


def test_db_password_unset_raises() -> None:
    """Verify omitting both password sources raises ``ValueError``."""
    settings = Settings(_env_file=None, postgres_password=None, postgres_password_file=None)

    with pytest.raises(ValueError, match="Set POSTGRES_PASSWORD or POSTGRES_PASSWORD_FILE"):
        _ = settings._db_password


def test_database_url_percent_encodes_special_characters() -> None:
    """Verify ``database_url`` percent-encodes special characters in the password."""
    settings = Settings(
        _env_file=None,
        postgres_user="user",
        postgres_password="p@ss:word",
        postgres_password_file=None,
        postgres_host="localhost",
        postgres_port=5432,
        postgres_db="shopping",
    )

    url = settings.database_url.render_as_string(hide_password=False)

    assert url.startswith("postgresql+asyncpg://")
    assert "p@ss:word" not in url
    assert "%40" in url  # percent-encoded "@"


def test_get_settings_returns_cached_singleton() -> None:
    """Verify ``get_settings`` returns the same cached instance on repeat calls."""
    get_settings.cache_clear()
    try:
        first = get_settings()
        second = get_settings()

        assert first is second
    finally:
        get_settings.cache_clear()
