-- CCV (Canonical Control Vocabulary) Service Schema

-- CCV Terms (canonical vocabulary)
CREATE TABLE IF NOT EXISTS ccv_terms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    canonical_name VARCHAR(500) NOT NULL,
    definition TEXT,
    domain VARCHAR(100),
    parent_id UUID REFERENCES ccv_terms(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'deprecated', 'rejected')),
    source VARCHAR(100) DEFAULT 'manual' CHECK (source IN ('manual', 'auto_extracted', 'imported')),
    confidence FLOAT DEFAULT 1.0,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(canonical_name, domain)
);

-- CCV Synonyms
CREATE TABLE IF NOT EXISTS ccv_synonyms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    term_id UUID REFERENCES ccv_terms(id) ON DELETE CASCADE,
    synonym VARCHAR(500) NOT NULL,
    source VARCHAR(100) DEFAULT 'manual',
    data_source_id UUID,
    confidence FLOAT DEFAULT 1.0,
    status VARCHAR(50) DEFAULT 'approved',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(term_id, synonym)
);

-- CCV Term Relationships (broader/narrower/related)
CREATE TABLE IF NOT EXISTS ccv_term_relationships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_term_id UUID REFERENCES ccv_terms(id) ON DELETE CASCADE,
    target_term_id UUID REFERENCES ccv_terms(id) ON DELETE CASCADE,
    relationship_type VARCHAR(50) NOT NULL CHECK (relationship_type IN ('broader', 'narrower', 'related', 'synonym', 'see_also')),
    confidence FLOAT DEFAULT 1.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(source_term_id, target_term_id, relationship_type)
);

-- CCV Suggestions (LLM-generated)
CREATE TABLE IF NOT EXISTS ccv_suggestions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    suggestion_type VARCHAR(50) NOT NULL CHECK (suggestion_type IN ('new_term', 'synonym', 'hierarchy', 'merge', 'definition')),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'auto_approved')),
    confidence FLOAT NOT NULL,
    suggested_value TEXT NOT NULL,
    context TEXT,
    term_id UUID REFERENCES ccv_terms(id) ON DELETE CASCADE,
    related_term_id UUID REFERENCES ccv_terms(id) ON DELETE SET NULL,
    parent_term_id UUID REFERENCES ccv_terms(id) ON DELETE SET NULL,
    source_entity_id UUID,
    source_data_source VARCHAR(255),
    source_text TEXT,
    llm_reasoning TEXT,
    alternative_suggestions JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by UUID,
    review_notes TEXT
);

-- CCV Entity Mappings (linking entities to canonical terms)
CREATE TABLE IF NOT EXISTS ccv_entity_mappings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_id UUID NOT NULL,
    term_id UUID REFERENCES ccv_terms(id) ON DELETE CASCADE,
    mapping_type VARCHAR(50) DEFAULT 'exact' CHECK (mapping_type IN ('exact', 'broad', 'narrow', 'related')),
    confidence FLOAT DEFAULT 1.0,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(entity_id, term_id)
);

-- CCV Import Jobs
CREATE TABLE IF NOT EXISTS ccv_import_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    source_type VARCHAR(100) NOT NULL,
    source_config JSONB,
    status VARCHAR(50) DEFAULT 'pending',
    terms_imported INTEGER DEFAULT 0,
    terms_skipped INTEGER DEFAULT 0,
    errors JSONB DEFAULT '[]',
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- CCV Audit Log
CREATE TABLE IF NOT EXISTS ccv_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    term_id UUID REFERENCES ccv_terms(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    previous_values JSONB,
    new_values JSONB,
    changed_by UUID,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ccv_terms_name ON ccv_terms USING gin(canonical_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_ccv_terms_domain ON ccv_terms(domain);
CREATE INDEX IF NOT EXISTS idx_ccv_terms_parent ON ccv_terms(parent_id);
CREATE INDEX IF NOT EXISTS idx_ccv_terms_status ON ccv_terms(status);
CREATE INDEX IF NOT EXISTS idx_ccv_synonyms_term ON ccv_synonyms(term_id);
CREATE INDEX IF NOT EXISTS idx_ccv_synonyms_text ON ccv_synonyms USING gin(synonym gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_ccv_suggestions_status ON ccv_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_ccv_suggestions_type ON ccv_suggestions(suggestion_type);
CREATE INDEX IF NOT EXISTS idx_ccv_suggestions_created ON ccv_suggestions(created_at);
CREATE INDEX IF NOT EXISTS idx_ccv_entity_mappings_entity ON ccv_entity_mappings(entity_id);
CREATE INDEX IF NOT EXISTS idx_ccv_entity_mappings_term ON ccv_entity_mappings(term_id);
CREATE INDEX IF NOT EXISTS idx_ccv_audit_term ON ccv_audit_log(term_id);
