# Vercel Deployment Guide for Weave ChatGPT UI

## Prerequisites

1. **Vercel Account** - Sign up at https://vercel.com
2. **Clerk Account** - Get API keys from https://clerk.com
3. **Backend API** - Your FastAPI backend URL (Railway deployment)

## Step 1: Install Vercel CLI (Optional)

```bash
npm i -g vercel
```

## Step 2: Deploy to Vercel

### Option A: Deploy via Vercel Dashboard (Recommended)

1. Go to https://vercel.com/new
2. Import your Git repository
3. **Root Directory**: Select `apps/chatgpt-ui`
4. **Framework Preset**: Next.js
5. Click "Deploy"

### Option B: Deploy via CLI

```bash
cd /Users/aaronbaker/weave/apps/chatgpt-ui
vercel
```

Follow the prompts:
- Set up and deploy? **Yes**
- Which scope? (Select your account)
- Link to existing project? **No**
- Project name? **weave-chatgpt-ui**
- Directory? **./** (current directory)
- Override settings? **No**

## Step 3: Configure Environment Variables

In the Vercel Dashboard (Settings → Environment Variables), add:

### Required Variables

```bash
# Clerk Authentication (same keys as next-app for SSO)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_... or pk_live_...
CLERK_SECRET_KEY=sk_test_... or sk_live_...

# Backend API (your Render URL)
PYTHON_API_BASE=https://weave-api.onrender.com

# Optional: OpenAI API (if used in frontend)
OPENAI_API_KEY=sk-...
```

### Get Clerk Keys

1. Go to https://dashboard.clerk.com
2. Select your application
3. Go to **API Keys**
4. Copy:
   - **Publishable Key** → `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - **Secret Key** → `CLERK_SECRET_KEY`

**Important:** Use the **same Clerk keys** as your other Weave apps for SSO!

## Step 4: Redeploy with Environment Variables

After adding environment variables:
- Vercel will automatically trigger a new deployment
- Or manually trigger: **Deployments → ... → Redeploy**

## Step 5: Verify Deployment

1. Visit your Vercel deployment URL (e.g., `https://weave-chatgpt-ui.vercel.app`)
2. Check that:
   - ✅ Sign in/sign up works (Clerk)
   - ✅ API calls reach your backend
   - ✅ Memory creation works
   - ✅ Canvas loads properly

## Troubleshooting

### Issue: "Clerk keys not found"
- Ensure `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` starts with `pk_`
- Ensure `CLERK_SECRET_KEY` starts with `sk_`
- Check they're set for "Production" environment in Vercel

### Issue: "Failed to fetch memories"
- Check `PYTHON_API_BASE` is correct (no trailing slash)
- Ensure your Render backend is running
- Check CORS settings in FastAPI allow your Vercel domain

### Issue: Build fails
- Check build logs in Vercel dashboard
- Ensure Node.js version is ≥18.17
- Check for TypeScript errors

## Custom Domain (Optional)

1. Go to Vercel Dashboard → Settings → Domains
2. Add your custom domain (e.g., `chatgpt.weave.app`)
3. Follow DNS configuration instructions
4. Update Clerk allowed origins to include your custom domain

## Important Notes

- **SSO**: Use the same Clerk keys across all Weave apps
- **CORS**: Add your Vercel URL to `ALLOWED_ORIGINS` in your FastAPI backend
- **Environment**: Set variables for all environments (Production, Preview, Development)
- **Security**: Never commit `.env.local` to Git

## ChatGPT Plugin Configuration

Your ChatGPT plugin manifest should point to:
```
https://your-vercel-url.vercel.app/api/mcp
```

Update the manifest in your GPT configuration with the production URL.
