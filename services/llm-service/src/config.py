"""Configuration management for LLM Service."""
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False
    )
    
    # OpenAI Configuration
    openai_api_key: str = ""
    openai_model: str = "gpt-4"
    openai_max_tokens: int = 2000
    openai_temperature: float = 0.7
    
    # Service Configuration
    llm_service_port: int = 8002
    log_level: str = "INFO"
    
    # CORS Settings
    allowed_origins: str = "http://localhost:3001"
    allowed_hosts: str = "localhost,127.0.0.1,llm-service"
    
    # Rate Limiting
    max_requests_per_minute: int = 60
    
    # Retry Configuration
    max_retries: int = 3
    retry_delay: float = 1.0


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
