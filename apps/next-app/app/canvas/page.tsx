"use client";
import { useEffect, useMemo, useState } from 'react';
import { Canvas2D } from '@/app/lib/ui/canvas';
import type { GraphResponse } from '@/app/lib/types';
import { Dialog } from '@/app/lib/ui/dialog';
import { useToast } from '@/app/lib/ui/toast';

type Card = { id: string; title: string; x: number; y: number; width: number; height: number; emotion: string; place?: string; peopleCount: number; connectionCount: number };
type Conn = { aId: string; bId: string; relation: string; strength: number };

function rand(min: number, max: number) { return Math.random() * (max - min) + min; }

export default function CanvasPage() {
  const { show } = useToast();
  const [cards, setCards] = useState<Card[]>([]);
  const [cons, setCons] = useState<Conn[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [since, setSince] = useState('');
  const [emotion, setEmotion] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [highlightIds, setHighlightIds] = useState<string[]>([]);
  const [weaveOpen, setWeaveOpen] = useState(false);
  const [relation, setRelation] = useState('THEME');
  const [note, setNote] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const res = await fetch(`/api/proxy/v1/graph`, { cache: 'no-store' });
      const data: GraphResponse = await res.json();
      if (cancelled) return;
      const cs: Card[] = data.nodes.map((n) => ({
        id: n.id,
        title: n.title || 'Untitled',
        x: rand(-300, 300),
        y: rand(-300, 300),
        width: 160,
        height: 80,
        emotion: ['joy','sadness','wonder','calm','fear','love','grief','anger'][Math.floor(Math.random()*8)],
        peopleCount: Math.floor(rand(0, 4)),
        connectionCount: 0,
      }));
      const es: Conn[] = data.edges.map((e) => ({ aId: e.a, bId: e.b, relation: e.relation, strength: 0.6 }));
      cs.forEach((c) => { c.connectionCount = es.filter((e) => e.aId === c.id || e.bId === c.id).length; });
      setCards(cs); setCons(es); setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // Initialize from URL params (q, focus)
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const q0 = sp.get('q') || '';
    const emo0 = sp.get('emotion') || '';
    const since0 = sp.get('since') || '';
    const focus = sp.get('focus');
    if (q0) setQuery(q0);
    if (emo0) setEmotion(emo0);
    if (since0) setSince(since0);
    if (focus) setHighlightIds([focus]);
  }, []);

  // Debounced highlight search
  useEffect(() => {
    const id = setTimeout(async () => {
      const params = new URLSearchParams();
      if (query) params.set('q', query);
      if (emotion) params.set('emotion', emotion);
      if (since) params.set('since', since);
      const url = `/api/proxy/v1/search/associative?${params.toString()}`;
      // Update URL without reload
      const nextUrl = new URL(window.location.href);
      nextUrl.search = params.toString();
      window.history.replaceState({}, '', nextUrl.toString());
      try {
        if (params.toString()) {
          const res = await fetch(url);
          if (res.ok) {
            const data = await res.json();
            setHighlightIds((data.memories || data.results || []).map((m: any) => m.id || m.memory_id));
          } else {
            // fallback to local title match
            const ids = cards.filter(c => !query || c.title.toLowerCase().includes(query.toLowerCase())).map(c => c.id);
            setHighlightIds(ids);
          }
        } else {
          setHighlightIds([]);
        }
      } catch {
        // Silent fail: keep previous highlights
      }
    }, 300);
    return () => clearTimeout(id);
  }, [query, emotion, since, cards]);

  const onClickMemory = (id: string) => {
    setSelected((cur) => {
      let next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
      if (next.length > 2) next = next.slice(-2);
      return next;
    });
  };

  async function confirmWeave() {
    if (selected.length !== 2) return;
    try {
      const body = { a_memory_id: selected[0], b_memory_id: selected[1], relation, note };
      const res = await fetch(`/api/proxy/v1/weaves`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error('Failed to weave');
      setCons((c) => [...c, { aId: selected[0], bId: selected[1], relation, strength: 0.8 }]);
      setWeaveOpen(false); setNote('');
      show('Memories woven ✓', 'success');
    } catch (e: any) {
      show(e.message || 'Weave failed', 'error');
    }
  }

  return (
    <main className="min-h-screen bg-white relative">
      <div className="p-3 border-b border-gray-200 flex items-center gap-2">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search title..." className="px-3 py-2 border rounded w-64 text-sm" />
        <select value={emotion} onChange={(e) => setEmotion(e.target.value)} className="px-2 py-2 border rounded text-sm">
          <option value="">Emotion</option>
          {['joy','sadness','wonder','calm','fear','love','grief','anger'].map((e) => <option key={e} value={e}>{e}</option>)}
        </select>
        <input value={since} onChange={(e) => setSince(e.target.value)} placeholder="Since (YYYY-MM-DD)" className="px-3 py-2 border rounded w-48 text-sm" />
        <span className="ml-auto text-xs text-gray-500">{cards.length} memories</span>
      </div>
      <div className="h-[calc(100vh-49px)]">
        <Canvas2D
          memories={cards}
          connections={cons}
          onMemoryClick={onClickMemory}
          selectedIds={selected}
          highlightIds={highlightIds}
        />
      </div>
      {/* Selection panel */}
      <div className="absolute top-[58px] right-4 bg-white/95 backdrop-blur border border-gray-200 rounded-md shadow px-3 py-2 text-sm flex items-center gap-2">
        <span className="text-gray-700">Selected: {selected.length}</span>
        {selected[0] && <a className="text-blue-700 hover:underline" href={`/memory/${selected[0]}`}>Open #1</a>}
        {selected[1] && <a className="text-blue-700 hover:underline" href={`/memory/${selected[1]}`}>Open #2</a>}
        <button disabled={selected.length !== 2} onClick={() => setWeaveOpen(true)} className="ml-2 px-2 py-1 rounded bg-indigo-600 text-white disabled:opacity-50">Weave</button>
      </div>
      {loading && (
        <div className="absolute top-16 left-4 bg-white/80 backdrop-blur px-3 py-1.5 rounded border text-sm">Loading graph…</div>
      )}

      {/* Weave modal */}
      <Dialog open={weaveOpen} onClose={() => setWeaveOpen(false)} title="Weave Memories">
        <div className="space-y-3 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-gray-600">Relation</span>
            <select value={relation} onChange={(e) => setRelation(e.target.value)} className="px-2 py-1 border rounded">
              {['SAME_PERSON','SAME_PLACE','SAME_TIME','THEME','EMOTION','TIME_NEAR'].map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-gray-600 mb-1">Note (optional)</label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} className="w-full border rounded p-2" rows={3} placeholder="Why are these connected?" />
          </div>
          <div className="flex justify-end gap-2">
            <button className="px-3 py-1.5 rounded border" onClick={() => setWeaveOpen(false)}>Cancel</button>
            <button className="px-3 py-1.5 rounded bg-indigo-600 text-white disabled:opacity-50" disabled={selected.length !== 2} onClick={confirmWeave}>Create Weave</button>
          </div>
        </div>
      </Dialog>
    </main>
  );
}

// Client page; no revalidate segment config here
