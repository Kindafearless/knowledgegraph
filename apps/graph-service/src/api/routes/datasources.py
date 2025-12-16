"""Data sources routes for the graph service."""

from typing import Any
from fastapi import APIRouter, Request

router = APIRouter()


@router.get("")
async def list_datasources(request: Request) -> list[dict[str, Any]]:
    """
    List all configured data sources.

    This is a placeholder endpoint. In a full implementation, this would
    return data sources configured for importing data into the knowledge graph.
    """
    # Return empty list for now - data sources feature to be implemented
    return []


@router.post("/{datasource_id}/sync")
async def sync_datasource(datasource_id: str, request: Request) -> dict[str, Any]:
    """
    Trigger a sync for a specific data source.

    This is a placeholder endpoint.
    """
    return {
        "status": "pending",
        "message": f"Sync triggered for datasource {datasource_id}",
        "datasource_id": datasource_id
    }


@router.get("/stats")
async def get_stats(request: Request) -> dict[str, Any]:
    """
    Get database statistics.

    This is a placeholder that returns mock stats.
    In a full implementation, this would query actual database metrics.
    """
    return {
        "entities": 0,
        "relationships": 0,
        "storage_mb": 0,
        "last_backup": None
    }
