from pathlib import Path

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str
    secret_key: str

    gemini_api_key: str = ""

    access_token_expire_minutes: int = 1440
    backend_env: str = "development"
    upload_dir: Path = Path("uploads")

    # Lets the Universal Data Upload Engine be disabled with a config
    # change rather than a deploy -- see PRODUCTION_ARCHITECTURE_REVIEW.md
    # section 7. Defaults on; existing /upload/ behavior is unaffected
    # either way since it doesn't check this flag.
    ingestion_engine_enabled: bool = True
    command_center_enabled: bool = True
    market_radar_enabled: bool = True

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()