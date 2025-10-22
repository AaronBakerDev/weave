import type { NextRequest } from 'next/server';

const API_BASE = process.env.PYTHON_API_BASE || 'http://localhost:8000';
const DEBUG = process.env.MCP_DEBUG === 'true';
const DEBUG_USER = process.env.UI_DEBUG_USER;
const isDev = process.env.NODE_ENV !== 'production';

/**
 * MCP (Model Context Protocol) endpoint for ChatGPT integration
 *
 * This endpoint receives tool calls from ChatGPT and translates them
 * to Weave API calls. Supports all core Weave operations:
 * - create_memory, set_core, lock_core
 * - append_layer, search_associative, weave
 * - set_permissions, invite
 *
 * See: /docs/CHATGPT-INTEGRATION.md for usage guide
 * See: /chatgpt-mcp-manifest.json for tool schemas
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();
  let requestBody: any;

  try {
    requestBody = await req.json();
  } catch (parseError: any) {
    log('ERROR', 'Failed to parse request body', { error: parseError.message });
    return jsonRpcError(null, -32700, 'Parse error: Invalid JSON in request body');
  }

  const { method, params, id } = requestBody;

  log('INFO', 'MCP Request', {
    method,
    tool: params?.name,
    requestId: id,
    hasParams: !!params
  });

  // Validate JSON-RPC method
  if (method !== 'call_tool') {
    log('WARN', 'Invalid method', { method, expected: 'call_tool' });
    return jsonRpcError(id, -32601, `Method not found: ${method}. Expected 'call_tool'.`);
  }

  const { name, arguments: args } = params || {};

  // Validate tool name
  if (!name) {
    log('ERROR', 'Missing tool name', { params });
    return jsonRpcError(id, -32602, 'Invalid params: tool name is required');
  }

  /**
   * Helper to call the Python API backend
   * Handles authentication, error checking, and response parsing
   */
  async function call(path: string, init?: RequestInit) {
    const url = `${API_BASE}${path}`;
    log('DEBUG', 'API Call', { path, method: init?.method || 'GET' });

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(init?.headers || {}) as any,
      };
      const auth = req.headers.get('authorization');
      if (auth) headers['authorization'] = auth;
      if (isDev && DEBUG_USER) headers['X-Debug-User'] = DEBUG_USER;
      const res = await fetch(url, { ...init, headers });

      // Handle non-OK responses
      if (!res.ok) {
        const errorText = await res.text();
        let errorMessage = `API error (${res.status}): ${res.statusText}`;

        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.detail || errorJson.message || errorMessage;
        } catch {
          // If not JSON, use the text
          if (errorText) errorMessage = errorText;
        }

        log('ERROR', 'API returned error', {
          status: res.status,
          statusText: res.statusText,
          path,
          error: errorMessage
        });

        throw new Error(errorMessage);
      }

      const data = await res.json();
      log('DEBUG', 'API Success', { path, hasData: !!data });
      return data;

    } catch (fetchError: any) {
      log('ERROR', 'API Fetch Failed', {
        url,
        error: fetchError.message,
        stack: fetchError.stack
      });
      throw fetchError;
    }
  }

  // Validate required parameters for each tool
  const validationError = validateToolArgs(name, args);
  if (validationError) {
    log('ERROR', 'Invalid tool arguments', { tool: name, error: validationError });
    return jsonRpcError(id, -32602, `Invalid params for ${name}: ${validationError}`);
  }

  let result: any = {};
  try {
    switch (name) {
      case 'create_memory':
        log('INFO', 'Creating memory', { title: args.title });
        result = await call('/v1/memories', {
          method: 'POST',
          body: JSON.stringify(args)
        });
        log('INFO', 'Memory created', { memory_id: result.memory_id, title: result.title });
        break;

      case 'set_core':
        log('INFO', 'Setting core', {
          memory_id: args.memory_id,
          lift: args.lift,
          narrativeLength: args.narrative?.length
        });
        result = await call(`/v1/memories/${args.memory_id}/core`, {
          method: 'PUT',
          body: JSON.stringify(args)
        });
        log('INFO', 'Core set successfully', { memory_id: args.memory_id });
        break;

      case 'lock_core':
        log('INFO', 'Locking core', { memory_id: args.memory_id });
        result = await call(`/v1/memories/${args.memory_id}/lock`, {
          method: 'POST'
        });
        log('INFO', 'Core locked', { memory_id: args.memory_id });
        break;

      case 'append_layer':
        log('INFO', 'Appending layer', {
          memory_id: args.memory_id,
          kind: args.kind,
          hasText: !!args.text_content,
          hasArtifact: !!args.artifact_id
        });
        result = await call(`/v1/memories/${args.memory_id}/layers`, {
          method: 'POST',
          body: JSON.stringify(args)
        });
        log('INFO', 'Layer appended', {
          memory_id: args.memory_id,
          layer_id: result.layer_id
        });
        break;

      case 'search_associative':
        log('INFO', 'Searching', {
          query: args.query,
          limit: args.limit || 10
        });
        result = await call(
          `/v1/search/associative?q=${encodeURIComponent(args.query)}` +
          (args.limit ? `&limit=${args.limit}` : '')
        );
        log('INFO', 'Search complete', {
          resultCount: result.results?.length || 0
        });
        break;

      case 'weave':
        log('INFO', 'Creating weave', {
          from: args.from_memory_id,
          to: args.to_memory_id,
          relation: args.relation_type || 'relates_to'
        });
        result = await call('/v1/weaves', {
          method: 'POST',
          body: JSON.stringify(args)
        });
        log('INFO', 'Weave created', { weave_id: result.weave_id });
        break;

      case 'set_permissions':
        log('INFO', 'Setting permissions', {
          memory_id: args.memory_id,
          visibility: args.visibility,
          allowedUsersCount: args.allowed_users?.length || 0
        });
        result = await call(`/v1/memories/${args.memory_id}/permissions`, {
          method: 'POST',
          body: JSON.stringify(args)
        });
        log('INFO', 'Permissions updated', { memory_id: args.memory_id });
        break;

      case 'invite':
        log('INFO', 'Creating invite', {
          email: args.email,
          role: args.role
        });
        result = await call(`/v1/invites`, {
          method: 'POST',
          body: JSON.stringify(args)
        });
        log('INFO', 'Invite created', { invite_id: result.invite_id });
        break;

      default:
        log('WARN', 'Unknown tool', { name });
        return jsonRpcError(id, -32601, `Unknown tool: ${name}. Check chatgpt-mcp-manifest.json for available tools.`);
    }

    // Format result for better ChatGPT display
    const formattedResult = formatResultForChatGPT(name, result);

    const duration = Date.now() - startTime;
    log('INFO', 'Request complete', {
      tool: name,
      requestId: id,
      duration: `${duration}ms`
    });

    return new Response(
      JSON.stringify({
        jsonrpc: '2.0',
        id,
        result: formattedResult
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (e: any) {
    const duration = Date.now() - startTime;
    log('ERROR', 'Request failed', {
      tool: name,
      requestId: id,
      duration: `${duration}ms`,
      error: e.message,
      stack: DEBUG ? e.stack : undefined
    });

    return jsonRpcError(
      id,
      -32000,
      formatErrorForChatGPT(name, e.message)
    );
  }
}

/**
 * Validate required arguments for each tool type
 */
function validateToolArgs(toolName: string, args: any): string | null {
  if (!args) return 'Arguments object is required';

  switch (toolName) {
    case 'create_memory':
      if (!args.title) return 'title is required';
      break;
    case 'set_core':
      if (!args.memory_id) return 'memory_id is required';
      if (!args.narrative) return 'narrative is required';
      break;
    case 'lock_core':
      if (!args.memory_id) return 'memory_id is required';
      break;
    case 'append_layer':
      if (!args.memory_id) return 'memory_id is required';
      if (!args.kind) return 'kind is required';
      if (args.kind === 'TEXT' && !args.text_content) return 'text_content is required for TEXT layers';
      if (args.kind === 'IMAGE' && !args.artifact_id) return 'artifact_id is required for IMAGE layers';
      break;
    case 'search_associative':
      if (!args.query) return 'query is required';
      break;
    case 'weave':
      if (!args.from_memory_id) return 'from_memory_id is required';
      if (!args.to_memory_id) return 'to_memory_id is required';
      break;
    case 'set_permissions':
      if (!args.memory_id) return 'memory_id is required';
      if (!args.visibility) return 'visibility is required';
      if (!['PRIVATE', 'SHARED', 'PUBLIC'].includes(args.visibility)) {
        return 'visibility must be PRIVATE, SHARED, or PUBLIC';
      }
      break;
  }

  return null;
}

/**
 * Format results for better display in ChatGPT conversations
 */
function formatResultForChatGPT(toolName: string, result: any): any {
  // Add helpful context and formatting hints
  switch (toolName) {
    case 'create_memory':
      return {
        ...result,
        _display: {
          message: `Memory created: "${result.title}"`,
          nextSteps: [
            'Set the core narrative with set_core',
            'Lock the core to make it immutable',
            'Add layers over time with append_layer'
          ]
        }
      };

    case 'set_core':
      return {
        ...result,
        _display: {
          message: result.core?.narrative
            ? `Core narrative set (${result.core.narrative.length} characters)`
            : 'Core narrative updated',
          tip: 'Use lock_core to make this narrative immutable'
        }
      };

    case 'lock_core':
      return {
        ...result,
        _display: {
          message: 'Core locked successfully',
          tip: 'To update, use set_core with lift:true to create a new draft'
        }
      };

    case 'search_associative':
      return {
        ...result,
        _display: {
          message: `Found ${result.results?.length || 0} memories`,
          tip: result.results?.length > 0
            ? 'Use memory_id from results to view details or create weaves'
            : 'Try a different search query'
        }
      };

    case 'weave':
      return {
        ...result,
        _display: {
          message: `Created connection between memories`,
          relation: result.relation_type || 'relates_to'
        }
      };

    default:
      return result;
  }
}

/**
 * Format errors for better understanding in ChatGPT conversations
 */
function formatErrorForChatGPT(toolName: string, errorMessage: string): string {
  // Add context-specific error guidance
  if (errorMessage.includes('404') || errorMessage.includes('not found')) {
    return `${errorMessage}. The memory may not exist or you may not have access. Use search_associative to find memories.`;
  }

  if (errorMessage.includes('403') || errorMessage.includes('forbidden')) {
    return `${errorMessage}. You don't have permission to perform this action. Check memory permissions with the owner.`;
  }

  if (errorMessage.includes('locked')) {
    return `${errorMessage}. This memory's core is locked. Use set_core with lift:true to create a new draft version.`;
  }

  return errorMessage;
}

/**
 * Create a JSON-RPC error response
 */
function jsonRpcError(id: any, code: number, message: string) {
  log('ERROR', 'Returning JSON-RPC error', { code, message, id });
  return new Response(
    JSON.stringify({
      jsonrpc: '2.0',
      id,
      error: { code, message }
    }),
    {
      status: code === -32700 ? 400 : code === -32601 ? 404 : 500,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

/**
 * Structured logging for MCP requests
 */
function log(level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR', message: string, data?: any) {
  if (level === 'DEBUG' && !DEBUG) return;

  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    ...data
  };

  // In production, this would go to a proper logging service
  // For now, console with structured format
  const logMethod = level === 'ERROR' ? console.error :
                   level === 'WARN' ? console.warn : console.log;

  logMethod(`[MCP ${level}] ${message}`, data || '');
}
