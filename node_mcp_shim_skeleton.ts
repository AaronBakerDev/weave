/**
 * Weave: Node.js MCP Shim
 *
 * Translates ChatGPT tool calls (MCP protocol) → Python FastAPI REST calls
 *
 * File location: apps/next-app/app/api/mcp/route.ts
 *
 * Flow:
 * 1. ChatGPT calls a tool (e.g., create_memory)
 * 2. MCP handler receives JSON-RPC 2.0 request
 * 3. Shim forwards to Python API via HTTP POST
 * 4. Python executes business logic (database, embeddings, etc.)
 * 5. Shim wraps response back in MCP format + UI component
 * 6. ChatGPT renders the UI component in-chat
 */

import { NextRequest, NextResponse } from 'next/server';

// ============================================================================
// CONFIG
// ============================================================================

const PYTHON_API_BASE = process.env.PYTHON_API_BASE || 'http://localhost:8000';
const PYTHON_API_TIMEOUT = 30000; // 30 seconds

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface MCPRequest {
  jsonrpc: string;
  method: string;
  params: {
    name: string;
    arguments: Record<string, any>;
  };
  id: string | number;
}

interface MCPResponse {
  jsonrpc: string;
  id: string | number;
  result?: any;
  error?: { code: number; message: string };
}

// ============================================================================
// TOOL REGISTRY
// ============================================================================

const TOOL_REGISTRY = [
  {
    name: 'create_memory',
    description: 'Create a new memory',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        seed_text: { type: 'string' },
        visibility: { enum: ['PRIVATE', 'SHARED', 'PUBLIC'] },
      },
    },
  },
  {
    name: 'set_core',
    description: 'Lock the core snapshot of a memory',
    inputSchema: {
      type: 'object',
      properties: {
        memory_id: { type: 'string' },
        narrative: { type: 'string' },
        anchors: { type: 'array' },
        people: { type: 'array' },
        when: { type: 'string' },
        where: { type: 'string' },
        emotion: { type: 'string' },
      },
      required: ['memory_id', 'narrative', 'anchors'],
    },
  },
  {
    name: 'lock_core',
    description: 'Make a memory core immutable',
    inputSchema: {
      type: 'object',
      properties: {
        memory_id: { type: 'string' },
      },
      required: ['memory_id'],
    },
  },
  {
    name: 'append_layer',
    description: 'Add a layer (contribution, reflection, artifact) to a memory',
    inputSchema: {
      type: 'object',
      properties: {
        memory_id: { type: 'string' },
        kind: {
          enum: ['TEXT', 'AUDIO', 'IMAGE', 'VIDEO', 'REFLECTION', 'LINK'],
        },
        payload: { type: 'string' },
        visibility: { enum: ['PRIVATE', 'SHARED', 'PUBLIC'] },
      },
      required: ['memory_id', 'kind', 'payload'],
    },
  },
  {
    name: 'search_associative',
    description: 'Search memories by semantic, lexical, and graph similarity',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        filters: {
          type: 'object',
          properties: {
            people: { type: 'array' },
            place: { type: 'string' },
            emotion: { type: 'array' },
            since: { type: 'string' },
            visibility: { enum: ['PRIVATE', 'SHARED', 'PUBLIC'] },
          },
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'weave',
    description: 'Create a connection (edge) between two memories',
    inputSchema: {
      type: 'object',
      properties: {
        a_memory_id: { type: 'string' },
        b_memory_id: { type: 'string' },
        relation: {
          enum: [
            'SAME_PERSON',
            'SAME_PLACE',
            'SAME_TIME',
            'THEME',
            'EMOTION',
            'TIME_NEAR',
          ],
        },
        note: { type: 'string' },
      },
      required: ['a_memory_id', 'b_memory_id', 'relation'],
    },
  },
  {
    name: 'set_permissions',
    description: 'Update memory visibility and participant roles',
    inputSchema: {
      type: 'object',
      properties: {
        memory_id: { type: 'string' },
        participants: { type: 'array' },
        visibility: { enum: ['PRIVATE', 'SHARED', 'PUBLIC'] },
      },
      required: ['memory_id', 'participants', 'visibility'],
    },
  },
  {
    name: 'invite',
    description: 'Invite a user to contribute to a memory',
    inputSchema: {
      type: 'object',
      properties: {
        memory_id: { type: 'string' },
        user_handle_or_email: { type: 'string' },
        role: { enum: ['CONTRIBUTOR', 'VIEWER'] },
      },
      required: ['memory_id', 'user_handle_or_email', 'role'],
    },
  },
];

// ============================================================================
// MCP HANDLER
// ============================================================================

async function handleMCPRequest(request: MCPRequest): Promise<MCPResponse> {
  const { method, params, id } = request;

  if (method === 'list_tools') {
    // ChatGPT asks what tools this app exposes
    return {
      jsonrpc: '2.0',
      id,
      result: {
        tools: TOOL_REGISTRY,
      },
    };
  }

  if (method === 'call_tool') {
    // ChatGPT calls a tool
    const { name, arguments: args } = params;

    try {
      const result = await forwardToPython(name, args);

      return {
        jsonrpc: '2.0',
        id,
        result: {
          content: result.content,
          ui_component: result.ui_component,
        },
      };
    } catch (error) {
      console.error(`Tool call failed: ${name}`, error);

      return {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32603,
          message: `Internal error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      };
    }
  }

  return {
    jsonrpc: '2.0',
    id,
    error: {
      code: -32601,
      message: `Method not found: ${method}`,
    },
  };
}

// ============================================================================
// PYTHON FORWARDING
// ============================================================================

async function forwardToPython(
  toolName: string,
  args: Record<string, any>
): Promise<{ content: any; ui_component?: any }> {
  const pythonUrl = `${PYTHON_API_BASE}/tools/${toolName}`;

  // Extract user ID from request headers (set by middleware or auth)
  const userId = args.user_id || process.env.FALLBACK_USER_ID || 'anonymous';

  const response = await fetch(pythonUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${userId}`, // Pass user context to Python
    },
    body: JSON.stringify(args),
    signal: AbortSignal.timeout(PYTHON_API_TIMEOUT),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Python API error (${response.status}): ${errorText}`);
  }

  const result = await response.json();
  return result;
}

// ============================================================================
// NEXT.JS API ROUTE HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as MCPRequest;

    // Validate JSON-RPC format
    if (body.jsonrpc !== '2.0' || !body.method) {
      return NextResponse.json(
        {
          jsonrpc: '2.0',
          error: {
            code: -32600,
            message: 'Invalid Request',
          },
        },
        { status: 400 }
      );
    }

    // Handle the MCP request
    const response = await handleMCPRequest(body);

    return NextResponse.json(response, {
      status: response.error ? 400 : 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('MCP handler error:', error);

    return NextResponse.json(
      {
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal server error',
        },
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// OPTIONAL: DEBUG ROUTE FOR TESTING (remove in production)
// ============================================================================

export async function GET(request: NextRequest) {
  if (process.env.ENVIRONMENT === 'development') {
    return NextResponse.json({
      service: 'weave-mcp-shim',
      status: 'running',
      tools_available: TOOL_REGISTRY.length,
      python_api: PYTHON_API_BASE,
    });
  }

  return NextResponse.json({ error: 'Not Found' }, { status: 404 });
}
