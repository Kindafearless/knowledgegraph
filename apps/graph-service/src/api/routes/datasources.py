"""Data sources routes for the graph service."""

import uuid
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel

router = APIRouter()

# In-memory storage for data sources (in production, use a database)
_datasources: dict[str, dict[str, Any]] = {}


class CreateDataSourceRequest(BaseModel):
    name: str
    type: str
    config: dict[str, Any] = {}


class DataSourceResponse(BaseModel):
    id: str
    name: str
    type: str
    status: str
    entity_count: int
    last_sync: str | None
    created_at: str
    config: dict[str, Any]


@router.get("")
async def list_datasources(request: Request) -> list[dict[str, Any]]:
    """List all configured data sources."""
    return list(_datasources.values())


@router.post("")
async def create_datasource(data: CreateDataSourceRequest, request: Request) -> dict[str, Any]:
    """Create a new data source."""
    datasource_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat() + "Z"

    datasource = {
        "id": datasource_id,
        "name": data.name,
        "type": data.type,
        "status": "inactive",
        "entity_count": 0,
        "last_sync": None,
        "created_at": now,
        "config": data.config,
    }

    _datasources[datasource_id] = datasource
    return datasource


@router.get("/{datasource_id}")
async def get_datasource(datasource_id: str, request: Request) -> dict[str, Any]:
    """Get a specific data source."""
    if datasource_id not in _datasources:
        raise HTTPException(status_code=404, detail="Data source not found")
    return _datasources[datasource_id]


@router.delete("/{datasource_id}")
async def delete_datasource(datasource_id: str, request: Request) -> dict[str, str]:
    """Delete a data source."""
    if datasource_id not in _datasources:
        raise HTTPException(status_code=404, detail="Data source not found")
    del _datasources[datasource_id]
    return {"status": "deleted"}


@router.post("/{datasource_id}/sync")
async def sync_datasource(datasource_id: str, request: Request) -> dict[str, Any]:
    """Trigger a sync for a specific data source."""
    if datasource_id not in _datasources:
        raise HTTPException(status_code=404, detail="Data source not found")

    # Update status to syncing
    _datasources[datasource_id]["status"] = "syncing"

    # In a real implementation, this would trigger an async sync job
    # For now, just mark it as active with a timestamp
    now = datetime.utcnow().isoformat() + "Z"
    _datasources[datasource_id]["status"] = "active"
    _datasources[datasource_id]["last_sync"] = now

    return {
        "status": "completed",
        "message": f"Sync completed for datasource {datasource_id}",
        "datasource_id": datasource_id,
        "last_sync": now
    }


@router.get("/stats")
async def get_stats(request: Request) -> dict[str, Any]:
    """Get database statistics."""
    total_entities = sum(ds.get("entity_count", 0) for ds in _datasources.values())

    return {
        "entities": total_entities,
        "relationships": 0,
        "storage_mb": len(_datasources) * 10,  # Mock value
        "last_backup": None,
        "datasource_count": len(_datasources)
    }
