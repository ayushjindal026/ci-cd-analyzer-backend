from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """
    Type-safe configuration loaded from .env file.

    WHY pydantic-settings and not os.environ.get()?
    - Type validation at startup — wrong types fail immediately
    - Missing required fields fail at startup, not at runtime
    - Single source of truth for all config
    - Testable — inject different settings in tests
    """
    openai_api_key: str
    openai_model: str = "llama-3.1-8b-instant"
    openai_base_url: str = "https://api.openai.com/v1"
    github_token: str
    log_level: str = "INFO"

    # How many tokens of log to send to the LLM.
    # WHY 3000? Errors concentrate at the end of logs.
    # Sending the full log (can be 50k tokens) is expensive.
    # Last 3000 tokens captures the actual failure without
    # paying for the noise at the top.
    max_log_tokens: int = 3000

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


# Singleton — imported everywhere, instantiated once
settings = Settings()