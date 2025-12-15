"""AWS Bedrock client initialization and utilities."""

import json
import os
import random
from typing import Any, AsyncGenerator

import structlog

from src.core.config import settings

logger = structlog.get_logger()

# Global clients
bedrock_runtime: Any = None
bedrock_client: Any = None

# Mock mode for local development
MOCK_MODE = os.getenv("LLM_MOCK_MODE", "false").lower() == "true"


async def init_bedrock_clients() -> None:
    """Initialize Bedrock clients."""
    global bedrock_runtime, bedrock_client

    if MOCK_MODE:
        logger.info("Running in MOCK MODE - LLM responses will be simulated")
        return

    # Only import boto3 when not in mock mode
    import boto3
    from botocore.config import Config

    config = Config(
        region_name=settings.aws_region,
        retries={"max_attempts": 3, "mode": "adaptive"},
    )

    bedrock_runtime = boto3.client("bedrock-runtime", config=config)
    bedrock_client = boto3.client("bedrock", config=config)

    logger.info(
        "Bedrock clients initialized",
        region=settings.aws_region,
        model=settings.bedrock_model_id,
    )


async def invoke_claude(
    messages: list[dict[str, str]],
    system_prompt: str | None = None,
    max_tokens: int | None = None,
    temperature: float | None = None,
) -> str:
    """Invoke Claude model via Bedrock.

    Args:
        messages: List of message dicts with 'role' and 'content'
        system_prompt: Optional system prompt
        max_tokens: Maximum tokens to generate
        temperature: Sampling temperature

    Returns:
        Generated text response
    """
    if MOCK_MODE:
        return _generate_mock_response(messages)

    if bedrock_runtime is None:
        raise RuntimeError("Bedrock client not initialized")

    body = {
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": max_tokens or settings.max_tokens,
        "temperature": temperature or settings.temperature,
        "messages": messages,
    }

    if system_prompt:
        body["system"] = system_prompt

    response = bedrock_runtime.invoke_model(
        modelId=settings.bedrock_model_id,
        body=json.dumps(body),
        contentType="application/json",
        accept="application/json",
    )

    response_body = json.loads(response["body"].read())

    return response_body["content"][0]["text"]


async def stream_claude(
    messages: list[dict[str, str]],
    system_prompt: str | None = None,
    max_tokens: int | None = None,
    temperature: float | None = None,
) -> AsyncGenerator[str, None]:
    """Stream Claude model response via Bedrock.

    Args:
        messages: List of message dicts with 'role' and 'content'
        system_prompt: Optional system prompt
        max_tokens: Maximum tokens to generate
        temperature: Sampling temperature

    Yields:
        Streamed text chunks
    """
    if MOCK_MODE:
        response = _generate_mock_response(messages)
        # Simulate streaming by yielding word by word
        for word in response.split(" "):
            yield word + " "
        return

    if bedrock_runtime is None:
        raise RuntimeError("Bedrock client not initialized")

    body = {
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": max_tokens or settings.max_tokens,
        "temperature": temperature or settings.temperature,
        "messages": messages,
    }

    if system_prompt:
        body["system"] = system_prompt

    response = bedrock_runtime.invoke_model_with_response_stream(
        modelId=settings.bedrock_model_id,
        body=json.dumps(body),
        contentType="application/json",
        accept="application/json",
    )

    for event in response["body"]:
        chunk = json.loads(event["chunk"]["bytes"])
        if chunk["type"] == "content_block_delta":
            yield chunk["delta"].get("text", "")


async def get_embeddings(texts: list[str]) -> list[list[float]]:
    """Get embeddings for texts using Bedrock.

    Args:
        texts: List of texts to embed

    Returns:
        List of embedding vectors
    """
    if MOCK_MODE:
        return [_generate_mock_embedding(text) for text in texts]

    if bedrock_runtime is None:
        raise RuntimeError("Bedrock client not initialized")

    embeddings = []

    for text in texts:
        # Cohere embed model format
        body = {
            "texts": [text],
            "input_type": "search_document",
        }

        response = bedrock_runtime.invoke_model(
            modelId=settings.bedrock_embedding_model_id,
            body=json.dumps(body),
            contentType="application/json",
            accept="application/json",
        )

        response_body = json.loads(response["body"].read())
        embeddings.append(response_body["embeddings"][0])

    return embeddings


async def get_query_embedding(query: str) -> list[float]:
    """Get embedding for a search query.

    Args:
        query: Search query text

    Returns:
        Embedding vector
    """
    if MOCK_MODE:
        return _generate_mock_embedding(query)

    if bedrock_runtime is None:
        raise RuntimeError("Bedrock client not initialized")

    body = {
        "texts": [query],
        "input_type": "search_query",
    }

    response = bedrock_runtime.invoke_model(
        modelId=settings.bedrock_embedding_model_id,
        body=json.dumps(body),
        contentType="application/json",
        accept="application/json",
    )

    response_body = json.loads(response["body"].read())
    return response_body["embeddings"][0]


# ============================================
# Mock Functions for Local Development
# ============================================

def _generate_mock_response(messages: list[dict[str, str]]) -> str:
    """Generate a mock LLM response for development."""
    if not messages:
        return "I'm a mock LLM response. How can I help you?"

    last_message = messages[-1].get("content", "").lower()

    # Check for term extraction requests
    if "extract" in last_message and "term" in last_message:
        return json.dumps({
            "terms": [
                {
                    "canonical_name": "Cloud Computing",
                    "variations": ["cloud", "cloud services"],
                    "suggested_parent": "Technology",
                    "confidence": 0.92,
                    "definition": "On-demand delivery of IT resources",
                    "reasoning": "Frequently mentioned in technical context"
                },
                {
                    "canonical_name": "Zero Trust",
                    "variations": ["ZTA", "zero trust architecture"],
                    "suggested_parent": "Security",
                    "confidence": 0.88,
                    "definition": "Security model requiring verification for all access",
                    "reasoning": "Key security concept in the text"
                }
            ],
            "relationships": [
                {
                    "term1": "Zero Trust",
                    "term2": "Access Control",
                    "relationship_type": "related",
                    "confidence": 0.85
                }
            ]
        })

    # Check for entity analysis
    if "analyze" in last_message and "entity" in last_message:
        return json.dumps({
            "analysis": "This entity appears to be a technology component used in cloud infrastructure.",
            "suggested_relationships": [
                {"type": "USES", "target": "AWS GovCloud", "confidence": 0.8},
                {"type": "RELATED_TO", "target": "Container Orchestration", "confidence": 0.75}
            ],
            "vocabulary_suggestions": ["Kubernetes", "Container", "Orchestration"]
        })

    # Check for intent classification
    if "intent" in last_message or "classify" in last_message:
        return json.dumps({
            "intent": "search",
            "confidence": 0.9,
            "entities": ["Cloud Migration", "AWS"],
            "query_type": "entity_search"
        })

    # Default conversational response
    mock_responses = [
        "Based on my analysis of the knowledge graph, I found several relevant entities and relationships that might help answer your question.",
        "The data shows interesting connections between the entities you mentioned. Let me break down what I found.",
        "I've identified the following patterns in your knowledge graph that are relevant to your query.",
        "Here's what I found in the graph: there are multiple interconnected entities that relate to your question.",
    ]

    base_response = random.choice(mock_responses)

    # Add context based on the question
    if "who" in last_message:
        base_response += "\n\nKey people involved include:\n- Alice Johnson (VP of Engineering)\n- Bob Smith (Senior Developer)\n- Carol Williams (Security Architect)"
    elif "what" in last_message:
        base_response += "\n\nThe main components are:\n- Cloud Migration Initiative\n- Zero Trust Implementation\n- AWS GovCloud Infrastructure"
    elif "how" in last_message:
        base_response += "\n\nThe process involves:\n1. Authentication via MFA\n2. Authorization through RBAC/ABAC\n3. Encryption of data in transit and at rest"

    return base_response


def _generate_mock_embedding(text: str) -> list[float]:
    """Generate a deterministic mock embedding based on text hash."""
    # Use hash to generate consistent embeddings for same text
    import hashlib
    text_hash = hashlib.md5(text.encode()).hexdigest()

    # Generate 1024-dimensional embedding (typical for Cohere)
    embedding = []
    for i in range(0, min(len(text_hash) * 64, 1024)):
        # Use characters from hash to generate floats
        char_idx = i % len(text_hash)
        base_val = int(text_hash[char_idx], 16) / 16.0
        # Add some variation based on position
        val = (base_val - 0.5) * 2 + (i % 10) * 0.01
        embedding.append(round(val, 6))

    # Pad to 1024 if needed
    while len(embedding) < 1024:
        embedding.append(0.0)

    return embedding[:1024]
