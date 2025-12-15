"""CCV data models."""

from datetime import datetime
from enum import Enum
from typing import Any
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


class TermStatus(str, Enum):
    """Status of a CCV term."""
    DRAFT = "draft"           # Newly suggested, not reviewed
    PENDING = "pending"       # Awaiting approval
    APPROVED = "approved"     # Approved and active
    DEPRECATED = "deprecated" # No longer in use
    REJECTED = "rejected"     # Rejected suggestion


class SuggestionType(str, Enum):
    """Type of CCV suggestion."""
    NEW_TERM = "new_term"           # Suggest a new canonical term
    SYNONYM = "synonym"             # Suggest a synonym mapping
    HIERARCHY = "hierarchy"         # Suggest parent-child relationship
    MERGE = "merge"                 # Suggest merging two terms
    DEFINITION = "definition"       # Suggest/update definition
    DEPRECATION = "deprecation"     # Suggest deprecating a term


class SuggestionStatus(str, Enum):
    """Status of a suggestion."""
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    AUTO_APPROVED = "auto_approved"


# =============================================================================
# Core Term Models
# =============================================================================

class CCVTerm(BaseModel):
    """A canonical control vocabulary term."""
    id: UUID = Field(default_factory=uuid4)
    canonical_name: str
    definition: str | None = None
    domain: str | None = None  # e.g., "finance", "security", "hr"
    parent_id: UUID | None = None  # For hierarchy
    status: TermStatus = TermStatus.APPROVED

    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: UUID | None = None
    approved_by: UUID | None = None
    approved_at: datetime | None = None

    # Source tracking
    source: str | None = None  # "manual", "auto_extracted", "imported"
    confidence: float = 1.0  # For auto-extracted terms

    # Usage statistics
    usage_count: int = 0
    last_used_at: datetime | None = None


class CCVSynonym(BaseModel):
    """A synonym or alias for a CCV term."""
    id: UUID = Field(default_factory=uuid4)
    term_id: UUID  # The canonical term this is a synonym for
    synonym: str
    source: str | None = None  # Where this synonym was found
    data_source_id: str | None = None  # Which data source uses this variant
    confidence: float = 1.0
    status: TermStatus = TermStatus.APPROVED
    created_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: UUID | None = None


class CCVRelationship(BaseModel):
    """A relationship between CCV terms (beyond parent-child)."""
    id: UUID = Field(default_factory=uuid4)
    source_term_id: UUID
    target_term_id: UUID
    relationship_type: str  # "related_to", "see_also", "broader_than", "narrower_than"
    confidence: float = 1.0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: UUID | None = None


# =============================================================================
# Suggestion Models
# =============================================================================

class CCVSuggestion(BaseModel):
    """A suggestion for CCV update."""
    id: UUID = Field(default_factory=uuid4)
    suggestion_type: SuggestionType
    status: SuggestionStatus = SuggestionStatus.PENDING
    confidence: float  # LLM confidence score

    # What's being suggested
    suggested_value: str
    context: str | None = None  # The context where this was found

    # Related entities
    term_id: UUID | None = None  # Existing term (for synonyms, hierarchy, etc.)
    related_term_id: UUID | None = None  # For merges, relationships
    parent_term_id: UUID | None = None  # For hierarchy suggestions

    # Source tracking
    source_entity_id: UUID | None = None  # Graph entity that triggered this
    source_data_source: str | None = None
    source_text: str | None = None  # Original text that was analyzed

    # LLM reasoning
    llm_reasoning: str | None = None
    alternative_suggestions: list[str] = Field(default_factory=list)

    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    reviewed_at: datetime | None = None
    reviewed_by: UUID | None = None
    review_notes: str | None = None


class DataSourceMapping(BaseModel):
    """Maps a data source field value to a CCV term."""
    id: UUID = Field(default_factory=uuid4)
    term_id: UUID
    data_source_id: str
    original_value: str  # The value as it appears in the source
    field_path: str | None = None  # e.g., "employee.department"
    confidence: float = 1.0
    is_auto_mapped: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)


# =============================================================================
# API Request/Response Models
# =============================================================================

class TermCreate(BaseModel):
    """Request to create a new term."""
    canonical_name: str
    definition: str | None = None
    domain: str | None = None
    parent_id: UUID | None = None
    synonyms: list[str] = Field(default_factory=list)


class TermUpdate(BaseModel):
    """Request to update a term."""
    canonical_name: str | None = None
    definition: str | None = None
    domain: str | None = None
    parent_id: UUID | None = None
    status: TermStatus | None = None


class SynonymCreate(BaseModel):
    """Request to add a synonym."""
    synonym: str
    data_source_id: str | None = None


class SuggestionReview(BaseModel):
    """Request to review a suggestion."""
    action: str  # "approve", "reject", "modify"
    modified_value: str | None = None  # If action is "modify"
    notes: str | None = None


class TermWithDetails(BaseModel):
    """Term with all related data."""
    term: CCVTerm
    synonyms: list[CCVSynonym] = Field(default_factory=list)
    children: list["TermWithDetails"] = Field(default_factory=list)
    parent: CCVTerm | None = None
    relationships: list[CCVRelationship] = Field(default_factory=list)
    mappings: list[DataSourceMapping] = Field(default_factory=list)
    pending_suggestions: int = 0


class HierarchyNode(BaseModel):
    """A node in the term hierarchy tree."""
    term: CCVTerm
    children: list["HierarchyNode"] = Field(default_factory=list)
    synonym_count: int = 0
    usage_count: int = 0


class TermSearchResult(BaseModel):
    """Search result for terms."""
    term: CCVTerm
    match_type: str  # "canonical", "synonym", "definition"
    matched_text: str
    score: float


# =============================================================================
# Event Models (for real-time updates)
# =============================================================================

class CCVEvent(BaseModel):
    """Event for real-time CCV updates."""
    event_type: str  # "term_created", "term_updated", "suggestion_created", etc.
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    data: dict[str, Any]
    user_id: UUID | None = None


# Enable forward references
TermWithDetails.model_rebuild()
HierarchyNode.model_rebuild()
