"""Graph query API routes."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_session
from src.models.entity import GraphSubset
from src.services.graph_query_service import GraphQueryService
from src.services.permission_service import check_permission

router = APIRouter()


def get_query_service(
    session: Annotated[AsyncSession, Depends(get_session)]
) -> GraphQueryService:
    """Dependency to get query service."""
    return GraphQueryService(session)


class TraversalRequest(BaseModel):
    """Request for graph traversal."""

    start_node_id: UUID
    depth: int = 2
    relationship_types: list[str] | None = None
    direction: str = "both"  # "incoming", "outgoing", "both"


class PathRequest(BaseModel):
    """Request for finding paths between nodes."""

    source_id: UUID
    target_id: UUID
    max_depth: int = 5
    relationship_types: list[str] | None = None


class SearchRequest(BaseModel):
    """Request for semantic search."""

    query: str
    entity_types: list[str] | None = None
    limit: int = 50
    include_relationships: bool = True


@router.post("/traverse", response_model=GraphSubset)
async def traverse_graph(
    request: Request,
    traversal: TraversalRequest,
    service: Annotated[GraphQueryService, Depends(get_query_service)],
) -> GraphSubset:
    """Traverse the graph from a starting node."""
    check_permission(request, "graph:query:execute")

    return await service.traverse(
        start_node_id=traversal.start_node_id,
        depth=traversal.depth,
        relationship_types=traversal.relationship_types,
        direction=traversal.direction,
        user_data_sources=request.state.data_sources,
        user_classification=request.state.classification,
    )


@router.post("/paths", response_model=GraphSubset)
async def find_paths(
    request: Request,
    path_request: PathRequest,
    service: Annotated[GraphQueryService, Depends(get_query_service)],
) -> GraphSubset:
    """Find paths between two nodes."""
    check_permission(request, "graph:query:execute")

    return await service.find_paths(
        source_id=path_request.source_id,
        target_id=path_request.target_id,
        max_depth=path_request.max_depth,
        relationship_types=path_request.relationship_types,
        user_data_sources=request.state.data_sources,
        user_classification=request.state.classification,
    )


@router.post("/search", response_model=GraphSubset)
async def search_graph(
    request: Request,
    search: SearchRequest,
    service: Annotated[GraphQueryService, Depends(get_query_service)],
) -> GraphSubset:
    """Search the graph using text query."""
    check_permission(request, "graph:query:execute")

    return await service.search(
        query=search.query,
        entity_types=search.entity_types,
        limit=search.limit,
        include_relationships=search.include_relationships,
        user_data_sources=request.state.data_sources,
        user_classification=request.state.classification,
    )


@router.get("/expand/{node_id}", response_model=GraphSubset)
async def expand_node(
    request: Request,
    node_id: UUID,
    service: Annotated[GraphQueryService, Depends(get_query_service)],
    depth: int = Query(1, ge=1, le=3),
) -> GraphSubset:
    """Expand a node to show its immediate neighbors."""
    check_permission(request, "graph:query:execute")

    return await service.traverse(
        start_node_id=node_id,
        depth=depth,
        direction="both",
        user_data_sources=request.state.data_sources,
        user_classification=request.state.classification,
    )


@router.get("/analytics/centrality")
async def get_centrality(
    request: Request,
    service: Annotated[GraphQueryService, Depends(get_query_service)],
    algorithm: str = Query("degree", regex="^(degree|betweenness|closeness|pagerank)$"),
    limit: int = Query(20, ge=1, le=100),
) -> list[dict]:
    """Get top nodes by centrality measure."""
    check_permission(request, "graph:analytics:read")

    return await service.get_centrality(
        algorithm=algorithm,
        limit=limit,
        user_data_sources=request.state.data_sources,
        user_classification=request.state.classification,
    )


@router.get("/analytics/communities")
async def detect_communities(
    request: Request,
    service: Annotated[GraphQueryService, Depends(get_query_service)],
) -> list[dict]:
    """Detect communities in the graph."""
    check_permission(request, "graph:analytics:read")

    return await service.detect_communities(
        user_data_sources=request.state.data_sources,
        user_classification=request.state.classification,
    )
