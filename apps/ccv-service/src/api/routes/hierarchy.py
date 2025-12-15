"""Hierarchy API routes."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_session
from src.models.ccv import HierarchyNode, CCVTerm, TermStatus

router = APIRouter()


class MoveTermRequest(BaseModel):
    """Request to move a term in the hierarchy."""
    new_parent_id: UUID | None  # None to make it a root term


class HierarchyStats(BaseModel):
    """Statistics about the hierarchy."""
    total_terms: int
    root_terms: int
    max_depth: int
    domains: list[str]


async def get_session_dep() -> AsyncSession:
    """Get database session."""
    from src.core.database import get_session
    async for session in get_session():
        yield session


@router.get("", response_model=list[HierarchyNode])
async def get_hierarchy(
    session: Annotated[AsyncSession, Depends(get_session_dep)],
    domain: str | None = None,
    max_depth: int = Query(3, ge=1, le=10),
) -> list[HierarchyNode]:
    """Get the term hierarchy as a tree structure."""
    # Get root terms
    query = """
        SELECT * FROM ccv_terms
        WHERE parent_id IS NULL AND status = 'approved'
    """
    params: dict = {}

    if domain:
        query += " AND domain = :domain"
        params["domain"] = domain

    query += " ORDER BY canonical_name"

    result = await session.execute(text(query), params)
    roots = result.fetchall()

    # Build tree recursively
    async def build_node(row, depth: int) -> HierarchyNode:
        term = CCVTerm(
            id=row.id,
            canonical_name=row.canonical_name,
            definition=row.definition,
            domain=row.domain,
            parent_id=row.parent_id,
            status=TermStatus(row.status),
            usage_count=row.usage_count,
        )

        # Get synonym count
        syn_result = await session.execute(
            text("SELECT COUNT(*) FROM ccv_synonyms WHERE term_id = :term_id"),
            {"term_id": row.id}
        )
        synonym_count = syn_result.scalar() or 0

        children = []
        if depth < max_depth:
            children_result = await session.execute(
                text("""
                    SELECT * FROM ccv_terms
                    WHERE parent_id = :parent_id AND status = 'approved'
                    ORDER BY canonical_name
                """),
                {"parent_id": row.id}
            )
            for child_row in children_result.fetchall():
                children.append(await build_node(child_row, depth + 1))

        return HierarchyNode(
            term=term,
            children=children,
            synonym_count=synonym_count,
            usage_count=term.usage_count,
        )

    return [await build_node(row, 1) for row in roots]


@router.get("/flat", response_model=list[CCVTerm])
async def get_flat_hierarchy(
    session: Annotated[AsyncSession, Depends(get_session_dep)],
    domain: str | None = None,
) -> list[CCVTerm]:
    """Get terms in a flat list with parent references.

    Useful for building tree structures client-side.
    """
    query = "SELECT * FROM ccv_terms WHERE status = 'approved'"
    params: dict = {}

    if domain:
        query += " AND domain = :domain"
        params["domain"] = domain

    query += " ORDER BY parent_id NULLS FIRST, canonical_name"

    result = await session.execute(text(query), params)

    return [
        CCVTerm(
            id=row.id,
            canonical_name=row.canonical_name,
            definition=row.definition,
            domain=row.domain,
            parent_id=row.parent_id,
            status=TermStatus(row.status),
            usage_count=row.usage_count,
        )
        for row in result.fetchall()
    ]


@router.get("/stats", response_model=HierarchyStats)
async def get_hierarchy_stats(
    session: Annotated[AsyncSession, Depends(get_session_dep)],
) -> HierarchyStats:
    """Get statistics about the term hierarchy."""
    # Total terms
    total_result = await session.execute(
        text("SELECT COUNT(*) FROM ccv_terms WHERE status = 'approved'")
    )
    total_terms = total_result.scalar() or 0

    # Root terms
    root_result = await session.execute(
        text("SELECT COUNT(*) FROM ccv_terms WHERE parent_id IS NULL AND status = 'approved'")
    )
    root_terms = root_result.scalar() or 0

    # Max depth (using recursive CTE)
    depth_result = await session.execute(
        text("""
            WITH RECURSIVE term_depth AS (
                SELECT id, parent_id, 1 as depth
                FROM ccv_terms
                WHERE parent_id IS NULL

                UNION ALL

                SELECT t.id, t.parent_id, td.depth + 1
                FROM ccv_terms t
                JOIN term_depth td ON t.parent_id = td.id
            )
            SELECT COALESCE(MAX(depth), 0) FROM term_depth
        """)
    )
    max_depth = depth_result.scalar() or 0

    # Domains
    domain_result = await session.execute(
        text("""
            SELECT DISTINCT domain FROM ccv_terms
            WHERE domain IS NOT NULL AND status = 'approved'
            ORDER BY domain
        """)
    )
    domains = [row[0] for row in domain_result.fetchall()]

    return HierarchyStats(
        total_terms=total_terms,
        root_terms=root_terms,
        max_depth=max_depth,
        domains=domains,
    )


@router.post("/{term_id}/move", response_model=CCVTerm)
async def move_term(
    term_id: UUID,
    move: MoveTermRequest,
    session: Annotated[AsyncSession, Depends(get_session_dep)],
) -> CCVTerm:
    """Move a term to a new parent in the hierarchy."""
    # Check term exists
    result = await session.execute(
        text("SELECT * FROM ccv_terms WHERE id = :id"),
        {"id": term_id}
    )
    row = result.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Term not found")

    # Validate new parent exists (if specified)
    if move.new_parent_id:
        parent_result = await session.execute(
            text("SELECT id FROM ccv_terms WHERE id = :id"),
            {"id": move.new_parent_id}
        )
        if not parent_result.fetchone():
            raise HTTPException(status_code=404, detail="Parent term not found")

        # Prevent circular references
        if await _would_create_cycle(session, term_id, move.new_parent_id):
            raise HTTPException(status_code=400, detail="Cannot create circular reference")

    # Update parent
    await session.execute(
        text("UPDATE ccv_terms SET parent_id = :parent_id, updated_at = NOW() WHERE id = :id"),
        {"id": term_id, "parent_id": move.new_parent_id}
    )

    # Return updated term
    updated_result = await session.execute(
        text("SELECT * FROM ccv_terms WHERE id = :id"),
        {"id": term_id}
    )
    updated_row = updated_result.fetchone()

    return CCVTerm(
        id=updated_row.id,
        canonical_name=updated_row.canonical_name,
        definition=updated_row.definition,
        domain=updated_row.domain,
        parent_id=updated_row.parent_id,
        status=TermStatus(updated_row.status),
    )


@router.get("/{term_id}/ancestors", response_model=list[CCVTerm])
async def get_ancestors(
    term_id: UUID,
    session: Annotated[AsyncSession, Depends(get_session_dep)],
) -> list[CCVTerm]:
    """Get all ancestor terms (path to root)."""
    result = await session.execute(
        text("""
            WITH RECURSIVE ancestors AS (
                SELECT * FROM ccv_terms WHERE id = :term_id

                UNION ALL

                SELECT t.* FROM ccv_terms t
                JOIN ancestors a ON t.id = a.parent_id
            )
            SELECT * FROM ancestors WHERE id != :term_id
            ORDER BY id
        """),
        {"term_id": term_id}
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


@router.get("/{term_id}/descendants", response_model=list[CCVTerm])
async def get_descendants(
    term_id: UUID,
    session: Annotated[AsyncSession, Depends(get_session_dep)],
) -> list[CCVTerm]:
    """Get all descendant terms (subtree)."""
    result = await session.execute(
        text("""
            WITH RECURSIVE descendants AS (
                SELECT * FROM ccv_terms WHERE parent_id = :term_id

                UNION ALL

                SELECT t.* FROM ccv_terms t
                JOIN descendants d ON t.parent_id = d.id
            )
            SELECT * FROM descendants ORDER BY canonical_name
        """),
        {"term_id": term_id}
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


async def _would_create_cycle(
    session: AsyncSession,
    term_id: UUID,
    new_parent_id: UUID,
) -> bool:
    """Check if moving a term would create a circular reference."""
    # Get all ancestors of the new parent
    result = await session.execute(
        text("""
            WITH RECURSIVE ancestors AS (
                SELECT id, parent_id FROM ccv_terms WHERE id = :parent_id

                UNION ALL

                SELECT t.id, t.parent_id FROM ccv_terms t
                JOIN ancestors a ON t.id = a.parent_id
            )
            SELECT id FROM ancestors
        """),
        {"parent_id": new_parent_id}
    )

    ancestor_ids = {row[0] for row in result.fetchall()}
    return term_id in ancestor_ids
