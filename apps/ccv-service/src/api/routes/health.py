"""Health check routes."""

from datetime import datetime

from fastapi import APIRouter
from pydantic import BaseModel

from src.core.database import engine
from src.core.events import redis_client

router = APIRouter()


class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    service: str
    timestamp: str


class ReadyResponse(BaseModel):
    """Readiness check response."""
    status: str
    checks: dict[str, str]
    timestamp: str


@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    """Basic health check."""
    return HealthResponse(
        status="healthy",
        service="ccv-service",
        timestamp=datetime.utcnow().isoformat(),
    )


@router.get("/ready", response_model=ReadyResponse)
async def ready() -> ReadyResponse:
    """Readiness check with dependency verification."""
    checks: dict[str, str] = {}
    all_healthy = True

    # Check database
    try:
        async with engine.connect() as conn:
            await conn.execute("SELECT 1")
        checks["database"] = "healthy"
    except Exception as e:
        checks["database"] = f"unhealthy: {str(e)}"
        all_healthy = False

    # Check Redis
    try:
        if redis_client:
            await redis_client.ping()
            checks["redis"] = "healthy"
        else:
            checks["redis"] = "not connected"
            all_healthy = False
    except Exception as e:
        checks["redis"] = f"unhealthy: {str(e)}"
        all_healthy = False

    return ReadyResponse(
        status="ready" if all_healthy else "not ready",
        checks=checks,
        timestamp=datetime.utcnow().isoformat(),
    )
