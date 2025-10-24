import MemoryDetailClient from '../../../components/MemoryDetailClient';

async function getMemory(id: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ? process.env.NEXT_PUBLIC_BASE_URL : ''}/api/proxy/v1/memories/${id}`, {
    cache: 'no-store'
  });
  if (!res.ok) throw new Error('Failed');
  return res.json();
}

export default async function MemoryPage({ params }: { params: { id: string } }) {
  const data = await getMemory(params.id);
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-6">
          <a href="/" className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Home
          </a>
        </div>

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">{data.title || 'Untitled Memory'}</h1>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>Memory ID: {params.id.slice(0, 8)}...</span>
            {data.created_at && (
              <span>Created: {new Date(data.created_at).toLocaleDateString()}</span>
            )}
          </div>
        </div>

        {/* Client-side interactive component */}
        <MemoryDetailClient id={params.id} initial={data} />
      </div>
    </main>
  );
}
