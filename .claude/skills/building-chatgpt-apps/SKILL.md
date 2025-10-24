---
name: building-chatgpt-apps
description: |
  Builds ChatGPT applications using Next.js, MCP protocol, and Vercel.
  Creates MCP handlers, tool schemas, and deployment configuration.
  Use when user asks to build ChatGPT apps, create MCP tools, or
  integrate with ChatGPT platform. Handles Weave-style architecture.
---

# Building ChatGPT Apps

Creates production-ready ChatGPT applications with MCP integration.

## Quick Start

**Create MCP handler:**
```bash
python scripts/generate-mcp-handler.py create_memory search_memories
```

**Update manifest:**
```bash
python scripts/update-manifest.py chatgpt-mcp-manifest.json
```

## Detailed Guidance

- **MCP Architecture:** See reference/mcp-architecture.md
- **Tool Implementation:** See reference/tool-implementation.md
- **Deployment:** See reference/deployment.md

## When to Use

- User asks to build ChatGPT app
- User needs to create MCP tools
- User wants to add ChatGPT integration
- User mentions Model Context Protocol

## Workflow

1. [ ] Define tool schemas in manifest
2. [ ] Create MCP API route handler
3. [ ] Implement tool logic with validation
4. [ ] Add display hints for ChatGPT
5. [ ] Configure Vercel deployment
6. [ ] Test with ChatGPT

## Output Format

Use templates/mcp-handler.ts for consistent structure.
