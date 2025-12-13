"""Relationship API routes."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_session
from src.models.entity import Relationship, RelationshipCreate, RelationshipUpdate
from src.services.relationship_service import RelationshipService
from src.services.permission_service import check_permission

router = APIRouter()


def get_relationship_service(
    session: Annotated[AsyncSession, Depends(get_session)]
) -> RelationshipService:
    """Dependency to get relationship service."""
    return RelationshipService(session)


@router.get("", response_model=list[Relationship])
async def list_relationships(
    request: Request,
    service: Annotated[RelationshipService, Depends(get_relationship_service)],
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    type: str | None = None,
    source_id: UUID | None = None,
    target_id: UUID | None = None,
) -> list[Relationship]:
    """List relationships with pagination and filtering."""
    check_permission(request, "graph:relationship:read")

    return await service.list_relationships(
        page=page,
        page_size=page_size,
        relationship_type=type,
        source_id=source_id,
        target_id=target_id,
        user_data_sources=request.state.data_sources,
        user_classification=request.state.classification,
    )


@router.get("/{relationship_id}", response_model=Relationship)
async def get_relationship(
    request: Request,
    relationship_id: UUID,
    service: Annotated[RelationshipService, Depends(get_relationship_service)],
) -> Relationship:
    """Get a specific relationship by ID."""
    check_permission(request, "graph:relationship:read")

    relationship = await service.get_relationship(
        relationship_id,
        user_data_sources=request.state.data_sources,
        user_classification=request.state.classification,
    )

    if not relationship:
        raise HTTPException(status_code=404, detail="Relationship not found")

    return relationship


@router.post("", response_model=Relationship, status_code=201)
async def create_relationship(
    request: Request,
    relationship_data: RelationshipCreate,
    service: Annotated[RelationshipService, Depends(get_relationship_service)],
) -> Relationship:
    """Create a new relationship."""
    check_permission(request, "graph:relationship:create")

    return await service.create_relationship(
        relationship_data,
        created_by=UUID(request.state.user_id),
    )


@router.put("/{relationship_id}", response_model=Relationship)
async def update_relationship(
    request: Request,
    relationship_id: UUID,
    relationship_data: RelationshipUpdate,
    service: Annotated[RelationshipService, Depends(get_relationship_service)],
) -> Relationship:
    """Update an existing relationship."""
    check_permission(request, "graph:relationship:update")

    relationship = await service.update_relationship(
        relationship_id,
        relationship_data,
        user_data_sources=request.state.data_sources,
        user_classification=request.state.classification,
    )

    if not relationship:
        raise HTTPException(status_code=404, detail="Relationship not found")

    return relationship


@router.delete("/{relationship_id}", status_code=204)
async def delete_relationship(
    request: Request,
    relationship_id: UUID,
    service: Annotated[RelationshipService, Depends(get_relationship_service)],
) -> None:
    """Delete a relationship."""
    check_permission(request, "graph:relationship:delete")

    deleted = await service.delete_relationship(
        relationship_id,
        user_data_sources=request.state.data_sources,
        user_classification=request.state.classification,
    )

    if not deleted:
        raise HTTPException(status_code=404, detail="Relationship not found")
