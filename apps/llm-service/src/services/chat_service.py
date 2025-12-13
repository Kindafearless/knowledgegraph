"""Chat service for LLM interactions."""

from typing import Any, AsyncGenerator

import structlog

from src.core.bedrock import invoke_claude, stream_claude

logger = structlog.get_logger()

SYSTEM_PROMPT = """You are an AI assistant for a knowledge graph application. Your role is to help users explore and understand their data through natural language.

You have access to a knowledge graph containing entities (people, organizations, concepts, documents) and their relationships. When answering questions:

1. Use the provided context from the knowledge graph to inform your responses
2. Be precise about relationships and connections between entities
3. Cite sources when referencing specific data
4. Suggest follow-up queries or visualizations when appropriate
5. If you don't have enough information, say so clearly

When the user asks about relationships or connections, structure your response to be clear about:
- The entities involved
- The type of relationship
- Any relevant properties or metadata

You can suggest graph actions like:
- Searching for specific entities
- Expanding nodes to show connections
- Filtering by relationship types
- Running analytics queries

Always maintain the security context - only reference data the user has access to."""

INTENT_CLASSIFICATION_PROMPT = """Classify the user's intent into one of these categories:
- graph_query: User wants to query the knowledge graph (find entities, relationships, paths)
- search: User wants to search for information
- analysis: User wants analytical insights (centrality, clustering, patterns)
- explanation: User wants explanation of concepts or data
- action: User wants to perform an action (create, update, delete)
- general: General conversation or questions

User message: {message}

Respond with just the category name."""


class ChatService:
    """Service for chat interactions with LLM."""

    async def classify_intent(self, message: str) -> str:
        """Classify the intent of a user message.

        Args:
            message: User's message

        Returns:
            Intent category
        """
        prompt = INTENT_CLASSIFICATION_PROMPT.format(message=message)
        messages = [{"role": "user", "content": prompt}]

        response = await invoke_claude(
            messages=messages,
            max_tokens=50,
            temperature=0.1,
        )

        intent = response.strip().lower()

        # Validate intent
        valid_intents = ["graph_query", "search", "analysis", "explanation", "action", "general"]
        if intent not in valid_intents:
            intent = "general"

        return intent

    async def generate_response(
        self,
        message: str,
        history: list[dict[str, str]],
        context: list[str],
        intent: str,
    ) -> str:
        """Generate a response to the user's message.

        Args:
            message: User's message
            history: Conversation history
            context: Retrieved context from RAG
            intent: Classified intent

        Returns:
            Generated response
        """
        # Build messages list
        messages = []

        # Add history
        for msg in history[-10:]:  # Last 10 messages
            messages.append({
                "role": msg.get("role", "user"),
                "content": msg.get("content", ""),
            })

        # Build context-aware prompt
        user_content = message
        if context:
            context_text = "\n\n".join(context)
            user_content = f"""Based on the following context from the knowledge graph:

{context_text}

User question: {message}"""

        messages.append({"role": "user", "content": user_content})

        response = await invoke_claude(
            messages=messages,
            system_prompt=SYSTEM_PROMPT,
        )

        return response

    async def stream_response(
        self,
        message: str,
        history: list[dict[str, str]],
        context: list[str],
    ) -> AsyncGenerator[str, None]:
        """Stream a response to the user's message.

        Args:
            message: User's message
            history: Conversation history
            context: Retrieved context from RAG

        Yields:
            Response chunks
        """
        messages = []

        for msg in history[-10:]:
            messages.append({
                "role": msg.get("role", "user"),
                "content": msg.get("content", ""),
            })

        user_content = message
        if context:
            context_text = "\n\n".join(context)
            user_content = f"""Based on the following context:

{context_text}

User question: {message}"""

        messages.append({"role": "user", "content": user_content})

        async for chunk in stream_claude(messages=messages, system_prompt=SYSTEM_PROMPT):
            yield chunk

    async def extract_graph_action(
        self,
        message: str,
        rag_results: list[dict],
    ) -> dict[str, Any] | None:
        """Extract a graph action from the user's query.

        Args:
            message: User's message
            rag_results: Retrieved RAG results

        Returns:
            Graph action dict or None
        """
        # Check if we found specific entities
        entity_ids = [r["id"] for r in rag_results if r.get("type") == "entity"]

        if not entity_ids:
            return None

        # Determine action type based on message
        message_lower = message.lower()

        if any(word in message_lower for word in ["connect", "relationship", "path", "between"]):
            return {
                "type": "search",
                "query": message,
                "entity_ids": entity_ids[:5],  # Limit to 5 entities
            }

        if any(word in message_lower for word in ["expand", "show", "related", "connected"]):
            return {
                "type": "expand",
                "node_id": entity_ids[0],
                "depth": 1,
            }

        return {
            "type": "search",
            "query": message,
            "entity_ids": entity_ids[:3],
        }

    async def analyze_query(self, message: str) -> dict[str, Any]:
        """Analyze a query to extract structured information.

        Args:
            message: User's message

        Returns:
            Analysis results
        """
        analysis_prompt = f"""Analyze this query and extract:
1. Named entities mentioned (people, organizations, concepts)
2. Relationship types being asked about
3. Time constraints if any
4. Suggested graph operations

Query: {message}

Respond in JSON format with keys: entities, relationships, time_constraints, suggested_operations"""

        messages = [{"role": "user", "content": analysis_prompt}]

        response = await invoke_claude(
            messages=messages,
            max_tokens=500,
            temperature=0.1,
        )

        # Parse response (handle potential JSON parsing issues)
        try:
            import json
            # Try to extract JSON from response
            start = response.find("{")
            end = response.rfind("}") + 1
            if start != -1 and end > start:
                return json.loads(response[start:end])
        except Exception:
            pass

        return {
            "entities": [],
            "relationships": [],
            "time_constraints": None,
            "suggested_operations": [],
            "raw_analysis": response,
        }
