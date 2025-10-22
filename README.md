# Weave: ChatGPT-Native Memory Platform

An explorable memory canvas inside ChatGPT. Capture, organize, and weave memories together with friends.

**✨ Start with `doc.md` for the step-by-step practical build guide.**

## Quick Navigation

- **[doc.md](./doc.md)** ← **START HERE** - Ordered, practical guide to ship v1 (Milestones A-D + tasks)
- **[specs/product-spec.md](./specs/product-spec.md)** - Product vision & UX
- **[specs/technical-spec.md](./specs/technical-spec.md)** - Architecture & decisions
- **[schema.sql](./schema.sql)** - PostgreSQL schema with RLS policies

## Current Status (as of doc.md)

**✅ Decisions locked:**
- Next.js on Vercel + Node MCP shim → Python FastAPI on Railway
- Canvas Option B (richer cards) + Public Mirror Option B (follows + slugs)

**✅ Infrastructure:**
- Backend skeleton at `services/api/` with partial implementations
- Endpoints: `POST /v1/memories`, `PUT /v1/memories/{id}/core`, `POST /v1/memories/{id}/lock`, `POST /v1/memories/{id}/layers`, `POST /v1/artifacts/upload`, `GET /v1/artifacts/{id}/download`

**❌ TODO (see doc.md Appendix for priority order):**
- Auth (JWT verification)
- `GET /v1/memories/{id}`, `/search/associative`, `/v1/weaves`, `/permissions`, `/invites`
- Indexing pipeline (embeddings + TSV)
- UI: MCP route, Inline Weaver, detail view, Canvas
- Public mirror (slugs, viewer, follows)

## Do-First Checklist (from doc.md Appendix)

1. **Auth**: Implement JWT verification in `services/api/app/deps.py:get_user_id`
2. **Backend**: `GET /v1/memories/{id}` endpoint
3. **Indexing**: Real embeddings + TSV rebuild pipeline
4. **Search**: `GET /v1/search/associative` (hybrid scoring: 0.55 cosine + 0.35 TS + 0.10 edge)
5. **UI**: Inline Weaver card + minimal detail view
6. **Canvas**: Weaving (`POST /v1/weaves`) + Canvas 2D with threads
7. **Permissions**: `POST /v1/memories/{id}/permissions` + RLS tightening
8. **Invites**: Create/accept flow + UI
9. **Public**: Slugs + viewer page + follows
10. **Security/QA**: Permission matrix tests, export/delete flow, observability

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
│   │   ├── models.py               # SQLAlchemy ORM
│   │   ├── deps.py                 # Auth + DB (TODO: JWT)
│   │   ├── routers/
│   │   │   ├── memories.py         # Partial: create, core, lock, layers
│   │   │   ├── search.py           # TODO: GET /v1/search/associative
│   │   │   ├── weave.py            # TODO: POST /v1/weaves
│   │   │   ├── permissions.py      # TODO: POST /v1/memories/{id}/permissions
│   │   │   ├── invites.py          # TODO: invite create/accept
│   │   │   └── artifacts.py        # Done: upload/download
│   │   ├── workers/
│   │   │   └── indexing.py         # TODO: embeddings + TSV rebuild
│   │   └── db/
│   │       ├── migrations/         # SQL files (run in order)
│   │       └── rls.sql
│   ├── requirements.txt
│   ├── .env.example
│   └── docker-compose.yml
│
├── apps/
│   ├── chatgpt-ui/                 # Next.js ChatGPT App
│   │   ├── app/
│   │   │   ├── api/mcp/            # TODO: MCP protocol bridge
│   │   │   ├── lib/                # ChatGPT hooks (useSendMessage, etc.)
│   │   │   └── memory/             # Pages: canvas, detail, search
│   │   └── package.json
│   │
│   └── next-app/ or similar        # Alternative Next.js structure
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
| **Storage** | S3-compatible (Backblaze B2) | Media attachments via signed URLs |
| **Auth** | JWT | JWKS URL-based verification |
| **Deployment** | Vercel + Railway | Fully managed, no DevOps |

## Local Development

### One-Command Dev

If you have Docker, Python 3.11+, and Node 18+ installed, you can start everything (Postgres + migrations + FastAPI + Next.js) with a single command from the repo root:

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

# Run migrations in order (PostgreSQL must be running)
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

See `docs/DEPLOY-RAILWAY.md` for Railway setup.

**Key env vars:**
- `DATABASE_URL` (Railway PostgreSQL)
- `JWT_JWKS_URL` (auth provider)
- `OPENAI_API_KEY`
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` (S3/B2)
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
