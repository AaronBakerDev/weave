"use client";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="min-h-screen p-6 bg-slate-50">
      <div className="max-w-3xl mx-auto">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          <h2 className="font-semibold">Failed to load public profile</h2>
          <p className="text-sm mt-1">{error.message}</p>
          <button className="mt-3 px-3 py-1.5 text-sm rounded bg-red-600 text-white" onClick={reset}>Retry</button>
        </div>
      </div>
    </main>
  );
}

