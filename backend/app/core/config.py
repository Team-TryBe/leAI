"""
Configuration management for Aditus application.
Loads environment variables and provides app-wide settings.
"""

import os
from functools import lru_cache
from typing import Optional
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # App info
    APP_NAME: str = "Aditus"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = os.getenv("DEBUG", "False").lower() == "true"
    
    # Server
    SERVER_HOST: str = os.getenv("SERVER_HOST", "0.0.0.0")
    SERVER_PORT: int = int(os.getenv("SERVER_PORT", "8000"))
    
    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql+asyncpg://postgres:postgres@localhost:5432/aditus"
    )
    
    # Gemini API
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-1.5-pro")
    GEMINI_TEMPERATURE: float = float(os.getenv("GEMINI_TEMPERATURE", "0.7"))
    
    # Firecrawl API (for advanced web scraping)
    FIRECRAWL_API_KEY: str = os.getenv("FIRECRAWL_API_KEY", "")
    
    # Google OAuth2 (Gmail Integration)
    GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "")
    GOOGLE_CLIENT_SECRET: str = os.getenv("GOOGLE_CLIENT_SECRET", "")

    # M-Pesa Daraja API
    DARAJA_CONSUMER_KEY: str = os.getenv("DARAJA_CONSUMER_KEY", "")
    DARAJA_CONSUMER_SECRET: str = os.getenv("DARAJA_CONSUMER_SECRET", "")
    DARAJA_PASSKEY: str = os.getenv("DARAJA_PASSKEY", "")
    DARAJA_SHORTCODE: str = os.getenv("DARAJA_SHORTCODE", "")
    DARAJA_CALLBACK_URL: str = os.getenv("DARAJA_CALLBACK_URL", "")
    DARAJA_BASE_URL: str = os.getenv("DARAJA_BASE_URL", "https://sandbox.safaricom.co.ke")  # Use production URL in prod
    DARAJA_TRANSACTION_TYPE: str = os.getenv("DARAJA_TRANSACTION_TYPE", "CustomerPayBillOnline")  # Use CustomerBuyGoodsOnline for Till

    # Resend (Email Sending)
    RESEND_API_KEY: str = os.getenv("RESEND_API_KEY", "")
    RESEND_FROM_EMAIL: str = os.getenv("RESEND_FROM_EMAIL", "")
    
    # API URLs
    API_URL: str = os.getenv("API_URL", "http://localhost:8000")
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3000")
    
    # File storage
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "uploads")
    MAX_FILE_SIZE: int = int(os.getenv("MAX_FILE_SIZE", "10485760"))  # 10MB
    
    # PDF Generation (WeasyPrint)
    PDF_OUTPUT_DIR: str = os.getenv("PDF_OUTPUT_DIR", "pdfs")
    PDF_PAGE_SIZE: str = os.getenv("PDF_PAGE_SIZE", "A4")
    
    # Background tasks
    BACKGROUND_TASK_TIMEOUT: int = int(os.getenv("BACKGROUND_TASK_TIMEOUT", "300"))
    MAX_RETRIES: int = int(os.getenv("MAX_RETRIES", "3"))
    
    # CORS
    CORS_ORIGINS: list = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:8000",
        os.getenv("FRONTEND_URL", "http://localhost:3000")
    ]
    CORS_ALLOW_CREDENTIALS: bool = True
    CORS_ALLOW_METHODS: list = ["*"]
    CORS_ALLOW_HEADERS: list = ["*"]
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "dev-secret-key-change-in-production")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # Scraping
    REQUEST_TIMEOUT: int = int(os.getenv("REQUEST_TIMEOUT", "30"))
    USER_AGENT: str = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    
    model_config = {
        "env_file": ".env",
        "case_sensitive": True,
        "extra": "ignore"  # Ignore extra fields from .env
    }


@lru_cache()
def get_settings() -> Settings:
    """Get cached application settings."""
    return Settings()


def validate_settings(settings: Settings) -> bool:
    """Validate critical settings."""
    if not settings.GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY environment variable is not set")
    
    # Ensure directories exist
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    os.makedirs(settings.PDF_OUTPUT_DIR, exist_ok=True)
    
    return True
