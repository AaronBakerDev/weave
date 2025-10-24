# Railway Deployment Guide for Weave FastAPI Backend

## Prerequisites

1. **Railway Account** - Sign up at https://railway.app
2. **GitHub Repository** - Your code should be in Git
3. **OpenAI API Key** - For embeddings
4. **Clerk JWT Settings** - For authentication

## Step 1: Create Railway Project

### Option A: Deploy via Railway Dashboard (Recommended)

1. Go to https://railway.app
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Authorize Railway to access your GitHub
5. Select your `weave` repository
6. Railway will detect it's a monorepo

### Option B: Deploy via Railway CLI

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Initialize project
cd /Users/aaronbaker/weave/services/api
railway init
```

## Step 2: Configure Root Directory

Since Weave is a monorepo, you need to tell Railway where the API is:

1. In Railway Dashboard → Your Project → **Settings**
2. **Root Directory**: `services/api`
3. **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. **Build Command**: Leave empty (Python doesn't need build)

## Step 3: Add PostgreSQL Database

1. In your Railway project, click **"+ New"**
2. Select **"Database"** → **"PostgreSQL"**
3. Railway will create a Postgres instance
4. **IMPORTANT:** You need pgvector extension

### Enable pgvector Extension

After Postgres is created:

1. Click on the **PostgreSQL** service
2. Go to **"Connect"** tab
3. Copy the **"Postgres Connection URL"**
4. Run this command locally:

```bash
# Connect to Railway Postgres
psql "postgresql://postgres:xxxxx@xxxxx.railway.app:5432/railway"

# Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

# Verify
\dx
# Should show "vector" in the list

# Exit
\q
```

Or use Railway's web terminal:
1. Click PostgreSQL service → **"Data"** tab
2. Click **"Query"**
3. Run: `CREATE EXTENSION IF NOT EXISTS vector;`

## Step 4: Run Database Migrations

You need to run your SQL migrations against the Railway database:

```bash
# Set DATABASE_URL to your Railway Postgres URL
export DATABASE_URL="postgresql://postgres:xxxxx@xxxxx.railway.app:5432/railway"

# Run migrations in order
psql "$DATABASE_URL" -f services/api/app/db/migrations/0001_init.sql
psql "$DATABASE_URL" -f services/api/app/db/migrations/0002_idempotency.sql
psql "$DATABASE_URL" -f services/api/app/db/migrations/0003_core_locked_at.sql
psql "$DATABASE_URL" -f services/api/app/db/migrations/0004_memory_event.sql
psql "$DATABASE_URL" -f services/api/app/db/rls.sql
```

**Important:** Run migrations from your local machine pointing to Railway DB, or use Railway's CLI:

```bash
railway run psql -f app/db/migrations/0001_init.sql
railway run psql -f app/db/migrations/0002_idempotency.sql
railway run psql -f app/db/migrations/0003_core_locked_at.sql
railway run psql -f app/db/migrations/0004_memory_event.sql
railway run psql -f app/db/rls.sql
```

## Step 5: Configure Environment Variables

In Railway Dashboard → Your API Service → **Variables** tab:

### Required Variables:

```bash
# Python runtime
PYTHON_VERSION=3.11

# Port (Railway provides this automatically, but good to set)
PORT=8000

# Database (Railway auto-injects DATABASE_URL, but you can override)
DATABASE_URL=${{Postgres.DATABASE_URL}}

# OpenAI
OPENAI_API_KEY=sk-proj-your-key-here
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIM=1536

# JWT / Auth (from Clerk)
JWT_AUDIENCE=weave
JWT_ISSUER=https://your-clerk-issuer.clerk.accounts.dev
JWT_JWKS_URL=https://your-clerk-issuer.clerk.accounts.dev/.well-known/jwks.json

# AWS S3 / Backblaze B2 for artifacts
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_BUCKET=weave-prod
AWS_REGION=us-east-1
S3_ENDPOINT_URL=https://s3.us-east-005.backblazeb2.com  # If using Backblaze B2

# CORS (Add your Vercel domains)
ALLOWED_ORIGINS=https://chatgpt-ui-ivory.vercel.app,https://app.weweavee.com,https://weweavee.com
```

### Get Clerk JWT Settings:

1. Go to https://dashboard.clerk.com
2. Select your application
3. Go to **JWT Templates** → **Create template** (or use default)
4. Your JWT settings:
   - **Issuer**: Copy from JWT template (e.g., `https://upbeat-cod-12.clerk.accounts.dev`)
   - **JWKS URL**: `{issuer}/.well-known/jwks.json`
   - **Audience**: Set to `weave` (or match your template)

### Variables Railway Auto-Provides:

Railway automatically injects these (you don't need to set them):
- `DATABASE_URL` - Postgres connection string
- `RAILWAY_ENVIRONMENT` - production/staging
- `RAILWAY_PROJECT_ID`
- `RAILWAY_SERVICE_ID`

## Step 6: Create Nixpacks Configuration (Optional)

Railway uses Nixpacks to detect your app. For better control, create this file:

**File:** `/Users/aaronbaker/weave/services/api/nixpacks.toml`

```toml
[phases.setup]
nixPkgs = ["python311", "postgresql"]

[phases.install]
cmds = ["pip install -r requirements.txt"]

[start]
cmd = "uvicorn app.main:app --host 0.0.0.0 --port $PORT"
```

## Step 7: Deploy

### Auto-Deploy (Recommended):

Railway automatically deploys on every push to your main branch.

```bash
git add .
git commit -m "Configure Railway deployment"
git push origin main
```

### Manual Deploy:

```bash
cd /Users/aaronbaker/weave/services/api
railway up
```

## Step 8: Verify Deployment

1. In Railway Dashboard, click on your API service
2. Go to **"Deployments"** tab
3. Check build logs for errors
4. Once deployed, click **"Settings"** → **"Networking"**
5. Railway will show your **Public URL** (e.g., `https://weave-api-production.up.railway.app`)

### Test Your API:

```bash
# Check health
curl https://your-app.up.railway.app/

# Test API
curl https://your-app.up.railway.app/v1/memories
```

## Step 9: Set Up Background Worker (Indexing)

The indexing worker needs to run separately. Create a second service:

1. In Railway project, click **"+ New"**
2. Select **"Empty Service"**
3. Name it **"indexing-worker"**
4. **Settings:**
   - Root Directory: `services/api`
   - Start Command: `python app/workers/indexing.py`
   - Use same environment variables as API service

Or add to existing service (not recommended for production):
- Update start command to run both: `uvicorn app.main:app --host 0.0.0.0 --port $PORT & python app/workers/indexing.py`

## Step 10: Update Vercel Environment Variables

Now that Railway is deployed, update Vercel:

1. Go to https://vercel.com/aaronbakerdevs-projects/chatgpt-ui/settings/environment-variables
2. Add/Update:
   ```bash
   PYTHON_API_BASE=https://your-app.up.railway.app
   ```
3. **Redeploy Vercel:**
   ```bash
   vercel --prod
   ```

## Step 11: Configure Custom Domain on Railway (Optional)

1. In Railway → API Service → **Settings** → **Networking**
2. Click **"Generate Domain"** for a `railway.app` subdomain
3. Or add custom domain: **"Custom Domain"** → `api.weweavee.com`
4. Add CNAME in Cloudflare:
   - Type: `CNAME`
   - Name: `api`
   - Target: (Railway provides this)

## Troubleshooting

### Build fails with "ModuleNotFoundError"?
- Check `requirements.txt` is in `services/api/`
- Verify Root Directory is set to `services/api`

### Database connection fails?
- Ensure pgvector extension is installed
- Check `DATABASE_URL` format
- Verify migrations ran successfully

### Import errors in Python?
- Railway runs from `services/api/` as root
- Imports should be `from app.main import app` not `from services.api.app.main`

### 502 Bad Gateway?
- Check Start Command includes `--host 0.0.0.0`
- Verify `--port $PORT` uses Railway's PORT variable
- Check build logs for Python errors

### CORS errors from Vercel?
- Add your Vercel URL to `ALLOWED_ORIGINS`
- Include both preview and production URLs

## Cost Estimate

**Railway Pricing:**
- **Hobby Plan**: $5/month (500 hours, 512MB RAM, 1GB disk)
- **Pro Plan**: $20/month (usage-based)

**Typical Usage:**
- API Service: ~$5-10/month
- PostgreSQL: $5-15/month (depending on size)
- Indexing Worker: ~$5/month

**Total:** ~$15-30/month for production

## Production Checklist

- [ ] PostgreSQL created with pgvector extension
- [ ] All migrations run successfully
- [ ] Environment variables configured
- [ ] ALLOWED_ORIGINS includes Vercel domains
- [ ] Clerk JWT settings configured
- [ ] S3/Backblaze B2 configured for artifacts
- [ ] OpenAI API key set for embeddings
- [ ] Indexing worker running
- [ ] Health check passes
- [ ] Vercel updated with Railway URL
- [ ] CORS working between Vercel and Railway

## Useful Railway Commands

```bash
# View logs
railway logs

# Run migrations
railway run psql -f app/db/migrations/0001_init.sql

# Open shell
railway shell

# Check environment
railway variables

# Link to different project
railway link
```

## Next Steps

1. **Set up monitoring** - Railway provides metrics
2. **Configure alerts** - Get notified of downtime
3. **Set up staging environment** - Create separate Railway project
4. **Implement CI/CD** - GitHub Actions for tests before deploy
5. **Database backups** - Railway has automatic backups on Pro plan

---

Your backend will be available at:
- **Railway URL:** `https://your-project.up.railway.app`
- **Custom Domain:** `https://api.weweavee.com` (after DNS setup)
