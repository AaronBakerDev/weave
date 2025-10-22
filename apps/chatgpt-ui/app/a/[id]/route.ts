import type { NextRequest } from 'next/server';

const API_BASE = process.env.PYTHON_API_BASE || 'http://localhost:8000';
const DEBUG_USER = process.env.UI_DEBUG_USER;
const isDev = process.env.NODE_ENV !== 'production';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = req.headers.get('authorization');
  const headers: Record<string, string> = {};
  if (auth) headers['authorization'] = auth;
  if (isDev && DEBUG_USER) headers['X-Debug-User'] = DEBUG_USER;

  const res = await fetch(`${API_BASE}/v1/artifacts/${params.id}/download`, { headers, cache: 'no-store' });
  if (!res.ok) {
    const body = await res.text();
    return new Response(body, { status: res.status, headers: { 'content-type': res.headers.get('content-type') || 'application/json' } });
  }
  const data = await res.json();
  const url = data?.url;
  if (!url || typeof url !== 'string') {
    return new Response(JSON.stringify({ error: 'No URL in artifact response' }), { status: 502 });
  }
  return Response.redirect(url, 302);
}

