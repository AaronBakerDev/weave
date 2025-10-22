import { API_BASE } from '@/app/lib/api';

async function getPublic(slug: string) {
  const res = await fetch(`${API_BASE}/v1/public/${slug}`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed');
  return res.json();
}

export default async function PublicPage({ params }: { params: { slug: string } }) {
  const data = await getPublic(params.slug);
  return (
    <main className="min-h-screen p-6 bg-slate-50">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-semibold text-gray-900">{data.title || 'Untitled'}</h1>
        {data.core && (
          <section className="mt-4 bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-800">Core v{data.core.version}</h3>
            <p className="mt-2 whitespace-pre-wrap text-gray-700">{data.core.narrative}</p>
          </section>
        )}
      </div>
    </main>
  );
}

export const revalidate = 0;

