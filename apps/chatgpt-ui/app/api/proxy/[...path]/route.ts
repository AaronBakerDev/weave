import type { NextRequest } from 'next/server';

const API_BASE = process.env.PYTHON_API_BASE || 'http://localhost:8000';
const DEBUG_USER = process.env.UI_DEBUG_USER;
const isDev = process.env.NODE_ENV !== 'production';

function buildHeaders(req: NextRequest, extra?: Record<string, string>) {
  const headers: Record<string, string> = { ...(extra || {}) };
  const auth = req.headers.get('authorization');
  if (auth) headers['authorization'] = auth;
  if (isDev && DEBUG_USER) headers['X-Debug-User'] = DEBUG_USER;
  return headers;
}

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  const url = `${API_BASE}/${params.path.join('/')}${req.nextUrl.search}`;
  const res = await fetch(url, { headers: buildHeaders(req), cache: 'no-store' });
  const body = await res.arrayBuffer();
  return new Response(body, { status: res.status, headers: res.headers });
}

export async function POST(req: NextRequest, { params }: { params: { path: string[] } }) {
  const url = `${API_BASE}/${params.path.join('/')}${req.nextUrl.search}`;
  const ct = req.headers.get('content-type');
  const res = await fetch(url, { method: 'POST', body: req.body, headers: buildHeaders(req, ct ? { 'content-type': ct } : undefined) });
  const body = await res.arrayBuffer();
  return new Response(body, { status: res.status, headers: res.headers });
}

export async function PUT(req: NextRequest, { params }: { params: { path: string[] } }) {
  const url = `${API_BASE}/${params.path.join('/')}${req.nextUrl.search}`;
  const ct = req.headers.get('content-type') || 'application/json';
  const res = await fetch(url, { method: 'PUT', body: req.body, headers: buildHeaders(req, { 'content-type': ct }) });
  const body = await res.arrayBuffer();
  return new Response(body, { status: res.status, headers: res.headers });
}
