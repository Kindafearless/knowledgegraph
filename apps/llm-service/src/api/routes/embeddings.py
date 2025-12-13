"""Embeddings API routes."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from src.core.bedrock import get_embeddings, get_query_embedding

router = APIRouter()


class EmbeddingRequest(BaseModel):
    """Request for generating embeddings."""

    texts: list[str]
    input_type: str = "search_document"  # or "search_query"


class EmbeddingResponse(BaseModel):
    """Response containing embeddings."""

    embeddings: list[list[float]]
    model: str
    dimensions: int


@router.post("", response_model=EmbeddingResponse)
async def create_embeddings(request: EmbeddingRequest) -> EmbeddingResponse:
    """Generate embeddings for a list of texts."""
    if not request.texts:
        raise HTTPException(status_code=400, detail="No texts provided")

    if len(request.texts) > 100:
        raise HTTPException(status_code=400, detail="Maximum 100 texts per request")

    try:
        if request.input_type == "search_query" and len(request.texts) == 1:
            embedding = await get_query_embedding(request.texts[0])
            embeddings = [embedding]
        else:
            embeddings = await get_embeddings(request.texts)

        return EmbeddingResponse(
            embeddings=embeddings,
            model="cohere.embed-english-v3",
            dimensions=len(embeddings[0]) if embeddings else 0,
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Embedding generation failed: {str(e)}")


class SimilarityRequest(BaseModel):
    """Request for computing similarity."""

    query: str
    documents: list[str]
    top_k: int = 5


class SimilarityResult(BaseModel):
    """Similarity result for a document."""

    index: int
    document: str
    score: float


class SimilarityResponse(BaseModel):
    """Response containing similarity scores."""

    results: list[SimilarityResult]


@router.post("/similarity", response_model=SimilarityResponse)
async def compute_similarity(request: SimilarityRequest) -> SimilarityResponse:
    """Compute similarity between a query and documents."""
    if not request.documents:
        raise HTTPException(status_code=400, detail="No documents provided")

    try:
        # Get query embedding
        query_embedding = await get_query_embedding(request.query)

        # Get document embeddings
        doc_embeddings = await get_embeddings(request.documents)

        # Compute cosine similarity
        results = []
        for i, doc_emb in enumerate(doc_embeddings):
            score = cosine_similarity(query_embedding, doc_emb)
            results.append(SimilarityResult(
                index=i,
                document=request.documents[i][:200],  # Truncate for response
                score=score,
            ))

        # Sort by score and return top_k
        results.sort(key=lambda x: x.score, reverse=True)
        results = results[: request.top_k]

        return SimilarityResponse(results=results)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Similarity computation failed: {str(e)}")


def cosine_similarity(a: list[float], b: list[float]) -> float:
    """Compute cosine similarity between two vectors."""
    import math

    dot_product = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(x * x for x in b))

    if norm_a == 0 or norm_b == 0:
        return 0.0

    return dot_product / (norm_a * norm_b)
