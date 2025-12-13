"""Application middleware."""

import time
from typing import Callable

import httpx
import structlog
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

logger = structlog.get_logger()


class LoggingMiddleware(BaseHTTPMiddleware):
    """Middleware for request/response logging."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        start_time = time.time()
        request_id = request.headers.get("X-Request-ID", "")

        # Log request
        logger.info(
            "Request started",
            method=request.method,
            path=request.url.path,
            request_id=request_id,
        )

        response = await call_next(request)

        # Log response
        duration = time.time() - start_time
        logger.info(
            "Request completed",
            method=request.method,
            path=request.url.path,
            status_code=response.status_code,
            duration_ms=round(duration * 1000, 2),
            request_id=request_id,
        )

        response.headers["X-Request-ID"] = request_id
        response.headers["X-Response-Time"] = f"{duration:.3f}s"

        return response


class AuthMiddleware(BaseHTTPMiddleware):
    """Middleware for authentication via auth service."""

    def __init__(self, app, auth_service_url: str):
        super().__init__(app)
        self.auth_service_url = auth_service_url

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Skip auth for health endpoints
        if request.url.path in ["/health", "/ready", "/docs", "/redoc", "/openapi.json"]:
            return await call_next(request)

        auth_header = request.headers.get("Authorization")
        if not auth_header:
            return Response(
                content='{"error": "Authorization header required"}',
                status_code=401,
                media_type="application/json",
            )

        # Validate token with auth service
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.auth_service_url}/api/v1/me",
                    headers={"Authorization": auth_header},
                    timeout=5.0,
                )

                if response.status_code != 200:
                    return Response(
                        content='{"error": "Invalid token"}',
                        status_code=401,
                        media_type="application/json",
                    )

                # Store user info in request state
                user_data = response.json()
                request.state.user = user_data
                request.state.user_id = user_data.get("id")
                request.state.permissions = user_data.get("permissions", [])
                request.state.data_sources = user_data.get("data_sources", [])
                request.state.classification = user_data.get("classification", "unclassified")

        except httpx.RequestError as e:
            logger.error("Auth service error", error=str(e))
            return Response(
                content='{"error": "Authentication service unavailable"}',
                status_code=503,
                media_type="application/json",
            )

        return await call_next(request)
