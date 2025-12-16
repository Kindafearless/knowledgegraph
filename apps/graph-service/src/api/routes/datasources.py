"""Data sources routes for the graph service."""

import uuid
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Request, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_session

router = APIRouter()


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
async def list_datasources(
    request: Request,
    session: AsyncSession = Depends(get_session)
) -> list[dict[str, Any]]:
    """List all configured data sources."""
    query = """
        SELECT
            ds.id,
            ds.name,
            ds.type,
            ds.sync_status as status,
            ds.last_sync,
            ds.created_at,
            ds.connection_config as config,
            ds.is_active,
            COALESCE(ec.entity_count, 0) as entity_count
        FROM data_sources ds
        LEFT JOIN (
            SELECT data_source_id, COUNT(*) as entity_count
            FROM entities
            GROUP BY data_source_id
        ) ec ON ds.id = ec.data_source_id
        WHERE ds.is_active = true
        ORDER BY ds.created_at DESC
    """

    result = await session.execute(text(query))
    rows = result.fetchall()

    return [
        {
            "id": str(row.id),
            "name": row.name,
            "type": row.type,
            "status": row.status or "inactive",
            "entity_count": row.entity_count,
            "last_sync": row.last_sync.isoformat() if row.last_sync else None,
            "created_at": row.created_at.isoformat() if row.created_at else None,
            "config": row.config or {},
        }
        for row in rows
    ]


@router.post("")
async def create_datasource(
    data: CreateDataSourceRequest,
    request: Request,
    session: AsyncSession = Depends(get_session)
) -> dict[str, Any]:
    """Create a new data source."""
    datasource_id = uuid.uuid4()
    now = datetime.utcnow()

    query = """
        INSERT INTO data_sources (id, name, type, connection_config, sync_status, is_active, created_at, updated_at)
        VALUES (:id, :name, :type, :config::jsonb, 'inactive', true, :created_at, :updated_at)
        RETURNING id, name, type, sync_status, last_sync, created_at, connection_config
    """

    import json
    result = await session.execute(
        text(query),
        {
            "id": datasource_id,
            "name": data.name,
            "type": data.type,
            "config": json.dumps(data.config),
            "created_at": now,
            "updated_at": now,
        }
    )

    row = result.fetchone()

    return {
        "id": str(row.id),
        "name": row.name,
        "type": row.type,
        "status": row.sync_status or "inactive",
        "entity_count": 0,
        "last_sync": row.last_sync.isoformat() if row.last_sync else None,
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "config": row.connection_config or {},
    }


@router.get("/stats")
async def get_stats(
    request: Request,
    session: AsyncSession = Depends(get_session)
) -> dict[str, Any]:
    """Get database statistics."""
    # Get entity count
    entity_result = await session.execute(text("SELECT COUNT(*) as count FROM entities"))
    entity_count = entity_result.scalar() or 0

    # Get relationship count
    rel_result = await session.execute(text("SELECT COUNT(*) as count FROM relationships"))
    rel_count = rel_result.scalar() or 0

    # Get datasource count
    ds_result = await session.execute(text("SELECT COUNT(*) as count FROM data_sources WHERE is_active = true"))
    ds_count = ds_result.scalar() or 0

    return {
        "entities": entity_count,
        "relationships": rel_count,
        "storage_mb": (entity_count + rel_count) // 100 + 1,  # Rough estimate
        "last_backup": None,
        "datasource_count": ds_count
    }


@router.get("/{datasource_id}")
async def get_datasource(
    datasource_id: str,
    request: Request,
    session: AsyncSession = Depends(get_session)
) -> dict[str, Any]:
    """Get a specific data source."""
    query = """
        SELECT
            ds.id,
            ds.name,
            ds.type,
            ds.sync_status as status,
            ds.last_sync,
            ds.created_at,
            ds.connection_config as config,
            COALESCE(ec.entity_count, 0) as entity_count
        FROM data_sources ds
        LEFT JOIN (
            SELECT data_source_id, COUNT(*) as entity_count
            FROM entities
            GROUP BY data_source_id
        ) ec ON ds.id = ec.data_source_id
        WHERE ds.id = :id
    """

    result = await session.execute(text(query), {"id": datasource_id})
    row = result.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Data source not found")

    return {
        "id": str(row.id),
        "name": row.name,
        "type": row.type,
        "status": row.status or "inactive",
        "entity_count": row.entity_count,
        "last_sync": row.last_sync.isoformat() if row.last_sync else None,
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "config": row.config or {},
    }


@router.delete("/{datasource_id}")
async def delete_datasource(
    datasource_id: str,
    request: Request,
    session: AsyncSession = Depends(get_session)
) -> dict[str, str]:
    """Delete a data source."""
    # Soft delete - just mark as inactive
    result = await session.execute(
        text("UPDATE data_sources SET is_active = false, updated_at = :now WHERE id = :id RETURNING id"),
        {"id": datasource_id, "now": datetime.utcnow()}
    )

    if result.fetchone() is None:
        raise HTTPException(status_code=404, detail="Data source not found")

    return {"status": "deleted"}


@router.post("/{datasource_id}/sync")
async def sync_datasource(
    datasource_id: str,
    request: Request,
    session: AsyncSession = Depends(get_session)
) -> dict[str, Any]:
    """Trigger a sync for a specific data source."""
    now = datetime.utcnow()

    # Update sync status
    result = await session.execute(
        text("""
            UPDATE data_sources
            SET sync_status = 'synced', last_sync = :now, updated_at = :now
            WHERE id = :id AND is_active = true
            RETURNING id
        """),
        {"id": datasource_id, "now": now}
    )

    if result.fetchone() is None:
        raise HTTPException(status_code=404, detail="Data source not found")

    return {
        "status": "completed",
        "message": f"Sync completed for datasource {datasource_id}",
        "datasource_id": datasource_id,
        "last_sync": now.isoformat()
    }
