# Backblaze B2 Setup Guide for Weave (3 Minutes)

## Why Backblaze B2?

- ✅ **Handles all file types**: Videos, images, audio, documents
- ✅ **Dead simple setup**: 3 clicks to get credentials
- ✅ **Cheaper than AWS**: $6/TB vs AWS $23/TB
- ✅ **10GB free forever**
- ✅ **S3-compatible**: Works with your existing code
- ✅ **Cloudflare integration**: Free bandwidth when used with Cloudflare

## Step 1: Create Backblaze Account (1 minute)

1. Go to: https://www.backblaze.com/b2/sign-up.html
2. Fill in:
   - Email: your email
   - Password: create password
3. Click **"Sign Up"**
4. Verify email (check inbox)
5. Login at: https://secure.backblaze.com

## Step 2: Create Bucket (30 seconds)

1. In Backblaze dashboard, click **"B2 Cloud Storage"** (left sidebar)
2. Click **"Buckets"** tab
3. Click **"Create a Bucket"**
4. Settings:
   - **Bucket Unique Name**: `weave-prod-<yourname>` (must be globally unique)
     - Try: `weave-prod-aaron` or `weave-prod-ab` if taken
   - **Files in Bucket are**: **Private** ✅
   - **Default Encryption**: **Disabled** (or enable if you want)
   - **Object Lock**: **Disabled**
5. Click **"Create a Bucket"**

## Step 3: Create Application Key (1 minute)

1. Click **"App Keys"** (left sidebar or in bucket view)
2. Click **"Add a New Application Key"**
3. Settings:
   - **Name of Key**: `weave-api-key`
   - **Allow access to Bucket(s)**: Select your `weave-prod-xxx` bucket
   - **Type of Access**: **Read and Write** ✅
   - **Allow List All Bucket Names**: ✅ Check this
   - **File name prefix**: Leave empty
   - **Duration (seconds)**: Leave empty (never expires)
4. Click **"Create New Key"**

## Step 4: SAVE CREDENTIALS (IMPORTANT!)

⚠️ **These are shown ONLY ONCE - save them now:**

You'll see a screen with:
```
Application Key ID: 005a1b2c3d4e5f6g7h8i9j0  (example)
Application Key: K005abcdefghijklmnopqrstuvwxyz1234567890  (example)
```

**Copy both immediately!**

Also note:
- **Endpoint**: Will be like `s3.us-west-004.backblazeb2.com`
- **Bucket Name**: Your `weave-prod-xxx` name

## Step 5: Get Endpoint URL

On the App Keys page, you'll see:

```
Endpoint: s3.us-west-004.backblazeb2.com
```

Your full endpoint URL is: `https://s3.us-west-004.backblazeb2.com`

(Region code might be different like `us-west-001`, `us-west-002`, etc.)

## Step 6: Environment Variables for Render

Add these to your **weave-api** service in Render:

```bash
# Backblaze B2 Configuration
AWS_ACCESS_KEY_ID=<your-keyID-from-step-4>
AWS_SECRET_ACCESS_KEY=<your-applicationKey-from-step-4>
AWS_S3_BUCKET=weave-prod-xxx  # your actual bucket name
AWS_REGION=us-west-004  # from your endpoint
S3_ENDPOINT_URL=https://s3.us-west-004.backblazeb2.com
```

### How to add in Render:

1. Go to https://dashboard.render.com
2. Click on **weave-api** service
3. Go to **"Environment"** tab
4. Click **"Add Environment Variable"**
5. Add each variable above
6. Click **"Save Changes"**

The service will automatically redeploy.

## Video Support Details

### Supported Video Formats:
- ✅ MP4 (most common)
- ✅ MOV (iPhone videos)
- ✅ AVI
- ✅ WebM
- ✅ MKV
- ✅ Any video format!

### File Size Limits:
- **Single file**: Up to 10TB (you're fine!)
- **Recommended**: Keep videos under 500MB for fast uploads

### Storage Calculator:

**With 10GB free tier:**
- 50 HD videos (2 min each @ 200MB)
- OR 25 HD videos (5 min each @ 400MB)
- OR 200+ high-quality images
- OR mix of videos + images

## Pricing (After Free Tier)

**Free tier:**
- 10GB storage
- 1GB daily download (free)
- 2,500 Class C transactions/day
- 2,500 Class B transactions/day

**If you exceed free tier:**
- Storage: $6/TB/month ($0.006/GB)
- Download: First 3x storage is FREE
  - Example: 10GB storage = 30GB free download/month
  - After that: $0.01/GB
- Uploads: Always free!

**Typical Weave usage (100 users):**
- Storage: ~2-5GB (well within free)
- Downloads: <10GB/month (free)
- **Cost: $0/month**

## Cloudflare Bandwidth Alliance (Bonus!)

Since you're using Cloudflare for DNS:

If you later set up Cloudflare CDN in front of B2:
- ✅ **Zero egress fees** from B2 to Cloudflare
- ✅ Faster delivery
- ✅ Save money on bandwidth

(Not needed now, but good to know!)

## Testing Upload

After configuring Render, test that video uploads work:

```bash
# Upload a test video
curl -X POST https://weave-api.onrender.com/v1/artifacts/upload \
  -H "Authorization: Bearer <your-jwt-token>" \
  -F "file=@test-video.mp4"

# Should return artifact_id and download URL
```

## Troubleshooting

### Issue: "Access Denied"
- Verify Application Key has **Read and Write** permissions
- Check key is scoped to correct bucket
- Ensure bucket name in env vars matches exactly

### Issue: "Invalid bucket name"
- Bucket names must be globally unique
- Use lowercase letters, numbers, hyphens only
- Try adding your name/initials: `weave-prod-aaron`

### Issue: "Endpoint connection failed"
- Verify endpoint URL includes `https://`
- Check region code matches your bucket region
- Format: `https://s3.us-west-XXX.backblazeb2.com`

### Issue: Video upload timeout
- Videos over 100MB may take time to upload
- Consider client-side upload progress indicator
- B2 supports multipart uploads for large files (handled by boto3)

## Security Best Practices

1. **Never commit credentials** - Only set in Render environment
2. **Use bucket-scoped keys** - Each app gets its own key
3. **Rotate keys periodically** - Create new key, delete old
4. **Enable lifecycle rules** - Auto-delete old versions if needed

## Video Optimization Tips (Optional)

To save storage and bandwidth:

1. **Compress videos before upload:**
   ```bash
   ffmpeg -i input.mp4 -c:v libx264 -crf 28 -preset fast output.mp4
   ```

2. **Generate thumbnails:**
   - Extract frame at 2 seconds for preview
   - Store thumbnail separately (1-2MB vs 200MB video)

3. **Use adaptive bitrate:**
   - Serve different quality based on user's connection
   - B2 can store multiple versions

(Not required now - just for future optimization!)

## Bucket Management

### View files in bucket:
```bash
# List files
b2 ls weave-prod-xxx

# Download file
b2 download-file-by-name weave-prod-xxx filename.mp4 local.mp4
```

### Delete old files (if needed):
- Via dashboard: Browse files → Select → Delete
- Via CLI: `b2 delete-file-version`

## Next Steps After Setup

1. ✅ Save credentials (keyID, applicationKey, endpoint)
2. ✅ Add to Render environment variables
3. ✅ Wait for Render to redeploy (~2 minutes)
4. ✅ Test video upload via API
5. ✅ Celebrate - your memory app can now store videos! 🎉

---

**Your B2 Setup Summary:**
- Bucket: `weave-prod-xxx`
- Endpoint: `https://s3.us-west-XXX.backblazeb2.com`
- Region: `us-west-XXX`
- Storage: 10GB free forever
- Supports: Videos, images, audio, any file type
- Setup time: ~3 minutes
- Monthly cost: $0 (within free tier)
