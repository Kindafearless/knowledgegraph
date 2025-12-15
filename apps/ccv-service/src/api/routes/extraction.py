"""Term extraction API routes."""

from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_session
from src.models.ccv import CCVSuggestion
from src.services.extraction_service import ExtractionService

router = APIRouter()


def get_extraction_service(
    session: Annotated[AsyncSession, Depends(get_session)]
) -> ExtractionService:
    """Dependency to get extraction service."""
    return ExtractionService(session)


class TextExtractionRequest(BaseModel):
    """Request to extract terms from text."""
    text: str = Field(..., min_length=10, max_length=50000)
    context: str | None = None
    domain: str | None = None
    source_entity_id: UUID | None = None
    data_source: str | None = None


class EntityExtractionRequest(BaseModel):
    """Request to extract terms from an entity."""
    entity_name: str
    entity_type: str
    entity_properties: dict[str, Any] = {}
    entity_id: UUID
    data_source: str | None = None


class BulkExtractionRequest(BaseModel):
    """Request to extract terms from multiple texts."""
    items: list[TextExtractionRequest]
    async_processing: bool = False


class ExtractionResponse(BaseModel):
    """Response from term extraction."""
    suggestion_count: int
    suggestions: list[CCVSuggestion]


class AsyncExtractionResponse(BaseModel):
    """Response when processing asynchronously."""
    job_id: str
    message: str
    item_count: int


@router.post("/text", response_model=ExtractionResponse)
async def extract_from_text(
    request: TextExtractionRequest,
    service: Annotated[ExtractionService, Depends(get_extraction_service)],
) -> ExtractionResponse:
    """Extract CCV terms from a text passage.

    Uses LLM to analyze the text and identify:
    - New canonical terms
    - Synonyms for existing terms
    - Hierarchical relationships
    - Term definitions

    Returns a list of suggestions that can be reviewed or auto-approved.
    """
    suggestions = await service.extract_terms_from_text(
        text=request.text,
        context=request.context,
        domain=request.domain,
        source_entity_id=request.source_entity_id,
        data_source=request.data_source,
    )

    return ExtractionResponse(
        suggestion_count=len(suggestions),
        suggestions=suggestions,
    )


@router.post("/entity", response_model=ExtractionResponse)
async def extract_from_entity(
    request: EntityExtractionRequest,
    service: Annotated[ExtractionService, Depends(get_extraction_service)],
) -> ExtractionResponse:
    """Extract CCV terms from a graph entity.

    Analyzes the entity name, type, and properties to identify
    relevant vocabulary terms and relationships.
    """
    suggestions = await service.extract_terms_from_entity(
        entity_name=request.entity_name,
        entity_type=request.entity_type,
        entity_properties=request.entity_properties,
        entity_id=request.entity_id,
        data_source=request.data_source,
    )

    return ExtractionResponse(
        suggestion_count=len(suggestions),
        suggestions=suggestions,
    )


@router.post("/bulk", response_model=ExtractionResponse | AsyncExtractionResponse)
async def bulk_extract(
    request: BulkExtractionRequest,
    background_tasks: BackgroundTasks,
    service: Annotated[ExtractionService, Depends(get_extraction_service)],
) -> ExtractionResponse | AsyncExtractionResponse:
    """Extract terms from multiple texts.

    For large batches, set async_processing=true to process in the background.
    """
    if request.async_processing and len(request.items) > 5:
        # Process asynchronously for large batches
        from uuid import uuid4
        job_id = str(uuid4())

        async def process_batch():
            texts = [
                {
                    "text": item.text,
                    "context": item.context,
                    "domain": item.domain,
                    "source_entity_id": item.source_entity_id,
                    "data_source": item.data_source,
                }
                for item in request.items
            ]
            await service.bulk_extract(texts)

        background_tasks.add_task(process_batch)

        return AsyncExtractionResponse(
            job_id=job_id,
            message="Processing started. Suggestions will appear as they are extracted.",
            item_count=len(request.items),
        )

    # Process synchronously
    texts = [
        {
            "text": item.text,
            "context": item.context,
            "domain": item.domain,
            "source_entity_id": item.source_entity_id,
            "data_source": item.data_source,
        }
        for item in request.items
    ]
    suggestions = await service.bulk_extract(texts)

    return ExtractionResponse(
        suggestion_count=len(suggestions),
        suggestions=suggestions,
    )


@router.post("/analyze", response_model=dict)
async def analyze_vocabulary_coverage(
    request: TextExtractionRequest,
    service: Annotated[ExtractionService, Depends(get_extraction_service)],
) -> dict:
    """Analyze how well the existing vocabulary covers a text.

    Returns statistics about:
    - Terms found in the vocabulary
    - Potential new terms
    - Coverage percentage
    """
    from sqlalchemy import text as sql_text
    import re

    # Extract words from text
    words = set(re.findall(r'\b\w{3,}\b', request.text.lower()))

    # Check how many match existing terms or synonyms
    session = service.session
    result = await session.execute(
        sql_text("""
            SELECT LOWER(canonical_name) as name FROM ccv_terms WHERE status = 'approved'
            UNION
            SELECT LOWER(synonym) as name FROM ccv_synonyms WHERE status = 'approved'
        """)
    )

    vocabulary = {row[0] for row in result.fetchall()}

    matched = words & vocabulary
    unmatched = words - vocabulary

    return {
        "total_unique_words": len(words),
        "matched_terms": len(matched),
        "unmatched_words": len(unmatched),
        "coverage_percentage": round(len(matched) / len(words) * 100, 2) if words else 0,
        "matched_examples": list(matched)[:20],
        "unmatched_examples": list(unmatched)[:50],
        "domain": request.domain,
    }
