import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List, Optional

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="allow")

    PROJECT_NAME: str = "Sonic Census"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = "noisepollution-ai-super-secret-key-change-in-production-2026"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day for dev convenience
    
    # Database URL: default to SQLite fallback for zero-friction local run if PostgreSQL not configured
    DATABASE_URL: str = "sqlite:///./noisepollution.db"
    
    # CORS
    FRONTEND_ORIGIN: str = "http://localhost:5173"
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://localhost:8000"
    ]
    
    # Audio uploads
    UPLOAD_DIRECTORY: str = "uploads"
    REPORTS_DIRECTORY: str = "generated_reports"
    SPECTROGRAMS_DIRECTORY: str = "generated_spectrograms"
    MAX_UPLOAD_SIZE_MB: int = 25
    MAX_AUDIO_DURATION_SECONDS: float = 60.0
    
    # Machine Learning / AI
    MODEL_PATH: str = "models/Cnn14.pth"
    DEVICE: str = "cpu"
    
    # Optional Third-Party Keys
    GEMINI_API_KEY: Optional[str] = None
    OPENAI_API_KEY: Optional[str] = None
    RESEND_API_KEY: Optional[str] = None
    GOOGLE_MAPS_API_KEY: Optional[str] = None

settings = Settings()
