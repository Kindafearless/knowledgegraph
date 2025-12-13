"""Chat API routes."""

from typing import Annotated

import httpx
import structlog
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from src.core.config import settings
from src.services.chat_service import ChatService
from src.services.rag_service import RAGService

logger = structlog.get_logger()
router = APIRouter()


class ChatMessage(BaseModel):
    """Chat message model."""

    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    """Chat request model."""

    message: str
    history: list[ChatMessage] = []
    include_graph_context: bool = True
    stream: bool = False


class ChatResponse(BaseModel):
    """Chat response model."""

    message: str
    sources: list[dict] = []
    graph_action: dict | None = None


def get_chat_service() -> ChatService:
    """Dependency to get chat service."""
    return ChatService()


def get_rag_service() -> RAGService:
    """Dependency to get RAG service."""
    return RAGService()


@router.post("", response_model=ChatResponse)
async def chat(
    request: Request,
    chat_request: ChatRequest,
    chat_service: Annotated[ChatService, Depends(get_chat_service)],
    rag_service: Annotated[RAGService, Depends(get_rag_service)],
) -> ChatResponse:
    """Process a chat message and return a response."""
    # Get user context from auth middleware
    user_id = getattr(request.state, "user_id", None)
    user_data_sources = getattr(request.state, "data_sources", [])
    user_classification = getattr(request.state, "classification", "unclassified")

    try:
        # Classify intent
        intent = await chat_service.classify_intent(chat_request.message)
        logger.info("Intent classified", intent=intent, user_id=user_id)

        # Get relevant context from RAG if needed
        context = []
        sources = []
        graph_action = None

        if chat_request.include_graph_context and intent in ["graph_query", "search", "analysis"]:
            # Retrieve relevant graph context
            rag_results = await rag_service.retrieve(
                query=chat_request.message,
                user_data_sources=user_data_sources,
                user_classification=user_classification,
            )
            context = [r["content"] for r in rag_results]
            sources = [{"id": r["id"], "type": r["type"], "name": r["name"]} for r in rag_results]

            # Determine if we should execute a graph action
            if intent == "graph_query":
                graph_action = await chat_service.extract_graph_action(
                    chat_request.message,
                    rag_results,
                )

        # Generate response
        response_text = await chat_service.generate_response(
            message=chat_request.message,
            history=chat_request.history,
            context=context,
            intent=intent,
        )

        return ChatResponse(
            message=response_text,
            sources=sources,
            graph_action=graph_action,
        )

    except Exception as e:
        logger.error("Chat processing error", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to process chat message")


@router.post("/stream")
async def chat_stream(
    request: Request,
    chat_request: ChatRequest,
    chat_service: Annotated[ChatService, Depends(get_chat_service)],
    rag_service: Annotated[RAGService, Depends(get_rag_service)],
) -> StreamingResponse:
    """Process a chat message and stream the response."""
    user_data_sources = getattr(request.state, "data_sources", [])
    user_classification = getattr(request.state, "classification", "unclassified")

    async def generate():
        try:
            # Get context if needed
            context = []
            if chat_request.include_graph_context:
                rag_results = await rag_service.retrieve(
                    query=chat_request.message,
                    user_data_sources=user_data_sources,
                    user_classification=user_classification,
                )
                context = [r["content"] for r in rag_results]

            # Stream response
            async for chunk in chat_service.stream_response(
                message=chat_request.message,
                history=chat_request.history,
                context=context,
            ):
                yield f"data: {chunk}\n\n"

            yield "data: [DONE]\n\n"

        except Exception as e:
            logger.error("Stream error", error=str(e))
            yield f"data: Error: {str(e)}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )


@router.post("/analyze")
async def analyze_query(
    request: Request,
    chat_request: ChatRequest,
    chat_service: Annotated[ChatService, Depends(get_chat_service)],
) -> dict:
    """Analyze a query to extract entities, intent, and suggested actions."""
    analysis = await chat_service.analyze_query(chat_request.message)
    return analysis
