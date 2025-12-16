"""Term management service."""

from datetime import datetime
from typing import Any
from uuid import UUID

import structlog
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.events import publish_ccv_update
from src.models.ccv import (
    CCVTerm,
    CCVSynonym,
    TermCreate,
    TermUpdate,
    TermStatus,
    TermWithDetails,
    TermSearchResult,
)

logger = structlog.get_logger()


class TermService:
    """Service for managing CCV terms."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def list_terms(
        self,
        domain: str | None = None,
        status: TermStatus | None = None,
        parent_id: UUID | None = None,
        page: int = 1,
        page_size: int = 50,
    ) -> list[CCVTerm]:
        """List terms with filtering."""
        offset = (page - 1) * page_size

        query = "SELECT * FROM ccv_terms WHERE 1=1"
        params: dict[str, Any] = {"limit": page_size, "offset": offset}

        if domain:
            query += " AND domain = :domain"
            params["domain"] = domain

        if status:
            query += " AND status = :status"
            params["status"] = status.value

        if parent_id:
            query += " AND parent_id = :parent_id"
            params["parent_id"] = parent_id
        elif parent_id is None and "parent_id" not in params:
            # Root terms only by default
            query += " AND parent_id IS NULL"

        query += " ORDER BY canonical_name LIMIT :limit OFFSET :offset"

        result = await self.session.execute(text(query), params)
        rows = result.fetchall()

        return [self._row_to_term(row) for row in rows]

    async def get_term(self, term_id: UUID) -> CCVTerm | None:
        """Get a term by ID."""
        result = await self.session.execute(
            text("SELECT * FROM ccv_terms WHERE id = :id"),
            {"id": term_id}
        )
        row = result.fetchone()
        return self._row_to_term(row) if row else None

    async def get_term_with_details(self, term_id: UUID) -> TermWithDetails | None:
        """Get a term with all related data."""
        term = await self.get_term(term_id)
        if not term:
            return None

        # Get synonyms
        synonyms = await self.get_synonyms(term_id)

        # Get children
        children_result = await self.session.execute(
            text("SELECT * FROM ccv_terms WHERE parent_id = :parent_id"),
            {"parent_id": term_id}
        )
        children = [self._row_to_term(row) for row in children_result.fetchall()]

        # Get parent
        parent = None
        if term.parent_id:
            parent = await self.get_term(term.parent_id)

        # Get pending suggestions count
        suggestions_result = await self.session.execute(
            text("""
                SELECT COUNT(*) FROM ccv_suggestions
                WHERE (term_id = :term_id OR parent_term_id = :term_id)
                AND status = 'pending'
            """),
            {"term_id": term_id}
        )
        pending_suggestions = suggestions_result.scalar() or 0

        # Get mappings
        mappings_result = await self.session.execute(
            text("SELECT * FROM ccv_data_source_mappings WHERE term_id = :term_id"),
            {"term_id": term_id}
        )
        mappings = mappings_result.fetchall()

        return TermWithDetails(
            term=term,
            synonyms=synonyms,
            children=[TermWithDetails(term=c, synonyms=[], children=[]) for c in children],
            parent=parent,
            pending_suggestions=pending_suggestions,
            mappings=mappings,
        )

    async def create_term(self, data: TermCreate, user_id: UUID | None = None) -> CCVTerm:
        """Create a new term."""
        term = CCVTerm(
            canonical_name=data.canonical_name,
            definition=data.definition,
            domain=data.domain,
            parent_id=data.parent_id,
            status=TermStatus.APPROVED,
            source="manual",
            created_by=user_id,
            approved_by=user_id,
            approved_at=datetime.utcnow(),
        )

        await self.session.execute(
            text("""
                INSERT INTO ccv_terms
                (id, canonical_name, definition, domain, parent_id, status,
                 source, confidence, created_at, updated_at, created_by, approved_by, approved_at)
                VALUES (:id, :canonical_name, :definition, :domain, :parent_id, :status,
                        :source, :confidence, :created_at, :updated_at, :created_by, :approved_by, :approved_at)
            """),
            {
                "id": term.id,
                "canonical_name": term.canonical_name,
                "definition": term.definition,
                "domain": term.domain,
                "parent_id": term.parent_id,
                "status": term.status.value,
                "source": term.source,
                "confidence": term.confidence,
                "created_at": term.created_at,
                "updated_at": term.updated_at,
                "created_by": term.created_by,
                "approved_by": term.approved_by,
                "approved_at": term.approved_at,
            }
        )

        # Add synonyms if provided
        for synonym in data.synonyms:
            await self.add_synonym(term.id, synonym, user_id)

        # Publish event
        await publish_ccv_update("term_created", {
            "term_id": str(term.id),
            "canonical_name": term.canonical_name,
            "domain": term.domain,
        })

        logger.info("Term created", term_id=str(term.id), name=term.canonical_name)
        return term

    async def update_term(
        self,
        term_id: UUID,
        data: TermUpdate,
        user_id: UUID | None = None,
    ) -> CCVTerm | None:
        """Update a term."""
        term = await self.get_term(term_id)
        if not term:
            return None

        updates = ["updated_at = :updated_at"]
        params: dict[str, Any] = {"term_id": term_id, "updated_at": datetime.utcnow()}

        if data.canonical_name is not None:
            updates.append("canonical_name = :canonical_name")
            params["canonical_name"] = data.canonical_name

        if data.definition is not None:
            updates.append("definition = :definition")
            params["definition"] = data.definition

        if data.domain is not None:
            updates.append("domain = :domain")
            params["domain"] = data.domain

        if data.parent_id is not None:
            updates.append("parent_id = :parent_id")
            params["parent_id"] = data.parent_id

        if data.status is not None:
            updates.append("status = :status")
            params["status"] = data.status.value

        await self.session.execute(
            text(f"UPDATE ccv_terms SET {', '.join(updates)} WHERE id = :term_id"),
            params
        )

        # Publish event
        await publish_ccv_update("term_updated", {
            "term_id": str(term_id),
            "changes": {k: v for k, v in params.items() if k not in ["term_id", "updated_at"]},
        })

        logger.info("Term updated", term_id=str(term_id))
        return await self.get_term(term_id)

    async def delete_term(self, term_id: UUID) -> bool:
        """Delete a term (and cascade to synonyms, mappings)."""
        term = await self.get_term(term_id)
        if not term:
            return False

        # Check for children
        children = await self.session.execute(
            text("SELECT id FROM ccv_terms WHERE parent_id = :parent_id"),
            {"parent_id": term_id}
        )
        if children.fetchone():
            # Orphan children instead of blocking
            await self.session.execute(
                text("UPDATE ccv_terms SET parent_id = NULL WHERE parent_id = :parent_id"),
                {"parent_id": term_id}
            )

        await self.session.execute(
            text("DELETE FROM ccv_terms WHERE id = :id"),
            {"id": term_id}
        )

        # Publish event
        await publish_ccv_update("term_deleted", {
            "term_id": str(term_id),
            "canonical_name": term.canonical_name,
        })

        logger.info("Term deleted", term_id=str(term_id))
        return True

    async def search_terms(
        self,
        query: str,
        domain: str | None = None,
        limit: int = 20,
    ) -> list[TermSearchResult]:
        """Search for terms by name, synonym, or definition."""
        results: list[TermSearchResult] = []

        # Search canonical names
        canonical_results = await self.session.execute(
            text("""
                SELECT *, ts_rank(to_tsvector('english', canonical_name), plainto_tsquery(:query)) as rank
                FROM ccv_terms
                WHERE to_tsvector('english', canonical_name) @@ plainto_tsquery(:query)
                   OR canonical_name ILIKE :like_query
                ORDER BY rank DESC
                LIMIT :limit
            """),
            {"query": query, "like_query": f"%{query}%", "limit": limit}
        )

        for row in canonical_results.fetchall():
            term = self._row_to_term(row)
            results.append(TermSearchResult(
                term=term,
                match_type="canonical",
                matched_text=term.canonical_name,
                score=row.rank if hasattr(row, 'rank') else 1.0,
            ))

        # Search synonyms
        synonym_results = await self.session.execute(
            text("""
                SELECT s.*, t.*
                FROM ccv_synonyms s
                JOIN ccv_terms t ON s.term_id = t.id
                WHERE s.synonym ILIKE :like_query
                LIMIT :limit
            """),
            {"like_query": f"%{query}%", "limit": limit}
        )

        for row in synonym_results.fetchall():
            results.append(TermSearchResult(
                term=self._row_to_term(row),
                match_type="synonym",
                matched_text=row.synonym,
                score=0.9,
            ))

        # Sort by score and deduplicate
        seen_ids = set()
        unique_results = []
        for r in sorted(results, key=lambda x: x.score, reverse=True):
            if r.term.id not in seen_ids:
                seen_ids.add(r.term.id)
                unique_results.append(r)

        return unique_results[:limit]

    async def get_synonyms(self, term_id: UUID) -> list[CCVSynonym]:
        """Get all synonyms for a term."""
        result = await self.session.execute(
            text("SELECT * FROM ccv_synonyms WHERE term_id = :term_id ORDER BY synonym"),
            {"term_id": term_id}
        )

        return [
            CCVSynonym(
                id=row.id,
                term_id=row.term_id,
                synonym=row.synonym,
                source=row.source,
                data_source_id=row.data_source_id,
                confidence=row.confidence,
                status=TermStatus(row.status),
                created_at=row.created_at,
                created_by=row.created_by,
            )
            for row in result.fetchall()
        ]

    async def add_synonym(
        self,
        term_id: UUID,
        synonym: str,
        user_id: UUID | None = None,
        data_source_id: str | None = None,
    ) -> CCVSynonym:
        """Add a synonym to a term."""
        syn = CCVSynonym(
            term_id=term_id,
            synonym=synonym,
            source="manual",
            data_source_id=data_source_id,
            created_by=user_id,
        )

        await self.session.execute(
            text("""
                INSERT INTO ccv_synonyms (id, term_id, synonym, source, data_source_id,
                                          confidence, status, created_at, created_by)
                VALUES (:id, :term_id, :synonym, :source, :data_source_id,
                        :confidence, :status, :created_at, :created_by)
            """),
            {
                "id": syn.id,
                "term_id": syn.term_id,
                "synonym": syn.synonym,
                "source": syn.source,
                "data_source_id": syn.data_source_id,
                "confidence": syn.confidence,
                "status": syn.status.value,
                "created_at": syn.created_at,
                "created_by": syn.created_by,
            }
        )

        # Publish event
        await publish_ccv_update("synonym_added", {
            "term_id": str(term_id),
            "synonym": synonym,
        })

        logger.info("Synonym added", term_id=str(term_id), synonym=synonym)
        return syn

    async def remove_synonym(self, synonym_id: UUID) -> bool:
        """Remove a synonym."""
        result = await self.session.execute(
            text("DELETE FROM ccv_synonyms WHERE id = :id RETURNING term_id, synonym"),
            {"id": synonym_id}
        )
        row = result.fetchone()

        if row:
            await publish_ccv_update("synonym_removed", {
                "term_id": str(row.term_id),
                "synonym": row.synonym,
            })
            return True
        return False

    async def find_similar_terms(
        self,
        search_text: str,
        threshold: float = 0.5,
        limit: int = 5,
        exclude_id: UUID | None = None,
    ) -> list[dict]:
        """Find terms similar to the given text using fuzzy matching.

        Uses trigram similarity for fuzzy matching. Returns potential collisions
        when creating or updating terms.
        """
        if not search_text or len(search_text) < 2:
            return []

        # Query for similar terms using trigram similarity and phonetic matching
        result = await self.session.execute(
            text("""
                SELECT
                    id,
                    canonical_name,
                    definition,
                    domain,
                    similarity(LOWER(canonical_name), LOWER(:search_text)) as name_similarity,
                    CASE
                        WHEN LOWER(canonical_name) = LOWER(:search_text) THEN 'exact'
                        WHEN LOWER(canonical_name) LIKE LOWER(:prefix_pattern) THEN 'prefix'
                        WHEN LOWER(canonical_name) LIKE LOWER(:like_pattern) THEN 'contains'
                        ELSE 'similar'
                    END as match_type
                FROM ccv_terms
                WHERE
                    (similarity(LOWER(canonical_name), LOWER(:search_text)) > :threshold
                     OR LOWER(canonical_name) LIKE LOWER(:like_pattern))
                    AND (:exclude_id IS NULL OR id != :exclude_id)
                ORDER BY
                    CASE WHEN LOWER(canonical_name) = LOWER(:search_text) THEN 0 ELSE 1 END,
                    name_similarity DESC
                LIMIT :limit
            """),
            {
                "search_text": search_text,
                "threshold": threshold,
                "prefix_pattern": f"{search_text}%",
                "like_pattern": f"%{search_text}%",
                "exclude_id": exclude_id,
                "limit": limit,
            }
        )

        rows = result.fetchall()
        similar_terms = []

        for row in rows:
            similar_terms.append({
                "id": str(row.id),
                "canonical_name": row.canonical_name,
                "definition": row.definition,
                "domain": row.domain,
                "similarity": round(float(row.name_similarity), 2),
                "match_type": row.match_type,
            })

        # Also check synonyms for potential collisions
        syn_result = await self.session.execute(
            text("""
                SELECT DISTINCT
                    t.id,
                    t.canonical_name,
                    t.definition,
                    t.domain,
                    s.synonym as matched_synonym,
                    similarity(LOWER(s.synonym), LOWER(:search_text)) as syn_similarity
                FROM ccv_synonyms s
                JOIN ccv_terms t ON s.term_id = t.id
                WHERE
                    (similarity(LOWER(s.synonym), LOWER(:search_text)) > :threshold
                     OR LOWER(s.synonym) LIKE LOWER(:like_pattern))
                    AND (:exclude_id IS NULL OR t.id != :exclude_id)
                ORDER BY syn_similarity DESC
                LIMIT :limit
            """),
            {
                "search_text": search_text,
                "threshold": threshold,
                "like_pattern": f"%{search_text}%",
                "exclude_id": exclude_id,
                "limit": limit,
            }
        )

        seen_ids = {t["id"] for t in similar_terms}
        for row in syn_result.fetchall():
            if str(row.id) not in seen_ids:
                similar_terms.append({
                    "id": str(row.id),
                    "canonical_name": row.canonical_name,
                    "definition": row.definition,
                    "domain": row.domain,
                    "similarity": round(float(row.syn_similarity), 2),
                    "match_type": "synonym",
                    "matched_synonym": row.matched_synonym,
                })
                seen_ids.add(str(row.id))

        return similar_terms[:limit]

    async def find_or_create_term(
        self,
        canonical_name: str,
        domain: str | None = None,
        user_id: UUID | None = None,
    ) -> tuple[CCVTerm, bool]:
        """Find an existing term or create a new one.

        Returns tuple of (term, was_created).
        """
        # Check for exact match
        result = await self.session.execute(
            text("SELECT * FROM ccv_terms WHERE LOWER(canonical_name) = LOWER(:name)"),
            {"name": canonical_name}
        )
        row = result.fetchone()

        if row:
            return self._row_to_term(row), False

        # Check synonyms
        syn_result = await self.session.execute(
            text("""
                SELECT t.* FROM ccv_terms t
                JOIN ccv_synonyms s ON t.id = s.term_id
                WHERE LOWER(s.synonym) = LOWER(:name)
            """),
            {"name": canonical_name}
        )
        syn_row = syn_result.fetchone()

        if syn_row:
            return self._row_to_term(syn_row), False

        # Create new term
        term = await self.create_term(
            TermCreate(canonical_name=canonical_name, domain=domain),
            user_id=user_id
        )
        return term, True

    async def increment_usage(self, term_id: UUID) -> None:
        """Increment the usage count for a term."""
        await self.session.execute(
            text("""
                UPDATE ccv_terms
                SET usage_count = usage_count + 1, last_used_at = NOW()
                WHERE id = :term_id
            """),
            {"term_id": term_id}
        )

    def _row_to_term(self, row: Any) -> CCVTerm:
        """Convert a database row to a CCVTerm model."""
        return CCVTerm(
            id=row.id,
            canonical_name=row.canonical_name,
            definition=row.definition,
            domain=row.domain,
            parent_id=row.parent_id,
            status=TermStatus(row.status),
            created_at=row.created_at,
            updated_at=row.updated_at,
            created_by=row.created_by,
            approved_by=row.approved_by,
            approved_at=row.approved_at,
            source=row.source,
            confidence=row.confidence,
            usage_count=row.usage_count,
            last_used_at=row.last_used_at,
        )
