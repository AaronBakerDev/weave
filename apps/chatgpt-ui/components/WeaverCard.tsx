"use client";
import { useState } from 'react';
import { API_BASE } from '../lib/api';

export default function WeaverCard() {
  const [title, setTitle] = useState('');
  const [narrative, setNarrative] = useState('');
  const [time, setTime] = useState('');
  const [place, setPlace] = useState('');
  const [people, setPeople] = useState('');
  const [light, setLight] = useState('');
  const [sound, setSound] = useState('');
  const [smell, setSmell] = useState('');
  const [touch, setTouch] = useState('');
  const [words, setWords] = useState('');
  const [mid, setMid] = useState<string | null>(null);
  const [useMcp, setUseMcp] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);

  async function createMemory() {
    setErr(null);
    setSuccess(null);
    try {
      if (useMcp) {
        const res = await fetch(`/api/mcp`, {
          method: 'POST',
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'call_tool',
            params: {
              name: 'create_memory',
              arguments: { title, visibility: 'PRIVATE', seed_text: narrative }
            }
          })
        });
        const data = await res.json();
        const memId = data.result.id || data.result.memory_id || data.result?.memory?.id || null;
        setMid(memId);
        setSuccess('Memory created!');
      } else {
        const res = await fetch(`/api/proxy/v1/memories`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, visibility: 'PRIVATE' })
        });
        if (!res.ok) throw new Error('Failed to create memory');
        const data = await res.json();
        setMid(data.id);
        setSuccess('Memory shell created!');
      }
    } catch (e: any) {
      setErr(e.message);
    }
  }

  async function setCoreData() {
    if (!mid) return;
    setErr(null);
    setSuccess(null);
    try {
      const anchors = [];
      if (light) anchors.push({ kind: 'light', description: light });
      if (sound) anchors.push({ kind: 'sound', description: sound });
      if (smell) anchors.push({ kind: 'smell', description: smell });
      if (touch) anchors.push({ kind: 'touch', description: touch });
      if (words) anchors.push({ kind: 'words', description: words });

      const peopleArr = people.split(',').map(p => p.trim()).filter(Boolean);

      const body = {
        narrative,
        time: time || undefined,
        place: place || undefined,
        anchors,
        people: peopleArr
      };
      const res = await fetch(`/api/proxy/v1/memories/${mid}/core`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error('Failed to set core');
      setSuccess('Core data saved!');
    } catch (e: any) {
      setErr(e.message);
    }
  }

  async function lockCore() {
    if (!mid) return;
    setErr(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/proxy/v1/memories/${mid}/lock`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to lock core');
      setIsLocked(true);
      setSuccess('Core locked successfully!');
    } catch (e: any) {
      setErr(e.message);
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold text-gray-900">Create Memory</h3>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={useMcp}
            onChange={e => setUseMcp(e.target.checked)}
            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          Use MCP
        </label>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
          <input
            placeholder="A memorable title..."
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Narrative</label>
          <textarea
            placeholder="The core story of this memory..."
            value={narrative}
            onChange={e => setNarrative(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent min-h-[100px] resize-y"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
            <input
              placeholder="When did this happen?"
              value={time}
              onChange={e => setTime(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Place</label>
            <input
              placeholder="Where were you?"
              value={place}
              onChange={e => setPlace(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">People (comma-separated)</label>
          <input
            placeholder="Alice, Bob, Charlie..."
            value={people}
            onChange={e => setPeople(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        <div className="border-t border-gray-200 pt-4 mt-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Sensory Anchors</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Light</label>
              <input
                placeholder="Visual qualities..."
                value={light}
                onChange={e => setLight(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Sound</label>
              <input
                placeholder="What you heard..."
                value={sound}
                onChange={e => setSound(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Smell</label>
              <input
                placeholder="Scents present..."
                value={smell}
                onChange={e => setSmell(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Touch</label>
              <input
                placeholder="Tactile sensations..."
                value={touch}
                onChange={e => setTouch(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Words</label>
              <input
                placeholder="Notable phrases..."
                value={words}
                onChange={e => setWords(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          {!mid ? (
            <button
              onClick={createMemory}
              className="px-6 py-2.5 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors shadow-sm"
            >
              Create Memory
            </button>
          ) : (
            <>
              <button
                onClick={setCoreData}
                disabled={isLocked}
                className="px-6 py-2.5 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors shadow-sm disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                Set Core Data
              </button>
              <button
                onClick={lockCore}
                disabled={isLocked}
                className="px-6 py-2.5 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 transition-colors shadow-sm disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isLocked ? 'Locked' : 'Lock Core'}
              </button>
              <a
                href={`/memory/${mid}`}
                className="px-6 py-2.5 bg-gray-700 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors shadow-sm inline-block"
              >
                View Memory
              </a>
            </>
          )}
        </div>

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-center gap-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
            </svg>
            {success}
          </div>
        )}

        {err && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center gap-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
            </svg>
            {err}
          </div>
        )}
      </div>
    </div>
  );
}
