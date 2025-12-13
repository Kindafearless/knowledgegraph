"""RAG (Retrieval Augmented Generation) service."""

from typing import Any

import httpx
import structlog

from src.core.bedrock import get_query_embedding
from src.core.config import settings

logger = structlog.get_logger()


class RAGService:
    """Service for retrieval augmented generation."""

    def __init__(self):
        self.graph_service_url = settings.graph_service_url
        self.top_k = settings.top_k_results

    async def retrieve(
        self,
        query: str,
        user_data_sources: list[str] | None = None,
        user_classification: str = "unclassified",
        top_k: int | None = None,
    ) -> list[dict[str, Any]]:
        """Retrieve relevant context for a query.

        Args:
            query: Search query
            user_data_sources: User's allowed data sources
            user_classification: User's classification level
            top_k: Number of results to return

        Returns:
            List of relevant context items
        """
        k = top_k or self.top_k
        results = []

        try:
            # Get query embedding
            query_embedding = await get_query_embedding(query)

            # Search vector store for similar content
            vector_results = await self._vector_search(
                embedding=query_embedding,
                user_data_sources=user_data_sources,
                user_classification=user_classification,
                top_k=k,
            )
            results.extend(vector_results)

            # Also search graph service for entities
            graph_results = await self._graph_search(
                query=query,
                user_data_sources=user_data_sources,
                user_classification=user_classification,
                top_k=k,
            )
            results.extend(graph_results)

            # Deduplicate and rank
            results = self._deduplicate_and_rank(results, k)

        except Exception as e:
            logger.error("RAG retrieval error", error=str(e))

        return results

    async def _vector_search(
        self,
        embedding: list[float],
        user_data_sources: list[str] | None,
        user_classification: str,
        top_k: int,
    ) -> list[dict[str, Any]]:
        """Search vector store for similar content.

        This would query pgvector for similar embeddings.
        """
        # TODO: Implement actual vector search
        # For now, return empty list
        return []

    async def _graph_search(
        self,
        query: str,
        user_data_sources: list[str] | None,
        user_classification: str,
        top_k: int,
    ) -> list[dict[str, Any]]:
        """Search graph service for matching entities."""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.graph_service_url}/api/v1/entities",
                    params={
                        "search": query,
                        "page_size": top_k,
                    },
                    timeout=10.0,
                )

                if response.status_code != 200:
                    return []

                entities = response.json()

                return [
                    {
                        "id": entity["id"],
                        "type": "entity",
                        "name": entity["name"],
                        "content": self._format_entity_content(entity),
                        "score": 0.8,  # Default relevance score
                    }
                    for entity in entities
                ]

        except Exception as e:
            logger.error("Graph search error", error=str(e))
            return []

    def _format_entity_content(self, entity: dict) -> str:
        """Format an entity as readable content for LLM context."""
        content = f"Entity: {entity['name']} (Type: {entity['type']})\n"

        if entity.get("properties"):
            content += "Properties:\n"
            for key, value in entity["properties"].items():
                content += f"  - {key}: {value}\n"

        if entity.get("data_source"):
            content += f"Source: {entity['data_source']}\n"

        return content

    def _deduplicate_and_rank(
        self,
        results: list[dict[str, Any]],
        top_k: int,
    ) -> list[dict[str, Any]]:
        """Deduplicate results and rank by score."""
        # Deduplicate by ID
        seen_ids = set()
        unique_results = []

        for result in results:
            if result["id"] not in seen_ids:
                seen_ids.add(result["id"])
                unique_results.append(result)

        # Sort by score descending
        unique_results.sort(key=lambda x: x.get("score", 0), reverse=True)

        return unique_results[:top_k]

    async def index_entity(self, entity: dict) -> None:
        """Index an entity for RAG retrieval.

        Args:
            entity: Entity to index
        """
        try:
            # Generate embedding for entity content
            content = self._format_entity_content(entity)
            embedding = await get_query_embedding(content)

            # TODO: Store embedding in pgvector
            logger.info("Entity indexed", entity_id=entity["id"])

        except Exception as e:
            logger.error("Entity indexing error", error=str(e), entity_id=entity.get("id"))

    async def remove_from_index(self, entity_id: str) -> None:
        """Remove an entity from the RAG index.

        Args:
            entity_id: ID of entity to remove
        """
        # TODO: Implement removal from pgvector
        logger.info("Entity removed from index", entity_id=entity_id)
