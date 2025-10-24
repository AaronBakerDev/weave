# Tool Implementation Reference

## File Structure

```
app/api/mcp/route.ts       # Main handler
lib/mcp/
├── types.ts               # TypeScript types
├── schemas.ts             # Zod validation
└── tools.ts               # Tool implementations
```

## Tool Handler Pattern

```typescript
// lib/mcp/schemas.ts
import { z } from 'zod';

export const CreateMemorySchema = z.object({
  title: z.string().min(1).max(200),
  narrative: z.string().min(1),
  tags: z.array(z.string()).optional()
});

export type CreateMemoryParams = z.infer<typeof CreateMemorySchema>;
```

```typescript
// lib/mcp/tools.ts
import { CreateMemoryParams } from './schemas';

export async function createMemory(params: CreateMemoryParams) {
  const response = await fetch(`${process.env.BACKEND_API}/v1/memories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });

  const memory = await response.json();

  return {
    data: memory,
    display: {
      type: 'card',
      title: `Memory Created: ${memory.title}`,
      description: memory.narrative.slice(0, 200),
      metadata: {
        id: memory.id,
        created_at: memory.created_at
      }
    }
  };
}
```

```typescript
// app/api/mcp/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { CreateMemorySchema } from '@/lib/mcp/schemas';
import { createMemory } from '@/lib/mcp/tools';

const TOOL_HANDLERS = {
  create_memory: { schema: CreateMemorySchema, handler: createMemory }
};

export async function POST(request: NextRequest) {
  const { jsonrpc, method, params, id } = await request.json();

  const tool = TOOL_HANDLERS[method];
  if (!tool) {
    return errorResponse(`Method not found: ${method}`, -32601, id);
  }

  const validatedParams = tool.schema.parse(params);
  const result = await tool.handler(validatedParams);

  return NextResponse.json({ jsonrpc: '2.0', result, id });
}
```

## Authentication

```typescript
import { auth } from '@clerk/nextjs';

export async function POST(request: NextRequest) {
  const { userId } = auth();
  if (!userId) {
    return errorResponse('Unauthorized', -32000);
  }

  // Pass userId to backend
  const result = await fetch(`${process.env.BACKEND_API}/v1/memories`, {
    headers: {
      'Authorization': `Bearer ${await getToken()}`
    }
  });
}
```

## Validation

Always use Zod schemas for runtime validation:

```typescript
import { z } from 'zod';

const SearchSchema = z.object({
  query: z.string().min(1),
  limit: z.number().int().min(1).max(50).default(10)
});
```
