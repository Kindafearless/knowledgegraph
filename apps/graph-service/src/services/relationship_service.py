"""Relationship service for managing graph relationships."""

from datetime import datetime
from typing import Any
from uuid import UUID

import structlog
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.entity import Relationship, RelationshipCreate, RelationshipUpdate

logger = structlog.get_logger()


class RelationshipService:
    """Service for relationship operations."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def list_relationships(
        self,
        page: int = 1,
        page_size: int = 50,
        relationship_type: str | None = None,
        source_id: UUID | None = None,
        target_id: UUID | None = None,
        user_data_sources: list[str] | None = None,
        user_classification: str = "unclassified",
    ) -> list[Relationship]:
        """List relationships with pagination and filtering."""
        offset = (page - 1) * page_size

        query = """
            SELECT id, source_id, target_id, type, properties, weight,
                   data_source, classification, created_at, updated_at, created_by
            FROM relationships
            WHERE 1=1
        """
        params: dict[str, Any] = {"limit": page_size, "offset": offset}

        if relationship_type:
            query += " AND type = :relationship_type"
            params["relationship_type"] = relationship_type

        if source_id:
            query += " AND source_id = :source_id"
            params["source_id"] = source_id

        if target_id:
            query += " AND target_id = :target_id"
            params["target_id"] = target_id

        if user_data_sources:
            query += " AND (data_source IS NULL OR data_source = ANY(:user_sources))"
            params["user_sources"] = user_data_sources

        query += " AND classification <= :user_classification"
        params["user_classification"] = user_classification

        query += " ORDER BY created_at DESC LIMIT :limit OFFSET :offset"

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

    async def get_relationship(
        self,
        relationship_id: UUID,
        user_data_sources: list[str] | None = None,
        user_classification: str = "unclassified",
    ) -> Relationship | None:
        """Get a single relationship by ID."""
        query = """
            SELECT id, source_id, target_id, type, properties, weight,
                   data_source, classification, created_at, updated_at, created_by
            FROM relationships
            WHERE id = :relationship_id
        """
        params: dict[str, Any] = {"relationship_id": relationship_id}

        if user_data_sources:
            query += " AND (data_source IS NULL OR data_source = ANY(:user_sources))"
            params["user_sources"] = user_data_sources

        query += " AND classification <= :user_classification"
        params["user_classification"] = user_classification

        result = await self.session.execute(text(query), params)
        row = result.fetchone()

        if not row:
            return None

        return Relationship(
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

    async def create_relationship(
        self,
        relationship_data: RelationshipCreate,
        created_by: UUID,
    ) -> Relationship:
        """Create a new relationship."""
        relationship = Relationship(
            source_id=relationship_data.source_id,
            target_id=relationship_data.target_id,
            type=relationship_data.type,
            properties=relationship_data.properties,
            weight=relationship_data.weight,
            data_source=relationship_data.data_source,
            classification=relationship_data.classification,
            created_by=created_by,
        )

        query = """
            INSERT INTO relationships (id, source_id, target_id, type, properties, weight,
                                       data_source, classification, created_at, updated_at, created_by)
            VALUES (:id, :source_id, :target_id, :type, :properties::jsonb, :weight,
                    :data_source, :classification, :created_at, :updated_at, :created_by)
        """

        await self.session.execute(
            text(query),
            {
                "id": relationship.id,
                "source_id": relationship.source_id,
                "target_id": relationship.target_id,
                "type": relationship.type,
                "properties": relationship.properties,
                "weight": relationship.weight,
                "data_source": relationship.data_source,
                "classification": relationship.classification,
                "created_at": relationship.created_at,
                "updated_at": relationship.updated_at,
                "created_by": created_by,
            },
        )

        logger.info(
            "Relationship created",
            relationship_id=str(relationship.id),
            type=relationship.type,
        )
        return relationship

    async def update_relationship(
        self,
        relationship_id: UUID,
        relationship_data: RelationshipUpdate,
        user_data_sources: list[str] | None = None,
        user_classification: str = "unclassified",
    ) -> Relationship | None:
        """Update an existing relationship."""
        existing = await self.get_relationship(
            relationship_id, user_data_sources, user_classification
        )
        if not existing:
            return None

        updates = ["updated_at = :updated_at"]
        params: dict[str, Any] = {
            "relationship_id": relationship_id,
            "updated_at": datetime.utcnow(),
        }

        if relationship_data.type is not None:
            updates.append("type = :type")
            params["type"] = relationship_data.type

        if relationship_data.properties is not None:
            updates.append("properties = :properties::jsonb")
            params["properties"] = relationship_data.properties

        if relationship_data.weight is not None:
            updates.append("weight = :weight")
            params["weight"] = relationship_data.weight

        if relationship_data.classification is not None:
            updates.append("classification = :classification")
            params["classification"] = relationship_data.classification

        query = f"UPDATE relationships SET {', '.join(updates)} WHERE id = :relationship_id"
        await self.session.execute(text(query), params)

        logger.info("Relationship updated", relationship_id=str(relationship_id))
        return await self.get_relationship(
            relationship_id, user_data_sources, user_classification
        )

    async def delete_relationship(
        self,
        relationship_id: UUID,
        user_data_sources: list[str] | None = None,
        user_classification: str = "unclassified",
    ) -> bool:
        """Delete a relationship."""
        existing = await self.get_relationship(
            relationship_id, user_data_sources, user_classification
        )
        if not existing:
            return False

        await self.session.execute(
            text("DELETE FROM relationships WHERE id = :id"),
            {"id": relationship_id},
        )

        logger.info("Relationship deleted", relationship_id=str(relationship_id))
        return True
