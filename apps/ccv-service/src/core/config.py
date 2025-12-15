"""Application configuration."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    environment: str = "development"
    port: int = 8003
    log_level: str = "INFO"

    # Database
    database_url: str = "postgresql+asyncpg://localhost:5432/knowledgegraph"

    # Redis (for pub/sub and caching)
    redis_url: str = "redis://localhost:6379"

    # Service URLs
    auth_service_url: str = "http://localhost:8080"
    graph_service_url: str = "http://localhost:8001"
    llm_service_url: str = "http://localhost:8002"

    # CORS
    cors_origins: list[str] = ["http://localhost:3000"]

    # CCV Settings
    auto_approve_threshold: float = 0.95  # Auto-approve suggestions above this confidence
    suggestion_batch_size: int = 50  # Process suggestions in batches
    max_hierarchy_depth: int = 10  # Maximum depth for term hierarchies

    # LLM Settings
    enable_auto_suggestions: bool = True  # Enable LLM-powered suggestions
    suggestion_model: str = "claude-3-haiku"  # Use faster model for suggestions

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
