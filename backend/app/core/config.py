from pathlib import Path
from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


BASE_DIR = Path(__file__).resolve().parents[2]
DATA_DIR = BASE_DIR / "data"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="WREX_", env_file=".env", extra="ignore")

    # ── Identity ───────────────────────────────────────────────────────────────
    app_name: str = "Wrex.app"

    # ── Environment ────────────────────────────────────────────────────────────
    environment: Literal["development", "production", "test"] = "development"
    log_level: str = "INFO"
    debug: bool = False

    # ── CORS ───────────────────────────────────────────────────────────────────
    allowed_origins: list[str] = Field(
        default_factory=lambda: ["http://127.0.0.1:5173", "http://localhost:5173"]
    )

    # ── Analysis limits ────────────────────────────────────────────────────────
    min_text_words: int = 25
    max_text_words: int = 2500
    anon_daily_limit: int = 1
    free_daily_limit: int = 3

    # ── SQLite (waitlist + anon usage) ─────────────────────────────────────────
    sqlite_path: Path = DATA_DIR / "wrex.db"

    # ── Supabase ────────────────────────────────────────────────────────────────
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""

    @property
    def supabase_configured(self) -> bool:
        return bool(self.supabase_url and self.supabase_service_role_key)

    # ── Derived helpers ────────────────────────────────────────────────────────
    @field_validator("log_level")
    @classmethod
    def _validate_log_level(cls, v: str) -> str:
        valid = {"DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"}
        upper = v.upper()
        if upper not in valid:
            raise ValueError(f"log_level must be one of {valid}")
        return upper

    @property
    def is_production(self) -> bool:
        return self.environment == "production"

    @property
    def docs_enabled(self) -> bool:
        """Expose /docs and /redoc only outside production."""
        return not self.is_production


settings = Settings()
