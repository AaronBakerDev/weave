"use client";
import { useEffect, useRef, useState, useMemo } from 'react';

type Node = { id: string; title: string; x: number; y: number; vx: number; vy: number; people?: string[]; time?: string; place?: string };
type Edge = { a: string; b: string; relation: string };

function rand(min: number, max: number) { return Math.random() * (max - min) + min; }

export default function CanvasView() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [loading, setLoading] = useState(true);
  const [camera, setCamera] = useState({ x: 0, y: 0, z: 1 });
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await fetch(`/api/proxy/v1/graph`, { cache: 'no-store' });
      const data = await res.json();
      const ns: Node[] = data.nodes.map((n: any) => ({
        id: n.id,
        title: n.title || 'Untitled',
        x: rand(-300, 300),
        y: rand(-300, 300),
        vx: 0,
        vy: 0,
        people: n.people || [],
        time: n.time,
        place: n.place
      }));
      setNodes(ns);
      setEdges(data.edges);
      setLoading(false);
    }
    load();
  }, []);

  // Basic force layout
  useEffect(() => {
    let raf = 0;
    const kRepel = 3000; // repulsion strength
    const kSpring = 0.01; // spring strength
    const ideal = 120; // desired edge length
    const damp = 0.85; // velocity damping

    const step = () => {
      if (nodes.length === 0) { raf = requestAnimationFrame(step); return; }
      // repulsion
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          let dx = a.x - b.x, dy = a.y - b.y;
          let d2 = dx*dx + dy*dy + 0.01;
          const f = kRepel / d2;
          const fx = f * dx, fy = f * dy;
          a.vx += fx; a.vy += fy; b.vx -= fx; b.vy -= fy;
        }
      }
      // springs
      edges.forEach(e => {
        const a = nodes.find(n => n.id === e.a); const b = nodes.find(n => n.id === e.b);
        if (!a || !b) return;
        let dx = b.x - a.x, dy = b.y - a.y;
        const dist = Math.sqrt(dx*dx + dy*dy) + 0.001;
        const force = kSpring * (dist - ideal);
        const fx = force * (dx / dist), fy = force * (dy / dist);
        a.vx += fx; a.vy += fy; b.vx -= fx; b.vy -= fy;
      });
      // integrate
      nodes.forEach(n => { n.x += n.vx; n.y += n.vy; n.vx *= damp; n.vy *= damp; });
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [nodes.length, edges.length]);

  // Render
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    let anim = 0;
    const dpr = window.devicePixelRatio || 1;
    const render = () => {
      const w = canvas.clientWidth * dpr; const h = canvas.clientHeight * dpr;
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      ctx.save();
      ctx.clearRect(0, 0, w, h);
      ctx.translate(w/2, h/2); ctx.scale(camera.z, camera.z); ctx.translate(-camera.x, -camera.y);
      // edges (threads) - gradient effect
      edges.forEach(e => {
        const a = nodes.find(n => n.id === e.a); const b = nodes.find(n => n.id === e.b);
        if (!a || !b) return;
        const grad = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
        grad.addColorStop(0, 'rgba(99,102,241,0.3)');
        grad.addColorStop(1, 'rgba(139,92,246,0.3)');
        ctx.strokeStyle = grad;
        ctx.lineWidth = 2 / camera.z;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      });
      // nodes (cards) - enhanced design
      nodes.forEach(n => {
        const r = 10; const text = n.title;
        const tw = Math.min(180, Math.max(80, text.length * 7));
        const th = n.people && n.people.length > 0 ? 60 : 45;
        const isSelected = selected === n.id;

        // Shadow
        ctx.shadowColor = 'rgba(0,0,0,0.15)';
        ctx.shadowBlur = 8 / camera.z;
        ctx.shadowOffsetY = 2 / camera.z;

        // Card background
        ctx.fillStyle = isSelected ? '#eef2ff' : '#ffffff';
        ctx.strokeStyle = isSelected ? '#6366f1' : '#d1d5db';
        ctx.lineWidth = isSelected ? 2.5 / camera.z : 1.5 / camera.z;
        roundRect(ctx, n.x - tw/2, n.y - th/2, tw, th, r);
        ctx.fill(); ctx.stroke();

        // Reset shadow
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;

        // Title
        ctx.fillStyle = '#111827';
        ctx.font = `bold ${13 / camera.z}px system-ui`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        ctx.fillText(text.slice(0, 20), n.x, n.y - th/2 + 12);

        // Time/Place badges
        ctx.font = `${9 / camera.z}px system-ui`;
        ctx.fillStyle = '#6b7280';
        let badgeY = n.y - th/2 + 30;
        if (n.time) {
          ctx.fillText(`📅 ${n.time.slice(0, 15)}`, n.x, badgeY);
          badgeY += 12;
        }
        if (n.place) {
          ctx.fillText(`📍 ${n.place.slice(0, 15)}`, n.x, badgeY);
        }

        // People dots
        if (n.people && n.people.length > 0) {
          const dotSize = 6 / camera.z;
          const spacing = 8 / camera.z;
          const totalWidth = n.people.length * spacing;
          let dotX = n.x - totalWidth/2;
          const dotY = n.y + th/2 - 10;
          n.people.slice(0, 5).forEach(() => {
            ctx.fillStyle = '#8b5cf6';
            ctx.beginPath();
            ctx.arc(dotX, dotY, dotSize/2, 0, Math.PI * 2);
            ctx.fill();
            dotX += spacing;
          });
        }
      });
      ctx.restore();
      anim = requestAnimationFrame(render);
    };
    anim = requestAnimationFrame(render);
    return () => cancelAnimationFrame(anim);
  }, [nodes, edges, camera, selected]);

  // Interaction: pan/zoom + click to open / animate zoom
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    let dragging = false; let lastX = 0, lastY = 0;
    const onDown = (e: PointerEvent) => { dragging = true; lastX = e.clientX; lastY = e.clientY; (e.target as any).setPointerCapture(e.pointerId); };
    const onMove = (e: PointerEvent) => { if (!dragging) return; const dx = (e.clientX - lastX) / camera.z; const dy = (e.clientY - lastY) / camera.z; lastX = e.clientX; lastY = e.clientY; setCamera(c => ({ ...c, x: c.x - dx, y: c.y - dy })); };
    const onUp = (e: PointerEvent) => { dragging = false; };
    const onWheel = (e: WheelEvent) => { e.preventDefault(); const factor = Math.exp(-e.deltaY * 0.001); const nz = Math.min(4, Math.max(0.2, camera.z * factor)); setCamera(c => ({ ...c, z: nz })); };
    const onClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const sx = (e.clientX - rect.left) * dpr, sy = (e.clientY - rect.top) * dpr;
      // inverse transform
      const cx = (sx / dpr - canvas.width/(2)) / camera.z + camera.x;
      const cy = (sy / dpr - canvas.height/(2)) / camera.z + camera.y;
      const hit = nodes.find(n => Math.abs(cx - n.x) < 90 && Math.abs(cy - n.y) < 24);
      if (hit) {
        setSelected(hit.id);
        // animate zoom to enter
        animateTo(hit.x, hit.y, Math.min(3, camera.z * 1.5), () => {
          window.location.href = `/memory/${hit.id}`;
        });
      }
    };
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('click', onClick);
    return () => {
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('click', onClick);
    };
  }, [nodes, camera]);

  function animateTo(x: number, y: number, z: number, done?: () => void) {
    const start = performance.now();
    const dur = 350;
    const cx0 = camera.x, cy0 = camera.y, cz0 = camera.z;
    const ease = (t: number) => 1 - Math.pow(1 - t, 3);
    function tick(now: number) {
      const t = Math.min(1, (now - start) / dur);
      const et = ease(t);
      setCamera({ x: cx0 + (x - cx0) * et, y: cy0 + (y - cy0) * et, z: cz0 + (z - cz0) * et });
      if (t < 1) requestAnimationFrame(tick); else done && done();
    }
    requestAnimationFrame(tick);
  }

  const [hoveredNode, setHoveredNode] = useState<Node | null>(null);
  const [filterPerson, setFilterPerson] = useState('');
  const [filterTime, setFilterTime] = useState('');

  // Extract unique people and times for filters
  const allPeople = useMemo(() => {
    const peopleSet = new Set<string>();
    nodes.forEach(n => n.people?.forEach(p => peopleSet.add(p)));
    return Array.from(peopleSet).sort();
  }, [nodes]);

  const filteredNodes = useMemo(() => {
    return nodes.filter(n => {
      if (filterPerson && !(n.people?.includes(filterPerson))) return false;
      if (filterTime && !n.time?.includes(filterTime)) return false;
      return true;
    });
  }, [nodes, filterPerson, filterTime]);

  return (
    <div className="relative w-full" style={{ height: 'calc(100vh - 120px)' }}>
      {/* Filters */}
      <div className="absolute top-4 left-4 z-10 bg-white rounded-lg shadow-lg border border-gray-200 p-4 max-w-xs">
        <h3 className="text-sm font-bold text-gray-900 mb-3">Filters</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Person</label>
            <select
              value={filterPerson}
              onChange={e => setFilterPerson(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">All People</option>
              {allPeople.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Time</label>
            <input
              type="text"
              placeholder="Filter by time..."
              value={filterTime}
              onChange={e => setFilterTime(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div className="text-xs text-gray-500">
            Showing {filteredNodes.length} of {nodes.length} memories
          </div>
        </div>
      </div>

      {/* Hover preview */}
      {hoveredNode && (
        <div className="absolute top-4 right-4 z-10 bg-white rounded-lg shadow-lg border border-gray-200 p-4 max-w-sm">
          <h3 className="font-bold text-gray-900 mb-2">{hoveredNode.title}</h3>
          {hoveredNode.time && <p className="text-xs text-gray-600 mb-1">Time: {hoveredNode.time}</p>}
          {hoveredNode.place && <p className="text-xs text-gray-600 mb-1">Place: {hoveredNode.place}</p>}
          {hoveredNode.people && hoveredNode.people.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {hoveredNode.people.map((p, i) => (
                <span key={i} className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">
                  {p}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Canvas */}
      <canvas ref={canvasRef} className="w-full h-full block bg-gradient-to-br from-gray-50 to-gray-100" />

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary-200 border-t-primary-600"></div>
            <p className="mt-4 text-gray-600">Loading memory graph...</p>
          </div>
        </div>
      )}
    </div>
  );
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
