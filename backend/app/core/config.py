from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


BASE_DIR = Path(__file__).resolve().parents[2]
DATA_DIR = BASE_DIR / "data"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="WREX_", env_file=".env", extra="ignore")

    app_name: str = "Wrex.app"
    allowed_origins: list[str] = Field(
        default_factory=lambda: ["http://127.0.0.1:5173", "http://localhost:5173"]
    )
    min_text_words: int = 25
    max_text_words: int = 2500
    sqlite_path: Path = DATA_DIR / "wrex.db"


settings = Settings()
