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

        # Build query with security filters
        query = """
            SELECT id, name, type, properties, data_source, classification,
                   created_at, updated_at, created_by
            FROM entities
            WHERE 1=1
        """
        params: dict[str, Any] = {"limit": page_size, "offset": offset}

        # Apply type filter
        if entity_type:
            query += " AND type = :entity_type"
            params["entity_type"] = entity_type

        # Apply data source filter
        if data_source:
            query += " AND data_source = :data_source"
            params["data_source"] = data_source

        # Apply user data source restrictions
        if user_data_sources:
            query += " AND (data_source IS NULL OR data_source = ANY(:user_sources))"
            params["user_sources"] = user_data_sources

        # Apply classification filter
        query += " AND classification <= :user_classification"
        params["user_classification"] = user_classification

        # Apply search filter
        if search:
            query += " AND (name ILIKE :search OR properties::text ILIKE :search)"
            params["search"] = f"%{search}%"

        query += " ORDER BY created_at DESC LIMIT :limit OFFSET :offset"

        result = await self.session.execute(text(query), params)
        rows = result.fetchall()

        return [
            Entity(
                id=row.id,
                name=row.name,
                type=row.type,
                properties=row.properties or {},
                data_source=row.data_source,
                classification=row.classification,
                created_at=row.created_at,
                updated_at=row.updated_at,
                created_by=row.created_by,
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
            SELECT id, name, type, properties, data_source, classification,
                   created_at, updated_at, created_by
            FROM entities
            WHERE id = :entity_id
        """
        params: dict[str, Any] = {"entity_id": entity_id}

        # Apply security filters
        if user_data_sources:
            query += " AND (data_source IS NULL OR data_source = ANY(:user_sources))"
            params["user_sources"] = user_data_sources

        query += " AND classification <= :user_classification"
        params["user_classification"] = user_classification

        result = await self.session.execute(text(query), params)
        row = result.fetchone()

        if not row:
            return None

        return Entity(
            id=row.id,
            name=row.name,
            type=row.type,
            properties=row.properties or {},
            data_source=row.data_source,
            classification=row.classification,
            created_at=row.created_at,
            updated_at=row.updated_at,
            created_by=row.created_by,
        )

    async def create_entity(
        self,
        entity_data: EntityCreate,
        created_by: UUID,
    ) -> Entity:
        """Create a new entity."""
        entity = Entity(
            name=entity_data.name,
            type=entity_data.type,
            properties=entity_data.properties,
            data_source=entity_data.data_source,
            classification=entity_data.classification,
            created_by=created_by,
        )

        query = """
            INSERT INTO entities (id, name, type, properties, data_source, classification,
                                  created_at, updated_at, created_by)
            VALUES (:id, :name, :type, :properties::jsonb, :data_source, :classification,
                    :created_at, :updated_at, :created_by)
        """

        await self.session.execute(
            text(query),
            {
                "id": entity.id,
                "name": entity.name,
                "type": entity.type.value,
                "properties": entity.properties,
                "data_source": entity.data_source,
                "classification": entity.classification,
                "created_at": entity.created_at,
                "updated_at": entity.updated_at,
                "created_by": created_by,
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
            updates.append("properties = :properties::jsonb")
            params["properties"] = entity_data.properties

        if entity_data.classification is not None:
            updates.append("classification = :classification")
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
            text("DELETE FROM relationships WHERE source_id = :id OR target_id = :id"),
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
            condition = "source_id = :entity_id"
        elif direction == "incoming":
            condition = "target_id = :entity_id"
        else:  # both
            condition = "(source_id = :entity_id OR target_id = :entity_id)"

        query = f"""
            SELECT id, source_id, target_id, type, properties, weight,
                   data_source, classification, created_at, updated_at, created_by
            FROM relationships
            WHERE {condition}
        """
        params: dict[str, Any] = {"entity_id": entity_id}

        if user_data_sources:
            query += " AND (data_source IS NULL OR data_source = ANY(:user_sources))"
            params["user_sources"] = user_data_sources

        query += " AND classification <= :user_classification"
        params["user_classification"] = user_classification

        result = await self.session.execute(text(query), params)
        rows = result.fetchall()

        return [
            Relationship(
                id=row.id,
                source_id=row.source_id,
                target_id=row.target_id,
                type=row.type,
                properties=row.properties or {},
                weight=row.weight,
                data_source=row.data_source,
                classification=row.classification,
                created_at=row.created_at,
                updated_at=row.updated_at,
                created_by=row.created_by,
            )
            for row in rows
        ]
