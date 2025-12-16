"""Entity API routes."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_session
from src.models.entity import Entity, EntityCreate, EntityUpdate
from src.services.entity_service import EntityService
from src.services.permission_service import check_permission

router = APIRouter()


def get_entity_service(session: Annotated[AsyncSession, Depends(get_session)]) -> EntityService:
    """Dependency to get entity service."""
    return EntityService(session)


@router.get("", response_model=list[Entity])
async def list_entities(
    request: Request,
    service: Annotated[EntityService, Depends(get_entity_service)],
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    type: str | None = None,
    data_source: str | None = None,
    search: str | None = None,
) -> list[Entity]:
    """List entities with pagination and filtering."""
    check_permission(request, "entity:read")

    return await service.list_entities(
        page=page,
        page_size=page_size,
        entity_type=type,
        data_source=data_source,
        search=search,
        user_data_sources=request.state.data_sources,
        user_classification=request.state.classification,
    )


@router.get("/{entity_id}", response_model=Entity)
async def get_entity(
    request: Request,
    entity_id: UUID,
    service: Annotated[EntityService, Depends(get_entity_service)],
) -> Entity:
    """Get a specific entity by ID."""
    check_permission(request, "entity:read")

    entity = await service.get_entity(
        entity_id,
        user_data_sources=request.state.data_sources,
        user_classification=request.state.classification,
    )

    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found")

    return entity


@router.post("", response_model=Entity, status_code=201)
async def create_entity(
    request: Request,
    entity_data: EntityCreate,
    service: Annotated[EntityService, Depends(get_entity_service)],
) -> Entity:
    """Create a new entity."""
    check_permission(request, "graph:entity:create")

    return await service.create_entity(
        entity_data,
        created_by=UUID(request.state.user_id),
    )


@router.put("/{entity_id}", response_model=Entity)
async def update_entity(
    request: Request,
    entity_id: UUID,
    entity_data: EntityUpdate,
    service: Annotated[EntityService, Depends(get_entity_service)],
) -> Entity:
    """Update an existing entity."""
    check_permission(request, "graph:entity:update")

    entity = await service.update_entity(
        entity_id,
        entity_data,
        user_data_sources=request.state.data_sources,
        user_classification=request.state.classification,
    )

    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found")

    return entity


@router.delete("/{entity_id}", status_code=204)
async def delete_entity(
    request: Request,
    entity_id: UUID,
    service: Annotated[EntityService, Depends(get_entity_service)],
) -> None:
    """Delete an entity."""
    check_permission(request, "graph:entity:delete")

    deleted = await service.delete_entity(
        entity_id,
        user_data_sources=request.state.data_sources,
        user_classification=request.state.classification,
    )

    if not deleted:
        raise HTTPException(status_code=404, detail="Entity not found")


@router.get("/{entity_id}/relationships", response_model=list)
async def get_entity_relationships(
    request: Request,
    entity_id: UUID,
    service: Annotated[EntityService, Depends(get_entity_service)],
    direction: str = Query("both", regex="^(incoming|outgoing|both)$"),
) -> list:
    """Get relationships for an entity."""
    check_permission(request, "entity:read")

    return await service.get_entity_relationships(
        entity_id,
        direction=direction,
        user_data_sources=request.state.data_sources,
        user_classification=request.state.classification,
    )


@router.get("/by-ccv-term/{term_id}")
async def get_entities_by_ccv_term(
    request: Request,
    term_id: UUID,
    service: Annotated[EntityService, Depends(get_entity_service)],
    mapping_type: str | None = Query(None, regex="^(exact|broad|narrow|related)$"),
    min_confidence: float = Query(0.0, ge=0.0, le=1.0),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
) -> dict:
    """Get all entities mapped to a CCV term.

    Args:
        term_id: CCV term UUID
        mapping_type: Filter by mapping type (exact, broad, narrow, related)
        min_confidence: Minimum confidence score for mappings
        page, page_size: Pagination

    Returns:
        Entities linked to this CCV term with their mapping details
    """
    check_permission(request, "entity:read")

    entities = await service.get_entities_by_ccv_term(
        term_id,
        mapping_type=mapping_type,
        min_confidence=min_confidence,
        page=page,
        page_size=page_size,
    )
    count = await service.count_entities_by_ccv_term(term_id)

    return {
        "entities": entities,
        "total": count,
        "page": page,
        "page_size": page_size,
    }
