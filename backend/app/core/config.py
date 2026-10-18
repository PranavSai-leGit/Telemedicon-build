from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
import json
import os
from pathlib import Path

# Base workspace directory
BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent

class Settings(BaseSettings):
    PROJECT_NAME: str = "MediTale"
    PROJECT_TAGLINE: str = "Your health history, connected and ready for every consultation."
    VERSION: str = "1.0.0"
    DEBUG: bool = True
    SECRET_KEY: str = "meditale-super-secret-key-change-in-prod-1234567890abcdef"
    
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]
    
    # PostgreSQL with psycopg 3
    DATABASE_URL: str = "postgresql+psycopg://meditale_user:meditale_password@localhost:5432/meditale"
    
    # Sessions & Cookies
    SESSION_COOKIE_NAME: str = "meditale_session"
    SESSION_EXPIRE_HOURS: int = 24
    COOKIE_SECURE: bool = False
    COOKIE_SAMESITE: str = "lax"
    
    # Storage
    STORAGE_DIR: str = str(BASE_DIR / "private_uploads")
    MAX_FILE_SIZE_MB: int = 10
    
    # Gemini AI
    GEMINI_API_KEY: Optional[str] = None
    GEMINI_MODEL: str = "gemini-3.8-flash"
    AI_MODE: str = "auto"  # "auto", "gemini", "demo"

    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()

# Ensure private uploads directory exists
os.makedirs(settings.STORAGE_DIR, exist_ok=True)
