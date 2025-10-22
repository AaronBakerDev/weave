export default function Loading() {
  return (
    <main className="min-h-screen p-6 bg-slate-50">
      <div className="max-w-3xl mx-auto animate-pulse space-y-4">
        <div className="h-6 w-1/3 bg-gray-200 rounded" />
        <div className="h-8 w-2/3 bg-gray-200 rounded" />
        <div className="h-40 w-full bg-gray-200 rounded" />
      </div>
    </main>
  );
}

