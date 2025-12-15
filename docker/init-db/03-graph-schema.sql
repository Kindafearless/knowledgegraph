-- Graph Service Schema

-- Data Sources
CREATE TABLE IF NOT EXISTS data_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL,
    connection_config JSONB NOT NULL DEFAULT '{}',
    schema_mapping JSONB,
    classification_level VARCHAR(50) DEFAULT 'unclassified',
    is_active BOOLEAN DEFAULT true,
    last_sync TIMESTAMP WITH TIME ZONE,
    sync_status VARCHAR(50) DEFAULT 'pending',
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Entity Types
CREATE TABLE IF NOT EXISTS entity_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    schema JSONB DEFAULT '{}',
    display_config JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Entities (Graph Nodes)
CREATE TABLE IF NOT EXISTS entities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type_id UUID REFERENCES entity_types(id),
    name VARCHAR(500) NOT NULL,
    properties JSONB DEFAULT '{}',
    data_source_id UUID REFERENCES data_sources(id),
    external_id VARCHAR(500),
    classification_level VARCHAR(50) DEFAULT 'unclassified',
    confidence FLOAT DEFAULT 1.0,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(data_source_id, external_id)
);

-- Relationship Types
CREATE TABLE IF NOT EXISTS relationship_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    source_type_id UUID REFERENCES entity_types(id),
    target_type_id UUID REFERENCES entity_types(id),
    properties_schema JSONB DEFAULT '{}',
    is_directional BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Relationships (Graph Edges)
CREATE TABLE IF NOT EXISTS relationships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type_id UUID REFERENCES relationship_types(id),
    source_entity_id UUID REFERENCES entities(id) ON DELETE CASCADE,
    target_entity_id UUID REFERENCES entities(id) ON DELETE CASCADE,
    properties JSONB DEFAULT '{}',
    data_source_id UUID REFERENCES data_sources(id),
    confidence FLOAT DEFAULT 1.0,
    is_inferred BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Entity Embeddings for semantic search
CREATE TABLE IF NOT EXISTS entity_embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_id UUID REFERENCES entities(id) ON DELETE CASCADE,
    embedding_type VARCHAR(100) NOT NULL,
    embedding FLOAT[] NOT NULL,
    model_version VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(entity_id, embedding_type)
);

-- Graph Queries (saved queries)
CREATE TABLE IF NOT EXISTS saved_queries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    query_type VARCHAR(50) NOT NULL,
    query_config JSONB NOT NULL,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Entity change history
CREATE TABLE IF NOT EXISTS entity_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_id UUID REFERENCES entities(id) ON DELETE CASCADE,
    change_type VARCHAR(50) NOT NULL,
    previous_values JSONB,
    new_values JSONB,
    changed_by UUID,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_entities_type ON entities(type_id);
CREATE INDEX IF NOT EXISTS idx_entities_data_source ON entities(data_source_id);
CREATE INDEX IF NOT EXISTS idx_entities_name ON entities USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_entities_properties ON entities USING gin(properties);
CREATE INDEX IF NOT EXISTS idx_relationships_source ON relationships(source_entity_id);
CREATE INDEX IF NOT EXISTS idx_relationships_target ON relationships(target_entity_id);
CREATE INDEX IF NOT EXISTS idx_relationships_type ON relationships(type_id);
CREATE INDEX IF NOT EXISTS idx_entity_embeddings_entity ON entity_embeddings(entity_id);
CREATE INDEX IF NOT EXISTS idx_entity_history_entity ON entity_history(entity_id);
