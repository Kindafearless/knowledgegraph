"""Suggestion service for LLM-powered CCV recommendations."""

from datetime import datetime
from typing import Any
from uuid import UUID

import httpx
import structlog
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import settings
from src.core.events import publish_ccv_update, publish_suggestion
from src.models.ccv import (
    CCVSuggestion,
    CCVTerm,
    SuggestionType,
    SuggestionStatus,
    SuggestionReview,
    TermStatus,
)

logger = structlog.get_logger()


class SuggestionService:
    """Service for managing CCV suggestions."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def list_suggestions(
        self,
        status: SuggestionStatus | None = None,
        suggestion_type: SuggestionType | None = None,
        term_id: UUID | None = None,
        page: int = 1,
        page_size: int = 50,
    ) -> list[CCVSuggestion]:
        """List suggestions with filtering."""
        offset = (page - 1) * page_size

        query = "SELECT * FROM ccv_suggestions WHERE 1=1"
        params: dict[str, Any] = {"limit": page_size, "offset": offset}

        if status:
            query += " AND status = :status"
            params["status"] = status.value

        if suggestion_type:
            query += " AND suggestion_type = :suggestion_type"
            params["suggestion_type"] = suggestion_type.value

        if term_id:
            query += " AND (term_id = :term_id OR parent_term_id = :term_id)"
            params["term_id"] = term_id

        query += " ORDER BY created_at DESC LIMIT :limit OFFSET :offset"

        result = await self.session.execute(text(query), params)
        rows = result.fetchall()

        return [self._row_to_suggestion(row) for row in rows]

    async def get_suggestion(self, suggestion_id: UUID) -> CCVSuggestion | None:
        """Get a suggestion by ID."""
        result = await self.session.execute(
            text("SELECT * FROM ccv_suggestions WHERE id = :id"),
            {"id": suggestion_id}
        )
        row = result.fetchone()
        return self._row_to_suggestion(row) if row else None

    async def create_suggestion(
        self,
        suggestion_type: SuggestionType,
        suggested_value: str,
        confidence: float,
        term_id: UUID | None = None,
        parent_term_id: UUID | None = None,
        source_entity_id: UUID | None = None,
        source_data_source: str | None = None,
        source_text: str | None = None,
        context: str | None = None,
        llm_reasoning: str | None = None,
        alternative_suggestions: list[str] | None = None,
    ) -> CCVSuggestion:
        """Create a new suggestion."""
        # Check if should auto-approve
        status = SuggestionStatus.PENDING
        if confidence >= settings.auto_approve_threshold:
            status = SuggestionStatus.AUTO_APPROVED

        suggestion = CCVSuggestion(
            suggestion_type=suggestion_type,
            status=status,
            confidence=confidence,
            suggested_value=suggested_value,
            context=context,
            term_id=term_id,
            parent_term_id=parent_term_id,
            source_entity_id=source_entity_id,
            source_data_source=source_data_source,
            source_text=source_text,
            llm_reasoning=llm_reasoning,
            alternative_suggestions=alternative_suggestions or [],
        )

        await self.session.execute(
            text("""
                INSERT INTO ccv_suggestions
                (id, suggestion_type, status, confidence, suggested_value, context,
                 term_id, parent_term_id, source_entity_id, source_data_source,
                 source_text, llm_reasoning, alternative_suggestions, created_at)
                VALUES (:id, :suggestion_type, :status, :confidence, :suggested_value, :context,
                        :term_id, :parent_term_id, :source_entity_id, :source_data_source,
                        :source_text, :llm_reasoning, :alternative_suggestions, :created_at)
            """),
            {
                "id": suggestion.id,
                "suggestion_type": suggestion.suggestion_type.value,
                "status": suggestion.status.value,
                "confidence": suggestion.confidence,
                "suggested_value": suggestion.suggested_value,
                "context": suggestion.context,
                "term_id": suggestion.term_id,
                "parent_term_id": suggestion.parent_term_id,
                "source_entity_id": suggestion.source_entity_id,
                "source_data_source": suggestion.source_data_source,
                "source_text": suggestion.source_text,
                "llm_reasoning": suggestion.llm_reasoning,
                "alternative_suggestions": suggestion.alternative_suggestions,
                "created_at": suggestion.created_at,
            }
        )

        # If auto-approved, apply the suggestion
        if status == SuggestionStatus.AUTO_APPROVED:
            await self._apply_suggestion(suggestion)

        # Publish event
        await publish_suggestion({
            "suggestion_id": str(suggestion.id),
            "type": suggestion_type.value,
            "confidence": confidence,
            "status": status.value,
        })

        logger.info(
            "Suggestion created",
            suggestion_id=str(suggestion.id),
            type=suggestion_type.value,
            confidence=confidence,
            status=status.value,
        )

        return suggestion

    async def review_suggestion(
        self,
        suggestion_id: UUID,
        review: SuggestionReview,
        user_id: UUID | None = None,
    ) -> CCVSuggestion | None:
        """Review (approve/reject/modify) a suggestion."""
        suggestion = await self.get_suggestion(suggestion_id)
        if not suggestion:
            return None

        if suggestion.status != SuggestionStatus.PENDING:
            logger.warning("Suggestion already reviewed", suggestion_id=str(suggestion_id))
            return suggestion

        new_status = SuggestionStatus.APPROVED if review.action == "approve" else SuggestionStatus.REJECTED
        reviewed_at = datetime.utcnow()

        # Update suggestion
        await self.session.execute(
            text("""
                UPDATE ccv_suggestions
                SET status = :status, reviewed_at = :reviewed_at,
                    reviewed_by = :reviewed_by, review_notes = :review_notes
                WHERE id = :id
            """),
            {
                "id": suggestion_id,
                "status": new_status.value,
                "reviewed_at": reviewed_at,
                "reviewed_by": user_id,
                "review_notes": review.notes,
            }
        )

        suggestion.status = new_status
        suggestion.reviewed_at = reviewed_at
        suggestion.reviewed_by = user_id
        suggestion.review_notes = review.notes

        # Apply if approved
        if review.action == "approve":
            value = review.modified_value if review.modified_value else suggestion.suggested_value
            suggestion.suggested_value = value
            await self._apply_suggestion(suggestion)

        # Publish event
        await publish_ccv_update("suggestion_reviewed", {
            "suggestion_id": str(suggestion_id),
            "action": review.action,
            "status": new_status.value,
        })

        logger.info(
            "Suggestion reviewed",
            suggestion_id=str(suggestion_id),
            action=review.action,
        )

        return suggestion

    async def _apply_suggestion(self, suggestion: CCVSuggestion) -> None:
        """Apply an approved suggestion to the CCV."""
        if suggestion.suggestion_type == SuggestionType.NEW_TERM:
            # Create new term
            await self.session.execute(
                text("""
                    INSERT INTO ccv_terms
                    (id, canonical_name, parent_id, status, source, confidence, created_at, updated_at)
                    VALUES (gen_random_uuid(), :name, :parent_id, 'approved', 'auto_extracted', :confidence, NOW(), NOW())
                """),
                {
                    "name": suggestion.suggested_value,
                    "parent_id": suggestion.parent_term_id,
                    "confidence": suggestion.confidence,
                }
            )
            logger.info("Applied new term suggestion", term=suggestion.suggested_value)

        elif suggestion.suggestion_type == SuggestionType.SYNONYM:
            if suggestion.term_id:
                # Add synonym to existing term
                await self.session.execute(
                    text("""
                        INSERT INTO ccv_synonyms
                        (id, term_id, synonym, source, data_source_id, confidence, status, created_at)
                        VALUES (gen_random_uuid(), :term_id, :synonym, 'auto_extracted',
                                :data_source_id, :confidence, 'approved', NOW())
                    """),
                    {
                        "term_id": suggestion.term_id,
                        "synonym": suggestion.suggested_value,
                        "data_source_id": suggestion.source_data_source,
                        "confidence": suggestion.confidence,
                    }
                )
                logger.info("Applied synonym suggestion", synonym=suggestion.suggested_value)

        elif suggestion.suggestion_type == SuggestionType.HIERARCHY:
            if suggestion.term_id and suggestion.parent_term_id:
                # Update term's parent
                await self.session.execute(
                    text("UPDATE ccv_terms SET parent_id = :parent_id WHERE id = :term_id"),
                    {"term_id": suggestion.term_id, "parent_id": suggestion.parent_term_id}
                )
                logger.info("Applied hierarchy suggestion", term_id=str(suggestion.term_id))

        elif suggestion.suggestion_type == SuggestionType.DEFINITION:
            if suggestion.term_id:
                # Update term definition
                await self.session.execute(
                    text("UPDATE ccv_terms SET definition = :definition WHERE id = :term_id"),
                    {"term_id": suggestion.term_id, "definition": suggestion.suggested_value}
                )
                logger.info("Applied definition suggestion", term_id=str(suggestion.term_id))

    async def generate_suggestions_for_entity(
        self,
        entity_name: str,
        entity_type: str,
        entity_properties: dict[str, Any],
        entity_id: UUID,
        data_source: str | None = None,
    ) -> list[CCVSuggestion]:
        """Generate CCV suggestions for a new entity using LLM."""
        if not settings.enable_auto_suggestions:
            return []

        suggestions: list[CCVSuggestion] = []

        try:
            # Call LLM service for analysis
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{settings.llm_service_url}/api/v1/chat/analyze",
                    json={
                        "message": f"""Analyze this entity for vocabulary standardization:
Name: {entity_name}
Type: {entity_type}
Properties: {entity_properties}

Suggest:
1. A canonical term for this entity (if it should be added to the vocabulary)
2. Any existing terms this might be a synonym for
3. What category/parent term this should belong under
4. A clear definition

Respond with structured suggestions."""
                    },
                    timeout=30.0,
                )

                if response.status_code != 200:
                    logger.warning("LLM service error", status=response.status_code)
                    return []

                analysis = response.json()

        except Exception as e:
            logger.error("Failed to get LLM suggestions", error=str(e))
            return []

        # Parse LLM response and create suggestions
        # Check if this looks like a new term
        existing = await self._find_similar_terms(entity_name)

        if not existing:
            # Suggest as new term
            suggestion = await self.create_suggestion(
                suggestion_type=SuggestionType.NEW_TERM,
                suggested_value=entity_name,
                confidence=0.7,
                source_entity_id=entity_id,
                source_data_source=data_source,
                context=f"Entity type: {entity_type}",
                llm_reasoning=analysis.get("raw_analysis", ""),
            )
            suggestions.append(suggestion)
        else:
            # Suggest as synonym of the most similar existing term
            best_match = existing[0]
            suggestion = await self.create_suggestion(
                suggestion_type=SuggestionType.SYNONYM,
                suggested_value=entity_name,
                confidence=0.8,
                term_id=best_match.id,
                source_entity_id=entity_id,
                source_data_source=data_source,
                context=f"Similar to existing term: {best_match.canonical_name}",
            )
            suggestions.append(suggestion)

        return suggestions

    async def _find_similar_terms(self, name: str) -> list[CCVTerm]:
        """Find terms similar to the given name."""
        result = await self.session.execute(
            text("""
                SELECT * FROM ccv_terms
                WHERE similarity(canonical_name, :name) > 0.3
                   OR canonical_name ILIKE :like_name
                ORDER BY similarity(canonical_name, :name) DESC
                LIMIT 5
            """),
            {"name": name, "like_name": f"%{name}%"}
        )

        return [
            CCVTerm(
                id=row.id,
                canonical_name=row.canonical_name,
                definition=row.definition,
                domain=row.domain,
                parent_id=row.parent_id,
                status=TermStatus(row.status),
            )
            for row in result.fetchall()
        ]

    async def get_pending_count(self) -> int:
        """Get count of pending suggestions."""
        result = await self.session.execute(
            text("SELECT COUNT(*) FROM ccv_suggestions WHERE status = 'pending'")
        )
        return result.scalar() or 0

    async def batch_review(
        self,
        suggestion_ids: list[UUID],
        action: str,
        user_id: UUID | None = None,
    ) -> int:
        """Batch review multiple suggestions."""
        reviewed = 0
        for suggestion_id in suggestion_ids:
            result = await self.review_suggestion(
                suggestion_id,
                SuggestionReview(action=action),
                user_id=user_id,
            )
            if result:
                reviewed += 1
        return reviewed

    def _row_to_suggestion(self, row: Any) -> CCVSuggestion:
        """Convert a database row to a CCVSuggestion model."""
        return CCVSuggestion(
            id=row.id,
            suggestion_type=SuggestionType(row.suggestion_type),
            status=SuggestionStatus(row.status),
            confidence=row.confidence,
            suggested_value=row.suggested_value,
            context=row.context,
            term_id=row.term_id,
            related_term_id=row.related_term_id if hasattr(row, 'related_term_id') else None,
            parent_term_id=row.parent_term_id,
            source_entity_id=row.source_entity_id,
            source_data_source=row.source_data_source,
            source_text=row.source_text,
            llm_reasoning=row.llm_reasoning,
            alternative_suggestions=row.alternative_suggestions or [],
            created_at=row.created_at,
            reviewed_at=row.reviewed_at,
            reviewed_by=row.reviewed_by,
            review_notes=row.review_notes,
        )
