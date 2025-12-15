-- Seed Data for Development

-- ============================================
-- AUTH SERVICE SEED DATA
-- ============================================

-- Default Roles
INSERT INTO roles (id, name, description, is_system) VALUES
    ('11111111-1111-1111-1111-111111111111', 'admin', 'Full system administrator', true),
    ('22222222-2222-2222-2222-222222222222', 'analyst', 'Data analyst with read/write access', true),
    ('33333333-3333-3333-3333-333333333333', 'viewer', 'Read-only access', true),
    ('44444444-4444-4444-4444-444444444444', 'data_steward', 'Manages data sources and vocabulary', true)
ON CONFLICT (name) DO NOTHING;

-- Default Permissions
INSERT INTO permissions (id, name, description, resource, action) VALUES
    -- User permissions
    ('a1111111-1111-1111-1111-111111111111', 'user:read', 'View users', 'user', 'read'),
    ('a2222222-2222-2222-2222-222222222222', 'user:write', 'Create/edit users', 'user', 'write'),
    ('a3333333-3333-3333-3333-333333333333', 'user:delete', 'Delete users', 'user', 'delete'),
    -- Data source permissions
    ('b1111111-1111-1111-1111-111111111111', 'datasource:read', 'View data sources', 'datasource', 'read'),
    ('b2222222-2222-2222-2222-222222222222', 'datasource:write', 'Create/edit data sources', 'datasource', 'write'),
    ('b3333333-3333-3333-3333-333333333333', 'datasource:delete', 'Delete data sources', 'datasource', 'delete'),
    -- Entity permissions
    ('c1111111-1111-1111-1111-111111111111', 'entity:read', 'View entities', 'entity', 'read'),
    ('c2222222-2222-2222-2222-222222222222', 'entity:write', 'Create/edit entities', 'entity', 'write'),
    ('c3333333-3333-3333-3333-333333333333', 'entity:delete', 'Delete entities', 'entity', 'delete'),
    -- CCV permissions
    ('d1111111-1111-1111-1111-111111111111', 'ccv:read', 'View vocabulary', 'ccv', 'read'),
    ('d2222222-2222-2222-2222-222222222222', 'ccv:write', 'Create/edit vocabulary', 'ccv', 'write'),
    ('d3333333-3333-3333-3333-333333333333', 'ccv:approve', 'Approve vocabulary suggestions', 'ccv', 'approve'),
    -- Settings permissions
    ('e1111111-1111-1111-1111-111111111111', 'settings:read', 'View settings', 'settings', 'read'),
    ('e2222222-2222-2222-2222-222222222222', 'settings:write', 'Modify settings', 'settings', 'write'),
    ('e3333333-3333-3333-3333-333333333333', 'permissions:read', 'View permissions', 'permissions', 'read')
ON CONFLICT (name) DO NOTHING;

-- Role-Permission mappings
-- Admin gets all permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT '11111111-1111-1111-1111-111111111111', id FROM permissions
ON CONFLICT DO NOTHING;

-- Analyst permissions
INSERT INTO role_permissions (role_id, permission_id) VALUES
    ('22222222-2222-2222-2222-222222222222', 'b1111111-1111-1111-1111-111111111111'),
    ('22222222-2222-2222-2222-222222222222', 'c1111111-1111-1111-1111-111111111111'),
    ('22222222-2222-2222-2222-222222222222', 'c2222222-2222-2222-2222-222222222222'),
    ('22222222-2222-2222-2222-222222222222', 'd1111111-1111-1111-1111-111111111111'),
    ('22222222-2222-2222-2222-222222222222', 'd2222222-2222-2222-2222-222222222222')
ON CONFLICT DO NOTHING;

-- Viewer permissions
INSERT INTO role_permissions (role_id, permission_id) VALUES
    ('33333333-3333-3333-3333-333333333333', 'b1111111-1111-1111-1111-111111111111'),
    ('33333333-3333-3333-3333-333333333333', 'c1111111-1111-1111-1111-111111111111'),
    ('33333333-3333-3333-3333-333333333333', 'd1111111-1111-1111-1111-111111111111')
ON CONFLICT DO NOTHING;

-- Data steward permissions
INSERT INTO role_permissions (role_id, permission_id) VALUES
    ('44444444-4444-4444-4444-444444444444', 'b1111111-1111-1111-1111-111111111111'),
    ('44444444-4444-4444-4444-444444444444', 'b2222222-2222-2222-2222-222222222222'),
    ('44444444-4444-4444-4444-444444444444', 'c1111111-1111-1111-1111-111111111111'),
    ('44444444-4444-4444-4444-444444444444', 'd1111111-1111-1111-1111-111111111111'),
    ('44444444-4444-4444-4444-444444444444', 'd2222222-2222-2222-2222-222222222222'),
    ('44444444-4444-4444-4444-444444444444', 'd3333333-3333-3333-3333-333333333333')
ON CONFLICT DO NOTHING;

-- Test Users (password is 'password123' hashed with bcrypt)
INSERT INTO users (id, email, name, password_hash, classification_level, organization, department, is_active) VALUES
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'admin@example.com', 'Admin User', '$2a$10$rQEY7qXWwV6v7F9v9VJW8eMxwvS3FYr6dOJMBjLhBm5mH5q5hqZGe', 'secret', 'Acme Corp', 'IT', true),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'analyst@example.com', 'Data Analyst', '$2a$10$rQEY7qXWwV6v7F9v9VJW8eMxwvS3FYr6dOJMBjLhBm5mH5q5hqZGe', 'confidential', 'Acme Corp', 'Analytics', true),
    ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'viewer@example.com', 'Report Viewer', '$2a$10$rQEY7qXWwV6v7F9v9VJW8eMxwvS3FYr6dOJMBjLhBm5mH5q5hqZGe', 'unclassified', 'Acme Corp', 'Operations', true),
    ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'steward@example.com', 'Data Steward', '$2a$10$rQEY7qXWwV6v7F9v9VJW8eMxwvS3FYr6dOJMBjLhBm5mH5q5hqZGe', 'secret', 'Acme Corp', 'Data Governance', true)
ON CONFLICT (email) DO NOTHING;

-- Assign roles to users
INSERT INTO user_roles (user_id, role_id) VALUES
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111'),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222'),
    ('cccccccc-cccc-cccc-cccc-cccccccccccc', '33333333-3333-3333-3333-333333333333'),
    ('dddddddd-dddd-dddd-dddd-dddddddddddd', '44444444-4444-4444-4444-444444444444')
ON CONFLICT DO NOTHING;

-- ============================================
-- GRAPH SERVICE SEED DATA
-- ============================================

-- Entity Types
INSERT INTO entity_types (id, name, description, schema, display_config) VALUES
    ('10000000-0000-0000-0000-000000000001', 'Person', 'A human individual',
     '{"properties": {"title": "string", "department": "string", "email": "string"}}',
     '{"color": "#4F46E5", "icon": "user"}'),
    ('10000000-0000-0000-0000-000000000002', 'Organization', 'A company or institution',
     '{"properties": {"industry": "string", "size": "string", "founded": "date"}}',
     '{"color": "#059669", "icon": "building"}'),
    ('10000000-0000-0000-0000-000000000003', 'Project', 'A work initiative or program',
     '{"properties": {"status": "string", "budget": "number", "start_date": "date", "end_date": "date"}}',
     '{"color": "#D97706", "icon": "folder"}'),
    ('10000000-0000-0000-0000-000000000004', 'Technology', 'A technology, tool, or system',
     '{"properties": {"version": "string", "vendor": "string", "category": "string"}}',
     '{"color": "#7C3AED", "icon": "cpu"}'),
    ('10000000-0000-0000-0000-000000000005', 'Document', 'A document or artifact',
     '{"properties": {"type": "string", "classification": "string", "version": "string"}}',
     '{"color": "#DC2626", "icon": "file-text"}'),
    ('10000000-0000-0000-0000-000000000006', 'Control', 'A security or compliance control',
     '{"properties": {"framework": "string", "category": "string", "status": "string"}}',
     '{"color": "#0891B2", "icon": "shield"}')
ON CONFLICT (name) DO NOTHING;

-- Relationship Types
INSERT INTO relationship_types (id, name, description, source_type_id, target_type_id, is_directional) VALUES
    ('20000000-0000-0000-0000-000000000001', 'WORKS_FOR', 'Person works for Organization',
     '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', true),
    ('20000000-0000-0000-0000-000000000002', 'MANAGES', 'Person manages Project',
     '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', true),
    ('20000000-0000-0000-0000-000000000003', 'USES', 'Project uses Technology',
     '10000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000004', true),
    ('20000000-0000-0000-0000-000000000004', 'AUTHORED', 'Person authored Document',
     '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000005', true),
    ('20000000-0000-0000-0000-000000000005', 'IMPLEMENTS', 'Project implements Control',
     '10000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000006', true),
    ('20000000-0000-0000-0000-000000000006', 'REPORTS_TO', 'Person reports to Person',
     '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', true),
    ('20000000-0000-0000-0000-000000000007', 'RELATED_TO', 'General relationship',
     NULL, NULL, false),
    ('20000000-0000-0000-0000-000000000008', 'DEPENDS_ON', 'Technology depends on Technology',
     '10000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000004', true)
ON CONFLICT (name) DO NOTHING;

-- Data Sources
INSERT INTO data_sources (id, name, type, connection_config, classification_level, is_active, sync_status) VALUES
    ('30000000-0000-0000-0000-000000000001', 'HR System', 'postgresql',
     '{"description": "Employee and organization data"}', 'confidential', true, 'synced'),
    ('30000000-0000-0000-0000-000000000002', 'Project Management', 'api',
     '{"description": "Project and task tracking data"}', 'unclassified', true, 'synced'),
    ('30000000-0000-0000-0000-000000000003', 'IT Asset Database', 'postgresql',
     '{"description": "Technology and infrastructure inventory"}', 'confidential', true, 'synced'),
    ('30000000-0000-0000-0000-000000000004', 'Document Repository', 'sharepoint',
     '{"description": "Corporate documents and policies"}', 'secret', true, 'synced'),
    ('30000000-0000-0000-0000-000000000005', 'Compliance Framework', 'manual',
     '{"description": "Security controls and compliance data"}', 'confidential', true, 'synced')
ON CONFLICT DO NOTHING;

-- Sample Entities - Organizations
INSERT INTO entities (id, type_id, name, properties, data_source_id, classification_level) VALUES
    ('e0000000-0000-0000-0001-000000000001', '10000000-0000-0000-0000-000000000002', 'Acme Corporation',
     '{"industry": "Technology", "size": "Enterprise", "founded": "1995"}',
     '30000000-0000-0000-0000-000000000001', 'unclassified'),
    ('e0000000-0000-0000-0001-000000000002', '10000000-0000-0000-0000-000000000002', 'Engineering Department',
     '{"parent_org": "Acme Corporation", "size": "Large"}',
     '30000000-0000-0000-0000-000000000001', 'unclassified'),
    ('e0000000-0000-0000-0001-000000000003', '10000000-0000-0000-0000-000000000002', 'Security Team',
     '{"parent_org": "Acme Corporation", "size": "Medium"}',
     '30000000-0000-0000-0000-000000000001', 'confidential')
ON CONFLICT DO NOTHING;

-- Sample Entities - People
INSERT INTO entities (id, type_id, name, properties, data_source_id, classification_level) VALUES
    ('e0000000-0000-0000-0002-000000000001', '10000000-0000-0000-0000-000000000001', 'Alice Johnson',
     '{"title": "VP of Engineering", "department": "Engineering", "email": "alice@acme.com"}',
     '30000000-0000-0000-0000-000000000001', 'unclassified'),
    ('e0000000-0000-0000-0002-000000000002', '10000000-0000-0000-0000-000000000001', 'Bob Smith',
     '{"title": "Senior Developer", "department": "Engineering", "email": "bob@acme.com"}',
     '30000000-0000-0000-0000-000000000001', 'unclassified'),
    ('e0000000-0000-0000-0002-000000000003', '10000000-0000-0000-0000-000000000001', 'Carol Williams',
     '{"title": "Security Architect", "department": "Security", "email": "carol@acme.com"}',
     '30000000-0000-0000-0000-000000000001', 'confidential'),
    ('e0000000-0000-0000-0002-000000000004', '10000000-0000-0000-0000-000000000001', 'David Brown',
     '{"title": "Project Manager", "department": "PMO", "email": "david@acme.com"}',
     '30000000-0000-0000-0000-000000000001', 'unclassified'),
    ('e0000000-0000-0000-0002-000000000005', '10000000-0000-0000-0000-000000000001', 'Eve Davis',
     '{"title": "Compliance Officer", "department": "Legal", "email": "eve@acme.com"}',
     '30000000-0000-0000-0000-000000000001', 'confidential')
ON CONFLICT DO NOTHING;

-- Sample Entities - Projects
INSERT INTO entities (id, type_id, name, properties, data_source_id, classification_level) VALUES
    ('e0000000-0000-0000-0003-000000000001', '10000000-0000-0000-0000-000000000003', 'Cloud Migration Initiative',
     '{"status": "In Progress", "budget": 2500000, "start_date": "2024-01-15"}',
     '30000000-0000-0000-0000-000000000002', 'confidential'),
    ('e0000000-0000-0000-0003-000000000002', '10000000-0000-0000-0000-000000000003', 'Zero Trust Implementation',
     '{"status": "Planning", "budget": 1500000, "start_date": "2024-06-01"}',
     '30000000-0000-0000-0000-000000000002', 'secret'),
    ('e0000000-0000-0000-0003-000000000003', '10000000-0000-0000-0000-000000000003', 'CMMC Certification',
     '{"status": "In Progress", "budget": 800000, "start_date": "2024-03-01"}',
     '30000000-0000-0000-0000-000000000002', 'confidential'),
    ('e0000000-0000-0000-0003-000000000004', '10000000-0000-0000-0000-000000000003', 'Data Lake Modernization',
     '{"status": "Completed", "budget": 1200000, "start_date": "2023-06-01", "end_date": "2024-02-28"}',
     '30000000-0000-0000-0000-000000000002', 'unclassified')
ON CONFLICT DO NOTHING;

-- Sample Entities - Technologies
INSERT INTO entities (id, type_id, name, properties, data_source_id, classification_level) VALUES
    ('e0000000-0000-0000-0004-000000000001', '10000000-0000-0000-0000-000000000004', 'AWS GovCloud',
     '{"version": "Latest", "vendor": "Amazon", "category": "Cloud Platform"}',
     '30000000-0000-0000-0000-000000000003', 'confidential'),
    ('e0000000-0000-0000-0004-000000000002', '10000000-0000-0000-0000-000000000004', 'Kubernetes',
     '{"version": "1.28", "vendor": "CNCF", "category": "Container Orchestration"}',
     '30000000-0000-0000-0000-000000000003', 'unclassified'),
    ('e0000000-0000-0000-0004-000000000003', '10000000-0000-0000-0000-000000000004', 'PostgreSQL',
     '{"version": "15", "vendor": "PostgreSQL Global", "category": "Database"}',
     '30000000-0000-0000-0000-000000000003', 'unclassified'),
    ('e0000000-0000-0000-0004-000000000004', '10000000-0000-0000-0000-000000000004', 'AWS Bedrock',
     '{"version": "Latest", "vendor": "Amazon", "category": "AI/ML Platform"}',
     '30000000-0000-0000-0000-000000000003', 'confidential'),
    ('e0000000-0000-0000-0004-000000000005', '10000000-0000-0000-0000-000000000004', 'Terraform',
     '{"version": "1.6", "vendor": "HashiCorp", "category": "Infrastructure as Code"}',
     '30000000-0000-0000-0000-000000000003', 'unclassified'),
    ('e0000000-0000-0000-0004-000000000006', '10000000-0000-0000-0000-000000000004', 'CrowdStrike Falcon',
     '{"version": "Latest", "vendor": "CrowdStrike", "category": "Endpoint Security"}',
     '30000000-0000-0000-0000-000000000003', 'confidential')
ON CONFLICT DO NOTHING;

-- Sample Entities - Controls
INSERT INTO entities (id, type_id, name, properties, data_source_id, classification_level) VALUES
    ('e0000000-0000-0000-0006-000000000001', '10000000-0000-0000-0000-000000000006', 'AC-2 Account Management',
     '{"framework": "NIST 800-53", "category": "Access Control", "status": "Implemented"}',
     '30000000-0000-0000-0000-000000000005', 'confidential'),
    ('e0000000-0000-0000-0006-000000000002', '10000000-0000-0000-0000-000000000006', 'SC-8 Transmission Confidentiality',
     '{"framework": "NIST 800-53", "category": "System Communications", "status": "Implemented"}',
     '30000000-0000-0000-0000-000000000005', 'confidential'),
    ('e0000000-0000-0000-0006-000000000003', '10000000-0000-0000-0000-000000000006', 'AU-2 Audit Events',
     '{"framework": "NIST 800-53", "category": "Audit and Accountability", "status": "Partially Implemented"}',
     '30000000-0000-0000-0000-000000000005', 'confidential'),
    ('e0000000-0000-0000-0006-000000000004', '10000000-0000-0000-0000-000000000006', 'CM-2 Baseline Configuration',
     '{"framework": "NIST 800-53", "category": "Configuration Management", "status": "Implemented"}',
     '30000000-0000-0000-0000-000000000005', 'confidential'),
    ('e0000000-0000-0000-0006-000000000005', '10000000-0000-0000-0000-000000000006', 'IA-2 Identification and Authentication',
     '{"framework": "NIST 800-53", "category": "Identification and Authentication", "status": "Implemented"}',
     '30000000-0000-0000-0000-000000000005', 'confidential')
ON CONFLICT DO NOTHING;

-- Sample Relationships
INSERT INTO relationships (id, type_id, source_entity_id, target_entity_id, properties) VALUES
    -- People work for organizations
    ('r0000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
     'e0000000-0000-0000-0002-000000000001', 'e0000000-0000-0000-0001-000000000002', '{"role": "Head"}'),
    ('r0000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001',
     'e0000000-0000-0000-0002-000000000002', 'e0000000-0000-0000-0001-000000000002', '{}'),
    ('r0000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001',
     'e0000000-0000-0000-0002-000000000003', 'e0000000-0000-0000-0001-000000000003', '{"role": "Lead"}'),
    -- Reporting structure
    ('r0000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000006',
     'e0000000-0000-0000-0002-000000000002', 'e0000000-0000-0000-0002-000000000001', '{}'),
    -- People manage projects
    ('r0000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000002',
     'e0000000-0000-0000-0002-000000000001', 'e0000000-0000-0000-0003-000000000001', '{"role": "Sponsor"}'),
    ('r0000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000002',
     'e0000000-0000-0000-0002-000000000004', 'e0000000-0000-0000-0003-000000000001', '{"role": "PM"}'),
    ('r0000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000002',
     'e0000000-0000-0000-0002-000000000003', 'e0000000-0000-0000-0003-000000000002', '{"role": "Lead"}'),
    ('r0000000-0000-0000-0000-000000000008', '20000000-0000-0000-0000-000000000002',
     'e0000000-0000-0000-0002-000000000005', 'e0000000-0000-0000-0003-000000000003', '{"role": "Lead"}'),
    -- Projects use technologies
    ('r0000000-0000-0000-0000-000000000009', '20000000-0000-0000-0000-000000000003',
     'e0000000-0000-0000-0003-000000000001', 'e0000000-0000-0000-0004-000000000001', '{}'),
    ('r0000000-0000-0000-0000-000000000010', '20000000-0000-0000-0000-000000000003',
     'e0000000-0000-0000-0003-000000000001', 'e0000000-0000-0000-0004-000000000002', '{}'),
    ('r0000000-0000-0000-0000-000000000011', '20000000-0000-0000-0000-000000000003',
     'e0000000-0000-0000-0003-000000000001', 'e0000000-0000-0000-0004-000000000005', '{}'),
    ('r0000000-0000-0000-0000-000000000012', '20000000-0000-0000-0000-000000000003',
     'e0000000-0000-0000-0003-000000000002', 'e0000000-0000-0000-0004-000000000006', '{}'),
    -- Projects implement controls
    ('r0000000-0000-0000-0000-000000000013', '20000000-0000-0000-0000-000000000005',
     'e0000000-0000-0000-0003-000000000002', 'e0000000-0000-0000-0006-000000000001', '{}'),
    ('r0000000-0000-0000-0000-000000000014', '20000000-0000-0000-0000-000000000005',
     'e0000000-0000-0000-0003-000000000002', 'e0000000-0000-0000-0006-000000000005', '{}'),
    ('r0000000-0000-0000-0000-000000000015', '20000000-0000-0000-0000-000000000005',
     'e0000000-0000-0000-0003-000000000003', 'e0000000-0000-0000-0006-000000000003', '{}'),
    -- Technology dependencies
    ('r0000000-0000-0000-0000-000000000016', '20000000-0000-0000-0000-000000000008',
     'e0000000-0000-0000-0004-000000000002', 'e0000000-0000-0000-0004-000000000001', '{}'),
    ('r0000000-0000-0000-0000-000000000017', '20000000-0000-0000-0000-000000000008',
     'e0000000-0000-0000-0004-000000000004', 'e0000000-0000-0000-0004-000000000001', '{}')
ON CONFLICT DO NOTHING;

-- ============================================
-- CCV SERVICE SEED DATA
-- ============================================

-- Root level domains
INSERT INTO ccv_terms (id, canonical_name, definition, domain, status, source, confidence) VALUES
    ('t0000000-0000-0000-0000-000000000001', 'Security', 'Information security domain', NULL, 'approved', 'manual', 1.0),
    ('t0000000-0000-0000-0000-000000000002', 'Compliance', 'Regulatory compliance domain', NULL, 'approved', 'manual', 1.0),
    ('t0000000-0000-0000-0000-000000000003', 'Technology', 'Technology and systems domain', NULL, 'approved', 'manual', 1.0),
    ('t0000000-0000-0000-0000-000000000004', 'Organization', 'Organizational structure domain', NULL, 'approved', 'manual', 1.0)
ON CONFLICT DO NOTHING;

-- Security sub-terms
INSERT INTO ccv_terms (id, canonical_name, definition, domain, parent_id, status, source, confidence, usage_count) VALUES
    ('t0000000-0000-0000-0001-000000000001', 'Access Control', 'Mechanisms to restrict system access to authorized users', 'security',
     't0000000-0000-0000-0000-000000000001', 'approved', 'manual', 1.0, 15),
    ('t0000000-0000-0000-0001-000000000002', 'Authentication', 'Process of verifying user identity', 'security',
     't0000000-0000-0000-0001-000000000001', 'approved', 'manual', 1.0, 23),
    ('t0000000-0000-0000-0001-000000000003', 'Authorization', 'Process of granting permissions to authenticated users', 'security',
     't0000000-0000-0000-0001-000000000001', 'approved', 'manual', 1.0, 18),
    ('t0000000-0000-0000-0001-000000000004', 'Multi-Factor Authentication', 'Authentication requiring multiple verification methods', 'security',
     't0000000-0000-0000-0001-000000000002', 'approved', 'manual', 1.0, 12),
    ('t0000000-0000-0000-0001-000000000005', 'Encryption', 'Process of encoding data to prevent unauthorized access', 'security',
     't0000000-0000-0000-0000-000000000001', 'approved', 'manual', 1.0, 20),
    ('t0000000-0000-0000-0001-000000000006', 'Data at Rest Encryption', 'Encryption of stored data', 'security',
     't0000000-0000-0000-0001-000000000005', 'approved', 'manual', 1.0, 8),
    ('t0000000-0000-0000-0001-000000000007', 'Data in Transit Encryption', 'Encryption of data during transmission', 'security',
     't0000000-0000-0000-0001-000000000005', 'approved', 'manual', 1.0, 10),
    ('t0000000-0000-0000-0001-000000000008', 'Zero Trust', 'Security model that requires verification for all access attempts', 'security',
     't0000000-0000-0000-0000-000000000001', 'approved', 'auto_extracted', 0.95, 7),
    ('t0000000-0000-0000-0001-000000000009', 'Audit Logging', 'Recording of security-relevant events', 'security',
     't0000000-0000-0000-0000-000000000001', 'approved', 'manual', 1.0, 14),
    ('t0000000-0000-0000-0001-000000000010', 'Vulnerability Management', 'Process of identifying and mitigating security vulnerabilities', 'security',
     't0000000-0000-0000-0000-000000000001', 'approved', 'manual', 1.0, 9)
ON CONFLICT DO NOTHING;

-- Compliance sub-terms
INSERT INTO ccv_terms (id, canonical_name, definition, domain, parent_id, status, source, confidence, usage_count) VALUES
    ('t0000000-0000-0000-0002-000000000001', 'CMMC', 'Cybersecurity Maturity Model Certification', 'compliance',
     't0000000-0000-0000-0000-000000000002', 'approved', 'manual', 1.0, 25),
    ('t0000000-0000-0000-0002-000000000002', 'NIST 800-53', 'Security and Privacy Controls for Information Systems', 'compliance',
     't0000000-0000-0000-0000-000000000002', 'approved', 'manual', 1.0, 30),
    ('t0000000-0000-0000-0002-000000000003', 'FedRAMP', 'Federal Risk and Authorization Management Program', 'compliance',
     't0000000-0000-0000-0000-000000000002', 'approved', 'manual', 1.0, 18),
    ('t0000000-0000-0000-0002-000000000004', 'IL6', 'Impact Level 6 - Classified information up to Secret', 'compliance',
     't0000000-0000-0000-0000-000000000002', 'approved', 'manual', 1.0, 12),
    ('t0000000-0000-0000-0002-000000000005', 'FIPS 140-2', 'Federal Information Processing Standard for cryptographic modules', 'compliance',
     't0000000-0000-0000-0000-000000000002', 'approved', 'manual', 1.0, 15)
ON CONFLICT DO NOTHING;

-- Technology sub-terms
INSERT INTO ccv_terms (id, canonical_name, definition, domain, parent_id, status, source, confidence, usage_count) VALUES
    ('t0000000-0000-0000-0003-000000000001', 'Cloud Computing', 'On-demand delivery of IT resources over the internet', 'technical',
     't0000000-0000-0000-0000-000000000003', 'approved', 'manual', 1.0, 22),
    ('t0000000-0000-0000-0003-000000000002', 'Container Orchestration', 'Automated management of containerized applications', 'technical',
     't0000000-0000-0000-0000-000000000003', 'approved', 'manual', 1.0, 15),
    ('t0000000-0000-0000-0003-000000000003', 'Infrastructure as Code', 'Managing infrastructure through machine-readable files', 'technical',
     't0000000-0000-0000-0000-000000000003', 'approved', 'manual', 1.0, 12),
    ('t0000000-0000-0000-0003-000000000004', 'Relational Database', 'Database organized into tables with defined relationships', 'technical',
     't0000000-0000-0000-0000-000000000003', 'approved', 'manual', 1.0, 18),
    ('t0000000-0000-0000-0003-000000000005', 'Machine Learning', 'AI systems that learn from data', 'technical',
     't0000000-0000-0000-0000-000000000003', 'approved', 'auto_extracted', 0.92, 8)
ON CONFLICT DO NOTHING;

-- CCV Synonyms
INSERT INTO ccv_synonyms (id, term_id, synonym, source, confidence, status) VALUES
    ('s0000000-0000-0000-0000-000000000001', 't0000000-0000-0000-0001-000000000004', 'MFA', 'manual', 1.0, 'approved'),
    ('s0000000-0000-0000-0000-000000000002', 't0000000-0000-0000-0001-000000000004', '2FA', 'manual', 0.9, 'approved'),
    ('s0000000-0000-0000-0000-000000000003', 't0000000-0000-0000-0001-000000000004', 'Two-Factor Authentication', 'manual', 0.95, 'approved'),
    ('s0000000-0000-0000-0000-000000000004', 't0000000-0000-0000-0001-000000000008', 'ZTA', 'auto_extracted', 0.9, 'approved'),
    ('s0000000-0000-0000-0000-000000000005', 't0000000-0000-0000-0001-000000000008', 'Zero Trust Architecture', 'manual', 1.0, 'approved'),
    ('s0000000-0000-0000-0000-000000000006', 't0000000-0000-0000-0003-000000000003', 'IaC', 'manual', 1.0, 'approved'),
    ('s0000000-0000-0000-0000-000000000007', 't0000000-0000-0000-0002-000000000001', 'Cybersecurity Maturity Model', 'manual', 0.95, 'approved'),
    ('s0000000-0000-0000-0000-000000000008', 't0000000-0000-0000-0003-000000000005', 'ML', 'manual', 1.0, 'approved'),
    ('s0000000-0000-0000-0000-000000000009', 't0000000-0000-0000-0003-000000000005', 'AI', 'auto_extracted', 0.85, 'approved')
ON CONFLICT DO NOTHING;

-- CCV Suggestions (pending review)
INSERT INTO ccv_suggestions (id, suggestion_type, status, confidence, suggested_value, context, term_id, llm_reasoning) VALUES
    ('sg000000-0000-0000-0000-000000000001', 'new_term', 'pending', 0.88, 'DevSecOps',
     'Extracted from project documentation', NULL,
     'Term appears frequently in security and development contexts, combining DevOps with security practices'),
    ('sg000000-0000-0000-0000-000000000002', 'synonym', 'pending', 0.82, 'K8s',
     'Common abbreviation found in technical docs', 't0000000-0000-0000-0003-000000000002',
     'Widely used abbreviation for Kubernetes in technical documentation'),
    ('sg000000-0000-0000-0000-000000000003', 'new_term', 'pending', 0.75, 'Service Mesh',
     'Referenced in cloud architecture documents', NULL,
     'Infrastructure layer for managing service-to-service communication'),
    ('sg000000-0000-0000-0000-000000000004', 'definition', 'pending', 0.9, 'A distributed system for managing containerized workloads and services',
     'Definition update suggestion', 't0000000-0000-0000-0003-000000000002',
     'More comprehensive definition based on official documentation'),
    ('sg000000-0000-0000-0000-000000000005', 'hierarchy', 'pending', 0.85, 'Move under Cloud Computing',
     'Hierarchy reorganization', 't0000000-0000-0000-0003-000000000002',
     'Container orchestration is typically a cloud computing concept')
ON CONFLICT DO NOTHING;

-- ============================================
-- LLM SERVICE SEED DATA
-- ============================================

-- LLM Prompt Templates
INSERT INTO llm_prompts (id, name, description, prompt_template, variables, model, temperature, max_tokens, is_active) VALUES
    ('p0000000-0000-0000-0000-000000000001', 'entity_analysis', 'Analyze an entity and suggest relationships',
     'Analyze the following entity and suggest potential relationships to other entities in the knowledge graph:\n\nEntity: {{entity_name}}\nType: {{entity_type}}\nProperties: {{properties}}\n\nProvide suggestions in JSON format.',
     '["entity_name", "entity_type", "properties"]', 'claude-3-sonnet', 0.7, 2000, true),
    ('p0000000-0000-0000-0000-000000000002', 'term_extraction', 'Extract canonical terms from text',
     'Extract key terms from the following text that should be added to our canonical vocabulary:\n\nText: {{text}}\nDomain: {{domain}}\n\nFor each term provide: canonical name, definition, synonyms, and confidence score.',
     '["text", "domain"]', 'claude-3-haiku', 0.5, 1500, true),
    ('p0000000-0000-0000-0000-000000000003', 'query_intent', 'Classify user query intent',
     'Classify the intent of the following user query about a knowledge graph:\n\nQuery: {{query}}\n\nCategories: search, explore, analyze, create, update, explain\n\nProvide the intent and extracted entities.',
     '["query"]', 'claude-3-haiku', 0.3, 500, true)
ON CONFLICT (name) DO NOTHING;

-- Sample Chat Session
INSERT INTO chat_sessions (id, user_id, title, context_type, is_active) VALUES
    ('cs000000-0000-0000-0000-000000000001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
     'Cloud Migration Analysis', 'graph_exploration', true)
ON CONFLICT DO NOTHING;

-- Sample Chat Messages
INSERT INTO chat_messages (id, session_id, role, content, intent, created_at) VALUES
    ('cm000000-0000-0000-0000-000000000001', 'cs000000-0000-0000-0000-000000000001',
     'user', 'What technologies are being used in the Cloud Migration Initiative?', 'search',
     NOW() - INTERVAL '1 hour'),
    ('cm000000-0000-0000-0000-000000000002', 'cs000000-0000-0000-0000-000000000001',
     'assistant', 'The Cloud Migration Initiative is using several key technologies:\n\n1. **AWS GovCloud** - The primary cloud platform\n2. **Kubernetes** - For container orchestration\n3. **Terraform** - For infrastructure as code\n\nThese technologies were chosen to support the IL6 compliance requirements while enabling modern cloud-native development practices.',
     NULL, NOW() - INTERVAL '59 minutes'),
    ('cm000000-0000-0000-0000-000000000003', 'cs000000-0000-0000-0000-000000000001',
     'user', 'Who is leading this project?', 'search',
     NOW() - INTERVAL '55 minutes'),
    ('cm000000-0000-0000-0000-000000000004', 'cs000000-0000-0000-0000-000000000001',
     'assistant', 'The Cloud Migration Initiative has two key leaders:\n\n1. **Alice Johnson** (VP of Engineering) - Project Sponsor\n2. **David Brown** (Project Manager) - Day-to-day project management\n\nAlice provides executive oversight while David manages the tactical execution of the migration plan.',
     NULL, NOW() - INTERVAL '54 minutes')
ON CONFLICT DO NOTHING;

-- Done!
SELECT 'Seed data loaded successfully' as status;
