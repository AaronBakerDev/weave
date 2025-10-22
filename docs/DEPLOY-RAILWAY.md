# Deploying Weave API on Railway (v1)

This assumes the backend lives at `services/api` in this repo.

## One‑time setup

1) Push to GitHub
- Connect your repo to GitHub and push `main`.

2) Create a Railway project
- Go to Railway dashboard → New Project → Deploy from GitHub → select this repo.
- When prompted for root directory, choose `services/api`.

3) Configure service
- Install command: `pip install -r requirements.txt`
- Start command: `bash start.sh` (binds to `$PORT` automatically)
- Python version: auto (3.11+), or set in Railway if needed.

4) Add PostgreSQL
- In the project, click `+` → `PostgreSQL`.
- Railway injects `DATABASE_URL` env var into your service.

5) Environment variables (Service → Variables)
- `DATABASE_URL` (auto from PostgreSQL plugin)
- `AWS_REGION`
- `AWS_S3_BUCKET`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `S3_ENDPOINT_URL` (set if using Backblaze B2 or R2)
- `JWT_AUDIENCE`, `JWT_ISSUER`, `JWT_JWKS_URL` (or use `X-Debug-User` during dev)
- `EMBEDDING_DIM=1536`
- `ALLOWED_ORIGINS=*` (tighten in prod)
- `OPENAI_API_KEY` (for embeddings)
- `EMBEDDING_MODEL=text-embedding-3-small` (1536 dims)

6) Initialize DB (migrations + RLS)
- Open the PostgreSQL service → Connect → psql shell.
- Run:
  - `\\i services/api/app/db/migrations/0001_init.sql`
  - `\\i services/api/app/db/migrations/0002_idempotency.sql`
  - `\\i services/api/app/db/migrations/0003_core_locked_at.sql`
  - `\\i services/api/app/db/migrations/0004_memory_event.sql`
  - `\\i services/api/app/db/rls.sql`

7) Deploy
- Click Deploy. Railway builds the Python app and runs `bash start.sh`.
- Health check: `GET https://<railway-domain>/v1/health`

## After deploy

- Vercel (ChatGPT UI) env var: `PYTHON_API_BASE=https://<railway-domain>`
- Rotate secrets in Railway Variables.
- Use the dashboard to view logs; scale can remain automatic for MVP.

## Optional: Railway CLI

```bash
npm install -g @railway/cli
railway login
railway link  # in repo root
railway logs
railway variables
railway up    # local deploy (optional)
```

## Notes
- pgvector is created in the migration via `create extension if not exists vector;`.
- App binds to `$PORT` via `services/api/start.sh`.
- For Backblaze B2/R2, boto3 must set `endpoint_url` from `S3_ENDPOINT_URL`.
- Endpoints currently return 501 until implemented; start with `POST /v1/memories`.
