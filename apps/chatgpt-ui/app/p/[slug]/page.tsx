import { API_BASE } from '../../../lib/api';

async function getPublic(slug: string) {
  const res = await fetch(`${API_BASE}/v1/public/${slug}`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed');
  return res.json();
}

export default async function PublicPage({ params }: { params: { slug: string } }) {
  const data = await getPublic(params.slug);
  return (
    <main style={{ padding: 24 }}>
      <h1>{data.title || 'Untitled'}</h1>
      {data.core && (
        <section>
          <h3>Core (v{data.core.version})</h3>
          <p>{data.core.narrative}</p>
        </section>
      )}
    </main>
  );
}

