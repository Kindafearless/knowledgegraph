"""Term API routes."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_session
from src.models.ccv import (
    CCVTerm,
    CCVSynonym,
    TermCreate,
    TermUpdate,
    TermStatus,
    TermWithDetails,
    TermSearchResult,
    SynonymCreate,
)
from src.services.term_service import TermService

router = APIRouter()


def get_term_service(session: Annotated[AsyncSession, Depends(get_session)]) -> TermService:
    """Dependency to get term service."""
    return TermService(session)


@router.get("", response_model=list[CCVTerm])
async def list_terms(
    service: Annotated[TermService, Depends(get_term_service)],
    domain: str | None = None,
    status: TermStatus | None = None,
    parent_id: UUID | None = None,
    include_children: bool = False,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
) -> list[CCVTerm]:
    """List CCV terms with filtering."""
    return await service.list_terms(
        domain=domain,
        status=status,
        parent_id=parent_id,
        page=page,
        page_size=page_size,
    )


@router.get("/search", response_model=list[TermSearchResult])
async def search_terms(
    service: Annotated[TermService, Depends(get_term_service)],
    q: str = Query(..., min_length=1),
    domain: str | None = None,
    limit: int = Query(20, ge=1, le=100),
) -> list[TermSearchResult]:
    """Search for terms by name, synonym, or definition."""
    return await service.search_terms(query=q, domain=domain, limit=limit)


@router.get("/similar")
async def find_similar_terms(
    service: Annotated[TermService, Depends(get_term_service)],
    q: str = Query(..., min_length=2),
    threshold: float = Query(0.3, ge=0.0, le=1.0),
    limit: int = Query(5, ge=1, le=20),
    exclude_id: UUID | None = None,
) -> list[dict]:
    """Find terms similar to the given text for collision detection.

    Returns potential matches using fuzzy text matching. Use this to warn users
    about potential duplicates when creating or updating terms.

    - threshold: Minimum similarity score (0-1, default 0.3)
    - exclude_id: Term ID to exclude from results (useful when editing)
    """
    return await service.find_similar_terms(
        search_text=q,
        threshold=threshold,
        limit=limit,
        exclude_id=exclude_id,
    )


@router.get("/{term_id}", response_model=TermWithDetails)
async def get_term(
    term_id: UUID,
    service: Annotated[TermService, Depends(get_term_service)],
) -> TermWithDetails:
    """Get a term with all details (synonyms, children, mappings)."""
    term = await service.get_term_with_details(term_id)
    if not term:
        raise HTTPException(status_code=404, detail="Term not found")
    return term


@router.post("", response_model=CCVTerm, status_code=201)
async def create_term(
    request: Request,
    data: TermCreate,
    service: Annotated[TermService, Depends(get_term_service)],
) -> CCVTerm:
    """Create a new CCV term."""
    user_id = getattr(request.state, "user_id", None)
    return await service.create_term(data, user_id=UUID(user_id) if user_id else None)


@router.put("/{term_id}", response_model=CCVTerm)
async def update_term(
    request: Request,
    term_id: UUID,
    data: TermUpdate,
    service: Annotated[TermService, Depends(get_term_service)],
) -> CCVTerm:
    """Update a CCV term."""
    user_id = getattr(request.state, "user_id", None)
    term = await service.update_term(
        term_id, data,
        user_id=UUID(user_id) if user_id else None
    )
    if not term:
        raise HTTPException(status_code=404, detail="Term not found")
    return term


@router.delete("/{term_id}", status_code=204)
async def delete_term(
    term_id: UUID,
    service: Annotated[TermService, Depends(get_term_service)],
) -> None:
    """Delete a CCV term."""
    deleted = await service.delete_term(term_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Term not found")


# Synonym endpoints
@router.get("/{term_id}/synonyms", response_model=list[CCVSynonym])
async def list_synonyms(
    term_id: UUID,
    service: Annotated[TermService, Depends(get_term_service)],
) -> list[CCVSynonym]:
    """List all synonyms for a term."""
    return await service.get_synonyms(term_id)


@router.post("/{term_id}/synonyms", response_model=CCVSynonym, status_code=201)
async def add_synonym(
    request: Request,
    term_id: UUID,
    data: SynonymCreate,
    service: Annotated[TermService, Depends(get_term_service)],
) -> CCVSynonym:
    """Add a synonym to a term."""
    user_id = getattr(request.state, "user_id", None)
    return await service.add_synonym(
        term_id,
        data.synonym,
        user_id=UUID(user_id) if user_id else None,
        data_source_id=data.data_source_id,
    )


@router.delete("/{term_id}/synonyms/{synonym_id}", status_code=204)
async def remove_synonym(
    term_id: UUID,
    synonym_id: UUID,
    service: Annotated[TermService, Depends(get_term_service)],
) -> None:
    """Remove a synonym from a term."""
    deleted = await service.remove_synonym(synonym_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Synonym not found")


# Utility endpoints
@router.post("/find-or-create", response_model=CCVTerm)
async def find_or_create_term(
    request: Request,
    data: TermCreate,
    service: Annotated[TermService, Depends(get_term_service)],
) -> CCVTerm:
    """Find an existing term or create a new one.

    Returns the matching term if found (by name or synonym),
    otherwise creates a new term.
    """
    user_id = getattr(request.state, "user_id", None)
    term, _ = await service.find_or_create_term(
        data.canonical_name,
        domain=data.domain,
        user_id=UUID(user_id) if user_id else None,
    )
    return term


@router.post("/{term_id}/usage", status_code=204)
async def record_usage(
    term_id: UUID,
    service: Annotated[TermService, Depends(get_term_service)],
) -> None:
    """Record that a term was used (for analytics)."""
    await service.increment_usage(term_id)
