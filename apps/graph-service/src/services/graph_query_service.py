"""Graph query service for traversals and analytics."""

from typing import Any
from uuid import UUID

import structlog
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.entity import Entity, Relationship, GraphSubset

logger = structlog.get_logger()


class GraphQueryService:
    """Service for graph queries and analytics."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def traverse(
        self,
        start_node_id: UUID,
        depth: int = 2,
        relationship_types: list[str] | None = None,
        direction: str = "both",
        user_data_sources: list[str] | None = None,
        user_classification: str = "unclassified",
    ) -> GraphSubset:
        """Traverse the graph from a starting node."""
        visited_nodes: set[UUID] = set()
        visited_edges: set[UUID] = set()
        nodes: list[Entity] = []
        edges: list[Relationship] = []

        # Get starting node
        start_node = await self._get_node(
            start_node_id, user_data_sources, user_classification
        )
        if start_node:
            nodes.append(start_node)
            visited_nodes.add(start_node_id)

        # BFS traversal
        current_level = {start_node_id}
        for _ in range(depth):
            if not current_level:
                break

            next_level: set[UUID] = set()
            for node_id in current_level:
                # Get relationships
                rels = await self._get_node_relationships(
                    node_id,
                    direction,
                    relationship_types,
                    user_data_sources,
                    user_classification,
                )
                for rel in rels:
                    if rel.id not in visited_edges:
                        visited_edges.add(rel.id)
                        edges.append(rel)

                        # Get connected nodes
                        connected_id = (
                            rel.target_id if rel.source_id == node_id else rel.source_id
                        )
                        if connected_id not in visited_nodes:
                            visited_nodes.add(connected_id)
                            next_level.add(connected_id)
                            connected_node = await self._get_node(
                                connected_id, user_data_sources, user_classification
                            )
                            if connected_node:
                                nodes.append(connected_node)

            current_level = next_level

        return GraphSubset(
            nodes=nodes,
            edges=edges,
            total_nodes=len(nodes),
            total_edges=len(edges),
        )

    async def find_paths(
        self,
        source_id: UUID,
        target_id: UUID,
        max_depth: int = 5,
        relationship_types: list[str] | None = None,
        user_data_sources: list[str] | None = None,
        user_classification: str = "unclassified",
    ) -> GraphSubset:
        """Find paths between two nodes using BFS."""
        visited_nodes: set[UUID] = set()
        path_nodes: list[Entity] = []
        path_edges: list[Relationship] = []

        # Get source and target nodes
        source_node = await self._get_node(
            source_id, user_data_sources, user_classification
        )
        target_node = await self._get_node(
            target_id, user_data_sources, user_classification
        )

        if not source_node or not target_node:
            return GraphSubset(nodes=[], edges=[], total_nodes=0, total_edges=0)

        # BFS to find path
        queue: list[tuple[UUID, list[UUID], list[Relationship]]] = [
            (source_id, [source_id], [])
        ]
        visited_nodes.add(source_id)

        while queue and len(path_edges) == 0:
            current_id, path, edges = queue.pop(0)

            if len(path) > max_depth:
                continue

            rels = await self._get_node_relationships(
                current_id,
                "both",
                relationship_types,
                user_data_sources,
                user_classification,
            )

            for rel in rels:
                next_id = (
                    rel.target_id if rel.source_id == current_id else rel.source_id
                )

                if next_id == target_id:
                    # Found path
                    for node_id in path:
                        node = await self._get_node(
                            node_id, user_data_sources, user_classification
                        )
                        if node:
                            path_nodes.append(node)
                    path_nodes.append(target_node)
                    path_edges = edges + [rel]
                    break

                if next_id not in visited_nodes:
                    visited_nodes.add(next_id)
                    queue.append((next_id, path + [next_id], edges + [rel]))

        return GraphSubset(
            nodes=path_nodes,
            edges=path_edges,
            total_nodes=len(path_nodes),
            total_edges=len(path_edges),
        )

    async def search(
        self,
        query: str,
        entity_types: list[str] | None = None,
        limit: int = 50,
        include_relationships: bool = True,
        user_data_sources: list[str] | None = None,
        user_classification: str = "unclassified",
    ) -> GraphSubset:
        """Search the graph using text query."""
        sql = """
            SELECT
                e.id,
                e.name,
                et.name as type,
                e.properties,
                ds.name as data_source,
                e.classification_level as classification,
                e.created_at,
                e.updated_at
            FROM entities e
            LEFT JOIN entity_types et ON e.type_id = et.id
            LEFT JOIN data_sources ds ON e.data_source_id = ds.id
            WHERE (e.name ILIKE :search OR e.properties::text ILIKE :search)
        """
        params: dict[str, Any] = {"search": f"%{query}%", "limit": limit}

        if entity_types:
            sql += " AND et.name = ANY(:entity_types)"
            params["entity_types"] = entity_types

        sql += " LIMIT :limit"

        result = await self.session.execute(text(sql), params)
        rows = result.fetchall()

        nodes = [
            Entity(
                id=row.id,
                name=row.name,
                type=row.type or "Unknown",
                properties=row.properties or {},
                data_source=row.data_source,
                classification=row.classification or "unclassified",
                created_at=row.created_at,
                updated_at=row.updated_at,
            )
            for row in rows
        ]

        edges: list[Relationship] = []
        if include_relationships and nodes:
            node_ids = [n.id for n in nodes]
            edges = await self._get_relationships_between(
                node_ids, user_data_sources, user_classification
            )

        return GraphSubset(
            nodes=nodes,
            edges=edges,
            total_nodes=len(nodes),
            total_edges=len(edges),
        )

    async def get_centrality(
        self,
        algorithm: str = "degree",
        limit: int = 20,
        user_data_sources: list[str] | None = None,
        user_classification: str = "unclassified",
    ) -> list[dict]:
        """Get top nodes by centrality measure."""
        return await self._degree_centrality(
            limit, user_data_sources, user_classification
        )

    async def _degree_centrality(
        self,
        limit: int,
        user_data_sources: list[str] | None,
        user_classification: str,
    ) -> list[dict]:
        """Calculate degree centrality."""
        sql = """
            SELECT e.id, e.name, et.name as type,
                   COUNT(DISTINCT r.id) as degree
            FROM entities e
            LEFT JOIN entity_types et ON e.type_id = et.id
            LEFT JOIN relationships r ON (e.id = r.source_entity_id OR e.id = r.target_entity_id)
            GROUP BY e.id, e.name, et.name
            ORDER BY degree DESC
            LIMIT :limit
        """
        params: dict[str, Any] = {"limit": limit}

        result = await self.session.execute(text(sql), params)
        rows = result.fetchall()

        return [
            {
                "node_id": str(row.id),
                "name": row.name,
                "type": row.type,
                "centrality": row.degree,
            }
            for row in rows
        ]

    async def detect_communities(
        self,
        user_data_sources: list[str] | None = None,
        user_classification: str = "unclassified",
    ) -> list[dict]:
        """Detect communities using connected components."""
        sql = """
            SELECT et.name as type, COUNT(*) as member_count, array_agg(e.id) as member_ids
            FROM entities e
            LEFT JOIN entity_types et ON e.type_id = et.id
            GROUP BY et.name
        """

        result = await self.session.execute(text(sql))
        rows = result.fetchall()

        return [
            {
                "community_id": idx,
                "label": row.type or "Unknown",
                "member_count": row.member_count,
                "member_ids": [str(mid) for mid in (row.member_ids or [])[:10]],
            }
            for idx, row in enumerate(rows)
        ]

    async def _get_node(
        self,
        node_id: UUID,
        user_data_sources: list[str] | None,
        user_classification: str,
    ) -> Entity | None:
        """Get a single node by ID."""
        sql = """
            SELECT
                e.id,
                e.name,
                et.name as type,
                e.properties,
                ds.name as data_source,
                e.classification_level as classification,
                e.created_at,
                e.updated_at
            FROM entities e
            LEFT JOIN entity_types et ON e.type_id = et.id
            LEFT JOIN data_sources ds ON e.data_source_id = ds.id
            WHERE e.id = :node_id
        """
        params: dict[str, Any] = {"node_id": node_id}

        result = await self.session.execute(text(sql), params)
        row = result.fetchone()

        if not row:
            return None

        return Entity(
            id=row.id,
            name=row.name,
            type=row.type or "Unknown",
            properties=row.properties or {},
            data_source=row.data_source,
            classification=row.classification or "unclassified",
            created_at=row.created_at,
            updated_at=row.updated_at,
        )

    async def _get_node_relationships(
        self,
        node_id: UUID,
        direction: str,
        relationship_types: list[str] | None,
        user_data_sources: list[str] | None,
        user_classification: str,
    ) -> list[Relationship]:
        """Get relationships for a node."""
        if direction == "outgoing":
            condition = "r.source_entity_id = :node_id"
        elif direction == "incoming":
            condition = "r.target_entity_id = :node_id"
        else:
            condition = "(r.source_entity_id = :node_id OR r.target_entity_id = :node_id)"

        sql = f"""
            SELECT
                r.id,
                r.source_entity_id as source_id,
                r.target_entity_id as target_id,
                rt.name as type,
                r.properties,
                r.confidence as weight,
                ds.name as data_source,
                'unclassified' as classification,
                r.created_at,
                r.updated_at
            FROM relationships r
            LEFT JOIN relationship_types rt ON r.type_id = rt.id
            LEFT JOIN data_sources ds ON r.data_source_id = ds.id
            WHERE {condition}
        """
        params: dict[str, Any] = {"node_id": node_id}

        if relationship_types:
            sql += " AND rt.name = ANY(:rel_types)"
            params["rel_types"] = relationship_types

        result = await self.session.execute(text(sql), params)
        rows = result.fetchall()

        return [
            Relationship(
                id=row.id,
                source_id=row.source_id,
                target_id=row.target_id,
                type=row.type or "RELATED_TO",
                properties=row.properties or {},
                weight=row.weight or 1.0,
                data_source=row.data_source,
                classification=row.classification,
                created_at=row.created_at,
                updated_at=row.updated_at,
            )
            for row in rows
        ]

    async def _get_relationships_between(
        self,
        node_ids: list[UUID],
        user_data_sources: list[str] | None,
        user_classification: str,
    ) -> list[Relationship]:
        """Get relationships between a set of nodes."""
        sql = """
            SELECT
                r.id,
                r.source_entity_id as source_id,
                r.target_entity_id as target_id,
                rt.name as type,
                r.properties,
                r.confidence as weight,
                ds.name as data_source,
                'unclassified' as classification,
                r.created_at,
                r.updated_at
            FROM relationships r
            LEFT JOIN relationship_types rt ON r.type_id = rt.id
            LEFT JOIN data_sources ds ON r.data_source_id = ds.id
            WHERE r.source_entity_id = ANY(:node_ids) AND r.target_entity_id = ANY(:node_ids)
        """
        params: dict[str, Any] = {"node_ids": node_ids}

        result = await self.session.execute(text(sql), params)
        rows = result.fetchall()

        return [
            Relationship(
                id=row.id,
                source_id=row.source_id,
                target_id=row.target_id,
                type=row.type or "RELATED_TO",
                properties=row.properties or {},
                weight=row.weight or 1.0,
                data_source=row.data_source,
                classification=row.classification,
                created_at=row.created_at,
                updated_at=row.updated_at,
            )
            for row in rows
        ]
