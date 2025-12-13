"""Health check routes."""

from datetime import datetime

from fastapi import APIRouter
from pydantic import BaseModel

from src.core.bedrock import bedrock_runtime

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
        service="llm-service",
        timestamp=datetime.utcnow().isoformat(),
    )


@router.get("/ready", response_model=ReadyResponse)
async def ready() -> ReadyResponse:
    """Readiness check with dependency verification."""
    checks: dict[str, str] = {}
    all_healthy = True

    # Check Bedrock client
    if bedrock_runtime is not None:
        checks["bedrock"] = "healthy"
    else:
        checks["bedrock"] = "unhealthy: client not initialized"
        all_healthy = False

    return ReadyResponse(
        status="ready" if all_healthy else "not ready",
        checks=checks,
        timestamp=datetime.utcnow().isoformat(),
    )
