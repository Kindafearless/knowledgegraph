"""Application configuration."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    environment: str = "development"
    port: int = 8001
    log_level: str = "INFO"

    # Database
    database_url: str = "postgresql+asyncpg://localhost:5432/knowledgegraph"

    # Auth service
    auth_service_url: str = "http://localhost:8080"

    # CORS
    cors_origins: list[str] = ["http://localhost:3000"]

    # Graph settings
    max_traversal_depth: int = 5
    max_results_per_query: int = 1000
    default_page_size: int = 50

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
