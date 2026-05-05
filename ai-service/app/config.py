from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import Optional


class Settings(BaseSettings):
    """
    Centralized, type-safe configuration for AI service.

    WHY this approach:
    - Fails fast if required env vars are missing
    - Works with both .env (local dev) and Docker env vars
    - Prevents silent misconfiguration in production
    """

    # =========================
    # 🤖 AI CONFIG
    # =========================
    openai_api_key: str
    openai_model: str = "llama-3.1-8b-instant"
    openai_base_url: str = "https://api.groq.com/openai/v1"

    # =========================
    # ⚙️ OPTIONAL CONFIG
    # =========================
    log_level: str = "INFO"
    max_log_tokens: int = 3000

    # =========================
    # 🔐 OPTIONAL (avoid if possible)
    # =========================
    # Ideally AI service should NOT depend on GitHub
    github_token: Optional[str] = None

    # =========================
    # ✅ VALIDATION
    # =========================
    @field_validator("openai_api_key")
    def validate_api_key(cls, v):
        if not v or v.strip() == "":
            raise ValueError("OPENAI_API_KEY is required")
        return v

    @field_validator("openai_model")
    def validate_model(cls, v):
        if not v or v.strip() == "":
            raise ValueError("OPENAI_MODEL cannot be empty")
        return v

    @field_validator("openai_base_url")
    def validate_base_url(cls, v):
        if not v.startswith("http"):
            raise ValueError("OPENAI_BASE_URL must be a valid URL")
        return v

    # =========================
    # 📦 CONFIG SOURCE
    # =========================
    class Config:
        env_file = ".env"              # works locally
        env_file_encoding = "utf-8"
        extra = "ignore"              # ignore unknown env vars


# Singleton instance
settings = Settings()