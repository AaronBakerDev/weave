/**
 * Weave: Canvas Component Stubs
 *
 * File location: apps/next-app/app/lib/ui/
 *
 * Components:
 * 1. Canvas2D - Main explorable memory space (pan/zoom/drag)
 * 2. MemoryCard - Individual memory object on canvas (minimalist design)
 * 3. MemoryDetail - Detail view (entered via zoom)
 * 4. SearchOverlay - Search/filter UI on canvas
 * 5. ConnectionThreads - Visual lines between related memories
 */

'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useSendMessage, useDisplayMode, useWidgetProps } from '@/app/lib/hooks';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface Memory {
  id: string;
  title: string;
  emotion: string;
  place?: string;
  peopleCount: number;
  connectionCount: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Connection {
  aId: string;
  bId: string;
  relation: string;
  strength: number;
}

interface CanvasProps {
  memories: Memory[];
  connections: Connection[];
  onMemoryClick: (memoryId: string) => void;
  onMemoryDrag: (memoryId: string, x: number, y: number) => void;
}

// ============================================================================
// 1. CANVAS 2D COMPONENT (Main explorable space)
// ============================================================================

export function Canvas2D({ memories, connections, onMemoryClick, onMemoryDrag }: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scale, setScale] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartY, setDragStartY] = useState(0);
  const [selectedMemoryId, setSelectedMemoryId] = useState<string | null>(null);

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const newScale = Math.max(0.5, Math.min(3, scale - e.deltaY * 0.001));
    setScale(newScale);
  }, [scale]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left mouse button

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - offsetX) / scale;
    const y = (e.clientY - rect.top - offsetY) / scale;

    // Check if clicked on a memory card
    let clickedMemory: Memory | null = null;
    for (const memory of memories) {
      if (
        x >= memory.x &&
        x <= memory.x + memory.width &&
        y >= memory.y &&
        y <= memory.y + memory.height
      ) {
        clickedMemory = memory;
        break;
      }
    }

    if (clickedMemory) {
      setSelectedMemoryId(clickedMemory.id);
      onMemoryClick(clickedMemory.id);
    } else {
      setIsDraggingCanvas(true);
      setDragStartX(e.clientX - offsetX);
      setDragStartY(e.clientY - offsetY);
    }
  }, [memories, scale, offsetX, offsetY, onMemoryClick]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDraggingCanvas) {
      setOffsetX(e.clientX - dragStartX);
      setOffsetY(e.clientY - dragStartY);
    }
  }, [isDraggingCanvas, dragStartX, dragStartY]);

  const handleMouseUp = useCallback(() => {
    setIsDraggingCanvas(false);
  }, []);

  // Draw canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.fillStyle = '#fafafa';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Save context state
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    // Draw connections (threads) first (so they appear behind cards)
    drawConnections(ctx, memories, connections);

    // Draw memory cards
    for (const memory of memories) {
      drawMemoryCard(ctx, memory, selectedMemoryId === memory.id);
    }

    ctx.restore();
  }, [memories, connections, scale, offsetX, offsetY, selectedMemoryId]);

  return (
    <div className="w-full h-full bg-white relative">
      <canvas
        ref={canvasRef}
        width={1024}
        height={768}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      />
      <div className="absolute top-4 left-4 text-xs text-gray-500 pointer-events-none">
        {memories.length} memories • Scroll to zoom • Drag to pan
      </div>
    </div>
  );
}

// ============================================================================
// HELPER: Draw Connection Threads
// ============================================================================

function drawConnections(
  ctx: CanvasRenderingContext2D,
  memories: Memory[],
  connections: Connection[]
) {
  const memoryMap = new Map(memories.map(m => [m.id, m]));

  for (const conn of connections) {
    const aMemory = memoryMap.get(conn.aId);
    const bMemory = memoryMap.get(conn.bId);

    if (!aMemory || !bMemory) continue;

    const x1 = aMemory.x + aMemory.width / 2;
    const y1 = aMemory.y + aMemory.height / 2;
    const x2 = bMemory.x + bMemory.width / 2;
    const y2 = bMemory.y + bMemory.height / 2;

    // Draw thread (connection line)
    ctx.strokeStyle = `rgba(100, 150, 200, ${conn.strength * 0.4})`;
    ctx.lineWidth = Math.max(0.5, conn.strength * 2);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
}

// ============================================================================
// 2. MEMORY CARD COMPONENT (Minimalist design)
// ============================================================================

function drawMemoryCard(
  ctx: CanvasRenderingContext2D,
  memory: Memory,
  isSelected: boolean
) {
  const { x, y, width, height, title, emotion, place, peopleCount, connectionCount } = memory;

  // Background
  ctx.fillStyle = isSelected ? '#e8f4f8' : '#ffffff';
  ctx.fillRect(x, y, width, height);

  // Border
  ctx.strokeStyle = isSelected ? '#0099cc' : '#cccccc';
  ctx.lineWidth = isSelected ? 2 : 1;
  ctx.strokeRect(x, y, width, height);

  // Emotion color dot
  const emotionColor = getEmotionColor(emotion);
  ctx.fillStyle = emotionColor;
  ctx.beginPath();
  ctx.arc(x + 8, y + 8, 4, 0, Math.PI * 2);
  ctx.fill();

  // Title
  ctx.fillStyle = '#333333';
  ctx.font = 'bold 12px sans-serif';
  ctx.textBaseline = 'top';
  ctx.fillText(title, x + 8, y + 8, width - 16);

  // Metadata (place, people count, connection count)
  ctx.fillStyle = '#666666';
  ctx.font = '10px sans-serif';
  const metadataY = y + height - 16;

  if (place) {
    ctx.fillText(`📍 ${place}`, x + 8, metadataY);
  }

  if (peopleCount > 0) {
    ctx.fillText(`🧑 ${peopleCount}`, x + 80, metadataY);
  }

  if (connectionCount > 0) {
    ctx.fillText(`🔗 ${connectionCount}`, x + 120, metadataY);
  }
}

// ============================================================================
// HELPER: Emotion Color Mapping
// ============================================================================

function getEmotionColor(emotion: string): string {
  const colors: Record<string, string> = {
    joy: '#ffd700',
    sadness: '#4169e1',
    wonder: '#9370db',
    calm: '#3cb371',
    fear: '#ff6347',
    love: '#ff69b4',
    grief: '#696969',
    anger: '#dc143c',
  };
  return colors[emotion.toLowerCase()] || '#cccccc';
}

// ============================================================================
// 3. MEMORY DETAIL VIEW (Zoom-to-enter)
// ============================================================================

interface MemoryDetailProps {
  memoryId: string;
  onBack: () => void;
}

export function MemoryDetail({ memoryId, onBack }: MemoryDetailProps) {
  const [memory, setMemory] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { sendMessage } = useSendMessage();

  useEffect(() => {
    // TODO: Fetch memory details from Python API
    // For now, placeholder
    setLoading(false);
  }, [memoryId]);

  if (loading) {
    return <div className="p-8">Loading memory...</div>;
  }

  return (
    <div className="w-full max-w-2xl mx-auto p-8">
      <button
        onClick={onBack}
        className="mb-4 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
      >
        ← Back to Canvas
      </button>

      <div className="bg-white border border-gray-200 rounded-lg p-8">
        {/* Core (immutable snapshot) */}
        <div className="mb-8 p-6 bg-blue-50 border-l-4 border-blue-500">
          <h2 className="text-2xl font-bold mb-2">{memory?.title}</h2>
          <p className="text-gray-700 mb-4">{memory?.narrative}</p>
          <div className="text-sm text-gray-600 space-y-1">
            {memory?.when && <div>📅 {new Date(memory.when).toLocaleDateString()}</div>}
            {memory?.where && <div>📍 {memory.where}</div>}
            {memory?.people?.length > 0 && <div>👥 {memory.people.join(', ')}</div>}
          </div>
        </div>

        {/* Layers (contributions, reflections) */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4">Layers & Reflections</h3>
          <div className="space-y-4">
            {memory?.layers?.map((layer: any) => (
              <div
                key={layer.id}
                className="p-4 border border-gray-200 rounded bg-gray-50"
              >
                <p className="font-medium text-sm text-gray-600 mb-2">
                  {layer.author} • {layer.kind}
                </p>
                <p className="text-gray-700">{layer.content}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Add layer button */}
        <button
          onClick={() =>
            sendMessage(`Add a reflection to this memory: "${memory?.title}"`)
          }
          className="w-full py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          + Add Layer
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// 4. SEARCH OVERLAY COMPONENT
// ============================================================================

interface SearchOverlayProps {
  onSearch: (query: string) => void;
  onFilterChange: (filters: Record<string, any>) => void;
}

export function SearchOverlay({ onSearch, onFilterChange }: SearchOverlayProps) {
  const [query, setQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query);
  };

  return (
    <div className="absolute top-4 right-4 w-80 bg-white border border-gray-300 rounded-lg shadow-lg p-4">
      <form onSubmit={handleSearch} className="space-y-3">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder='Search (e.g., "last time I felt calm")'
          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <button
          type="submit"
          className="w-full py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm font-medium"
        >
          Search
        </button>
      </form>

      <button
        onClick={() => setShowFilters(!showFilters)}
        className="text-xs text-blue-600 hover:underline mt-2"
      >
        {showFilters ? 'Hide' : 'Show'} Filters
      </button>

      {showFilters && (
        <div className="mt-3 space-y-2 text-sm">
          <label className="flex items-center">
            <input type="checkbox" className="mr-2" />
            Person
          </label>
          <label className="flex items-center">
            <input type="checkbox" className="mr-2" />
            Place
          </label>
          <label className="flex items-center">
            <input type="checkbox" className="mr-2" />
            Emotion
          </label>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 5. WEAVER CARD (Inline quick capture)
// ============================================================================

export function WeaverCard() {
  const { sendMessage } = useSendMessage();
  const [text, setText] = useState('');

  const handleAdd = async () => {
    await sendMessage(`Add this to a memory: "${text}"`);
    setText('');
  };

  return (
    <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6 max-w-md">
      <h3 className="font-semibold text-gray-800 mb-3">✨ Quick Capture</h3>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="What would you like to remember?"
        className="w-full h-24 p-3 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <div className="flex gap-2 mt-3">
        <button
          onClick={handleAdd}
          className="flex-1 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm font-medium"
        >
          Add to Memory
        </button>
        <button
          onClick={() => sendMessage('Show me the canvas')}
          className="flex-1 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 text-sm font-medium"
        >
          Open Canvas
        </button>
      </div>
    </div>
  );
}
