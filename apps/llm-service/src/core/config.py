"""Application configuration."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    environment: str = "development"
    port: int = 8002
    log_level: str = "INFO"

    # AWS Bedrock
    aws_region: str = "us-gov-west-1"
    bedrock_model_id: str = "anthropic.claude-3-5-sonnet-20241022-v2:0"
    bedrock_embedding_model_id: str = "cohere.embed-english-v3"

    # Database (for vector storage)
    database_url: str = "postgresql+asyncpg://localhost:5432/knowledgegraph"

    # Service URLs
    auth_service_url: str = "http://localhost:8080"
    graph_service_url: str = "http://localhost:8001"

    # CORS
    cors_origins: list[str] = ["http://localhost:3000"]

    # LLM settings
    max_tokens: int = 4096
    temperature: float = 0.7
    top_p: float = 0.9

    # RAG settings
    chunk_size: int = 1000
    chunk_overlap: int = 200
    top_k_results: int = 5

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
