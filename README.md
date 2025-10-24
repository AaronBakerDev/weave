# Weave: ChatGPT-Native Memory Platform

An explorable memory canvas inside ChatGPT. Capture, organize, and weave memories together with friends.

**✨ Start with `doc.md` for the step-by-step practical build guide.**

## Quick Navigation

- **[doc.md](./doc.md)** ← **START HERE** - Ordered, practical guide to ship v1 (Milestones A-D + tasks)
- **[specs/product-spec.md](./specs/product-spec.md)** - Product vision & UX
- **[specs/technical-spec.md](./specs/technical-spec.md)** - Architecture & decisions
- **[schema.sql](./schema.sql)** - PostgreSQL schema with RLS policies

## Current Status (2025-10-24)

**✅ Platform pillars are in place**
- ChatGPT UI (Next.js 14) implements the marketing home, inline Weaver card, memory detail editor, canvas view, search, and public/user routes.
- `/api/mcp` bridge translates ChatGPT tool calls into FastAPI requests using the manifest in `chatgpt-mcp-manifest.json`.
- FastAPI backend ships fully wired routers for memories, search, weave links, permissions, invites, artifacts, public slugs, follows, graph, export, plus health/rate limiting/JWT verification.
- Indexing worker listens to `memory_event`, rebuilds TSV and pgvector embeddings, and degrades gracefully if `OPENAI_API_KEY` is absent.

**⏳ Outstanding work (tracked in `ai-docs/sprint-2025-10-24.md`)**
- Upgrade local Node.js to ≥18.17 to satisfy Next.js runtime requirements and re-verify the Tailwind/PostCSS upgrade.
- Finish hybrid search parity by reintroducing the edge-boost term and queuing indexing for non-text layers.
- Refresh README/doc onboarding for Docker-less Postgres setups and updated UI/backend coverage.
- Harden automated testing (integration tests against live Postgres, Canvas interactions, etc.).

## Immediate Focus

1. **Node.js Upgrade**: Use `nvm`, `asdf`, or Volta to install Node ≥18.17, then re-run `npm run build` / `npm run dev` to confirm Tailwind/PostCSS fixes.
2. **Hybrid Search Polish**: Implement the edge-boost component in `services/api/app/routers/search.py` and ensure layer appends enqueue indexing.
3. **Docs Refresh**: Update `doc.md`/README onboarding for non-Docker Postgres flows and capture the current feature surface.
4. **Test Coverage**: Run `services/api/tests/test_api.py` against a local Postgres (with pgvector) and document results; expand UI smoke tests as needed.

## Milestones

| Milestone | Goal | Acceptance |
|-----------|------|-----------|
| **A - Capture & Recall** | Create/lock/search/detail view. Deployed. | P0 endpoints working, search <2s p95, end-to-end works |
| **B - Weaving & Canvas** | Link memories, Canvas with richer cards, zoom-to-enter | Create weave, see thread, smooth nav |
| **C - Sharing & Invites** | Role-based access, invite flow, public groundwork | Invite user, accept, append layer, slug resolves |
| **D - Public Mirror** | Follows, public profiles, optional events | Public pages <500ms p95 cached |

## Directory Structure

```
weave/
├── doc.md                          ← BUILD GUIDE (start here!)
├── schema.sql                      # PostgreSQL schema + RLS
├── README.md                       # (this file)
│
├── services/api/                   # Python FastAPI backend
│   ├── app/
│   │   ├── main.py
│   │   ├── models.py               # SQLAlchemy ORM + Pydantic models
│   │   ├── deps.py                 # JWT auth + RLS-aware sessions
│   │   ├── routers/
│   │   │   ├── memories.py         # CRUD, layers, permissions, suggestions
│   │   │   ├── search.py           # Hybrid search (edge boost pending)
│   │   │   ├── weave.py            # Memory connections
│   │   │   ├── invites.py          # Invite create/accept
│   │   │   ├── follows.py          # Follow graph + feeds
│   │   │   ├── public.py           # Public slugs
│   │   │   ├── graph.py            # Canvas graph feed
│   │   │   └── artifacts.py        # Upload/download proxies
│   │   ├── workers/
│   │   │   └── indexing.py         # Embedding + TSV refresh worker
│   │   └── db/
│   │       ├── migrations/         # SQL files (run in order)
│   │       └── rls.sql
│   ├── requirements.txt
│   ├── .env.example
│   └── docker-compose.yml
│
├── apps/
│   ├── chatgpt-ui/                 # Primary Next.js ChatGPT App
│   │   ├── app/
│   │   │   ├── api/
│   │   │   │   ├── mcp/            # JSON-RPC bridge to FastAPI
│   │   │   │   └── proxy/          # REST proxy to FastAPI
│   │   │   ├── canvas/             # Canvas experience
│   │   │   ├── memory/             # Memory detail route
│   │   │   ├── search/             # Search UI
│   │   │   ├── p/, u/, a/          # Public slugs, author pages, artifact redirect
│   │   │   └── globals.css         # Tailwind entry (v4)
│   │   └── package.json
│   │
│   └── next-app/                   # Earlier stub preserved for reference
│
├── specs/
│   ├── product-spec.md             # Vision, UX, features
│   ├── technical-spec.md           # Stack, architecture
│   └── api-docs.md                 # API reference (TODO)
│
└── docs/
    ├── DEPLOY-RAILWAY.md           # Railway deployment guide
    └── ...
```

## Tech Stack

| Component | Choice | Notes |
|-----------|--------|-------|
| **Frontend** | Next.js 14 (Vercel starter) | ChatGPT Apps SDK |
| **UI Bridge** | Node.js MCP shim | `/api/mcp` route proxies to Python |
| **Backend** | Python 3.11 FastAPI | Railway container |
| **Database** | PostgreSQL 14+ + pgvector | RLS policies for multi-tenancy |
| **Search** | Hybrid scoring | 0.55 cosine + 0.35 BM25 + 0.10 edge boost |
| **Embeddings** | OpenAI `text-embedding-3-large` | 1536 dimensions |
| **Storage** | Backblaze B2 | S3-compatible, 10GB free, videos/images via signed URLs |
| **Auth** | JWT | JWKS URL-based verification |
| **Deployment** | Vercel + Railway | Fully managed, no DevOps |

## Local Development

### One-Command Dev

If you have Docker, Python 3.11+, and Node ≥18.17 installed, you can start everything (Postgres + migrations + FastAPI + Next.js) with a single command from the repo root:

```
make dev
```

This launches:
- Postgres with pgvector on port 5432 (container name: `weave-pg`)
- FastAPI on http://localhost:8000
- Next.js UI on http://localhost:3000

Stop the app processes with Ctrl+C. The database container stays running for faster restarts. To stop it later:

```
make down && docker stop weave-pg
```

### 1. Start PostgreSQL + Backend

```bash
cd services/api

# Run migrations in order (PostgreSQL must be running and pgvector enabled)
psql "$DATABASE_URL" -f app/db/migrations/0001_init.sql
psql "$DATABASE_URL" -f app/db/migrations/0002_idempotency.sql
psql "$DATABASE_URL" -f app/db/migrations/0003_core_locked_at.sql
psql "$DATABASE_URL" -f app/db/migrations/0004_memory_event.sql
psql "$DATABASE_URL" -f app/db/rls.sql

# Install and run FastAPI
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```

> **No Docker?** Use a local Postgres 14+ instance with the `vector` extension installed. Update `DATABASE_URL` (for example `postgresql://localhost:5432/weave`) before running the migrations above.

### 2. Start Indexing Worker (optional)

```bash
cd services/api
source .venv/bin/activate
python app/workers/indexing.py
```

### 3. Start ChatGPT UI

```bash
cd apps/chatgpt-ui  # or next-app
npm install
PYTHON_API_BASE=http://localhost:8000 npm run dev
```

### 4. Use the app locally

- Create a memory on `http://localhost:3000` with the Weaver card.
- Open the Canvas at `http://localhost:3000/canvas` and click nodes to enter detail.
- Public pages live under `/p/{slug}` and author pages under `/u/{handle}`.


## Key Implementation Details (from doc.md)

**Endpoint Pattern:**
- Routes: `/v1/*` prefix
- Request/response: include `query` + `results: [{memory, score, reasons}]`
- Idempotency: via idempotency-key headers on create/lock

**RLS & Auth:**
- Every request sets `SET LOCAL app.user_id = '<uuid>'` (see `deps.py`)
- Policies enforce: owner sees all, contributors see + write, viewers see only, public = anyone

**Search Scoring:**
```
hybrid_score = 0.55 * cosine_similarity + 0.35 * ts_rank + 0.10 * edge_boost
```
- `cosine_similarity`: Vector distance on narrative embedding
- `ts_rank`: PostgreSQL full-text search (TSV column)
- `edge_boost`: +0.1 if memory connected to query context

**Indexing Trigger:**
- On `core` lock and text/reflection layer append
- Build document: `title + core.narrative + [text_layers] + [captions]`
- Update `tsv` and `embedding` columns

## Deployment

See deployment guides:
- **`DEPLOY.md`** - Quick deployment guide (Render + Vercel)
- **`RENDER-SETUP.md`** - Detailed Render backend setup
- **`VERCEL-SETUP.md`** - Vercel frontend setup
- **`BACKBLAZE-B2-SETUP.md`** - Backblaze B2 storage (videos/images)
- **`DOMAIN-SETUP.md`** - Custom domain configuration

**Key env vars:**
- `DATABASE_URL` (Render PostgreSQL)
- `JWT_JWKS_URL` (Clerk auth)
- `OPENAI_API_KEY` (embeddings)
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` (Backblaze B2)
- `S3_ENDPOINT_URL` (Backblaze B2 endpoint)
- `ALLOWED_ORIGINS` (CORS)

## Next Steps

**→ READ `doc.md` FOR THE BUILD GUIDE**

Then:
1. Check existing code in `services/api/`
2. Start with task #1: JWT verification in `deps.py`
3. Follow tasks in order (they unblock each other)
4. Test locally before each deploy

## References

- PostgreSQL RLS: https://www.postgresql.org/docs/current/ddl-rowsecurity.html
- Vercel ChatGPT Apps: https://vercel.com/docs/ai
- Railway Docs: https://docs.railway.app
- OpenAI Embeddings: https://platform.openai.com/docs/models/text-embedding
- FastAPI: https://fastapi.tiangolo.com
