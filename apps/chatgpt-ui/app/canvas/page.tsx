import CanvasView from '../../components/CanvasView';

export default function CanvasPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="border-b border-gray-200 bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <a href="/" className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Home
              </a>
              <h1 className="text-2xl font-bold text-gray-900">Memory Canvas</h1>
            </div>
            <div className="flex items-center gap-4">
              <p className="text-sm text-gray-600 hidden sm:block">Pan with drag, zoom with scroll. Click to explore.</p>
              <a
                href="/search"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Search
              </a>
            </div>
          </div>
        </div>
      </div>
      <CanvasView />
    </main>
  );
}
