"use client";
import { useState } from 'react';
import type { SearchResponse } from '@/app/lib/types';

export default function SearchPage() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function run() {
    if (!q.trim()) return;
    setErr(null); setLoading(true);
    try {
      const res = await fetch(`/api/proxy/v1/search/associative?q=${encodeURIComponent(q)}`);
      if (!res.ok) throw new Error('Search failed');
      const data = (await res.json()) as SearchResponse;
      setResults(data);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-2">
          <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && run()} placeholder="Search memories…" className="px-3 py-2 border rounded w-full" />
          <button onClick={run} className="px-3 py-2 rounded bg-blue-600 text-white">Search</button>
          <a href="/canvas" className="text-sm text-blue-600">Open Canvas</a>
        </div>
        {err && <div className="mt-3 text-sm text-red-600">{err}</div>}
        {loading && <div className="mt-3 text-sm text-gray-600">Searching…</div>}
        {results && (
          <div className="mt-4 bg-white rounded border">
            <div className="p-3 border-b text-sm text-gray-600">{results.total} results</div>
            <ul className="divide-y">
              {results.memories.map((m) => (
                <li key={m.id} className="p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <a className="font-medium text-blue-700 hover:underline" href={`/memory/${m.id}`}>{m.title || 'Untitled'}</a>
                    <a className="text-xs text-gray-600 hover:underline" href={`/canvas?focus=${m.id}`}>Show on Canvas</a>
                  </div>
                  {m.excerpt && <p className="text-gray-600 mt-1">{m.excerpt}</p>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </main>
  );
}

