"""Suggestion API routes."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_session
from src.models.ccv import (
    CCVSuggestion,
    SuggestionType,
    SuggestionStatus,
    SuggestionReview,
)
from src.services.suggestion_service import SuggestionService

router = APIRouter()


def get_suggestion_service(
    session: Annotated[AsyncSession, Depends(get_session)]
) -> SuggestionService:
    """Dependency to get suggestion service."""
    return SuggestionService(session)


class SuggestionStats(BaseModel):
    """Statistics about suggestions."""
    pending: int
    approved_today: int
    rejected_today: int
    auto_approved_today: int


class BatchReviewRequest(BaseModel):
    """Request to batch review suggestions."""
    suggestion_ids: list[UUID]
    action: str  # "approve" or "reject"


class BatchReviewResponse(BaseModel):
    """Response from batch review."""
    reviewed: int
    total: int


@router.get("", response_model=list[CCVSuggestion])
async def list_suggestions(
    service: Annotated[SuggestionService, Depends(get_suggestion_service)],
    status: SuggestionStatus | None = None,
    suggestion_type: SuggestionType | None = None,
    term_id: UUID | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
) -> list[CCVSuggestion]:
    """List CCV suggestions with filtering."""
    return await service.list_suggestions(
        status=status,
        suggestion_type=suggestion_type,
        term_id=term_id,
        page=page,
        page_size=page_size,
    )


@router.get("/pending", response_model=list[CCVSuggestion])
async def list_pending_suggestions(
    service: Annotated[SuggestionService, Depends(get_suggestion_service)],
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
) -> list[CCVSuggestion]:
    """List pending suggestions for review."""
    return await service.list_suggestions(
        status=SuggestionStatus.PENDING,
        page=page,
        page_size=page_size,
    )


@router.get("/stats", response_model=SuggestionStats)
async def get_suggestion_stats(
    service: Annotated[SuggestionService, Depends(get_suggestion_service)],
) -> SuggestionStats:
    """Get suggestion statistics."""
    pending = await service.get_pending_count()
    # TODO: Implement daily stats
    return SuggestionStats(
        pending=pending,
        approved_today=0,
        rejected_today=0,
        auto_approved_today=0,
    )


@router.get("/{suggestion_id}", response_model=CCVSuggestion)
async def get_suggestion(
    suggestion_id: UUID,
    service: Annotated[SuggestionService, Depends(get_suggestion_service)],
) -> CCVSuggestion:
    """Get a specific suggestion."""
    suggestion = await service.get_suggestion(suggestion_id)
    if not suggestion:
        raise HTTPException(status_code=404, detail="Suggestion not found")
    return suggestion


@router.post("/{suggestion_id}/review", response_model=CCVSuggestion)
async def review_suggestion(
    request: Request,
    suggestion_id: UUID,
    review: SuggestionReview,
    service: Annotated[SuggestionService, Depends(get_suggestion_service)],
) -> CCVSuggestion:
    """Review (approve/reject/modify) a suggestion."""
    if review.action not in ["approve", "reject", "modify"]:
        raise HTTPException(status_code=400, detail="Invalid action")

    user_id = getattr(request.state, "user_id", None)
    suggestion = await service.review_suggestion(
        suggestion_id,
        review,
        user_id=UUID(user_id) if user_id else None,
    )

    if not suggestion:
        raise HTTPException(status_code=404, detail="Suggestion not found")

    return suggestion


@router.post("/batch-review", response_model=BatchReviewResponse)
async def batch_review_suggestions(
    request: Request,
    batch: BatchReviewRequest,
    service: Annotated[SuggestionService, Depends(get_suggestion_service)],
) -> BatchReviewResponse:
    """Batch review multiple suggestions at once."""
    if batch.action not in ["approve", "reject"]:
        raise HTTPException(status_code=400, detail="Invalid action")

    user_id = getattr(request.state, "user_id", None)
    reviewed = await service.batch_review(
        batch.suggestion_ids,
        batch.action,
        user_id=UUID(user_id) if user_id else None,
    )

    return BatchReviewResponse(
        reviewed=reviewed,
        total=len(batch.suggestion_ids),
    )


@router.post("/{suggestion_id}/approve", response_model=CCVSuggestion)
async def approve_suggestion(
    request: Request,
    suggestion_id: UUID,
    service: Annotated[SuggestionService, Depends(get_suggestion_service)],
) -> CCVSuggestion:
    """Quick approve a suggestion."""
    user_id = getattr(request.state, "user_id", None)
    suggestion = await service.review_suggestion(
        suggestion_id,
        SuggestionReview(action="approve"),
        user_id=UUID(user_id) if user_id else None,
    )

    if not suggestion:
        raise HTTPException(status_code=404, detail="Suggestion not found")

    return suggestion


@router.post("/{suggestion_id}/reject", response_model=CCVSuggestion)
async def reject_suggestion(
    request: Request,
    suggestion_id: UUID,
    service: Annotated[SuggestionService, Depends(get_suggestion_service)],
    notes: str | None = None,
) -> CCVSuggestion:
    """Quick reject a suggestion."""
    user_id = getattr(request.state, "user_id", None)
    suggestion = await service.review_suggestion(
        suggestion_id,
        SuggestionReview(action="reject", notes=notes),
        user_id=UUID(user_id) if user_id else None,
    )

    if not suggestion:
        raise HTTPException(status_code=404, detail="Suggestion not found")

    return suggestion
