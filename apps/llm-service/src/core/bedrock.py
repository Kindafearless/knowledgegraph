"""AWS Bedrock client initialization and utilities."""

import json
from typing import Any, AsyncGenerator

import boto3
import structlog
from botocore.config import Config

from src.core.config import settings

logger = structlog.get_logger()

# Global clients
bedrock_runtime: Any = None
bedrock_client: Any = None


async def init_bedrock_clients() -> None:
    """Initialize Bedrock clients."""
    global bedrock_runtime, bedrock_client

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
