"""LLM-powered term extraction service."""

import json
import re
from typing import Any
from uuid import UUID

import httpx
import structlog
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import settings
from src.models.ccv import (
    CCVSuggestion,
    CCVTerm,
    SuggestionType,
    TermStatus,
)
from src.services.suggestion_service import SuggestionService

logger = structlog.get_logger()


TERM_EXTRACTION_PROMPT = """Analyze the following text and extract key terms that should be part of a canonical control vocabulary (CCV).

Text to analyze:
{text}

Context: {context}
Domain: {domain}

For each term you identify, provide:
1. The canonical form (standardized name)
2. Any variations/synonyms found in the text
3. A suggested category/parent term
4. Confidence score (0.0-1.0) based on:
   - Frequency of use
   - Clarity of definition
   - Domain relevance
5. A brief definition based on context

Return your analysis as JSON in this format:
{{
  "terms": [
    {{
      "canonical_name": "string",
      "variations": ["string"],
      "suggested_parent": "string or null",
      "confidence": 0.85,
      "definition": "string",
      "reasoning": "why this term should be in the vocabulary"
    }}
  ],
  "relationships": [
    {{
      "term1": "string",
      "term2": "string",
      "relationship_type": "synonym|broader|narrower|related",
      "confidence": 0.9
    }}
  ]
}}

Focus on:
- Domain-specific terminology
- Technical terms that need standardization
- Terms with multiple variations that should be unified
- Hierarchical relationships between concepts"""


class ExtractionService:
    """Service for LLM-powered term extraction."""

    def __init__(self, session: AsyncSession):
        self.session = session
        self.suggestion_service = SuggestionService(session)

    async def extract_terms_from_text(
        self,
        text: str,
        context: str | None = None,
        domain: str | None = None,
        source_entity_id: UUID | None = None,
        data_source: str | None = None,
    ) -> list[CCVSuggestion]:
        """Extract CCV terms from text using LLM."""
        if not settings.enable_auto_suggestions:
            return []

        suggestions: list[CCVSuggestion] = []

        try:
            # Build prompt
            prompt = TERM_EXTRACTION_PROMPT.format(
                text=text[:4000],  # Limit text length
                context=context or "General knowledge graph content",
                domain=domain or "general",
            )

            # Call LLM service
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{settings.llm_service_url}/api/v1/chat/analyze",
                    json={
                        "message": prompt,
                        "context_type": "term_extraction",
                    },
                    timeout=60.0,
                )

                if response.status_code != 200:
                    logger.warning(
                        "LLM service error",
                        status=response.status_code,
                        detail=response.text[:200],
                    )
                    return []

                result = response.json()
                analysis = result.get("analysis", result.get("response", ""))

        except Exception as e:
            logger.error("Failed to call LLM for extraction", error=str(e))
            return []

        # Parse the LLM response
        extracted = self._parse_extraction_response(analysis)

        # Create suggestions for each extracted term
        for term_data in extracted.get("terms", []):
            suggestions.extend(
                await self._process_extracted_term(
                    term_data=term_data,
                    source_entity_id=source_entity_id,
                    data_source=data_source,
                    domain=domain,
                )
            )

        # Process relationships
        for rel_data in extracted.get("relationships", []):
            suggestion = await self._process_relationship(
                rel_data=rel_data,
                data_source=data_source,
            )
            if suggestion:
                suggestions.append(suggestion)

        logger.info(
            "Extracted terms from text",
            term_count=len(extracted.get("terms", [])),
            relationship_count=len(extracted.get("relationships", [])),
            suggestion_count=len(suggestions),
        )

        return suggestions

    async def extract_terms_from_entity(
        self,
        entity_name: str,
        entity_type: str,
        entity_properties: dict[str, Any],
        entity_id: UUID,
        data_source: str | None = None,
    ) -> list[CCVSuggestion]:
        """Extract CCV terms from a graph entity."""
        # Build context from entity properties
        properties_text = "\n".join(
            f"- {k}: {v}" for k, v in entity_properties.items()
            if v and k not in ("id", "created_at", "updated_at")
        )

        text = f"""Entity: {entity_name}
Type: {entity_type}
Properties:
{properties_text}"""

        return await self.extract_terms_from_text(
            text=text,
            context=f"Graph entity of type '{entity_type}'",
            domain=entity_type.lower(),
            source_entity_id=entity_id,
            data_source=data_source,
        )

    async def bulk_extract(
        self,
        texts: list[dict[str, Any]],
        batch_size: int = 10,
    ) -> list[CCVSuggestion]:
        """Bulk extract terms from multiple texts."""
        all_suggestions: list[CCVSuggestion] = []

        for i in range(0, len(texts), batch_size):
            batch = texts[i:i + batch_size]
            for item in batch:
                suggestions = await self.extract_terms_from_text(
                    text=item.get("text", ""),
                    context=item.get("context"),
                    domain=item.get("domain"),
                    source_entity_id=item.get("source_entity_id"),
                    data_source=item.get("data_source"),
                )
                all_suggestions.extend(suggestions)

        return all_suggestions

    async def _process_extracted_term(
        self,
        term_data: dict[str, Any],
        source_entity_id: UUID | None,
        data_source: str | None,
        domain: str | None,
    ) -> list[CCVSuggestion]:
        """Process an extracted term and create appropriate suggestions."""
        suggestions: list[CCVSuggestion] = []

        canonical_name = term_data.get("canonical_name", "").strip()
        if not canonical_name:
            return suggestions

        confidence = float(term_data.get("confidence", 0.7))
        definition = term_data.get("definition")
        reasoning = term_data.get("reasoning")
        suggested_parent = term_data.get("suggested_parent")
        variations = term_data.get("variations", [])

        # Check if term already exists
        existing = await self._find_existing_term(canonical_name)

        if existing:
            # Term exists - suggest variations as synonyms
            for variation in variations:
                if not await self._synonym_exists(existing.id, variation):
                    suggestion = await self.suggestion_service.create_suggestion(
                        suggestion_type=SuggestionType.SYNONYM,
                        suggested_value=variation,
                        confidence=confidence * 0.9,
                        term_id=existing.id,
                        source_entity_id=source_entity_id,
                        source_data_source=data_source,
                        context=f"Variation of existing term: {canonical_name}",
                        llm_reasoning=reasoning,
                    )
                    suggestions.append(suggestion)

            # Suggest definition update if we have one and term doesn't
            if definition and not existing.definition:
                suggestion = await self.suggestion_service.create_suggestion(
                    suggestion_type=SuggestionType.DEFINITION,
                    suggested_value=definition,
                    confidence=confidence,
                    term_id=existing.id,
                    source_entity_id=source_entity_id,
                    source_data_source=data_source,
                    context="Definition extracted from text",
                    llm_reasoning=reasoning,
                )
                suggestions.append(suggestion)

        else:
            # Term doesn't exist - suggest as new term
            parent_id = None
            if suggested_parent:
                parent = await self._find_existing_term(suggested_parent)
                parent_id = parent.id if parent else None

            suggestion = await self.suggestion_service.create_suggestion(
                suggestion_type=SuggestionType.NEW_TERM,
                suggested_value=canonical_name,
                confidence=confidence,
                parent_term_id=parent_id,
                source_entity_id=source_entity_id,
                source_data_source=data_source,
                context=f"Domain: {domain or 'general'}. Definition: {definition or 'Not provided'}",
                llm_reasoning=reasoning,
                alternative_suggestions=variations[:5],
            )
            suggestions.append(suggestion)

        return suggestions

    async def _process_relationship(
        self,
        rel_data: dict[str, Any],
        data_source: str | None,
    ) -> CCVSuggestion | None:
        """Process a relationship between terms."""
        term1_name = rel_data.get("term1", "").strip()
        term2_name = rel_data.get("term2", "").strip()
        rel_type = rel_data.get("relationship_type", "related")
        confidence = float(rel_data.get("confidence", 0.7))

        if not term1_name or not term2_name:
            return None

        term1 = await self._find_existing_term(term1_name)
        term2 = await self._find_existing_term(term2_name)

        if not term1 or not term2:
            return None

        if rel_type == "synonym":
            # Check if synonym already exists
            if await self._synonym_exists(term1.id, term2_name):
                return None

            return await self.suggestion_service.create_suggestion(
                suggestion_type=SuggestionType.SYNONYM,
                suggested_value=term2_name,
                confidence=confidence,
                term_id=term1.id,
                source_data_source=data_source,
                context=f"Identified as synonym of {term1_name}",
            )

        elif rel_type in ("broader", "narrower"):
            # Hierarchy relationship
            parent_id = term1.id if rel_type == "broader" else term2.id
            child_id = term2.id if rel_type == "broader" else term1.id

            return await self.suggestion_service.create_suggestion(
                suggestion_type=SuggestionType.HIERARCHY,
                suggested_value=f"Set parent of {term2_name if rel_type == 'broader' else term1_name}",
                confidence=confidence,
                term_id=child_id,
                parent_term_id=parent_id,
                source_data_source=data_source,
                context=f"Hierarchical relationship: {term1_name} -> {term2_name}",
            )

        return None

    async def _find_existing_term(self, name: str) -> CCVTerm | None:
        """Find an existing term by name or synonym."""
        # Check canonical name
        result = await self.session.execute(
            text("""
                SELECT * FROM ccv_terms
                WHERE LOWER(canonical_name) = LOWER(:name)
                AND status = 'approved'
                LIMIT 1
            """),
            {"name": name}
        )
        row = result.fetchone()

        if row:
            return CCVTerm(
                id=row.id,
                canonical_name=row.canonical_name,
                definition=row.definition,
                domain=row.domain,
                parent_id=row.parent_id,
                status=TermStatus(row.status),
            )

        # Check synonyms
        result = await self.session.execute(
            text("""
                SELECT t.* FROM ccv_terms t
                JOIN ccv_synonyms s ON s.term_id = t.id
                WHERE LOWER(s.synonym) = LOWER(:name)
                AND t.status = 'approved'
                LIMIT 1
            """),
            {"name": name}
        )
        row = result.fetchone()

        if row:
            return CCVTerm(
                id=row.id,
                canonical_name=row.canonical_name,
                definition=row.definition,
                domain=row.domain,
                parent_id=row.parent_id,
                status=TermStatus(row.status),
            )

        return None

    async def _synonym_exists(self, term_id: UUID, synonym: str) -> bool:
        """Check if a synonym already exists for a term."""
        result = await self.session.execute(
            text("""
                SELECT 1 FROM ccv_synonyms
                WHERE term_id = :term_id
                AND LOWER(synonym) = LOWER(:synonym)
                LIMIT 1
            """),
            {"term_id": term_id, "synonym": synonym}
        )
        return result.fetchone() is not None

    def _parse_extraction_response(self, response: str) -> dict[str, Any]:
        """Parse LLM extraction response into structured data."""
        try:
            # Try to find JSON in the response
            json_match = re.search(r'\{[\s\S]*\}', response)
            if json_match:
                return json.loads(json_match.group())
        except json.JSONDecodeError:
            pass

        # Fallback: try to parse the entire response as JSON
        try:
            return json.loads(response)
        except json.JSONDecodeError:
            logger.warning("Failed to parse LLM response as JSON")
            return {"terms": [], "relationships": []}
