# Domain Setup Guide: weweavee.com → Vercel

## Step 1: Rename Vercel Project (Optional but Recommended)

1. Go to https://vercel.com/aaronbakerdevs-projects/chatgpt-ui
2. Click **Settings** tab
3. Scroll to **Project Name**
4. Change from `chatgpt-ui` to `weave` (or `weweavee`)
5. Click **Save**

## Step 2: Add Custom Domain to Vercel

1. In your Vercel project, go to **Settings** → **Domains**
2. Click **Add Domain**
3. Enter your domain options:
   - `weweavee.com` (apex/root domain)
   - `www.weweavee.com` (www subdomain)
   - `app.weweavee.com` (recommended for app)

**Recommendation:** Use `app.weweavee.com` for the ChatGPT UI

4. Click **Add**
5. Vercel will show you DNS configuration instructions

## Step 3: Configure DNS in Cloudflare

### For apex domain (weweavee.com):

1. Log in to Cloudflare dashboard: https://dash.cloudflare.com
2. Select `weweavee.com`
3. Go to **DNS** → **Records**
4. Add **A Record**:
   - Type: `A`
   - Name: `@`
   - IPv4 address: `76.76.21.21` (Vercel's IP)
   - Proxy status: DNS only (gray cloud) ⚠️ Important!
   - TTL: Auto

### For www subdomain (www.weweavee.com):

Add **CNAME Record**:
- Type: `CNAME`
- Name: `www`
- Target: `cname.vercel-dns.com`
- Proxy status: DNS only (gray cloud)
- TTL: Auto

### For app subdomain (app.weweavee.com) - RECOMMENDED:

Add **CNAME Record**:
- Type: `CNAME`
- Name: `app`
- Target: `cname.vercel-dns.com`
- Proxy status: DNS only (gray cloud)
- TTL: Auto

## Step 4: Verify Domain in Vercel

1. After adding DNS records, return to Vercel
2. Click **Verify** next to your domain
3. Wait for DNS propagation (can take 5-60 minutes)
4. Status will change from "Pending" to "Valid"

## Step 5: Set Production Domain

1. In Vercel → Settings → Domains
2. Find your preferred domain (e.g., `app.weweavee.com`)
3. Click **...** → **Set as Production Domain**

## Step 6: Update Clerk Settings

Update your Clerk allowed origins to include:
1. Go to https://dashboard.clerk.com
2. Select your application
3. Go to **Settings** → **Allowed Origins**
4. Add:
   - `https://weweavee.com`
   - `https://www.weweavee.com`
   - `https://app.weweavee.com`

## Step 7: Update Backend CORS

In your Render backend environment variables, add to `ALLOWED_ORIGINS`:
```bash
https://weweavee.com,https://www.weweavee.com,https://app.weweavee.com
```

Update in: Render Dashboard → weave-api → Environment → ALLOWED_ORIGINS

## Step 8: Update ChatGPT Plugin Manifest

Update your GPT's action endpoint to:
```
https://app.weweavee.com/api/mcp
```

## Troubleshooting

### Domain not verifying?
- Check DNS propagation: https://dnschecker.org
- Ensure proxy is disabled in Cloudflare (gray cloud, not orange)
- Wait up to 60 minutes for full propagation

### SSL/HTTPS not working?
- Vercel automatically provisions SSL certificates
- May take 5-10 minutes after domain verification
- Check Vercel → Settings → Domains → SSL status

### Redirect issues?
- Ensure only one domain is set as "Production"
- Configure redirects in vercel.json if needed

## Quick DNS Check

```bash
# Check DNS resolution
dig app.weweavee.com
dig weweavee.com

# Check if pointing to Vercel
host app.weweavee.com
```

## Current Deployment Status

- Preview URL: https://chatgpt-qktnn1xeb-aaronbakerdevs-projects.vercel.app
- Production URL: (waiting for --prod deployment)
- Custom Domain: (pending setup)
