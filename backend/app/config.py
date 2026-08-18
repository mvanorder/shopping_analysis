from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import SecretStr
from sqlalchemy.engine import URL

_ENV_FILE = Path(__file__).resolve().parent.parent / ".env"  # backend/.env

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=_ENV_FILE, extra="ignore")

    postgres_host: str = "localhost"
    postgres_port: int = 5432
    postgres_user: str = "shopping"
    postgres_db: str = "shopping"
    postgres_password: SecretStr | None = None
    # Mirrors the db container's own POSTGRES_PASSWORD_FILE convention
    # (see database/Dockerfile) so the same Settings code works unchanged
    # once the backend is containerized for staging/prod.
    postgres_password_file: str | None = None

    @property
    def _db_password(self) -> str:
        """Get and return the database password
        :raises ValueError: if the file specified in POSTGRES_PASSWORD_FILE does not exist.
        :raises ValueError: if POSTGRES_PASSWORD and POSTGRES_PASSWORD_FILE are both not set.
        """
        if self.postgres_password:
            return self.postgres_password.get_secret_value()
        if self.postgres_password_file:
            password_file_path = Path(self.postgres_password_file)
            if not password_file_path.exists():
                raise ValueError(f"Could not read POSTGRES_PASSWORD_FILE: {self.postgres_password_file}")
            return password_file_path.read_text().strip()

        raise ValueError("Set POSTGRES_PASSWORD or POSTGRES_PASSWORD_FILE")


    @property
    def database_url(self) -> URL:
        # URL.create percent-encodes user/password, so special characters
        # (e.g. "@" or ":" in a password) don't get misparsed as URL syntax.
        return URL.create(
            drivername="postgresql+asyncpg",
            username=self.postgres_user,
            password=self._db_password,
            host=self.postgres_host,
            port=self.postgres_port,
            database=self.postgres_db,
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()
