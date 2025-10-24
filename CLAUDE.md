# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Weave is a ChatGPT-native memory platform that enables users to capture, organize, and explore memories through an interactive canvas interface. It uses an event-sourced architecture with immutable memory cores and append-only layers.

**Current Status (2025-10-24):** Platform pillars are complete. Milestones A-C (Capture/Recall, Weaving/Canvas, Sharing/Invites) are fully implemented and deployed.

## Quick Start Development

### One-Command Dev (Recommended)
```bash
make dev  # Launches Postgres + migrations + FastAPI + Next.js
```

Starts:
- PostgreSQL with pgvector on port 5432
- FastAPI backend on http://localhost:8000
- Next.js UI on http://localhost:3000

Stop with Ctrl+C. Database container persists for faster restarts.

### Manual Setup
```bash
# Backend (Terminal 1)
cd services/api
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Run migrations in order
psql "$DATABASE_URL" -f app/db/migrations/0001_init.sql
psql "$DATABASE_URL" -f app/db/migrations/0002_idempotency.sql
psql "$DATABASE_URL" -f app/db/migrations/0003_core_locked_at.sql
psql "$DATABASE_URL" -f app/db/migrations/0004_memory_event.sql
psql "$DATABASE_URL" -f app/db/rls.sql

uvicorn app.main:app --reload --port 8000

# Indexing Worker (Terminal 2, optional)
cd services/api
source .venv/bin/activate
python app/workers/indexing.py

# Frontend (Terminal 3)
cd apps/chatgpt-ui
npm install
PYTHON_API_BASE=http://localhost:8000 npm run dev
```

## Common Commands

### Frontend (Next.js)
```bash
cd apps/chatgpt-ui
npm run dev      # Development server on port 3000
npm run build    # Production build
npm run start    # Production server
```

**Requirements:** Node.js ≥18.17 (Next.js 14 requirement)

### Backend (FastAPI)
```bash
cd services/api
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000  # Development server
python app/workers/indexing.py             # Background indexing worker
pytest tests/                              # Run tests
```

**Requirements:** Python 3.11+, PostgreSQL 14+ with pgvector extension

### Database Migrations
```bash
# Always run in order:
psql "$DATABASE_URL" -f app/db/migrations/0001_init.sql
psql "$DATABASE_URL" -f app/db/migrations/0002_idempotency.sql
psql "$DATABASE_URL" -f app/db/migrations/0003_core_locked_at.sql
psql "$DATABASE_URL" -f app/db/migrations/0004_memory_event.sql
psql "$DATABASE_URL" -f app/db/rls.sql
```

## Architecture

### Three-Tier Stack with MCP Bridge

```
ChatGPT (MCP tool calls)
    ↓
Next.js Frontend (Vercel)
    ├── /api/mcp (JSON-RPC → FastAPI bridge)
    └── React UI (Canvas, Search, Detail, Public pages)
    ↓
FastAPI Backend (Railway)
    ├── Routers: memories, search, weave, invites, artifacts, public, follows, graph, export
    ├── Auth: JWT verification + RLS session management
    └── Workers: Indexing (embeddings + TSV)
    ↓
PostgreSQL 14+ with pgvector + RLS
```

### Key Architectural Patterns

**Event Sourcing:**
- Immutable `memory_core_version` - versioned snapshots, locked after finalization
- Append-only `memory_layer` - never modified or deleted
- All changes tracked via versions and timestamps

**Row-Level Security (RLS):**
- `SET LOCAL app.user_id` on every request via `deps.py`
- Postgres enforces access at query time
- Multi-tenant safe at database level

**Hybrid Search:**
```python
score = 0.55 * cosine_similarity(embedding)
      + 0.35 * ts_rank_cd(tsv)
      + 0.10 * edge_boost  # Planned enhancement
```

**Idempotency:**
- `Idempotency-Key` header on create/lock operations
- Prevents duplicate creates on retry
- Maps key to created resource_id

## Directory Structure

```
weave/
├── services/api/              # Python FastAPI backend
│   ├── app/
│   │   ├── main.py            # App entry, router mounting
│   │   ├── models.py          # Pydantic models
│   │   ├── deps.py            # JWT auth + RLS session dependency
│   │   ├── routers/           # API endpoints (/v1/*)
│   │   │   ├── memories.py    # Core CRUD + layers + suggestions
│   │   │   ├── search.py      # Hybrid search
│   │   │   ├── weave.py       # Memory connections
│   │   │   ├── invites.py     # Collaboration invites
│   │   │   ├── artifacts.py   # Media upload/download
│   │   │   ├── public.py      # Public slugs
│   │   │   ├── follows.py     # Follow graph
│   │   │   ├── graph.py       # Canvas graph data
│   │   │   └── export.py      # Data export
│   │   ├── db/
│   │   │   ├── models_orm.py  # SQLAlchemy ORM
│   │   │   ├── session.py     # DB session + RLS
│   │   │   ├── migrations/    # SQL files (run in order)
│   │   │   └── rls.sql        # Row-Level Security policies
│   │   ├── auth/
│   │   │   └── jwt.py         # JWT verification (JWKS)
│   │   └── workers/
│   │       └── indexing.py    # Embedding + TSV indexing
│   └── requirements.txt
│
├── apps/chatgpt-ui/           # Next.js 14 ChatGPT UI
│   ├── app/
│   │   ├── api/
│   │   │   ├── mcp/route.ts      # MCP → FastAPI bridge
│   │   │   └── proxy/[...path]/  # REST proxy
│   │   ├── canvas/page.tsx       # Canvas 2D view
│   │   ├── memory/[id]/page.tsx  # Memory detail
│   │   ├── search/page.tsx       # Search interface
│   │   ├── p/[slug]/             # Public memory pages
│   │   ├── u/[handle]/           # User profiles
│   │   ├── a/[id]/               # Artifact redirects
│   │   ├── page.tsx              # Home/landing
│   │   ├── layout.tsx            # Root layout + Clerk auth
│   │   └── globals.css           # Tailwind v4 entry
│   ├── components/
│   │   └── WeaverCard.tsx        # Memory creation UI
│   ├── middleware.ts             # Clerk middleware
│   └── package.json
│
├── specs/
│   ├── product-spec.md        # Vision, UX, features
│   └── technical-spec.md      # Stack, architecture decisions
│
├── schema.sql                 # PostgreSQL schema with RLS
├── doc.md                     # Build guide (milestones A-D)
├── README.md                  # Quick start
├── Makefile                   # Dev shortcuts
└── chatgpt-mcp-manifest.json  # MCP tool schemas
```

## Data Model

### Core Tables

**memory** - Central memory entity
- Fields: id, owner_id, visibility (PRIVATE/SHARED/PUBLIC), title, status, current_core_version
- Soft deletes via status field

**memory_core_version** - Immutable narrative snapshots
- Fields: memory_id, version, narrative, anchors (JSONB), people (JSONB), when_start/end, where, locked
- Versioned: new version created when "lifted" (edited after lock)

**memory_layer** - Append-only contributions
- Fields: id, memory_id, author_id, kind (TEXT/IMAGE/VIDEO/AUDIO/REFLECTION/LINK), text_content, artifact_id, meta (JSONB)
- Never modified or deleted

**participant** - Access control
- Fields: memory_id, user_id, role (OWNER/CONTRIBUTOR/VIEWER), invited_by
- Composite primary key on (memory_id, user_id)

**edge** - Memory connections (weave)
- Fields: a_memory_id, b_memory_id, relation (SAME_PERSON/SAME_EVENT/THEME/EMOTION/TIME_NEAR), strength, created_by

**artifact** - Media attachments
- Fields: id, memory_id, owner_id, mime, storage_key, sha256, bytes
- Stored in S3; accessed via signed URLs with 24-hour TTL

### Search Infrastructure

- `memory.tsv` (tsvector): Full-text search index
- `memory.embedding` (vector[1536]): Semantic search via pgvector
- Hybrid scoring: 55% cosine + 35% BM25 + 10% edge boost

## API Structure

### Endpoint Pattern
- Prefix: `/v1/*`
- Auth: JWT via Authorization header or X-Debug-User (dev mode)
- Idempotency: Idempotency-Key header on create/lock operations
- Response: JSON (ORJSONResponse for performance)

### Key Endpoints

**Memories:**
- `GET /v1/memories` - List user's memories
- `POST /v1/memories` - Create memory
- `PUT /v1/memories/{id}/core` - Set/update core
- `POST /v1/memories/{id}/lock` - Lock core (make immutable)
- `POST /v1/memories/{id}/layers` - Append layer
- `GET /v1/memories/{id}` - Full detail (core + layers + edges)
- `POST /v1/memories/{id}/permissions` - Set visibility + roles
- `GET /v1/memories/{id}/suggestions` - Weave suggestions

**Search:**
- `GET /v1/search/associative?q={query}` - Hybrid search

**Weaving:**
- `POST /v1/weaves` - Create memory connection

**Collaboration:**
- `POST /v1/invites` - Create invite
- `POST /v1/invites/{token}/accept` - Accept invite

**Media:**
- `POST /v1/artifacts/upload` - Upload artifact (returns artifact_id)
- `GET /v1/artifacts/{id}/download` - Signed URL for download

**Public:**
- `GET /v1/public/p/{slug}` - Public memory by slug

## MCP Integration

### Tool Flow
1. ChatGPT invokes tool (e.g., `create_memory`)
2. JSON-RPC call → `/api/mcp` (Next.js route)
3. Node handler validates + forwards to FastAPI endpoint
4. FastAPI executes + returns result
5. Node handler formats result with display hints
6. Returns to ChatGPT for rendering

### Available MCP Tools (chatgpt-mcp-manifest.json)
- create_memory, set_core, lock_core, append_layer
- search_associative, weave, set_permissions, invite

## Search System

### Components

**Vector Search (pgvector):**
- OpenAI embeddings (text-embedding-3-small, 1536 dimensions)
- Cosine similarity via `<=>` operator

**Full-Text Search (PostgreSQL):**
- TSV index on title + narrative + layers
- `websearch_to_tsquery` for query parsing
- `ts_rank_cd` for relevance scoring

**Indexing Worker:**
- Triggered by `memory_event` table
- Enqueued on core lock + text layer append
- Builds document: title + narrative + recent layers
- Generates embedding via OpenAI API
- Updates `memory.tsv` and `memory.embedding`
- Gracefully degrades with zero vectors if OPENAI_API_KEY missing

## Environment Variables

### Backend (.env)
```bash
DATABASE_URL=postgresql://localhost:5432/weave
OPENAI_API_KEY=sk-...
JWT_JWKS_URL=https://...
ALLOWED_ORIGINS=http://localhost:3000,https://...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=...
AWS_S3_ENDPOINT=...  # For Backblaze B2
```

### Frontend (.env.local)
```bash
PYTHON_API_BASE=http://localhost:8000
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
```

## Important Implementation Details

### RLS Session Management
Every authenticated request in `deps.py:get_user_id()` must:
1. Verify JWT token
2. Extract user_id from subject
3. Set `SET LOCAL app.user_id = '<uuid>'` on database session
4. Postgres RLS policies automatically enforce access

### Idempotency Pattern
For create/lock operations:
1. Client sends `Idempotency-Key` header
2. Backend checks `idempotency_key` table
3. If exists, return existing resource_id
4. If new, perform operation and store mapping
5. Safe for client retries

### Memory Core Versioning
- Locked cores are immutable
- Editing a locked core creates a new version
- `memory.current_core_version` tracks active version
- Preserves complete audit trail

### Layer Append-Only
- Layers never deleted or modified
- `status` field can mark as hidden (future)
- Complete history preserved

## Testing

### Run API Tests
```bash
cd services/api
pytest tests/test_api.py  # Requires PostgreSQL with pgvector
```

### Coverage Gaps (Tracked in sprint notes)
- RLS policy tests (owner/contributor/viewer permissions)
- Search quality tests
- Canvas interaction tests
- End-to-end flows

## Deployment

### Frontend (Vercel)
- Auto-deploy from Git (main branch)
- Preview deployments on PRs
- Set environment variables in Vercel dashboard

### Backend (Railway)
- Containerized FastAPI
- PostgreSQL addon with pgvector
- See: `docs/DEPLOY-RAILWAY.md`
- Run migrations manually via Railway shell

## Outstanding Work (as of 2025-10-24)

From `ai-docs/sprint-2025-10-24.md`:

1. **Node.js Upgrade** - Requires ≥18.17 for Next.js 14 (currently 18.15.0)
2. **Edge Boost Implementation** - Add edge-boost term to hybrid search scoring
3. **Indexing Enhancements** - Queue indexing for non-text layers
4. **Documentation Refresh** - Update for Docker-less Postgres setup
5. **Test Coverage** - Integration tests, RLS policy tests, Canvas tests

## Key Files to Reference

- **Build Guide:** `doc.md` - Step-by-step practical guide
- **Product Vision:** `specs/product-spec.md`
- **Architecture:** `specs/technical-spec.md`
- **Database Schema:** `schema.sql`
- **API Routes:** `services/api/app/routers/*.py`
- **Frontend Pages:** `apps/chatgpt-ui/app/*/page.tsx`

## Development Tips

- **Auth Flow:** JWT → `deps.py` → RLS session → Postgres policies
- **Search Flow:** Query → Embed → Hybrid scoring → Results with reasons
- **Memory Flow:** Create → Set core → Lock → Append layers → Index
- **Weave Flow:** Create edge → Update graph → Canvas visualization
- **Public Flow:** Set visibility PUBLIC → Generate slug → Public page

Refer to `doc.md` for detailed milestone breakdown and task sequencing.
