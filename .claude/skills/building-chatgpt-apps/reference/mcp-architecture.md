# MCP Architecture Reference

## Three-Tier Flow

```
ChatGPT → Next.js API Route → Backend API → Database
```

## MCP Request Format

```typescript
interface MCPRequest {
  jsonrpc: '2.0';
  method: string;
  params: Record<string, any>;
  id?: string | number;
}
```

## MCP Response Format

```typescript
interface MCPResponse {
  jsonrpc: '2.0';
  result: {
    data: any;
    display?: {
      type: 'card' | 'list' | 'table' | 'markdown';
      // ... type-specific fields
    };
  };
  id?: string | number;
}
```

## Error Codes

- `-32700`: Parse error
- `-32600`: Invalid request
- `-32601`: Method not found
- `-32602`: Invalid params
- `-32603`: Internal error
- `-32000`: Unauthorized
- `-32001`: Forbidden
- `-32002`: Not found
- `-32003`: Rate limit

## Display Hints

**Card:**
```typescript
{
  type: 'card',
  title: 'Title',
  description: 'Description',
  metadata: { key: 'value' },
  actions: [{ label: 'View', url: '/path' }]
}
```

**List:**
```typescript
{
  type: 'list',
  items: [
    { title: 'Item', description: 'Desc', url: '/path' }
  ],
  total: 100,
  hasMore: true
}
```

**Table:**
```typescript
{
  type: 'table',
  headers: ['Col1', 'Col2'],
  rows: [['val1', 'val2']]
}
```
