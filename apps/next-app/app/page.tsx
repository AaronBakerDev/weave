/**
 * Home Page - Weave Quick Capture
 *
 * Initial entry point when user opens the app in ChatGPT
 * Displays the Weaver Card for quick memory capture
 */

'use client';

import React from 'react';
import { WeaverCard } from './lib/ui/weaver-card';

export default function Home() {
  return (
    <main className="min-h-[calc(100vh-49px)] bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-md mx-auto mt-6">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">✨ Weave</h1>
          <p className="text-gray-600">Your explorable memory canvas inside ChatGPT</p>
        </div>

        <WeaverCard />

        <div className="mt-8 p-4 bg-white rounded-lg border border-gray-200 text-sm text-gray-600">
          <h3 className="font-semibold text-gray-700 mb-2">How it works:</h3>
          <ul className="space-y-1 text-xs">
            <li>📝 Capture moments and thoughts in quick notes</li>
            <li>🗺️ Explore your memories on an interactive canvas</li>
            <li>🔗 Connect related memories to see patterns</li>
            <li>🌐 Share memories with friends</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
