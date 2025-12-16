"""Entity and relationship models."""

from datetime import datetime
from enum import Enum
from typing import Any
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


class EntityType(str, Enum):
    """Types of entities in the knowledge graph."""

    ENTITY = "entity"
    CONCEPT = "concept"
    DOCUMENT = "document"
    PERSON = "person"
    ORGANIZATION = "organization"


class Entity(BaseModel):
    """Knowledge graph entity."""

    id: UUID = Field(default_factory=uuid4)
    name: str
    type: str  # Dynamic type from entity_types table
    properties: dict[str, Any] = Field(default_factory=dict)
    data_source: str | None = None
    classification: str = "unclassified"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: UUID | None = None


class EntityCreate(BaseModel):
    """Schema for creating an entity."""

    name: str
    type: str  # Dynamic type from entity_types table
    properties: dict[str, Any] = Field(default_factory=dict)
    data_source: str | None = None
    classification: str = "unclassified"


class EntityUpdate(BaseModel):
    """Schema for updating an entity."""

    name: str | None = None
    properties: dict[str, Any] | None = None
    classification: str | None = None


class Relationship(BaseModel):
    """Relationship between entities."""

    id: UUID = Field(default_factory=uuid4)
    source_id: UUID
    target_id: UUID
    type: str
    properties: dict[str, Any] = Field(default_factory=dict)
    weight: float = 1.0
    data_source: str | None = None
    classification: str = "unclassified"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: UUID | None = None


class RelationshipCreate(BaseModel):
    """Schema for creating a relationship."""

    source_id: UUID
    target_id: UUID
    type: str
    properties: dict[str, Any] = Field(default_factory=dict)
    weight: float = 1.0
    data_source: str | None = None
    classification: str = "unclassified"


class RelationshipUpdate(BaseModel):
    """Schema for updating a relationship."""

    type: str | None = None
    properties: dict[str, Any] | None = None
    weight: float | None = None
    classification: str | None = None


class GraphSubset(BaseModel):
    """A subset of the graph for visualization."""

    nodes: list[Entity]
    edges: list[Relationship]
    total_nodes: int
    total_edges: int
