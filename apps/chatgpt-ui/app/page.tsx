"use client";
import { useState, useEffect } from 'react';
import WeaverCard from '../components/WeaverCard';

type Memory = {
  id: string;
  title: string;
  created_at: string;
  core?: {
    narrative?: string;
    locked?: boolean;
  };
};

export default function Home() {
  const [recentMemories, setRecentMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    async function loadRecent() {
      try {
        const res = await fetch('/api/proxy/v1/memories?limit=5');
        if (res.ok) {
          const data = await res.json();
          setRecentMemories(data.memories || []);
        }
      } catch (e) {
        console.error('Failed to load recent memories', e);
      } finally {
        setLoading(false);
      }
    }
    loadRecent();
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-50 to-purple-50 opacity-30"></div>
        <div className="relative max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-6xl font-extrabold text-gray-900 mb-4">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-purple-600">
                Weave
              </span>
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
              Your personal memory platform. Capture, preserve, and weave together the threads of your life's most important moments.
            </p>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors shadow-lg hover:shadow-xl"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create Memory
              </button>
              <a
                href="/canvas"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white text-primary-600 font-semibold rounded-lg hover:bg-gray-50 transition-colors shadow border border-primary-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zM14 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1h-4a1 1 0 01-1-1v-3z" />
                </svg>
                View Canvas
              </a>
              <a
                href="/search"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors shadow border border-gray-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Search
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        {/* Create Memory Form */}
        {showCreateForm && (
          <div className="mb-12 animate-fadeIn">
            <div className="flex justify-center">
              <WeaverCard />
            </div>
          </div>
        )}

        {/* Feature Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-shadow">
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Immutable Core</h3>
            <p className="text-gray-600 text-sm">
              Lock your core memories to preserve their authenticity. Once locked, they remain unchanged forever.
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-shadow">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Layered Memories</h3>
            <p className="text-gray-600 text-sm">
              Add context, reflections, and media over time. Each layer enriches your memory without altering the core.
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-shadow">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Sensory Anchors</h3>
            <p className="text-gray-600 text-sm">
              Ground your memories in sensory details: light, sound, smell, touch, and words that bring them to life.
            </p>
          </div>
        </div>

        {/* Recent Memories */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-bold text-gray-900">Recent Memories</h2>
            <a href="/canvas" className="text-primary-600 hover:text-primary-700 font-medium">
              View all →
            </a>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary-200 border-t-primary-600"></div>
              <p className="mt-4 text-gray-600">Loading memories...</p>
            </div>
          ) : recentMemories.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentMemories.map((memory) => (
                <a
                  key={memory.id}
                  href={`/memory/${memory.id}`}
                  className="block bg-white rounded-lg shadow border border-gray-200 p-5 hover:shadow-lg hover:border-primary-300 transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-900 flex-1 mr-2">
                      {memory.title || 'Untitled Memory'}
                    </h3>
                    {memory.core?.locked && (
                      <svg className="w-5 h-5 text-orange-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  {memory.core?.narrative && (
                    <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                      {memory.core.narrative}
                    </p>
                  )}
                  <div className="text-xs text-gray-500">
                    {new Date(memory.created_at).toLocaleDateString()}
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-gray-900">No memories yet</h3>
              <p className="mt-2 text-gray-600">Create your first memory to get started.</p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create Memory
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <p className="text-center text-gray-500 text-sm">
            Weave - Your personal memory platform
          </p>
        </div>
      </footer>
    </main>
  );
}
