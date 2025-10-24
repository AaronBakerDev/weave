# Render Deployment Guide for Weave FastAPI Backend

## Why Render?

Render is an excellent alternative to Railway with:
- ✅ Free PostgreSQL (90 days, then paid)
- ✅ Free tier for web services (750 hours/month)
- ✅ Automatic SSL certificates
- ✅ Built-in PostgreSQL backups
- ✅ Easy monorepo support

## Prerequisites

1. **Render Account** - https://render.com
2. **GitHub Repository** - Your weave repo
3. **OpenAI API Key** - For embeddings
4. **Clerk JWT Settings** - For authentication

## Architecture Overview

You'll deploy:
1. **PostgreSQL Database** (with pgvector)
2. **Web Service** (FastAPI API)
3. **Background Worker** (Indexing service)

---

## Part 1: Create PostgreSQL Database

### Step 1: Create Database

1. Log in to https://dashboard.render.com
2. Click **"New +"** → **"PostgreSQL"**
3. Configure:
   - **Name**: `weave-db`
   - **Database**: `weave`
   - **User**: `weave_user` (auto-generated)
   - **Region**: Choose closest to you (e.g., Oregon, Ohio)
   - **PostgreSQL Version**: 14 or higher
   - **Plan**: Free (or Starter $7/month for production)
4. Click **"Create Database"**

### Step 2: Enable pgvector Extension

After database is created:

1. Go to your database dashboard
2. Click **"Connect"** → **"External Connection"**
3. Copy the **External Database URL**
4. Run locally:

```bash
# Install psql if needed
brew install postgresql

# Connect to Render Postgres
psql "postgresql://weave_user:xxxxx@dpg-xxxxx-oregon-postgres.render.com/weave"

# Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

# Verify
\dx
# Should show "vector" in the list

# Exit
\q
```

### Step 3: Run Database Migrations

```bash
# Set DATABASE_URL to your Render Postgres
export DATABASE_URL="postgresql://weave_user:xxxxx@dpg-xxxxx-oregon-postgres.render.com/weave"

cd /Users/aaronbaker/weave/services/api

# Run migrations in order
psql "$DATABASE_URL" -f app/db/migrations/0001_init.sql
psql "$DATABASE_URL" -f app/db/migrations/0002_idempotency.sql
psql "$DATABASE_URL" -f app/db/migrations/0003_core_locked_at.sql
psql "$DATABASE_URL" -f app/db/migrations/0004_memory_event.sql
psql "$DATABASE_URL" -f app/db/rls.sql
```

**Verify migrations:**
```bash
psql "$DATABASE_URL" -c "\dt"
# Should show all your tables
```

---

## Part 2: Deploy FastAPI Web Service

### Step 1: Create Web Service

1. In Render Dashboard, click **"New +"** → **"Web Service"**
2. Connect your GitHub repository
3. Select **"weave"** repository

### Step 2: Configure Service

**Basic Settings:**
- **Name**: `weave-api`
- **Region**: Same as database (e.g., Oregon)
- **Branch**: `main` (or `master`)
- **Root Directory**: `services/api`
- **Runtime**: `Python 3`
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

**Instance Type:**
- **Free** (for testing)
- **Starter** ($7/month - recommended for production)

### Step 3: Add Environment Variables

Click **"Advanced"** → **"Add Environment Variable"**:

```bash
# Python
PYTHON_VERSION=3.11.0

# Database (Click "Connect to existing database")
DATABASE_URL=[From Render Database - use Internal Database URL]

# OpenAI
OPENAI_API_KEY=sk-proj-your-key-here
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIM=1536

# JWT / Auth (from Clerk)
JWT_AUDIENCE=weave
JWT_ISSUER=https://your-clerk-issuer.clerk.accounts.dev
JWT_JWKS_URL=https://your-clerk-issuer.clerk.accounts.dev/.well-known/jwks.json

# AWS S3 / Backblaze B2
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_BUCKET=weave-prod
AWS_REGION=us-east-1
S3_ENDPOINT_URL=https://s3.us-east-005.backblazeb2.com  # Optional: for Backblaze B2

# CORS
ALLOWED_ORIGINS=https://chatgpt-ui-ivory.vercel.app,https://app.weweavee.com,https://weweavee.com
```

**Important:** For `DATABASE_URL`:
- Use **"Internal Database URL"** from your Render PostgreSQL
- Click "Connect to existing database" to auto-fill

### Step 4: Deploy

1. Click **"Create Web Service"**
2. Render will start building and deploying
3. Watch the logs for any errors
4. Once deployed, you'll get a URL like: `https://weave-api.onrender.com`

---

## Part 3: Deploy Background Worker (Indexing)

### Step 1: Create Background Worker

1. Click **"New +"** → **"Background Worker"**
2. Connect to same GitHub repository
3. Select **"weave"** repository

### Step 2: Configure Worker

**Basic Settings:**
- **Name**: `weave-indexing-worker`
- **Region**: Same as database and API
- **Branch**: `main`
- **Root Directory**: `services/api`
- **Runtime**: `Python 3`
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `python app/workers/indexing.py`

**Instance Type:**
- **Free** (for testing)
- **Starter** ($7/month for production)

### Step 3: Add Environment Variables

Use the **same environment variables** as the Web Service (copy them over):
- DATABASE_URL
- OPENAI_API_KEY
- EMBEDDING_MODEL
- EMBEDDING_DIM
- etc.

**Tip:** Render allows you to create **Environment Groups** to share variables:
1. Go to **"Environment Groups"** in left sidebar
2. Create group: `weave-shared`
3. Add all shared variables
4. Link group to both services

### Step 4: Deploy

1. Click **"Create Background Worker"**
2. Worker will start running
3. Check logs to ensure it's processing the queue

---

## Part 4: Update Vercel with Render URL

Now that Render is deployed:

### Via Vercel Dashboard:

1. Go to https://vercel.com/aaronbakerdevs-projects/chatgpt-ui/settings/environment-variables
2. Add or update:
   ```bash
   PYTHON_API_BASE=https://weave-api.onrender.com
   ```
3. Set for: **Production, Preview, Development**
4. Save

### Redeploy Vercel:

```bash
cd /Users/aaronbaker/weave/apps/chatgpt-ui
vercel --prod
```

---

## Part 5: Configure Custom Domain (Optional)

### For API (api.weweavee.com):

1. In Render → **weave-api** service → **Settings**
2. Scroll to **"Custom Domain"**
3. Click **"Add Custom Domain"**
4. Enter: `api.weweavee.com`
5. Render will show DNS instructions

### In Cloudflare:

Add **CNAME Record**:
- Type: `CNAME`
- Name: `api`
- Target: `weave-api.onrender.com` (from Render instructions)
- Proxy: **DNS only** (gray cloud)
- TTL: Auto

Wait 5-60 minutes for DNS propagation. Render will auto-provision SSL.

---

## Render vs Railway Comparison

| Feature | Render | Railway |
|---------|--------|---------|
| **Free PostgreSQL** | 90 days | Paid only |
| **Free Web Service** | 750 hrs/month | $5/month min |
| **Monorepo Support** | ✅ Root Directory | ✅ Root Directory |
| **Background Workers** | ✅ Native | ✅ Native |
| **pgvector** | ✅ Manual install | ✅ Manual install |
| **Cold Starts** | Yes (free tier) | Less frequent |
| **Build Speed** | Moderate | Fast |
| **Pricing** | More free tier | More predictable |

**Recommendation:** Render is better for starting out. Railway is better for production scale.

---

## Cost Estimate (Render)

### Free Tier (Testing):
- Web Service: 750 hours/month free
- PostgreSQL: Free for 90 days
- Background Worker: 750 hours/month free
- **Total:** $0/month (first 90 days)

### Paid (Production):
- Web Service (Starter): $7/month
- PostgreSQL (Starter): $7/month
- Background Worker (Starter): $7/month
- **Total:** $21/month

**Note:** Free tier web services "spin down" after 15 min of inactivity (cold start ~30s).

---

## Troubleshooting

### Issue: "pgvector extension not found"
```bash
# Connect to DB and install manually
psql "$DATABASE_URL"
CREATE EXTENSION vector;
\dx
\q
```

### Issue: "Import errors" in Python
- Verify Root Directory is set to `services/api`
- Imports should be `from app.main import app`
- Check build logs for missing dependencies

### Issue: Web service returns 502
- Check logs: Render Dashboard → Service → Logs
- Verify Start Command includes `--host 0.0.0.0 --port $PORT`
- Ensure all environment variables are set

### Issue: CORS errors from Vercel
- Add Vercel URL to `ALLOWED_ORIGINS` in Render
- Include both preview and production URLs
- Restart Render service after changing env vars

### Issue: Database connection timeout
- Use **Internal Database URL** (not External) for Render services
- External URL is only for local connections

### Issue: Worker not processing jobs
- Check `memory_event` table has rows
- Verify OPENAI_API_KEY is set
- Check worker logs for errors
- Ensure DATABASE_URL is correct

---

## Production Checklist

- [ ] PostgreSQL created with pgvector extension
- [ ] All migrations run successfully
- [ ] Web service deployed and running
- [ ] Background worker deployed and running
- [ ] All environment variables configured
- [ ] ALLOWED_ORIGINS includes Vercel domains
- [ ] Clerk JWT settings configured
- [ ] S3/Backblaze B2 configured for artifacts
- [ ] OpenAI API key set and tested
- [ ] Health check passes (`curl https://weave-api.onrender.com`)
- [ ] Vercel updated with Render URL
- [ ] CORS working between Vercel and Render
- [ ] Logs are clean (no errors)

---

## Monitoring & Maintenance

### View Logs:
- Render Dashboard → Service → Logs (live tail)

### Database Backups:
- Render automatically backs up paid databases
- Go to Database → Backups tab

### Restart Services:
- Render Dashboard → Service → Manual Deploy → Clear build cache & deploy

### Check Service Health:
```bash
# API health
curl https://weave-api.onrender.com/

# Test endpoint
curl https://weave-api.onrender.com/v1/memories
```

---

## Useful Render Features

### Environment Groups:
Share env vars across services:
1. Dashboard → Environment Groups
2. Create group → Add variables
3. Link to multiple services

### Render Shell:
Access service shell:
1. Service → Shell tab
2. Run commands directly

### Deploy Hooks:
Trigger deploys via API:
1. Service → Settings → Deploy Hook
2. Copy URL
3. POST to URL to trigger deploy

### Notifications:
1. Service → Settings → Notifications
2. Add email/Slack for deploy notifications

---

## Next Steps After Deployment

1. **Test full flow:**
   - Create memory via Vercel UI
   - Check it appears in Render logs
   - Verify in database

2. **Set up monitoring:**
   - Consider Sentry for error tracking
   - UptimeRobot for uptime monitoring

3. **Configure custom domains:**
   - `api.weweavee.com` → Render
   - `app.weweavee.com` → Vercel

4. **Upgrade to paid tier** when ready (no cold starts)

5. **Set up staging environment:**
   - Create separate Render services
   - Use different database
   - Test before production deploys

---

## Your Deployment URLs

After setup, you'll have:

- **API:** `https://weave-api.onrender.com`
- **Custom API:** `https://api.weweavee.com` (after DNS)
- **Frontend:** `https://chatgpt-ui-ivory.vercel.app`
- **Custom Frontend:** `https://app.weweavee.com` (after DNS)

---

Need help? Check Render docs: https://render.com/docs
