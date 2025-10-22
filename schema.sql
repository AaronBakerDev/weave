-- Weave: Postgres Schema with pgvector
-- Event-sourced memory model with immutable cores + append-only layers

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgvector";

-- ============================================================================
-- USERS
-- ============================================================================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  handle TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  plan TEXT DEFAULT 'FREE' CHECK (plan IN ('FREE', 'PRO', 'ENTERPRISE')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

CREATE INDEX idx_users_handle ON users(handle);
CREATE INDEX idx_users_email ON users(email);

-- ============================================================================
-- MEMORIES (Core entity)
-- ============================================================================

CREATE TABLE memories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  visibility TEXT DEFAULT 'PRIVATE' CHECK (visibility IN ('PRIVATE', 'SHARED', 'PUBLIC')),
  status TEXT DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'LOCKED', 'ARCHIVED')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

CREATE INDEX idx_memories_owner_id ON memories(owner_id);
CREATE INDEX idx_memories_visibility ON memories(visibility);
CREATE INDEX idx_memories_created_at ON memories(created_at DESC);

-- Row-Level Security: users see own memories + shared memories
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY memories_own ON memories
  FOR ALL USING (owner_id = current_user_id());

-- ============================================================================
-- MEMORY CORE (Immutable snapshot)
-- ============================================================================

CREATE TABLE memory_cores (
  memory_id UUID PRIMARY KEY REFERENCES memories(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  narrative TEXT NOT NULL,
  "when" TIMESTAMP,
  "where" TEXT,
  people TEXT[],
  anchors JSONB,  -- [{"sense": "light", "detail": "..."}, ...]
  emotion TEXT,   -- cached for color-coding
  locked_at TIMESTAMP NOT NULL DEFAULT NOW(),
  version INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB
);

-- Embedding for the narrative (for search)
CREATE TABLE memory_core_embeddings (
  memory_id UUID PRIMARY KEY REFERENCES memory_cores(memory_id) ON DELETE CASCADE,
  embedding VECTOR(3072),  -- text-embedding-3-large
  model TEXT DEFAULT 'text-embedding-3-large',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_memory_core_embeddings ON memory_core_embeddings USING ivfflat (embedding vector_cosine_ops);

-- ============================================================================
-- MEMORY LAYERS (Append-only contributions)
-- ============================================================================

CREATE TABLE memory_layers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  memory_id UUID NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES users(id),
  kind TEXT NOT NULL CHECK (kind IN ('TEXT', 'AUDIO', 'IMAGE', 'VIDEO', 'REFLECTION', 'LINK')),
  payload_uri TEXT,  -- S3 URL or JSON blob
  payload_json JSONB,
  visibility TEXT DEFAULT 'SHARED' CHECK (visibility IN ('PRIVATE', 'SHARED', 'PUBLIC')),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_memory_layers_memory_id ON memory_layers(memory_id);
CREATE INDEX idx_memory_layers_author_id ON memory_layers(author_id);
CREATE INDEX idx_memory_layers_created_at ON memory_layers(created_at DESC);

-- Embeddings for layer text (for search)
CREATE TABLE memory_layer_embeddings (
  layer_id UUID PRIMARY KEY REFERENCES memory_layers(id) ON DELETE CASCADE,
  embedding VECTOR(3072),
  model TEXT DEFAULT 'text-embedding-3-large',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_memory_layer_embeddings ON memory_layer_embeddings USING ivfflat (embedding vector_cosine_ops);

-- ============================================================================
-- MEMORY EDGES (Graph connections for weaving)
-- ============================================================================

CREATE TABLE edges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  a_memory_id UUID NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
  b_memory_id UUID NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
  relation TEXT NOT NULL CHECK (relation IN (
    'SAME_PERSON', 'SAME_PLACE', 'SAME_TIME', 'THEME', 'EMOTION', 'TIME_NEAR'
  )),
  strength FLOAT DEFAULT 0.5 CHECK (strength >= 0.0 AND strength <= 1.0),
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT no_self_edge CHECK (a_memory_id != b_memory_id),
  CONSTRAINT ordered_edge UNIQUE (
    LEAST(a_memory_id, b_memory_id),
    GREATEST(a_memory_id, b_memory_id),
    relation
  )
);

CREATE INDEX idx_edges_a ON edges(a_memory_id);
CREATE INDEX idx_edges_b ON edges(b_memory_id);
CREATE INDEX idx_edges_relation ON edges(relation);

-- ============================================================================
-- PARTICIPANTS (For shared memories)
-- ============================================================================

CREATE TABLE participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  memory_id UUID NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('OWNER', 'CONTRIBUTOR', 'VIEWER')),
  invited_by UUID REFERENCES users(id),
  invited_at TIMESTAMP DEFAULT NOW(),
  joined_at TIMESTAMP,

  UNIQUE(memory_id, user_id)
);

CREATE INDEX idx_participants_memory_id ON participants(memory_id);
CREATE INDEX idx_participants_user_id ON participants(user_id);

-- ============================================================================
-- ARTIFACTS (Media attachments)
-- ============================================================================

CREATE TABLE artifacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  memory_id UUID NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('IMAGE', 'AUDIO', 'VIDEO', 'DOCUMENT', 'TRANSCRIPT')),
  uri TEXT NOT NULL,  -- S3 signed URL
  sha256 TEXT,
  mime_type TEXT,
  transcript_uri TEXT,  -- for audio/video
  caption TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB
);

CREATE INDEX idx_artifacts_memory_id ON artifacts(memory_id);
CREATE INDEX idx_artifacts_type ON artifacts(type);

-- Embeddings for captions/transcripts (for search)
CREATE TABLE artifact_embeddings (
  artifact_id UUID PRIMARY KEY REFERENCES artifacts(id) ON DELETE CASCADE,
  embedding VECTOR(3072),
  text_chunk TEXT,  -- caption or transcript snippet
  model TEXT DEFAULT 'text-embedding-3-large',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_artifact_embeddings ON artifact_embeddings USING ivfflat (embedding vector_cosine_ops);

-- ============================================================================
-- MODERATION
-- ============================================================================

CREATE TABLE moderation_flags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_type TEXT CHECK (subject_type IN ('MEMORY', 'LAYER', 'ARTIFACT')),
  subject_id UUID NOT NULL,
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'FLAGGED', 'BLOCKED')),
  reasons TEXT[],
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_moderation_flags_subject ON moderation_flags(subject_type, subject_id);
CREATE INDEX idx_moderation_flags_status ON moderation_flags(status);

-- ============================================================================
-- ANALYTICS / EVENTS
-- ============================================================================

CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  event_type TEXT NOT NULL,  -- 'memory_created', 'memory_opened', 'layer_added', 'edge_created', etc.
  subject_id UUID,  -- memory_id or layer_id
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_events_user_id ON events(user_id);
CREATE INDEX idx_events_event_type ON events(event_type);
CREATE INDEX idx_events_created_at ON events(created_at DESC);

-- ============================================================================
-- RLS POLICIES (Row-Level Security for multi-tenant safety)
-- ============================================================================

-- Helper function to get current user ID from JWT
CREATE OR REPLACE FUNCTION current_user_id() RETURNS UUID AS $$
  SELECT COALESCE(current_setting('app.current_user_id', true)::uuid, null::uuid);
$$ LANGUAGE SQL;

-- Memories: users see own + shared
CREATE POLICY memories_shared ON memories
  FOR SELECT USING (
    owner_id = current_user_id()
    OR visibility = 'PUBLIC'
    OR EXISTS (
      SELECT 1 FROM participants
      WHERE memory_id = memories.id
      AND user_id = current_user_id()
    )
  );

-- Layers: visible if memory is visible to user
CREATE POLICY layers_visible ON memory_layers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM memories
      WHERE id = memory_id
      AND (
        owner_id = current_user_id()
        OR visibility = 'PUBLIC'
        OR EXISTS (
          SELECT 1 FROM participants
          WHERE memory_id = memories.id
          AND user_id = current_user_id()
        )
      )
    )
  );

-- ============================================================================
-- FUNCTIONS FOR COMMON OPERATIONS
-- ============================================================================

-- Create a new memory
CREATE OR REPLACE FUNCTION create_memory(
  p_title TEXT,
  p_seed_text TEXT DEFAULT NULL,
  p_visibility TEXT DEFAULT 'PRIVATE',
  p_user_id UUID
) RETURNS UUID AS $$
DECLARE
  v_memory_id UUID;
BEGIN
  INSERT INTO memories (owner_id, visibility)
  VALUES (p_user_id, p_visibility)
  RETURNING id INTO v_memory_id;

  RETURN v_memory_id;
END;
$$ LANGUAGE plpgsql;

-- Lock a memory core (make immutable)
CREATE OR REPLACE FUNCTION lock_memory_core(
  p_memory_id UUID,
  p_title TEXT,
  p_narrative TEXT,
  p_when TIMESTAMP,
  p_where TEXT,
  p_people TEXT[],
  p_anchors JSONB,
  p_emotion TEXT
) RETURNS TABLE(version INT, locked_at TIMESTAMP) AS $$
BEGIN
  INSERT INTO memory_cores (
    memory_id, title, narrative, "when", "where", people, anchors, emotion
  ) VALUES (
    p_memory_id, p_title, p_narrative, p_when, p_where, p_people, p_anchors, p_emotion
  );

  UPDATE memories SET status = 'LOCKED' WHERE id = p_memory_id;

  RETURN QUERY SELECT 1::INT, NOW();
END;
$$ LANGUAGE plpgsql;
