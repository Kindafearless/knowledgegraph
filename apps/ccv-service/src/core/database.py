"""Database connection and session management."""

from typing import AsyncGenerator

import structlog
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from src.core.config import settings

logger = structlog.get_logger()

engine = create_async_engine(
    settings.database_url,
    echo=settings.environment == "development",
    pool_size=20,
    max_overflow=10,
)

async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def init_db() -> None:
    """Initialize database connection and create tables."""
    logger.info("Initializing database connection")

    async with engine.begin() as conn:
        # Create CCV tables if they don't exist
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS ccv_terms (
                id UUID PRIMARY KEY,
                canonical_name VARCHAR(500) NOT NULL,
                definition TEXT,
                domain VARCHAR(100),
                parent_id UUID REFERENCES ccv_terms(id),
                status VARCHAR(50) NOT NULL DEFAULT 'approved',
                created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
                created_by UUID,
                approved_by UUID,
                approved_at TIMESTAMP,
                source VARCHAR(100),
                confidence FLOAT DEFAULT 1.0,
                usage_count INT DEFAULT 0,
                last_used_at TIMESTAMP
            )
        """))

        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS ccv_synonyms (
                id UUID PRIMARY KEY,
                term_id UUID NOT NULL REFERENCES ccv_terms(id) ON DELETE CASCADE,
                synonym VARCHAR(500) NOT NULL,
                source VARCHAR(100),
                data_source_id VARCHAR(100),
                confidence FLOAT DEFAULT 1.0,
                status VARCHAR(50) NOT NULL DEFAULT 'approved',
                created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                created_by UUID
            )
        """))

        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS ccv_relationships (
                id UUID PRIMARY KEY,
                source_term_id UUID NOT NULL REFERENCES ccv_terms(id) ON DELETE CASCADE,
                target_term_id UUID NOT NULL REFERENCES ccv_terms(id) ON DELETE CASCADE,
                relationship_type VARCHAR(100) NOT NULL,
                confidence FLOAT DEFAULT 1.0,
                created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                created_by UUID
            )
        """))

        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS ccv_suggestions (
                id UUID PRIMARY KEY,
                suggestion_type VARCHAR(50) NOT NULL,
                status VARCHAR(50) NOT NULL DEFAULT 'pending',
                confidence FLOAT NOT NULL,
                suggested_value TEXT NOT NULL,
                context TEXT,
                term_id UUID REFERENCES ccv_terms(id),
                related_term_id UUID REFERENCES ccv_terms(id),
                parent_term_id UUID REFERENCES ccv_terms(id),
                source_entity_id UUID,
                source_data_source VARCHAR(100),
                source_text TEXT,
                llm_reasoning TEXT,
                alternative_suggestions JSONB,
                created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                reviewed_at TIMESTAMP,
                reviewed_by UUID,
                review_notes TEXT
            )
        """))

        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS ccv_data_source_mappings (
                id UUID PRIMARY KEY,
                term_id UUID NOT NULL REFERENCES ccv_terms(id) ON DELETE CASCADE,
                data_source_id VARCHAR(100) NOT NULL,
                original_value VARCHAR(500) NOT NULL,
                field_path VARCHAR(200),
                confidence FLOAT DEFAULT 1.0,
                is_auto_mapped BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP NOT NULL DEFAULT NOW()
            )
        """))

        # Create indexes
        await conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_ccv_terms_canonical ON ccv_terms(canonical_name);
            CREATE INDEX IF NOT EXISTS idx_ccv_terms_domain ON ccv_terms(domain);
            CREATE INDEX IF NOT EXISTS idx_ccv_terms_parent ON ccv_terms(parent_id);
            CREATE INDEX IF NOT EXISTS idx_ccv_terms_status ON ccv_terms(status);
            CREATE INDEX IF NOT EXISTS idx_ccv_synonyms_term ON ccv_synonyms(term_id);
            CREATE INDEX IF NOT EXISTS idx_ccv_synonyms_synonym ON ccv_synonyms(synonym);
            CREATE INDEX IF NOT EXISTS idx_ccv_suggestions_status ON ccv_suggestions(status);
            CREATE INDEX IF NOT EXISTS idx_ccv_mappings_source ON ccv_data_source_mappings(data_source_id);
        """))

        # Full-text search index
        await conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_ccv_terms_search
            ON ccv_terms USING gin(to_tsvector('english', canonical_name || ' ' || COALESCE(definition, '')));
        """))

    logger.info("Database initialized")


async def close_db() -> None:
    """Close database connection."""
    logger.info("Closing database connection")
    await engine.dispose()


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """Get database session dependency."""
    async with async_session_maker() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
