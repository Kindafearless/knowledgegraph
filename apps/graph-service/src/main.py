"""Graph Service - Main application entry point."""

from contextlib import asynccontextmanager
from typing import AsyncGenerator

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.api.routes import entities, relationships, queries, health
from src.core.config import settings
from src.core.database import init_db, close_db
from src.core.middleware import AuthMiddleware, LoggingMiddleware

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan handler."""
    logger.info("Starting graph service", environment=settings.environment)
    await init_db()
    yield
    logger.info("Shutting down graph service")
    await close_db()


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    app = FastAPI(
        title="Knowledge Graph Service",
        description="API for managing knowledge graph entities and relationships",
        version="0.1.0",
        lifespan=lifespan,
        docs_url="/docs" if settings.environment != "production" else None,
        redoc_url="/redoc" if settings.environment != "production" else None,
    )

    # Add middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(LoggingMiddleware)
    app.add_middleware(AuthMiddleware, auth_service_url=settings.auth_service_url)

    # Include routers
    app.include_router(health.router, tags=["Health"])
    app.include_router(entities.router, prefix="/api/v1/entities", tags=["Entities"])
    app.include_router(relationships.router, prefix="/api/v1/relationships", tags=["Relationships"])
    app.include_router(queries.router, prefix="/api/v1/queries", tags=["Queries"])

    return app


app = create_app()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "src.main:app",
        host="0.0.0.0",
        port=settings.port,
        reload=settings.environment == "development",
    )
