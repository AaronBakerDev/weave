import { API_BASE } from '@/app/lib/api';
import type { Memory } from '@/app/lib/types';
import MemoryDetailClient from './_components/MemoryDetailClient';

async function getMemory(id: string): Promise<Memory> {
  const res = await fetch(`${API_BASE}/v1/memories/${id}`, {
    headers: { 'X-Debug-User': process.env.UI_DEBUG_USER || '11111111-1111-1111-1111-111111111111' },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('Failed to load memory');
  return res.json();
}

export default async function MemoryPage({ params }: { params: { id: string } }) {
  const data = await getMemory(params.id);
  return (
    <main className="min-h-screen p-6 bg-slate-50">
      <div className="max-w-3xl mx-auto">
        <a className="text-sm text-blue-600 hover:underline" href="/">← Back</a>
        <h1 className="mt-2 text-2xl font-semibold text-gray-900">{data.title || 'Untitled'}</h1>

        {data.core && (
          <section className="mt-4 bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">Core v{data.core.version}</h3>
              <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600">{data.core.locked ? 'Locked' : 'Draft'}</span>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-gray-700">{data.core.narrative}</p>
          </section>
        )}

        <section className="mt-4 bg-white border border-gray-200 rounded-lg">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">Layers</h3>
            <a className="text-sm text-blue-600 hover:underline" href={`/api/proxy/v1/memories/${data.id}`}>Raw</a>
          </div>
          <ul className="divide-y divide-gray-100">
            {data.layers?.map((l: any) => (
              <li key={l.id} className="p-4 text-sm">
                <div className="flex items-center gap-2">
                  <strong className="text-gray-700">{l.kind}</strong>
                  <span className="text-gray-400">•</span>
                  <span className="text-gray-500">{new Date(l.created_at || Date.now()).toLocaleString()}</span>
                </div>
                {l.text_content && <p className="mt-1 text-gray-700 whitespace-pre-wrap">{l.text_content}</p>}
                {l.artifact && (
                  <a className="mt-1 inline-block text-blue-600 hover:underline" href={`/a/${l.artifact.id}`}>
                    Download artifact
                  </a>
                )}
              </li>
            ))}
          </ul>
        </section>

        {/* Client editor */}
        {/* @ts-expect-error Server-to-Client */}
        <MemoryDetailClient id={params.id} initial={data} />
      </div>
    </main>
  );
}

export const revalidate = 0;
