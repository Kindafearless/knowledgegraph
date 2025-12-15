"""WebSocket endpoints for real-time CCV updates."""

import asyncio
import json
from typing import Set
from uuid import UUID

import structlog
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from redis.asyncio import Redis

from src.core.config import settings
from src.core.events import CHANNEL_CCV_UPDATES, CHANNEL_SUGGESTIONS

logger = structlog.get_logger()
router = APIRouter()

# Track active connections
active_connections: Set[WebSocket] = set()


class ConnectionManager:
    """Manage WebSocket connections."""

    def __init__(self):
        self.connections: dict[str, Set[WebSocket]] = {
            "all": set(),
            "suggestions": set(),
        }
        self._redis: Redis | None = None
        self._listener_task: asyncio.Task | None = None

    async def connect(self, websocket: WebSocket, channel: str = "all"):
        """Accept and register a new connection."""
        await websocket.accept()
        self.connections[channel].add(websocket)
        self.connections["all"].add(websocket)

        # Start Redis listener if not already running
        if self._listener_task is None or self._listener_task.done():
            self._listener_task = asyncio.create_task(self._redis_listener())

        logger.info("WebSocket connected", channel=channel)

    def disconnect(self, websocket: WebSocket):
        """Unregister a connection."""
        for channel in self.connections.values():
            channel.discard(websocket)
        logger.info("WebSocket disconnected")

    async def broadcast(self, message: dict, channel: str = "all"):
        """Broadcast a message to all connections in a channel."""
        connections = self.connections.get(channel, set())
        dead_connections = set()

        for connection in connections:
            try:
                await connection.send_json(message)
            except Exception:
                dead_connections.add(connection)

        # Clean up dead connections
        for conn in dead_connections:
            self.disconnect(conn)

    async def send_personal(self, websocket: WebSocket, message: dict):
        """Send a message to a specific connection."""
        try:
            await websocket.send_json(message)
        except Exception:
            self.disconnect(websocket)

    async def _redis_listener(self):
        """Listen for Redis pub/sub messages and broadcast to WebSockets."""
        try:
            self._redis = Redis.from_url(settings.redis_url)
            pubsub = self._redis.pubsub()
            await pubsub.subscribe(CHANNEL_CCV_UPDATES, CHANNEL_SUGGESTIONS)

            async for message in pubsub.listen():
                if message["type"] == "message":
                    channel = message["channel"].decode()
                    data = json.loads(message["data"])

                    # Broadcast to appropriate WebSocket channel
                    if channel == CHANNEL_SUGGESTIONS:
                        await self.broadcast(data, "suggestions")
                    await self.broadcast(data, "all")

        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error("Redis listener error", error=str(e))
        finally:
            if self._redis:
                await self._redis.close()


manager = ConnectionManager()


@router.websocket("/updates")
async def websocket_updates(
    websocket: WebSocket,
    token: str = Query(None),  # For authentication
):
    """WebSocket endpoint for all CCV updates."""
    # TODO: Validate token
    await manager.connect(websocket, "all")

    try:
        # Send initial connection confirmation
        await manager.send_personal(websocket, {
            "type": "connected",
            "message": "Connected to CCV updates",
        })

        # Keep connection alive and handle incoming messages
        while True:
            try:
                data = await asyncio.wait_for(
                    websocket.receive_json(),
                    timeout=30.0
                )

                # Handle ping/pong for keepalive
                if data.get("type") == "ping":
                    await manager.send_personal(websocket, {"type": "pong"})

                # Handle subscription changes
                elif data.get("type") == "subscribe":
                    channel = data.get("channel", "all")
                    manager.connections.setdefault(channel, set()).add(websocket)
                    await manager.send_personal(websocket, {
                        "type": "subscribed",
                        "channel": channel,
                    })

            except asyncio.TimeoutError:
                # Send keepalive ping
                await manager.send_personal(websocket, {"type": "ping"})

    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error("WebSocket error", error=str(e))
        manager.disconnect(websocket)


@router.websocket("/suggestions")
async def websocket_suggestions(
    websocket: WebSocket,
    token: str = Query(None),
):
    """WebSocket endpoint for suggestion updates only."""
    await manager.connect(websocket, "suggestions")

    try:
        await manager.send_personal(websocket, {
            "type": "connected",
            "message": "Connected to suggestion updates",
        })

        while True:
            try:
                data = await asyncio.wait_for(
                    websocket.receive_json(),
                    timeout=30.0
                )

                if data.get("type") == "ping":
                    await manager.send_personal(websocket, {"type": "pong"})

            except asyncio.TimeoutError:
                await manager.send_personal(websocket, {"type": "ping"})

    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error("WebSocket error", error=str(e))
        manager.disconnect(websocket)


@router.websocket("/term/{term_id}")
async def websocket_term_updates(
    websocket: WebSocket,
    term_id: UUID,
    token: str = Query(None),
):
    """WebSocket endpoint for updates to a specific term."""
    channel = f"term:{term_id}"
    await manager.connect(websocket, channel)

    try:
        await manager.send_personal(websocket, {
            "type": "connected",
            "message": f"Connected to updates for term {term_id}",
        })

        while True:
            try:
                data = await asyncio.wait_for(
                    websocket.receive_json(),
                    timeout=30.0
                )

                if data.get("type") == "ping":
                    await manager.send_personal(websocket, {"type": "pong"})

            except asyncio.TimeoutError:
                await manager.send_personal(websocket, {"type": "ping"})

    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error("WebSocket error", error=str(e))
        manager.disconnect(websocket)
