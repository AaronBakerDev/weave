# Render CLI Quick Reference Guide

## Installation

```bash
# Install via Homebrew (macOS/Linux)
brew install render

# Or via npm
npm install -g @render-community/render-cli

# Verify installation
render --version
```

You already have: **render version 2.1.1** ✅

## Authentication

```bash
# Login to Render
render login

# This will open browser for authentication
# Or set API key directly
export RENDER_API_KEY=your_api_key_here
```

**Get API Key:**
1. Go to https://dashboard.render.com/account/settings
2. Scroll to **API Keys**
3. Click **Create API Key**
4. Copy and save it

## Useful Commands

### List Services

```bash
# List all services
render list services

# List databases
render list databases

# List all resources
render list
```

### View Service Details

```bash
# Get service info
render get service <service-id-or-name>

# Example
render get service weave-api
```

### View Logs

```bash
# Tail logs for a service (most useful!)
render logs <service-id-or-name>

# Example
render logs weave-api

# Follow logs in real-time
render logs weave-api --follow
render logs weave-api -f

# Tail last 100 lines
render logs weave-api --tail 100
```

### Deploy

```bash
# Trigger manual deploy
render deploy <service-id-or-name>

# Example
render deploy weave-api
```

### Run Commands in Service Context

```bash
# Execute one-off command
render run <service-id> <command>

# Example: Run database migration
render run weave-api psql $DATABASE_URL -f app/db/migrations/0001_init.sql

# Open shell
render shell <service-id>
```

### Environment Variables

```bash
# List environment variables
render env list <service-id>

# Set environment variable
render env set <service-id> KEY=value

# Example
render env set weave-api ALLOWED_ORIGINS=https://app.weweavee.com

# Remove environment variable
render env unset <service-id> KEY
```

## Practical Workflows

### Quick Deploy to Render from CLI

```bash
cd /Users/aaronbaker/weave/services/api

# Login
render login

# List your services to get ID
render list services

# Deploy
render deploy weave-api

# Watch logs
render logs weave-api -f
```

### Run Database Migrations via CLI

```bash
# Get your service ID
render list services | grep weave

# Run migration (if service has access to psql)
render run weave-api psql $DATABASE_URL -c "CREATE EXTENSION IF NOT EXISTS vector;"

# Or run migrations locally pointing to Render DB
export DATABASE_URL=$(render env list weave-api | grep DATABASE_URL | cut -d'=' -f2)
psql "$DATABASE_URL" -f app/db/migrations/0001_init.sql
```

### Monitor Production

```bash
# Real-time logs
render logs weave-api -f

# Check service health
render get service weave-api

# View recent deploys
render list deploys weave-api
```

### Update Environment Variables

```bash
# Set multiple env vars
render env set weave-api \
  ALLOWED_ORIGINS=https://app.weweavee.com,https://weweavee.com \
  OPENAI_API_KEY=sk-proj-new-key

# List all env vars (to verify)
render env list weave-api
```

## Render CLI vs Dashboard

| Task | CLI | Dashboard |
|------|-----|-----------|
| **Create Service** | ❌ No | ✅ Yes |
| **View Logs** | ✅ Better | ✅ Good |
| **Deploy** | ✅ Yes | ✅ Yes |
| **Env Vars** | ✅ Yes | ✅ Easier |
| **Migrations** | ⚠️ Tricky | ❌ Manual |
| **Monitor** | ✅ Real-time | ✅ Pretty UI |

**Recommendation:**
- Use **Dashboard** for initial setup and configuration
- Use **CLI** for logs, deploys, and day-to-day ops

## Common Use Cases

### 1. Check if backend is healthy

```bash
# View recent logs
render logs weave-api --tail 50

# Check service status
render get service weave-api | grep status
```

### 2. Quick redeploy after code change

```bash
git push origin main  # Push to GitHub
render deploy weave-api  # Trigger Render deploy
render logs weave-api -f  # Watch deployment logs
```

### 3. Debug production issues

```bash
# Tail logs in real-time
render logs weave-api -f

# In another terminal, check worker logs
render logs weave-indexing-worker -f
```

### 4. Update API key quickly

```bash
render env set weave-api OPENAI_API_KEY=sk-proj-new-key
render deploy weave-api  # Restart with new env var
```

## Limitations

❌ **Cannot do via CLI:**
- Create new services (use Dashboard or render.yaml)
- Configure build settings
- Set up custom domains
- Create databases
- Configure autoscaling

✅ **Can do via CLI:**
- View logs (best feature!)
- Deploy services
- Manage environment variables
- Run one-off commands
- Monitor service health

## Alternative: Infrastructure as Code

For more control, use **render.yaml**:

```yaml
# render.yaml in repo root
services:
  - type: web
    name: weave-api
    env: python
    rootDir: services/api
    buildCommand: pip install -r requirements.txt
    startCommand: uvicorn app.main:app --host 0.0.0.0 --port $PORT
    envVars:
      - key: PYTHON_VERSION
        value: 3.11.0
      - key: DATABASE_URL
        fromDatabase:
          name: weave-db
          property: connectionString
      - key: OPENAI_API_KEY
        sync: false  # Set manually in dashboard

  - type: worker
    name: weave-indexing-worker
    env: python
    rootDir: services/api
    buildCommand: pip install -r requirements.txt
    startCommand: python app/workers/indexing.py
    envVars:
      - key: DATABASE_URL
        fromDatabase:
          name: weave-db
          property: connectionString

databases:
  - name: weave-db
    databaseName: weave
    user: weave_user
```

**Deploy from render.yaml:**
```bash
# Render will auto-detect render.yaml on push
git add render.yaml
git commit -m "Add Render infrastructure as code"
git push origin main
```

## Quick Reference Cheat Sheet

```bash
# Authentication
render login

# View all services
render list services

# View logs (MOST USEFUL)
render logs weave-api -f

# Deploy
render deploy weave-api

# Environment variables
render env list weave-api
render env set weave-api KEY=value

# Service info
render get service weave-api

# Shell access
render shell weave-api

# Help
render --help
render logs --help
```

## Pro Tips

1. **Alias common commands:**
```bash
# Add to ~/.zshrc or ~/.bashrc
alias rlogs='render logs weave-api -f'
alias rdeploy='render deploy weave-api'
alias rwlogs='render logs weave-indexing-worker -f'
```

2. **Save API key in environment:**
```bash
# Add to ~/.zshrc or ~/.bashrc
export RENDER_API_KEY=your_api_key_here
```

3. **Use with scripts:**
```bash
#!/bin/bash
# deploy.sh
echo "Deploying to Render..."
git push origin main
render deploy weave-api
echo "Watching logs..."
render logs weave-api --tail 100
```

## Troubleshooting

### Issue: "Authentication required"
```bash
render login
# Or set API key
export RENDER_API_KEY=your_key
```

### Issue: "Service not found"
```bash
# List all services to get exact name
render list services

# Use exact service name from list
render logs <exact-service-name>
```

### Issue: CLI command hangs
```bash
# Try with --json flag for raw output
render get service weave-api --json

# Or use dashboard as fallback
open https://dashboard.render.com
```

---

**Bottom Line:** Render CLI is great for logs and monitoring, but use the Dashboard for initial setup and configuration.
