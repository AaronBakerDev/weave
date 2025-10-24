#!/usr/bin/env python3
"""Generate MCP handler boilerplate for ChatGPT apps.

Usage: generate-mcp-handler.py <tool_name> [tool_name...]

Example: generate-mcp-handler.py create_memory search_memories
"""
import sys
import json
from pathlib import Path


def camel_to_snake(name):
    """Convert camelCase to snake_case."""
    result = []
    for i, char in enumerate(name):
        if char.isupper() and i > 0:
            result.append('_')
        result.append(char.lower())
    return ''.join(result)


def snake_to_camel(name):
    """Convert snake_case to camelCase."""
    components = name.split('_')
    return components[0] + ''.join(x.title() for x in components[1:])


def snake_to_pascal(name):
    """Convert snake_case to PascalCase."""
    return ''.join(x.title() for x in name.split('_'))


def generate_schema(tool_name):
    """Generate Zod schema for tool."""
    pascal = snake_to_pascal(tool_name)
    return f'''export const {pascal}Schema = z.object({{
  // TODO: Add parameters
  param1: z.string(),
  param2: z.number().optional()
}});

export type {pascal}Params = z.infer<typeof {pascal}Schema>;'''


def generate_handler(tool_name):
    """Generate handler function for tool."""
    pascal = snake_to_pascal(tool_name)
    camel = snake_to_camel(tool_name)

    return f'''export async function {camel}(params: {pascal}Params) {{
  // TODO: Implement {tool_name} logic

  const response = await fetch(`${{process.env.BACKEND_API}}/v1/...`, {{
    method: 'POST',
    headers: {{ 'Content-Type': 'application/json' }},
    body: JSON.stringify(params)
  }});

  const data = await response.json();

  return {{
    data,
    display: {{
      type: 'card',
      title: 'Title',
      description: 'Description'
      // TODO: Customize display hints
    }}
  }};
}}'''


def generate_route_entry(tool_name):
    """Generate route.ts entry for tool."""
    pascal = snake_to_pascal(tool_name)
    camel = snake_to_camel(tool_name)

    return f'  {tool_name}: {{ schema: {pascal}Schema, handler: {camel} }}'


def main():
    if len(sys.argv) < 2:
        print("Usage: generate-mcp-handler.py <tool_name> [tool_name...]", file=sys.stderr)
        print("\nExample: generate-mcp-handler.py create_memory search_memories", file=sys.stderr)
        sys.exit(1)

    tool_names = sys.argv[1:]

    # Generate schemas
    print("// Schemas (add to lib/mcp/schemas.ts)")
    print("import { z } from 'zod';\n")
    for tool_name in tool_names:
        print(generate_schema(tool_name))
        print()

    # Generate handlers
    print("\n// Handlers (add to lib/mcp/tools.ts)")
    for tool_name in tool_names:
        print(generate_handler(tool_name))
        print()

    # Generate route entries
    print("\n// Route entries (add to TOOL_HANDLERS in app/api/mcp/route.ts)")
    print("const TOOL_HANDLERS = {")
    for tool_name in tool_names:
        print(generate_route_entry(tool_name) + ",")
    print("};")

    # Generate manifest entries
    print("\n// Manifest entries (add to chatgpt-mcp-manifest.json)")
    manifest_tools = []
    for tool_name in tool_names:
        manifest_tools.append({
            "name": tool_name,
            "description": f"TODO: Describe {tool_name}",
            "parameters": {
                "type": "object",
                "required": ["param1"],
                "properties": {
                    "param1": {
                        "type": "string",
                        "description": "TODO: Describe param1"
                    },
                    "param2": {
                        "type": "number",
                        "description": "TODO: Describe param2"
                    }
                }
            }
        })

    print(json.dumps({"tools": manifest_tools}, indent=2))


if __name__ == "__main__":
    main()
