import { API_BASE } from '@/app/lib/api';
import { notFound } from 'next/navigation';

async function listPublic(handle: string) {
  // Use the Next.js proxy to ensure dev headers (X-Debug-User) and avoid CORS
  const res = await fetch(`${process.env.NEXT_PUBLIC_ASSET_PREFIX || ''}/api/proxy/v1/users/${handle}/memories/public`, {
    cache: 'no-store',
  });

  if (res.status === 404) return { notFound: true, memories: [] } as const;

  if (!res.ok) {
    let detail = '';
    try {
      detail = await res.text();
    } catch {}
    return { error: `Upstream ${res.status}${detail ? `: ${detail}` : ''}`, memories: [] } as const;
  }

  return (await res.json()) as { memories: any[] };
}

export default async function UserPage({ params }: { params: { handle: string } }) {
  const data = await listPublic(params.handle);
  if ((data as any).notFound) notFound();
  return (
    <main className="min-h-screen p-6 bg-slate-50">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-semibold text-gray-900">@{params.handle}</h1>
        {'error' in (data as any) && (data as any).error && (
          <div className="mt-3 rounded border border-amber-300 bg-amber-50 p-3 text-amber-800">
            {(data as any).error}
          </div>
        )}
        <ul className="mt-4 space-y-2">
          {data.memories?.map((m: any) => (
            <li key={m.id}>
              <a className="text-blue-700 hover:underline" href={`/memory/${m.id}`}>{m.title || 'Untitled'}</a>
            </li>
          ))}
        </ul>
        {!data.memories?.length && !('error' in (data as any)) && (
          <p className="mt-4 text-gray-500">No public memories yet.</p>
        )}
      </div>
    </main>
  );
}

export const revalidate = 0;
