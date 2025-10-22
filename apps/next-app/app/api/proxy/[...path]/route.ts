import type { NextRequest } from 'next/server';

const API_BASE = process.env.PYTHON_API_BASE || 'http://localhost:8000';
const DEBUG_USER = process.env.UI_DEBUG_USER || '11111111-1111-1111-1111-111111111111';

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  const url = `${API_BASE}/${params.path.join('/')}${req.nextUrl.search}`;
  const res = await fetch(url, { headers: { 'X-Debug-User': DEBUG_USER } });
  const body = await res.arrayBuffer();
  return new Response(body, { status: res.status, headers: res.headers });
}

export async function POST(req: NextRequest, { params }: { params: { path: string[] } }) {
  const url = `${API_BASE}/${params.path.join('/')}${req.nextUrl.search}`;
  const headers: Record<string, string> = { 'X-Debug-User': DEBUG_USER };
  const ct = req.headers.get('content-type');
  if (ct) headers['content-type'] = ct;
  const res = await fetch(url, { method: 'POST', body: req.body, headers });
  const body = await res.arrayBuffer();
  return new Response(body, { status: res.status, headers: res.headers });
}

export async function PUT(req: NextRequest, { params }: { params: { path: string[] } }) {
  const url = `${API_BASE}/${params.path.join('/')}${req.nextUrl.search}`;
  const headers: Record<string, string> = { 'X-Debug-User': DEBUG_USER, 'content-type': req.headers.get('content-type') || 'application/json' };
  const res = await fetch(url, { method: 'PUT', body: req.body, headers });
  const body = await res.arrayBuffer();
  return new Response(body, { status: res.status, headers: res.headers });
}

