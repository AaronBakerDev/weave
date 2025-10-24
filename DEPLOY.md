# 🚀 One-Command Deployment Guide

Deploy the entire Weave platform using `render.yaml` infrastructure as code.

## Prerequisites

- ✅ GitHub account
- ✅ Render account (https://render.com)
- 📋 OpenAI API key
- 📋 Clerk JWT settings

## Step 1: Push render.yaml to GitHub

```bash
cd /Users/aaronbaker/weave

# Add render.yaml to git
git add render.yaml

# Commit
git commit -m "Add Render infrastructure as code"

# Push to main branch
git push origin main
```

## Step 2: Connect Render to GitHub

1. Go to https://dashboard.render.com
2. Click **"New +"** → **"Blueprint"**
3. Select **"Connect a repository"**
4. Authorize Render to access GitHub
5. Select your **"weave"** repository
6. Render will detect `render.yaml` automatically
7. Click **"Apply"**

Render will now create:
- ✅ PostgreSQL database (`weave-db`)
- ✅ Web service (`weave-api`)
- ✅ Background worker (`weave-indexing-worker`)

## Step 3: Enable pgvector Extension

After database is created:

```bash
# Get database URL from Render dashboard
# Database → Connect → External Database URL

# Connect locally
psql "postgresql://weave_user:xxxxx@dpg-xxxxx-oregon-postgres.render.com/weave"

# Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

# Verify
\dx

# Exit
\q
```

## Step 4: Run Database Migrations

```bash
cd /Users/aaronbaker/weave/services/api

# Set DATABASE_URL (from Render dashboard)
export DATABASE_URL="postgresql://weave_user:xxxxx@dpg-xxxxx-oregon-postgres.render.com/weave"

# Run migrations in order
psql "$DATABASE_URL" -f app/db/migrations/0001_init.sql
psql "$DATABASE_URL" -f app/db/migrations/0002_idempotency.sql
psql "$DATABASE_URL" -f app/db/migrations/0003_core_locked_at.sql
psql "$DATABASE_URL" -f app/db/migrations/0004_memory_event.sql
psql "$DATABASE_URL" -f app/db/rls.sql

# Verify tables exist
psql "$DATABASE_URL" -c "\dt"
```

## Step 5: Set Secret Environment Variables

In Render Dashboard, add these **manually** (they're marked `sync: false` for security):

### For `weave-api` service:

```bash
OPENAI_API_KEY=sk-proj-your-key-here
JWT_ISSUER=https://your-clerk-issuer.clerk.accounts.dev
JWT_JWKS_URL=https://your-clerk-issuer.clerk.accounts.dev/.well-known/jwks.json
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_BUCKET=weave-prod
S3_ENDPOINT_URL=https://s3.us-east-005.backblazeb2.com  # Optional: Backblaze
```

### For `weave-indexing-worker` service:

```bash
OPENAI_API_KEY=sk-proj-your-key-here
```

**How to add:**
1. Render Dashboard → Select service
2. **Environment** tab
3. Click **"Add Environment Variable"**
4. Add key/value pairs above
5. Click **"Save Changes"**

### Get Clerk JWT Settings:

1. Go to https://dashboard.clerk.com
2. Select your application
3. Go to **JWT Templates** → Create or select template
4. Copy:
   - **Issuer URL** → `JWT_ISSUER`
   - Add `/.well-known/jwks.json` to issuer → `JWT_JWKS_URL`

## Step 6: Verify Deployment

```bash
# Check API is running
curl https://weave-api.onrender.com/

# Test authenticated endpoint (should get 401 without auth)
curl https://weave-api.onrender.com/v1/memories
```

## Step 7: Update Vercel Frontend

```bash
cd /Users/aaronbaker/weave/apps/chatgpt-ui

# Update Vercel environment variable
# Via Dashboard: https://vercel.com/aaronbakerdevs-projects/chatgpt-ui/settings/environment-variables
# Add: PYTHON_API_BASE=https://weave-api.onrender.com

# Or via CLI
vercel env add PYTHON_API_BASE
# Enter: https://weave-api.onrender.com
# Select: Production, Preview, Development

# Redeploy
vercel --prod
```

## Step 8: Configure Custom Domains (Optional)

### Backend API: api.weweavee.com

**In Render:**
1. Dashboard → `weave-api` → **Settings** → **Custom Domain**
2. Enter: `api.weweavee.com`
3. Copy the CNAME target

**In Cloudflare:**
```
Type: CNAME
Name: api
Target: weave-api.onrender.com
Proxy: DNS only (gray cloud)
```

### Frontend: app.weweavee.com

**In Vercel:**
1. Dashboard → Settings → **Domains**
2. Add: `app.weweavee.com`
3. Copy DNS instructions

**In Cloudflare:**
```
Type: CNAME
Name: app
Target: cname.vercel-dns.com
Proxy: DNS only (gray cloud)
```

## Monitoring with CLI

```bash
# Login to Render CLI
render login

# View API logs
render logs weave-api -f

# View worker logs
render logs weave-indexing-worker -f

# Check service status
render get service weave-api
```

## Updating After Code Changes

```bash
# Make changes to code
git add .
git commit -m "Your changes"
git push origin main

# Render auto-deploys via GitHub integration
# Watch logs
render logs weave-api -f
```

## Troubleshooting

### Issue: Services won't start
```bash
# Check build logs
render logs weave-api --tail 100

# Verify environment variables are set
render env list weave-api
```

### Issue: Database connection fails
```bash
# Verify pgvector is installed
psql "$DATABASE_URL" -c "SELECT * FROM pg_extension WHERE extname = 'vector';"

# Check DATABASE_URL is auto-injected
render env list weave-api | grep DATABASE_URL
```

### Issue: CORS errors from frontend
```bash
# Update ALLOWED_ORIGINS in Render dashboard
# Should include all your Vercel domains
ALLOWED_ORIGINS=https://chatgpt-ui-ivory.vercel.app,https://app.weweavee.com
```

## Complete Deployment Checklist

Backend (Render):
- [ ] `render.yaml` pushed to GitHub
- [ ] Blueprint applied in Render dashboard
- [ ] PostgreSQL created
- [ ] pgvector extension enabled
- [ ] All migrations run successfully
- [ ] Secret env vars added to both services
- [ ] API service running (check logs)
- [ ] Worker service running (check logs)
- [ ] Health check passes (`curl https://weave-api.onrender.com/`)

Frontend (Vercel):
- [ ] `PYTHON_API_BASE` points to Render API
- [ ] `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` set
- [ ] `CLERK_SECRET_KEY` set
- [ ] Deployed successfully
- [ ] Can load homepage

Integration:
- [ ] CORS configured correctly
- [ ] Clerk JWT settings match
- [ ] Can create memory from frontend
- [ ] Can search memories
- [ ] Canvas loads

Custom Domains (Optional):
- [ ] `api.weweavee.com` → Render
- [ ] `app.weweavee.com` → Vercel
- [ ] DNS propagated (check https://dnschecker.org)
- [ ] SSL certificates active

## Your Deployed URLs

After setup:
- **Backend API:** https://weave-api.onrender.com
- **Frontend:** https://chatgpt-ui-ivory.vercel.app
- **Custom Backend:** https://api.weweavee.com (after DNS)
- **Custom Frontend:** https://app.weweavee.com (after DNS)

---

**Total deployment time:** ~15-20 minutes (mostly waiting for builds)

**Monthly cost estimate:**
- Render (Starter plan): ~$21/month
- Vercel (Hobby): Free
- Cloudflare DNS: Free
- **Total: ~$21/month**
