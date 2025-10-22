import { API_BASE } from '../../../lib/api';
import { notFound } from 'next/navigation';

async function listPublic(handle: string) {
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
    <main style={{ padding: 24 }}>
      <h1>@{params.handle}</h1>
      {'error' in (data as any) && (data as any).error && (
        <div style={{ marginTop: 12, padding: 12, border: '1px solid #facc15', background: '#fffbeb', color: '#92400e' }}>
          {(data as any).error}
        </div>
      )}
      <ul>
        {data.memories?.map((m: any) => (
          <li key={m.id}><a href={`/memory/${m.id}`}>{m.title || 'Untitled'}</a></li>
        ))}
      </ul>
      {!data.memories?.length && !('error' in (data as any)) && (
        <p style={{ marginTop: 12, color: '#6b7280' }}>No public memories yet.</p>
      )}
    </main>
  );
}
