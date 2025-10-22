"use client";
import { useState } from 'react';

export default function MemoryDetailClient({ id, initial }: { id: string, initial: any }) {
  const [data, setData] = useState(initial);
  const [narrative, setNarrative] = useState(data.core?.narrative || '');
  const [layerText, setLayerText] = useState('');
  const [reflectionText, setReflectionText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  async function putCore() {
    setError(null);
    setSuccess(null);
    const body = { narrative, anchors: data.core?.anchors || [], people: data.core?.people || [] };
    const res = await fetch(`/api/proxy/v1/memories/${id}/core`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!res.ok) return setError('Failed to set core');
    setSuccess('Core updated!');
    setIsEditing(false);
    await refresh();
  }

  async function liftCore() {
    setError(null);
    setSuccess(null);
    const body = { narrative, anchors: data.core?.anchors || [], people: data.core?.people || [], lift: true };
    const res = await fetch(`/api/proxy/v1/memories/${id}/core`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!res.ok) return setError('Failed to lift core');
    setSuccess('Core lifted to new version!');
    setIsEditing(false);
    await refresh();
  }

  async function lockCore() {
    setError(null);
    setSuccess(null);
    const res = await fetch(`/api/proxy/v1/memories/${id}/lock`, { method: 'POST' });
    if (!res.ok) return setError('Failed to lock core');
    setSuccess('Core locked successfully!');
    await refresh();
  }

  async function appendText() {
    setError(null);
    setSuccess(null);
    const res = await fetch(`/api/proxy/v1/memories/${id}/layers`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'TEXT', text_content: layerText }) });
    if (!res.ok) return setError('Failed to append layer');
    setLayerText('');
    setSuccess('Text layer added!');
    await refresh();
  }

  async function appendReflection() {
    setError(null);
    setSuccess(null);
    const res = await fetch(`/api/proxy/v1/memories/${id}/layers`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'REFLECTION', text_content: reflectionText }) });
    if (!res.ok) return setError('Failed to append reflection');
    setReflectionText('');
    setSuccess('Reflection added!');
    await refresh();
  }

  async function uploadArtifact() {
    if (!file) return;
    setError(null);
    setSuccess(null);
    const fd = new FormData();
    fd.append('memory_id', id);
    fd.append('file', file);
    const up = await fetch(`/api/proxy/v1/artifacts/upload`, { method: 'POST', body: fd });
    if (!up.ok) return setError('Upload failed');
    const art = await up.json();
    const lay = await fetch(`/api/proxy/v1/memories/${id}/layers`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'IMAGE', artifact_id: art.artifact_id }) });
    if (!lay.ok) return setError('Layer link failed');
    setFile(null);
    setFilePreview(null);
    setSuccess('Media uploaded!');
    await refresh();
  }

  async function refresh() {
    const res = await fetch(`/api/proxy/v1/memories/${id}`);
    const json = await res.json();
    setData(json);
    setNarrative(json.core?.narrative || '');
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    setFile(selectedFile);
    if (selectedFile && selectedFile.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => setFilePreview(reader.result as string);
      reader.readAsDataURL(selectedFile);
    } else {
      setFilePreview(null);
    }
  };

  const getLayerIcon = (kind: string) => {
    switch (kind) {
      case 'TEXT':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'REFLECTION':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        );
      case 'IMAGE':
      case 'MEDIA':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
      case 'LINK':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        );
    }
  };

  const getLayerColor = (kind: string) => {
    switch (kind) {
      case 'TEXT': return 'bg-blue-50 border-blue-200 text-blue-900';
      case 'REFLECTION': return 'bg-purple-50 border-purple-200 text-purple-900';
      case 'IMAGE':
      case 'MEDIA': return 'bg-green-50 border-green-200 text-green-900';
      case 'LINK': return 'bg-orange-50 border-orange-200 text-orange-900';
      default: return 'bg-gray-50 border-gray-200 text-gray-900';
    }
  };

  return (
    <div className="space-y-8">
      {/* Core Display/Edit Section */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            Core Memory
            <span className="text-sm font-normal text-gray-500">
              v{data.core?.version || 0}
            </span>
            {data.core?.locked && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded-full">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                Locked
              </span>
            )}
          </h3>
          {!data.core?.locked && !isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 text-sm font-medium text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
            >
              Edit Core
            </button>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-4">
            <textarea
              value={narrative}
              onChange={e => setNarrative(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent min-h-[120px] resize-y"
              placeholder="Edit the core narrative..."
            />
            <div className="flex gap-3">
              <button
                onClick={putCore}
                className="px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
              >
                Save Draft
              </button>
              <button
                onClick={liftCore}
                className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                Lift to New Version
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setNarrative(data.core?.narrative || '');
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-gray-800 leading-relaxed">{data.core?.narrative || 'No core narrative yet.'}</p>

            {data.core?.time && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {data.core.time}
              </div>
            )}

            {data.core?.place && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {data.core.place}
              </div>
            )}

            {data.core?.people && data.core.people.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {data.core.people.map((person: string, i: number) => (
                  <span key={i} className="inline-flex items-center px-3 py-1 bg-indigo-100 text-indigo-700 text-sm font-medium rounded-full">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                    {person}
                  </span>
                ))}
              </div>
            )}

            {data.core?.anchors && data.core.anchors.length > 0 && (
              <div className="border-t border-gray-200 pt-4 mt-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Sensory Anchors</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {data.core.anchors.map((anchor: any, i: number) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <span className="font-medium text-gray-600 capitalize">{anchor.kind}:</span>
                      <span className="text-gray-800">{anchor.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {!data.core?.locked && !isEditing && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <button
              onClick={lockCore}
              className="px-4 py-2 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 transition-colors"
            >
              Lock Core
            </button>
          </div>
        )}
      </div>

      {/* Layers Display */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-gray-900">Layers ({data.layers?.length || 0})</h3>
        {data.layers && data.layers.length > 0 ? (
          <div className="space-y-3">
            {data.layers.map((layer: any) => (
              <div key={layer.id} className={`border rounded-lg p-4 ${getLayerColor(layer.kind)}`}>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{getLayerIcon(layer.kind)}</div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-sm">{layer.kind}</span>
                      <span className="text-xs opacity-75">
                        {new Date(layer.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {layer.text_content && (
                      <p className="text-sm leading-relaxed">{layer.text_content}</p>
                    )}
                    {layer.artifact && (
                      <a
                        href={`/a/${layer.artifact.id}`}
                        className="inline-flex items-center gap-1 mt-2 text-sm font-medium hover:underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Download {layer.artifact.filename}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No layers yet. Add your first layer below.</p>
        )}
      </div>

      {/* Add Layer Section */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Add Layer</h3>

        <div className="space-y-6">
          {/* Text Layer */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Text Layer</label>
            <textarea
              value={layerText}
              onChange={e => setLayerText(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent min-h-[80px] resize-y"
              placeholder="Add additional context or details..."
            />
            <button
              onClick={appendText}
              disabled={!layerText.trim()}
              className="mt-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Add Text
            </button>
          </div>

          {/* Reflection Layer */}
          <div className="border-t border-gray-200 pt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Reflection Layer</label>
            <textarea
              value={reflectionText}
              onChange={e => setReflectionText(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent min-h-[80px] resize-y"
              placeholder="Reflect on this memory..."
            />
            <button
              onClick={appendReflection}
              disabled={!reflectionText.trim()}
              className="mt-2 px-4 py-2 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Add Reflection
            </button>
          </div>

          {/* Media Upload */}
          <div className="border-t border-gray-200 pt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Media Upload</label>
            <input
              type="file"
              accept="image/*,video/*,audio/*"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
            />
            {filePreview && (
              <div className="mt-3">
                <img src={filePreview} alt="Preview" className="max-w-xs rounded-lg border border-gray-300" />
              </div>
            )}
            <button
              onClick={uploadArtifact}
              disabled={!file}
              className="mt-3 px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Upload Media
            </button>
          </div>
        </div>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-center gap-2">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
          </svg>
          {success}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center gap-2">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
          </svg>
          {error}
        </div>
      )}
    </div>
  );
}
