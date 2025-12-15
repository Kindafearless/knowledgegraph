"""CCV Service - Canonical Control Vocabulary management."""

from contextlib import asynccontextmanager
from typing import AsyncGenerator

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.api.routes import terms, suggestions, hierarchy, health, extraction
from src.api.websocket import router as ws_router
from src.core.config import settings
from src.core.database import init_db, close_db
from src.core.events import init_event_handlers, close_event_handlers

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan handler."""
    logger.info("Starting CCV service", environment=settings.environment)
    await init_db()
    await init_event_handlers()
    yield
    logger.info("Shutting down CCV service")
    await close_event_handlers()
    await close_db()


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    app = FastAPI(
        title="Canonical Control Vocabulary Service",
        description="Manage controlled vocabulary, synonyms, and ontology hierarchies",
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

    # Include routers
    app.include_router(health.router, tags=["Health"])
    app.include_router(terms.router, prefix="/api/v1/terms", tags=["Terms"])
    app.include_router(suggestions.router, prefix="/api/v1/suggestions", tags=["Suggestions"])
    app.include_router(hierarchy.router, prefix="/api/v1/hierarchy", tags=["Hierarchy"])
    app.include_router(extraction.router, prefix="/api/v1/extraction", tags=["Extraction"])
    app.include_router(ws_router, prefix="/ws", tags=["WebSocket"])

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
