"""Entity service for managing graph entities."""

from datetime import datetime
from typing import Any
from uuid import UUID

import structlog
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.entity import Entity, EntityCreate, EntityUpdate, Relationship

logger = structlog.get_logger()


class EntityService:
    """Service for entity operations."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def list_entities(
        self,
        page: int = 1,
        page_size: int = 50,
        entity_type: str | None = None,
        data_source: str | None = None,
        search: str | None = None,
        user_data_sources: list[str] | None = None,
        user_classification: str = "unclassified",
    ) -> list[Entity]:
        """List entities with pagination and filtering."""
        offset = (page - 1) * page_size

        # Build query with joins to get type name and data source name
        query = """
            SELECT
                e.id,
                e.name,
                et.name as type,
                e.properties,
                ds.name as data_source,
                e.classification_level as classification,
                e.created_at,
                e.updated_at
            FROM entities e
            LEFT JOIN entity_types et ON e.type_id = et.id
            LEFT JOIN data_sources ds ON e.data_source_id = ds.id
            WHERE 1=1
        """
        params: dict[str, Any] = {"limit": page_size, "offset": offset}

        # Apply type filter
        if entity_type:
            query += " AND et.name = :entity_type"
            params["entity_type"] = entity_type

        # Apply data source filter
        if data_source:
            query += " AND ds.name = :data_source"
            params["data_source"] = data_source

        # Apply search filter
        if search:
            query += " AND (e.name ILIKE :search OR e.properties::text ILIKE :search)"
            params["search"] = f"%{search}%"

        query += " ORDER BY e.created_at DESC LIMIT :limit OFFSET :offset"

        result = await self.session.execute(text(query), params)
        rows = result.fetchall()

        return [
            Entity(
                id=row.id,
                name=row.name,
                type=row.type or "Unknown",
                properties=row.properties or {},
                data_source=row.data_source,
                classification=row.classification or "unclassified",
                created_at=row.created_at,
                updated_at=row.updated_at,
            )
            for row in rows
        ]

    async def get_entity(
        self,
        entity_id: UUID,
        user_data_sources: list[str] | None = None,
        user_classification: str = "unclassified",
    ) -> Entity | None:
        """Get a single entity by ID."""
        query = """
            SELECT
                e.id,
                e.name,
                et.name as type,
                e.properties,
                ds.name as data_source,
                e.classification_level as classification,
                e.created_at,
                e.updated_at
            FROM entities e
            LEFT JOIN entity_types et ON e.type_id = et.id
            LEFT JOIN data_sources ds ON e.data_source_id = ds.id
            WHERE e.id = :entity_id
        """
        params: dict[str, Any] = {"entity_id": entity_id}

        result = await self.session.execute(text(query), params)
        row = result.fetchone()

        if not row:
            return None

        return Entity(
            id=row.id,
            name=row.name,
            type=row.type or "Unknown",
            properties=row.properties or {},
            data_source=row.data_source,
            classification=row.classification or "unclassified",
            created_at=row.created_at,
            updated_at=row.updated_at,
        )

    async def create_entity(
        self,
        entity_data: EntityCreate,
        created_by: UUID,
    ) -> Entity:
        """Create a new entity."""
        # Look up entity type id
        type_result = await self.session.execute(
            text("SELECT id FROM entity_types WHERE name = :type_name"),
            {"type_name": entity_data.type}
        )
        type_row = type_result.fetchone()
        type_id = type_row.id if type_row else None

        # Look up data source id if provided
        data_source_id = None
        if entity_data.data_source:
            ds_result = await self.session.execute(
                text("SELECT id FROM data_sources WHERE name = :ds_name"),
                {"ds_name": entity_data.data_source}
            )
            ds_row = ds_result.fetchone()
            data_source_id = ds_row.id if ds_row else None

        entity = Entity(
            name=entity_data.name,
            type=entity_data.type,
            properties=entity_data.properties,
            data_source=entity_data.data_source,
            classification=entity_data.classification,
            created_by=created_by,
        )

        import json
        query = """
            INSERT INTO entities (id, name, type_id, properties, data_source_id, classification_level,
                                  created_at, updated_at)
            VALUES (:id, :name, :type_id, :properties::jsonb, :data_source_id, :classification,
                    :created_at, :updated_at)
        """

        await self.session.execute(
            text(query),
            {
                "id": entity.id,
                "name": entity.name,
                "type_id": type_id,
                "properties": json.dumps(entity.properties) if entity.properties else "{}",
                "data_source_id": data_source_id,
                "classification": entity.classification,
                "created_at": entity.created_at,
                "updated_at": entity.updated_at,
            },
        )

        logger.info("Entity created", entity_id=str(entity.id), name=entity.name)
        return entity

    async def update_entity(
        self,
        entity_id: UUID,
        entity_data: EntityUpdate,
        user_data_sources: list[str] | None = None,
        user_classification: str = "unclassified",
    ) -> Entity | None:
        """Update an existing entity."""
        # First check if entity exists and user has access
        existing = await self.get_entity(entity_id, user_data_sources, user_classification)
        if not existing:
            return None

        # Build update query
        updates = ["updated_at = :updated_at"]
        params: dict[str, Any] = {
            "entity_id": entity_id,
            "updated_at": datetime.utcnow(),
        }

        if entity_data.name is not None:
            updates.append("name = :name")
            params["name"] = entity_data.name

        if entity_data.properties is not None:
            import json
            updates.append("properties = :properties::jsonb")
            params["properties"] = json.dumps(entity_data.properties)

        if entity_data.classification is not None:
            updates.append("classification_level = :classification")
            params["classification"] = entity_data.classification

        query = f"UPDATE entities SET {', '.join(updates)} WHERE id = :entity_id"
        await self.session.execute(text(query), params)

        logger.info("Entity updated", entity_id=str(entity_id))
        return await self.get_entity(entity_id, user_data_sources, user_classification)

    async def delete_entity(
        self,
        entity_id: UUID,
        user_data_sources: list[str] | None = None,
        user_classification: str = "unclassified",
    ) -> bool:
        """Delete an entity."""
        # First check if entity exists and user has access
        existing = await self.get_entity(entity_id, user_data_sources, user_classification)
        if not existing:
            return False

        # Delete related relationships first
        await self.session.execute(
            text("DELETE FROM relationships WHERE source_entity_id = :id OR target_entity_id = :id"),
            {"id": entity_id},
        )

        # Delete entity
        await self.session.execute(
            text("DELETE FROM entities WHERE id = :id"),
            {"id": entity_id},
        )

        logger.info("Entity deleted", entity_id=str(entity_id))
        return True

    async def get_entity_relationships(
        self,
        entity_id: UUID,
        direction: str = "both",
        user_data_sources: list[str] | None = None,
        user_classification: str = "unclassified",
    ) -> list[Relationship]:
        """Get relationships for an entity."""
        if direction == "outgoing":
            condition = "r.source_entity_id = :entity_id"
        elif direction == "incoming":
            condition = "r.target_entity_id = :entity_id"
        else:  # both
            condition = "(r.source_entity_id = :entity_id OR r.target_entity_id = :entity_id)"

        query = f"""
            SELECT
                r.id,
                r.source_entity_id as source_id,
                r.target_entity_id as target_id,
                rt.name as type,
                r.properties,
                r.confidence as weight,
                ds.name as data_source,
                'unclassified' as classification,
                r.created_at,
                r.updated_at,
                NULL as created_by
            FROM relationships r
            LEFT JOIN relationship_types rt ON r.type_id = rt.id
            LEFT JOIN data_sources ds ON r.data_source_id = ds.id
            WHERE {condition}
        """
        params: dict[str, Any] = {"entity_id": entity_id}

        result = await self.session.execute(text(query), params)
        rows = result.fetchall()

        return [
            Relationship(
                id=row.id,
                source_id=row.source_id,
                target_id=row.target_id,
                type=row.type or "RELATED_TO",
                properties=row.properties or {},
                weight=row.weight or 1.0,
                data_source=row.data_source,
                classification=row.classification,
                created_at=row.created_at,
                updated_at=row.updated_at,
                created_by=row.created_by,
            )
            for row in rows
        ]
