# How to Use Weave in ChatGPT

## Overview

This guide shows you how to integrate Weave with ChatGPT using the Model Context Protocol (MCP), enabling conversational memory capture and management.

## What You'll Get

After setting up this integration, you can:

- **Capture memories** through natural conversation
- **Search memories** using semantic, associative search
- **Add reflections** as layers over time
- **Connect memories** by weaving them together
- **Manage privacy** with conversation commands

All without leaving ChatGPT.

## Architecture

```
┌─────────────┐         ┌──────────────┐         ┌──────────────┐
│   ChatGPT   │  MCP    │  Weave UI    │  HTTP   │  Weave API   │
│             │────────>│  MCP Endpoint│────────>│  (Python)    │
│  (OpenAI)   │ JSON-RPC│  (Next.js)   │         │  (FastAPI)   │
└─────────────┘         └──────────────┘         └──────────────┘
```

**Flow:**
1. User talks to ChatGPT: "Remember my conversation with Sarah..."
2. ChatGPT calls MCP tool: `create_memory(title="Conversation with Sarah")`
3. Next.js MCP endpoint: Receives JSON-RPC, validates, proxies to Python API
4. Python API: Creates memory, returns response
5. MCP endpoint: Formats result for ChatGPT display
6. ChatGPT: Confirms to user: "Memory created: Conversation with Sarah"

## Prerequisites

- **ChatGPT Plus** (or Team/Enterprise) - Required for custom GPTs and MCP
- **Weave deployment** - Both API and UI must be running and accessible
- **HTTPS endpoint** - ChatGPT requires secure connections (use ngrok for local dev)

## Step-by-Step Setup

### 1. Prepare Your Weave Deployment

Ensure both services are running:

```bash
# Python API (default: http://localhost:8000)
cd apps/api
uvicorn main:app --reload

# Next.js UI (default: http://localhost:3000)
cd apps/chatgpt-ui
npm run dev
```

### 2. Expose Your Endpoint (Development)

ChatGPT needs a public HTTPS URL. For local development, use ngrok:

```bash
# Install ngrok
brew install ngrok  # macOS
# or download from https://ngrok.com/download

# Create tunnel to your Next.js app
ngrok http 3000
```

You'll get a URL like: `https://abc123.ngrok.io`

**Important:** Copy this URL - you'll need it in step 4.

### 3. Configure Environment Variables

In `apps/chatgpt-ui/.env.local`:

```bash
# Python API base URL (internal)
PYTHON_API_BASE=http://localhost:8000

# Debug user ID for testing (optional)
UI_DEBUG_USER=11111111-1111-1111-1111-111111111111

# Enable MCP debug logging (optional)
MCP_DEBUG=true
```

Restart your Next.js app after changes.

### 4. Create Custom GPT in ChatGPT

1. **Go to ChatGPT** → Click your profile → "My GPTs" → "Create a GPT"

2. **Configure Basic Info:**
   - **Name:** "Weave Memory Assistant"
   - **Description:** "Helps you capture, reflect on, and recall meaningful moments using the Weave layered memory system"
   - **Instructions:**

   ```
   You are a memory assistant helping users capture and manage their memories
   using the Weave system. Weave uses a layered architecture where memories
   have:
   - A core narrative (the essential story, locked once finalized)
   - Layers (reflections, updates, images added over time)
   - Weaves (connections between related memories)

   When users want to capture a moment, guide them through:
   1. Creating the memory with a title
   2. Setting the core narrative
   3. Locking the core
   4. Optionally adding layers or connecting to related memories

   Be conversational and warm. Help users reflect on their experiences.
   Always confirm actions clearly and suggest next steps.
   ```

3. **Add MCP Actions:**
   - Scroll to "Actions" section
   - Click "Create new action"
   - Import the schema from `/chatgpt-mcp-manifest.json`

   **OR** manually configure:

   - **Server URL:** `https://your-ngrok-url.ngrok.io/api/mcp`
   - **Authentication:** None (or configure as needed)
   - **Schema:** Import from manifest

4. **Import MCP Schema:**

   Upload or paste the contents of `/chatgpt-mcp-manifest.json`:

   ```bash
   # From your project root
   cat chatgpt-mcp-manifest.json
   ```

   Or manually add each tool (see "Manual Tool Configuration" below).

5. **Save and Test:**
   - Click "Save"
   - Go to "Preview" tab
   - Test with: "Create a memory called 'Test Memory'"

### 5. Verify Setup

Test the integration with these commands:

```
You: "Create a memory called 'Testing Weave Integration'"

GPT: [Calls create_memory tool]
     "I've created a memory titled 'Testing Weave Integration'.
     Would you like to set the core narrative now?"

You: "Yes, the narrative is: This is a test to verify the ChatGPT
      integration is working properly."

GPT: [Calls set_core tool]
     "I've set the core narrative. Would you like me to lock it?"

You: "Yes, lock it."

GPT: [Calls lock_core tool]
     "The core is now locked! Memory ID: abc-123-def-456"
```

## Manual Tool Configuration

If you can't import the manifest, configure each tool manually:

### Tool: create_memory

**Endpoint:** `POST /api/mcp`

**Request Body:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "call_tool",
  "params": {
    "name": "create_memory",
    "arguments": {
      "title": "string"
    }
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "memory_id": "uuid",
    "title": "string",
    "created_at": "iso-timestamp",
    "_display": {
      "message": "Memory created: \"title\"",
      "nextSteps": ["..."]
    }
  }
}
```

Repeat for all tools (see `chatgpt-mcp-manifest.json` for complete schemas).

## Production Deployment

### Option 1: Railway (Recommended)

See `/docs/DEPLOY-RAILWAY.md` for full guide.

**Quick version:**
1. Deploy both API and UI to Railway
2. Get the public UI URL (e.g., `https://weave-ui.railway.app`)
3. Use that URL in GPT configuration: `https://weave-ui.railway.app/api/mcp`

### Option 2: Vercel + Custom API

```bash
# Deploy UI to Vercel
cd apps/chatgpt-ui
vercel

# Deploy API elsewhere (Railway, DigitalOcean, etc.)
# Configure PYTHON_API_BASE in Vercel env vars
```

### Option 3: Self-Hosted

Requirements:
- HTTPS (required by ChatGPT)
- Publicly accessible endpoint
- CORS configured properly

## Usage Examples

### Example 1: Simple Memory Capture

```
You: "I want to remember my coffee chat with Sarah today."

GPT: "I'd be happy to help you capture that memory. Can you tell me
     more about the conversation? What happened, and what stood out?"

You: "We talked about her new startup idea. She's thinking about AI
     for education. I suggested she start with a specific use case
     rather than trying to solve everything at once. The energy she
     has is really inspiring."

GPT: [Calls create_memory → set_core → lock_core]
     "✓ Memory captured: 'Coffee chat with Sarah'

     Core narrative: We talked about her new startup idea...

     The core is now locked. Would you like to:
     - Add Sarah as a person involved
     - Set a location anchor
     - Add tags or connect to related memories"
```

### Example 2: Searching Memories

```
You: "Remind me about times I felt uncertain about a decision."

GPT: [Calls search_associative(query="uncertain about decision")]
     "I found 3 memories related to uncertainty:

     1. 'Should I take the new job?' (March 2024)
        Excerpt: I'm torn between stability and growth...

     2. 'Moving to a new city' (January 2024)
        Excerpt: Everything feels unknown right now...

     3. 'Ending a relationship' (November 2023)
        Excerpt: I know it's right but it's so hard...

     Would you like to explore any of these in detail?"
```

### Example 3: Adding Reflections

```
You: "Add a reflection to my 'Coffee with Sarah' memory: She
     actually built a prototype this week! So impressive."

GPT: [Searches for memory → Calls append_layer]
     "✓ Reflection added to 'Coffee with Sarah'

     Your new layer has been saved. The core narrative remains
     unchanged, but your reflection is now part of the memory's
     evolution."
```

### Example 4: Connecting Memories

```
You: "Connect my 'Coffee with Sarah' memory to the one about
     taking risks in business."

GPT: [Calls weave]
     "✓ Created connection between:
     - 'Coffee with Sarah'
     - 'Taking risks in business'

     Relation type: 'inspired_by'

     These memories are now woven together, showing how Sarah's
     energy inspired your thoughts on risk-taking."
```

## Troubleshooting

### "Tool not found" Error

**Cause:** Tool name mismatch between GPT config and API.

**Fix:**
1. Check tool names in `chatgpt-mcp-manifest.json`
2. Verify they match in your GPT configuration
3. Common typo: `create_memory` vs `createMemory` (use underscores)

### "Connection refused" Error

**Cause:** ChatGPT can't reach your MCP endpoint.

**Fix:**
1. Verify ngrok tunnel is running: `curl https://your-ngrok-url.ngrok.io/api/mcp`
2. Check HTTPS (not HTTP) - ChatGPT requires secure connections
3. Verify endpoint in GPT config matches ngrok URL exactly

### "Invalid parameters" Error

**Cause:** Missing required fields in tool call.

**Fix:**
1. Check MCP logs: Set `MCP_DEBUG=true` in `.env.local`
2. Verify parameter names match manifest exactly
3. Common issue: `memory_id` vs `memoryId` (use underscores)

### Memory Not Created

**Cause:** Python API not reachable or authentication issue.

**Fix:**
1. Check API is running: `curl http://localhost:8000/health`
2. Verify `PYTHON_API_BASE` in `.env.local`
3. Check `X-Debug-User` header is being sent (see route.ts logs)

### Debug Logging

Enable detailed logging:

```bash
# .env.local
MCP_DEBUG=true
```

Then check server console:

```
[MCP INFO] MCP Request { tool: 'create_memory', ... }
[MCP DEBUG] API Call { path: '/v1/memories', method: 'POST' }
[MCP INFO] Memory created { memory_id: '...', title: '...' }
[MCP INFO] Request complete { duration: '245ms' }
```

## Advanced Features

### Custom System Prompt

Enhance the GPT's personality and guidance:

```
You are a thoughtful memory companion helping users build a rich,
interconnected web of meaningful moments. When users share experiences:

1. Listen deeply - ask clarifying questions
2. Capture essence - help distill the core story
3. Reflect connections - suggest links to past memories
4. Guide evolution - encourage future reflections

Use warm, conversational language. Make memory-keeping feel natural,
not like data entry. Help users see patterns in their experiences.
```

### Batch Operations

ChatGPT can perform multi-step workflows:

```
You: "Create memories for each meeting from my notes:
     - Team standup: discussed Q4 roadmap
     - Design review: new feature mockups approved
     - 1-on-1 with Alex: career development planning"

GPT: [Creates 3 memories sequentially]
     "✓ Created 3 memories:
     1. Team standup (ID: abc-123)
     2. Design review (ID: def-456)
     3. 1-on-1 with Alex (ID: ghi-789)

     Would you like me to weave these together as related
     project memories?"
```

### Privacy Controls

```
You: "Make my beach trip memory private."

GPT: [Calls set_permissions(visibility="PRIVATE")]
     "✓ Privacy updated - 'Beach trip' is now private.
     Only you can view this memory."

You: "Actually, share it with Sarah."

GPT: [Calls set_permissions(visibility="SHARED", allowed_users=["sarah"])]
     "✓ Now shared with Sarah (view-only).
     Would you like to give her edit permissions?"
```

## Performance Tips

### Optimize Response Times

1. **Use caching** - The API supports caching for search results
2. **Batch operations** - Create multiple memories in one conversation
3. **Async flows** - Don't wait for locks, add layers asynchronously

### Reduce Token Usage

1. **Format results** - Use `_display` hints (already in MCP route)
2. **Limit search** - Pass `limit` param to search_associative
3. **Summarize** - Let ChatGPT summarize long narratives

## Security Considerations

### Authentication

Current setup uses `X-Debug-User` header for dev. Production should:

1. **Add OAuth** - Authenticate users properly
2. **Session tokens** - Pass user context from ChatGPT
3. **Rate limiting** - Prevent abuse

Example OAuth flow:

```typescript
// In route.ts
const userId = await validateOAuthToken(req.headers.authorization);
headers: { 'X-User-ID': userId }
```

### Data Privacy

- All memories are user-owned
- ChatGPT doesn't train on memory content
- Permissions are respected (PRIVATE/SHARED/PUBLIC)
- HTTPS encrypts data in transit

### CORS Configuration

For production, configure CORS properly:

```typescript
// apps/chatgpt-ui/next.config.mjs
const nextConfig = {
  async headers() {
    return [
      {
        source: '/api/mcp',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: 'https://chat.openai.com' },
          { key: 'Access-Control-Allow-Methods', value: 'POST, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type' },
        ],
      },
    ];
  },
};
```

## Monitoring & Analytics

Track MCP usage:

```typescript
// Add to route.ts
function log(level, message, data) {
  // Send to analytics service
  analytics.track('mcp_request', {
    tool: data.tool,
    duration: data.duration,
    success: level !== 'ERROR',
    ...data
  });

  // Console logging
  console.log(...);
}
```

Useful metrics:
- Tool call frequency
- Success/error rates
- Response times
- User engagement

## What's Next?

### Enhance the Integration

1. **Voice input** - Capture memories via speech
2. **Image analysis** - Auto-generate narratives from photos
3. **Scheduled reflections** - ChatGPT prompts for updates
4. **Insight generation** - Analyze patterns across memories

### Build on MCP

1. **Add tools** - Export memories, generate reports
2. **Custom workflows** - Templates for common memory types
3. **Integration hooks** - Connect to calendars, journals, etc.

### Improve UX

1. **Rich formatting** - Markdown in narratives
2. **Inline previews** - Show memory cards in chat
3. **Quick actions** - Edit, delete, share from ChatGPT

## FAQ

**Q: Can I use this with other AI assistants?**
A: Yes! The MCP protocol is standard. Adapt the manifest for Claude, Gemini, etc.

**Q: Will my memories be used to train ChatGPT?**
A: No. ChatGPT doesn't train on data from custom GPT tool calls.

**Q: Can I self-host everything?**
A: Yes. Deploy the API and UI anywhere with HTTPS.

**Q: What's the cost?**
A: ChatGPT Plus ($20/mo) for custom GPTs. Weave is open source and free to self-host.

**Q: Can multiple people share a GPT?**
A: Yes. GPT can be published as "Anyone with a link" or "Public".

**Q: How do I backup my memories?**
A: Export via API: `GET /v1/memories` returns all user memories as JSON.

## Resources

- **MCP Protocol Spec:** https://modelcontextprotocol.io
- **Weave API Docs:** `/docs/API.md`
- **Integration Guide:** `/docs/CHATGPT-INTEGRATION.md`
- **Tool Schemas:** `/chatgpt-mcp-manifest.json`
- **Component Docs:** See InlineWeaver.tsx for embeddable widget

## Support

**Issues:** Open a GitHub issue with `[ChatGPT]` prefix

**Questions:** Check `/docs/CHATGPT-INTEGRATION.md` for conversational patterns

**Contribute:** PRs welcome! Especially for:
- Additional tools
- Better error messages
- UX improvements

---

**You're all set!** Start capturing memories through conversation.

Try: "I want to remember this moment..."
