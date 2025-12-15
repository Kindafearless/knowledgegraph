"""Event handling for real-time updates and inter-service communication."""

import asyncio
import json
from typing import Any, Callable
from uuid import UUID

import redis.asyncio as redis
import structlog

from src.core.config import settings

logger = structlog.get_logger()

# Global Redis client
redis_client: redis.Redis | None = None
pubsub: redis.client.PubSub | None = None

# Event handlers registry
_event_handlers: dict[str, list[Callable]] = {}

# Channel names
CHANNEL_CCV_UPDATES = "ccv:updates"
CHANNEL_GRAPH_EVENTS = "graph:events"
CHANNEL_SUGGESTIONS = "ccv:suggestions"


class UUIDEncoder(json.JSONEncoder):
    """JSON encoder that handles UUIDs."""
    def default(self, obj: Any) -> Any:
        if isinstance(obj, UUID):
            return str(obj)
        return super().default(obj)


async def init_event_handlers() -> None:
    """Initialize Redis connection and event handlers."""
    global redis_client, pubsub

    redis_client = redis.from_url(settings.redis_url)
    pubsub = redis_client.pubsub()

    # Subscribe to graph events (for auto-suggestions)
    await pubsub.subscribe(CHANNEL_GRAPH_EVENTS)

    # Start listener task
    asyncio.create_task(_listen_for_events())

    logger.info("Event handlers initialized")


async def close_event_handlers() -> None:
    """Close Redis connections."""
    global redis_client, pubsub

    if pubsub:
        await pubsub.unsubscribe()
        await pubsub.close()

    if redis_client:
        await redis_client.close()

    logger.info("Event handlers closed")


async def _listen_for_events() -> None:
    """Listen for events from Redis pubsub."""
    if not pubsub:
        return

    try:
        async for message in pubsub.listen():
            if message["type"] == "message":
                channel = message["channel"].decode()
                data = json.loads(message["data"])

                # Dispatch to handlers
                handlers = _event_handlers.get(channel, [])
                for handler in handlers:
                    try:
                        await handler(data)
                    except Exception as e:
                        logger.error("Event handler error", error=str(e), channel=channel)
    except asyncio.CancelledError:
        pass
    except Exception as e:
        logger.error("Event listener error", error=str(e))


def on_event(channel: str) -> Callable:
    """Decorator to register an event handler."""
    def decorator(func: Callable) -> Callable:
        if channel not in _event_handlers:
            _event_handlers[channel] = []
        _event_handlers[channel].append(func)
        return func
    return decorator


async def publish_event(channel: str, event_type: str, data: dict[str, Any]) -> None:
    """Publish an event to Redis."""
    if not redis_client:
        logger.warning("Redis not connected, event not published")
        return

    event = {
        "type": event_type,
        "data": data,
    }

    await redis_client.publish(channel, json.dumps(event, cls=UUIDEncoder))
    logger.debug("Event published", channel=channel, event_type=event_type)


async def publish_ccv_update(event_type: str, data: dict[str, Any]) -> None:
    """Publish a CCV update event."""
    await publish_event(CHANNEL_CCV_UPDATES, event_type, data)


async def publish_suggestion(suggestion_data: dict[str, Any]) -> None:
    """Publish a new suggestion event."""
    await publish_event(CHANNEL_SUGGESTIONS, "new_suggestion", suggestion_data)


# =============================================================================
# Graph Event Handlers (for auto-suggestions)
# =============================================================================

@on_event(CHANNEL_GRAPH_EVENTS)
async def handle_graph_entity_created(data: dict[str, Any]) -> None:
    """Handle new entity creation - trigger CCV suggestions."""
    if data.get("type") != "entity_created":
        return

    entity = data.get("entity", {})
    logger.info("New entity detected, queueing for CCV analysis", entity_id=entity.get("id"))

    # Queue for suggestion generation (handled by background worker)
    if redis_client:
        await redis_client.lpush(
            "ccv:suggestion_queue",
            json.dumps({"entity": entity}, cls=UUIDEncoder)
        )


@on_event(CHANNEL_GRAPH_EVENTS)
async def handle_graph_data_ingested(data: dict[str, Any]) -> None:
    """Handle data ingestion - batch analyze for CCV."""
    if data.get("type") != "data_ingested":
        return

    batch_id = data.get("batch_id")
    entity_count = data.get("entity_count", 0)

    logger.info(
        "Data ingestion completed, triggering CCV analysis",
        batch_id=batch_id,
        entity_count=entity_count
    )

    # Queue batch for analysis
    if redis_client:
        await redis_client.lpush(
            "ccv:batch_analysis_queue",
            json.dumps(data, cls=UUIDEncoder)
        )
