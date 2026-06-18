from pathlib import Path

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str
    secret_key: str

    gemini_api_key: str = ""

    access_token_expire_minutes: int = 1440
    backend_env: str = "development"
    upload_dir: Path = Path("uploads")

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()