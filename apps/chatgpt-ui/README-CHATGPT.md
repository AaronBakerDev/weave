# Weave ChatGPT Integration

This Next.js app provides the MCP (Model Context Protocol) endpoint that enables ChatGPT to interact with Weave conversationally.

## Quick Start

```bash
# Install dependencies
npm install

# Configure environment
cp .env.local.example .env.local
# Edit .env.local with your settings

# Start the development server
npm run dev
```

The MCP endpoint will be available at: `http://localhost:3000/api/mcp`

## What's Included

### 1. MCP API Endpoint (`/app/api/mcp/route.ts`)
- Full JSON-RPC 2.0 implementation
- 8 tool integrations (create_memory, set_core, lock_core, etc.)
- Comprehensive error handling and validation
- Request/response logging
- ChatGPT-optimized formatting

### 2. InlineWeaver Widget (`/components/InlineWeaver.tsx`)
- Embeddable memory capture form
- Minimal UI: title + narrative
- Auto-creates, sets core, and locks in one flow
- Success confirmation with memory link
- Keyboard shortcuts (Cmd/Ctrl + Enter)

### 3. Integration Documentation
- `/docs/HOW-TO-USE-IN-CHATGPT.md` - Complete setup guide
- `/docs/CHATGPT-INTEGRATION.md` - Conversational patterns and usage
- `/chatgpt-mcp-manifest.json` - MCP tool schemas

## Architecture

```
User → ChatGPT → MCP Endpoint (/api/mcp) → Python API (/v1/*)
                       ↓
                 Validates, logs,
                 formats response
```

## Supported Tools

1. **create_memory** - Start a new memory
2. **set_core** - Set/update narrative (with lift support)
3. **lock_core** - Make narrative immutable
4. **append_layer** - Add text, images, links
5. **search_associative** - Semantic search
6. **weave** - Connect related memories
7. **set_permissions** - Control visibility
8. **invite** - Share with others

See `/chatgpt-mcp-manifest.json` for complete schemas.

## Configuration

### Environment Variables

```bash
# Python API base URL
PYTHON_API_BASE=http://localhost:8000

# Debug user for testing (optional)
UI_DEBUG_USER=11111111-1111-1111-1111-111111111111

# Enable debug logging (optional)
MCP_DEBUG=true
```

### ChatGPT Setup

1. Deploy this app to a public HTTPS endpoint (Railway, Vercel, ngrok)
2. Create a Custom GPT in ChatGPT
3. Configure Actions using `/chatgpt-mcp-manifest.json`
4. Point to your endpoint: `https://your-url.com/api/mcp`

**Detailed guide:** `/docs/HOW-TO-USE-IN-CHATGPT.md`

## Development

### Test MCP Endpoint Locally

```bash
# Start the server
npm run dev

# Test with curl
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "call_tool",
    "params": {
      "name": "create_memory",
      "arguments": {
        "title": "Test Memory"
      }
    }
  }'
```

### Enable Debug Logging

Set `MCP_DEBUG=true` in `.env.local`:

```
[MCP INFO] MCP Request { tool: 'create_memory', ... }
[MCP DEBUG] API Call { path: '/v1/memories', method: 'POST' }
[MCP INFO] Memory created { memory_id: '...', title: '...' }
```

### Add New Tools

1. Update `/chatgpt-mcp-manifest.json` with tool schema
2. Add case in `/app/api/mcp/route.ts` switch statement
3. Add validation in `validateToolArgs()`
4. Add formatting in `formatResultForChatGPT()`
5. Update documentation

## Using the InlineWeaver Component

```tsx
import InlineWeaver from '@/components/InlineWeaver';

export default function Page() {
  return (
    <InlineWeaver
      apiBase="/api/proxy"
      onMemoryCreated={(id, title) => {
        console.log(`Created: ${title} (${id})`);
      }}
      compact={false}
    />
  );
}
```

**Props:**
- `apiBase` - API endpoint (default: `/api/proxy`)
- `onMemoryCreated` - Callback when memory is created
- `className` - Custom styling
- `compact` - Minimal UI mode

## Deployment

### Option 1: Railway (Recommended)

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway up
```

Railway gives you a public HTTPS URL automatically.

### Option 2: Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Configure environment variables in Vercel dashboard
```

### Option 3: ngrok (Development)

```bash
# Start local server
npm run dev

# In another terminal, create tunnel
ngrok http 3000

# Use the ngrok HTTPS URL in ChatGPT config
```

## Troubleshooting

### "Connection refused" in ChatGPT

- Verify endpoint URL is correct and HTTPS
- Check ngrok/deployment is running
- Test endpoint with curl

### "Invalid parameters" errors

- Check tool schemas in manifest match route.ts
- Enable `MCP_DEBUG=true` for detailed logs
- Verify parameter names use underscores (not camelCase)

### Python API not reachable

- Verify `PYTHON_API_BASE` in `.env.local`
- Test API directly: `curl http://localhost:8000/health`
- Check CORS if API is on different domain

## Security

### Current Setup (Development)
- Uses `X-Debug-User` header for user context
- No authentication on MCP endpoint
- Suitable for local/testing only

### Production Recommendations
1. Add OAuth authentication
2. Validate user sessions
3. Rate limiting
4. CORS restrictions
5. API key validation

Example OAuth middleware:

```typescript
const userId = await validateSession(req);
headers: { 'X-User-ID': userId }
```

## Performance

### Response Times
- Average MCP call: 100-300ms
- Includes validation + API call + formatting
- ChatGPT timeout: 30 seconds

### Optimization Tips
1. Cache search results
2. Batch operations where possible
3. Use `_display` hints to reduce token usage
4. Implement request deduplication

## API Reference

### POST /api/mcp

**Request Format (JSON-RPC 2.0):**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "call_tool",
  "params": {
    "name": "tool_name",
    "arguments": { ... }
  }
}
```

**Response Format:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    ...data,
    "_display": {
      "message": "User-friendly message",
      "tip": "Helpful tip"
    }
  }
}
```

**Error Format:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32000,
    "message": "Human-readable error with context"
  }
}
```

## Examples

See `/docs/CHATGPT-INTEGRATION.md` for extensive examples of:
- Capturing memories conversationally
- Searching and recalling
- Adding reflections and layers
- Connecting memories with weaves
- Managing privacy settings

## Contributing

Contributions welcome! Focus areas:
- Additional MCP tools
- Better error messages
- UX improvements
- Performance optimizations
- Security enhancements

## License

Same as main Weave project.

## Resources

- **Setup Guide:** `/docs/HOW-TO-USE-IN-CHATGPT.md`
- **Usage Patterns:** `/docs/CHATGPT-INTEGRATION.md`
- **Tool Schemas:** `/chatgpt-mcp-manifest.json`
- **MCP Spec:** https://modelcontextprotocol.io
- **Main Weave Docs:** `/docs/API.md`
