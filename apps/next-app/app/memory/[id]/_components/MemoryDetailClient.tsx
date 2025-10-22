"use client";
import { useState } from 'react';

export default function MemoryDetailClient({ id, initial }: { id: string; initial: any }) {
  const [data, setData] = useState(initial);
  const [narrative, setNarrative] = useState(data.core?.narrative || '');
  const [layerText, setLayerText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function putCore(lift = false) {
    setError(null); setBusy(true);
    const body = { narrative, anchors: [], people: [], ...(lift ? { lift: true } : {}) };
    const res = await fetch(`/api/proxy/v1/memories/${id}/core`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!res.ok) { setBusy(false); return setError(lift ? 'Failed to lift core' : 'Failed to save core'); }
    await refresh(); setBusy(false);
  }
  async function lockCore() {
    setError(null); setBusy(true);
    const res = await fetch(`/api/proxy/v1/memories/${id}/lock`, { method: 'POST' });
    if (!res.ok) { setBusy(false); return setError('Failed to lock core'); }
    await refresh(); setBusy(false);
  }
  async function appendText() {
    if (!layerText.trim()) return;
    setError(null); setBusy(true);
    const res = await fetch(`/api/proxy/v1/memories/${id}/layers`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'TEXT', text_content: layerText }) });
    if (!res.ok) { setBusy(false); return setError('Failed to append layer'); }
    setLayerText(''); await refresh(); setBusy(false);
  }
  async function uploadArtifact() {
    if (!file) return; setBusy(true);
    const fd = new FormData();
    fd.append('memory_id', id);
    fd.append('file', file);
    const up = await fetch(`/api/proxy/v1/artifacts/upload`, { method: 'POST', body: fd });
    if (!up.ok) { setBusy(false); return setError('Upload failed'); }
    const art = await up.json();
    const lay = await fetch(`/api/proxy/v1/memories/${id}/layers`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'IMAGE', artifact_id: art.artifact_id }) });
    if (!lay.ok) { setBusy(false); return setError('Layer link failed'); }
    setFile(null); await refresh(); setBusy(false);
  }
  async function refresh() {
    const res = await fetch(`/api/proxy/v1/memories/${id}`);
    const json = await res.json();
    setData(json);
    setNarrative(json.core?.narrative || '');
  }

  return (
    <div className="mt-6 bg-white border border-gray-200 rounded-lg p-4">
      <h3 className="font-semibold text-gray-800">Edit Core</h3>
      <textarea
        value={narrative}
        onChange={(e) => setNarrative(e.target.value)}
        className="mt-2 w-full min-h-[100px] p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="Tell the story in your words..."
      />
      <div className="mt-2 flex flex-wrap gap-2">
        <button onClick={() => putCore(false)} disabled={busy} className="px-3 py-1.5 rounded bg-blue-600 text-white text-sm disabled:opacity-50">Save Draft</button>
        <button onClick={() => putCore(true)} disabled={busy} className="px-3 py-1.5 rounded bg-indigo-600 text-white text-sm disabled:opacity-50">Lift (New Draft)</button>
        <button onClick={lockCore} disabled={busy} className="px-3 py-1.5 rounded bg-gray-800 text-white text-sm disabled:opacity-50">Lock Core</button>
      </div>

      <h3 className="mt-6 font-semibold text-gray-800">Add Text Layer</h3>
      <textarea
        value={layerText}
        onChange={(e) => setLayerText(e.target.value)}
        className="mt-2 w-full min-h-[80px] p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="Add a detail, reflection, or quote..."
      />
      <div className="mt-2"><button onClick={appendText} disabled={busy || !layerText.trim()} className="px-3 py-1.5 rounded bg-blue-600 text-white text-sm disabled:opacity-50">Append</button></div>

      <h3 className="mt-6 font-semibold text-gray-800">Add Image</h3>
      <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} className="mt-2" />
      <div className="mt-2"><button onClick={uploadArtifact} disabled={busy || !file} className="px-3 py-1.5 rounded bg-blue-600 text-white text-sm disabled:opacity-50">Upload + Append</button></div>

      {error && <div className="mt-3 text-sm text-red-600">{error}</div>}
    </div>
  );
}

