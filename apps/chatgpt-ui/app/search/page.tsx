"use client";
import { useState } from 'react';

type SearchResult = {
  memory_id: string;
  title: string;
  narrative?: string;
  score: number;
  match_type: string;
};

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function search() {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/proxy/v1/search?q=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();
      setResults(data.results || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      search();
    }
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <a href="/" className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Home
          </a>
        </div>

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Search Memories</h1>
          <p className="text-gray-600">Search through your memories by keywords, people, places, or themes.</p>
        </div>

        {/* Search Input */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-8">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search for memories..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-lg"
              />
            </div>
            <button
              onClick={search}
              disabled={loading || !query.trim()}
              className="px-6 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Searching...
                </span>
              ) : (
                'Search'
              )}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
            </svg>
            {error}
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">
                Results ({results.length})
              </h2>
            </div>

            <div className="space-y-3">
              {results.map((result) => (
                <a
                  key={result.memory_id}
                  href={`/memory/${result.memory_id}`}
                  className="block bg-white rounded-lg shadow border border-gray-200 p-5 hover:shadow-lg hover:border-primary-300 transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {result.title || 'Untitled Memory'}
                      </h3>
                      {result.narrative && (
                        <p className="text-gray-600 text-sm line-clamp-2 mb-3">
                          {result.narrative}
                        </p>
                      )}
                      <div className="flex items-center gap-3">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                          {result.match_type}
                        </span>
                        <span className="text-xs text-gray-500">
                          Relevance: {Math.round(result.score * 100)}%
                        </span>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* No Results */}
        {!loading && results.length === 0 && query && (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">No results found</h3>
            <p className="mt-2 text-gray-600">Try different keywords or check your spelling.</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && results.length === 0 && !query && (
          <div className="text-center py-12">
            <svg className="mx-auto h-16 w-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">Start searching</h3>
            <p className="mt-2 text-gray-600">Enter keywords to search through your memories.</p>
          </div>
        )}
      </div>
    </main>
  );
}
