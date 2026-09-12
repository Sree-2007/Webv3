import React, { useEffect, useRef } from 'react';
import { SignalState, SIGNAL } from '../types';

type CarType = 'car' | 'bike' | 'bus' | 'truck' | 'ambulance' | 'person';
type Lane = 'east' | 'west' | 'north' | 'south' | 'ped';

interface Agent {
  id: number;
  type: CarType;
  x: number; y: number; vx: number; vy: number;
  width: number; height: number;
  color: string; confidence: number;
  lane: Lane; stopped: boolean;
}

interface PedestrianAgent extends Agent {
  waypoints: [number, number][];
  wpIdx: number;
  waiting: boolean;
  journey: number;
}

interface Props {
  cameraId: string;
  cameraName: string;
  spawnRate: number;
  ambulance?: boolean;
  paused?: boolean;
  phase: SignalState;
  onDensity?: (cameraId: string, ns: number, ew: number) => void;
}

const COLORS: Record<CarType, string[]> = {
  car: ['#e11d48', '#3b82f6', '#8b5cf6', '#0ea5e9', '#f59e0b', '#10b981', '#64748b', '#ec4899'],
  bike: ['#dc2626', '#16a34a', '#facc15'],
  bus: ['#1d4ed8', '#7c3aed', '#059669', '#ea580c'],
  truck: ['#78350f', '#334155', '#0f766e'],
  ambulance: ['#dc2626'],
  person: ['#22d3ee', '#a78bfa', '#f472b6', '#fbbf24'],
};

export const CameraFeed: React.FC<Props> = ({
  cameraId, cameraName, spawnRate, ambulance = false, paused = false, phase, onDensity,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const agentsRef = useRef<Agent[]>([]);
  const rafRef = useRef(0);
  const nextIdRef = useRef(1);
  const lastSpawnRef = useRef(0);
  const lastDensityRef = useRef(0);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  const phaseRef = useRef<SignalState>(phase);
  phaseRef.current = phase;
  const onDensityRef = useRef(onDensity);
  onDensityRef.current = onDensity;

  const priorityDirRef = useRef<'NS' | 'EW' | null>(null);
  const effectivePhaseRef = useRef<SignalState>(phase);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0, height = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const newW = Math.max(1, Math.round(rect.width));
      const newH = Math.max(1, Math.round(rect.height));
      const oldW = width;
      const oldH = height;
      width = newW;
      height = newH;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Scale agents proportionally so animation continues seamlessly
      if (oldW > 1 && oldH > 1 && (oldW !== width || oldH !== height)) {
        const sx = width / oldW;
        const sy = height / oldH;
        agentsRef.current.forEach(a => {
          a.x *= sx;
          a.y *= sy;
          if (a.lane === 'ped') {
            const ped = a as PedestrianAgent;
            ped.waypoints = ped.waypoints.map(([wx, wy]) => [wx * sx, wy * sy]);
          }
        });
      }
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const rand = (a: number, b: number) => a + Math.random() * (b - a);
    const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

    const stopX_east = () => width / 2 - 72;
    const stopX_west = () => width / 2 + 72;
    const stopY_south = () => height / 2 - 72;
    const stopY_north = () => height / 2 + 72;

    const computeEffectivePhase = (): SignalState => {
      const base = phaseRef.current;
      const ambs = agentsRef.current.filter(a => a.type === 'ambulance');
      if (ambs.length === 0) {
        priorityDirRef.current = null;
        return base;
      }
      const cx = width / 2, cy = height / 2;
      const approaching: { dir: 'NS' | 'EW'; dist: number }[] = [];
      for (const amb of ambs) {
        let isApproaching = false;
        let dir: 'NS' | 'EW' | null = null;
        if (amb.lane === 'east' && amb.x < cx) { isApproaching = true; dir = 'EW'; }
        else if (amb.lane === 'west' && amb.x > cx) { isApproaching = true; dir = 'EW'; }
        else if (amb.lane === 'south' && amb.y < cy) { isApproaching = true; dir = 'NS'; }
        else if (amb.lane === 'north' && amb.y > cy) { isApproaching = true; dir = 'NS'; }
        if (isApproaching && dir) {
          const d = Math.hypot(amb.x - cx, amb.y - cy);
          if (d < 320) approaching.push({ dir, dist: d });
        }
      }
      if (priorityDirRef.current) {
        const still = approaching.some(a => a.dir === priorityDirRef.current);
        if (!still) priorityDirRef.current = null;
      }
      if (!priorityDirRef.current && approaching.length > 0) {
        approaching.sort((a, b) => a.dist - b.dist);
        priorityDirRef.current = approaching[0].dir;
      }
      if (!priorityDirRef.current) return base;
      return priorityDirRef.current === 'NS' ? 'ns-green' : 'ew-green';
    };

    const spawnAgent = () => {
      const roll = Math.random();
      let type: CarType = 'car';
      if (ambulance && roll > 0.9) type = 'ambulance';
      else if (roll > 0.75) type = 'person';
      else if (roll > 0.58) type = 'bike';
      else if (roll > 0.48) type = 'bus';
      else if (roll > 0.38) type = 'truck';

      const isPed = type === 'person';
      const lanes: Lane[] = isPed ? ['ped'] : ['east', 'west', 'north', 'south'];
      const lane = pick(lanes);
      const color = pick(COLORS[type]);
      const isBus = type === 'bus' || type === 'truck';
      const isSmall = type === 'bike' || isPed;

      let w = isBus ? 22 : isSmall ? 6 : 14;
      let h = isBus ? 12 : isSmall ? 6 : 8;
      let x = 0, y = 0, vx = 0, vy = 0;
      const speed = isPed ? rand(0.4, 0.8) : isBus ? rand(0.7, 1.2) : rand(1.2, 2.2);

      if (isPed) {
        const cx = width / 2;
        const cy = height / 2;
        const WALK = 70;
        const CROSS = 62;
        const journey = Math.floor(Math.random() * 4);
        let waypoints: [number, number][] = [];

        if (journey === 0) {
          const startX = Math.random() > 0.5 ? -20 : width + 20;
          waypoints = [
            [startX, cy - WALK],
            [cx - CROSS, cy - CROSS],
            [cx + CROSS, cy - CROSS],
            [startX < 0 ? width + 20 : -20, cy - WALK],
          ];
        } else if (journey === 1) {
          const startX = Math.random() > 0.5 ? -20 : width + 20;
          waypoints = [
            [startX, cy + WALK],
            [cx - CROSS, cy + CROSS],
            [cx + CROSS, cy + CROSS],
            [startX < 0 ? width + 20 : -20, cy + WALK],
          ];
        } else if (journey === 2) {
          const startY = Math.random() > 0.5 ? -20 : height + 20;
          waypoints = [
            [cx - WALK, startY],
            [cx - CROSS, cy - CROSS],
            [cx - CROSS, cy + CROSS],
            [cx - WALK, startY < 0 ? height + 20 : -20],
          ];
        } else {
          const startY = Math.random() > 0.5 ? -20 : height + 20;
          waypoints = [
            [cx + WALK, startY],
            [cx + CROSS, cy - CROSS],
            [cx + CROSS, cy + CROSS],
            [cx + WALK, startY < 0 ? height + 20 : -20],
          ];
        }

        x = waypoints[0][0];
        y = waypoints[0][1];

        const ped: PedestrianAgent = {
          id: nextIdRef.current++, type, x, y, vx: 0, vy: 0,
          width: 6, height: 6, color,
          confidence: 0.85 + Math.random() * 0.14,
          lane: 'ped', stopped: false,
          waypoints, wpIdx: 1, waiting: false, journey,
        };
        agentsRef.current.push(ped);
        return;
      }

      if (lane === 'east') { x = -30; y = height / 2 - 22 + rand(-4, 4); vx = speed; }
      else if (lane === 'west') { x = width + 30; y = height / 2 + 22 + rand(-4, 4); vx = -speed; }
      else if (lane === 'south') {
        x = width / 2 - 22 + rand(-4, 4); y = -30; vy = speed;
        w = isBus ? 10 : isSmall ? 4 : 8; h = isBus ? 24 : isSmall ? 6 : 14;
      } else {
        x = width / 2 + 22 + rand(-4, 4); y = height + 30; vy = -speed;
        w = isBus ? 10 : isSmall ? 4 : 8; h = isBus ? 24 : isSmall ? 6 : 14;
      }

      agentsRef.current.push({
        id: nextIdRef.current++, type, x, y, vx, vy,
        width: w, height: h, color,
        confidence: 0.85 + Math.random() * 0.14,
        lane, stopped: false,
      });
    };

    const shouldStop = (a: Agent): boolean => {
      if (a.lane === 'ped') return false;
      const p = effectivePhaseRef.current;
      const nsMoving = SIGNAL.isNSMoving(p);
      const ewMoving = SIGNAL.isEWMoving(p);
      const sx_e = stopX_east(), sx_w = stopX_west();
      const sy_s = stopY_south(), sy_n = stopY_north();
      let atLine = false, moving = true;
      if (a.lane === 'east') { atLine = a.x + a.vx >= sx_e && a.x <= sx_e + 4; moving = ewMoving; }
      else if (a.lane === 'west') { atLine = a.x + a.vx <= sx_w && a.x >= sx_w - 4; moving = ewMoving; }
      else if (a.lane === 'south') { atLine = a.y + a.vy >= sy_s && a.y <= sy_s + 4; moving = nsMoving; }
      else if (a.lane === 'north') { atLine = a.y + a.vy <= sy_n && a.y >= sy_n - 4; moving = nsMoving; }
      if (!moving && atLine) return true;
      const ahead = agentsRef.current.find(o =>
        o.id !== a.id && o.lane === a.lane && o.stopped &&
        ((a.vx > 0 && o.x > a.x && o.x - a.x < a.width + 8) ||
         (a.vx < 0 && o.x < a.x && a.x - o.x < a.width + 8) ||
         (a.vy > 0 && o.y > a.y && o.y - a.y < a.height + 8) ||
         (a.vy < 0 && o.y < a.y && a.y - o.y < a.height + 8))
      );
      return !!ahead;
    };

    const drawRoad = () => {
      ctx.fillStyle = '#e8eef5'; ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(0, height / 2 - 60, width, 120);
      ctx.fillRect(width / 2 - 60, 0, 120, height);
      ctx.fillStyle = '#4a5568';
      ctx.fillRect(0, height / 2 - 55, width, 110);
      ctx.fillRect(width / 2 - 55, 0, 110, height);
      ctx.fillStyle = 'rgba(0,0,0,0.04)';
      for (let i = 0; i < 100; i++) ctx.fillRect(Math.random() * width, height / 2 - 55 + Math.random() * 110, 3, 3);

      ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 1.5; ctx.setLineDash([12, 8]);
      ctx.beginPath();
      ctx.moveTo(0, height / 2); ctx.lineTo(width / 2 - 55, height / 2);
      ctx.moveTo(width / 2 + 55, height / 2); ctx.lineTo(width, height / 2);
      ctx.moveTo(width / 2, 0); ctx.lineTo(width / 2, height / 2 - 55);
      ctx.moveTo(width / 2, height / 2 + 55); ctx.lineTo(width / 2, height);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1; ctx.setLineDash([10, 10]);
      ctx.beginPath();
      ctx.moveTo(0, height / 2 - 27); ctx.lineTo(width / 2 - 55, height / 2 - 27);
      ctx.moveTo(0, height / 2 + 27); ctx.lineTo(width / 2 - 55, height / 2 + 27);
      ctx.moveTo(width / 2 + 55, height / 2 - 27); ctx.lineTo(width, height / 2 - 27);
      ctx.moveTo(width / 2 + 55, height / 2 + 27); ctx.lineTo(width, height / 2 + 27);
      ctx.moveTo(width / 2 - 27, 0); ctx.lineTo(width / 2 - 27, height / 2 - 55);
      ctx.moveTo(width / 2 + 27, 0); ctx.lineTo(width / 2 + 27, height / 2 - 55);
      ctx.moveTo(width / 2 - 27, height / 2 + 55); ctx.lineTo(width / 2 - 27, height);
      ctx.moveTo(width / 2 + 27, height / 2 + 55); ctx.lineTo(width / 2 + 27, height);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      for (let i = -4; i <= 4; i++) {
        ctx.fillRect(width / 2 + i * 12 - 3, height / 2 - 68, 6, 13);
        ctx.fillRect(width / 2 + i * 12 - 3, height / 2 + 55, 6, 13);
        ctx.fillRect(width / 2 - 68, height / 2 + i * 12 - 3, 13, 6);
        ctx.fillRect(width / 2 + 55, height / 2 + i * 12 - 3, 13, 6);
      }
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(width / 2 - 72, height / 2 - 55, 4, 110);
      ctx.fillRect(width / 2 + 68, height / 2 - 55, 4, 110);
      ctx.fillRect(width / 2 - 55, height / 2 - 72, 110, 4);
      ctx.fillRect(width / 2 - 55, height / 2 + 68, 110, 4);
    };

    const drawSignals = () => {
      const p = effectivePhaseRef.current;
      const nsColor = SIGNAL.lightHex(SIGNAL.nsColor(p));
      const ewColor = SIGNAL.lightHex(SIGNAL.ewColor(p));
      const drawLight = (x: number, y: number, activeColor: string) => {
        ctx.fillStyle = '#1e293b';
        ctx.beginPath(); ctx.arc(x, y, 12, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#334155';
        ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI * 2); ctx.fill();
        const lights: [string, number, number][] = [
          ['#ef4444', x, y - 5.5], ['#f59e0b', x, y], ['#22c55e', x, y + 5.5],
        ];
        lights.forEach(([c, lx, ly]) => {
          const isActive = c === activeColor;
          ctx.fillStyle = isActive ? c : 'rgba(0,0,0,0.35)';
          ctx.beginPath(); ctx.arc(lx, ly, 2.6, 0, Math.PI * 2); ctx.fill();
          if (isActive) {
            ctx.shadowColor = c; ctx.shadowBlur = 10;
            ctx.beginPath(); ctx.arc(lx, ly, 2.6, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
          }
        });
      };
      const cx = width / 2, cy = height / 2;
      drawLight(cx - 80, cy - 80, nsColor);
      drawLight(cx + 80, cy + 80, nsColor);
      drawLight(cx + 80, cy - 80, ewColor);
      drawLight(cx - 80, cy + 80, ewColor);
    };

    const drawAgent = (a: Agent) => {
      ctx.save();
      const x = a.x - a.width / 2, y = a.y - a.height / 2;
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(x + 1, y + 1, a.width, a.height);
      if (a.type === 'person') {
        const ped = a as PedestrianAgent;
        ctx.fillStyle = a.color;
        ctx.beginPath(); ctx.arc(a.x, a.y, a.width / 2, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 1; ctx.stroke();
        if (ped.waiting) {
          ctx.strokeStyle = 'rgba(239,68,68,0.9)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(a.x, a.y, a.width / 2 + 3, 0, Math.PI * 2);
          ctx.stroke();
        }
      } else {
        ctx.fillStyle = a.color;
        ctx.fillRect(x, y, a.width, a.height);
        ctx.fillStyle = 'rgba(15,23,42,0.55)';
        if (a.lane === 'east' || a.lane === 'west') {
          ctx.fillRect(a.lane === 'east' ? x + a.width * 0.62 : x, y + 1.5, a.width * 0.25, a.height - 3);
        } else {
          ctx.fillRect(x + 1.5, a.lane === 'south' ? y + a.height * 0.62 : y, a.width - 3, a.height * 0.25);
        }
        if (a.type === 'ambulance') {
          ctx.fillStyle = '#ffffff';
          if (a.lane === 'east' || a.lane === 'west') {
            ctx.fillRect(a.x - 2, a.y - 5, 4, 10);
            ctx.fillRect(a.x - 5, a.y - 2, 10, 4);
          } else {
            ctx.fillRect(a.x - 5, a.y - 2, 10, 4);
            ctx.fillRect(a.x - 2, a.y - 5, 4, 10);
          }
          const flash = Math.floor(Date.now() / 180) % 2 === 0;
          ctx.fillStyle = flash ? '#3b82f6' : '#ef4444';
          ctx.beginPath();
          ctx.arc(a.x, a.y - (a.lane === 'east' || a.lane === 'west' ? a.height / 2 + 2 : 0), 2.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = flash ? '#3b82f6' : '#ef4444';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(a.x, a.y, Math.max(a.width, a.height) * 0.9 + 4, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      ctx.restore();
    };

    const drawYoloBox = (a: Agent) => {
      const x = a.x - a.width / 2 - 3, y = a.y - a.height / 2 - 3;
      const w = a.width + 6, h = a.height + 6;
      let stroke = '#22c55e', tag = '#22c55e', tagText = '#0a0a0f';
      if (a.type === 'ambulance') { stroke = '#ef4444'; tag = '#ef4444'; tagText = '#fff'; }
      else if (a.type === 'person') { stroke = '#06b6d4'; tag = '#06b6d4'; }
      else if (a.type === 'bus' || a.type === 'truck') { stroke = '#f59e0b'; tag = '#f59e0b'; }

      ctx.strokeStyle = stroke; ctx.lineWidth = 1.5; ctx.strokeRect(x, y, w, h);
      const L = 6; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, y + L); ctx.lineTo(x, y); ctx.lineTo(x + L, y);
      ctx.moveTo(x + w - L, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + L);
      ctx.moveTo(x + w, y + h - L); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w - L, y + h);
      ctx.moveTo(x + L, y + h); ctx.lineTo(x, y + h); ctx.lineTo(x, y + h - L);
      ctx.stroke();

      const label = a.type === 'ambulance'
        ? 'AMBULANCE · PRIORITY'
        : `${a.type.toUpperCase()} ${(a.confidence * 100).toFixed(0)}%`;
      ctx.font = 'bold 9px monospace';
      const tw = ctx.measureText(label).width + 6;
      ctx.fillStyle = tag; ctx.fillRect(x, y - 13, tw, 12);
      ctx.fillStyle = tagText; ctx.fillText(label, x + 3, y - 4);
    };

    const tick = (now: number) => {
      if (pausedRef.current) { rafRef.current = requestAnimationFrame(tick); return; }

      if (now - lastSpawnRef.current > 1000 / spawnRate) {
        lastSpawnRef.current = now;
        spawnAgent();
      }

      effectivePhaseRef.current = computeEffectivePhase();

      agentsRef.current.forEach(a => {
        if (a.lane === 'ped') {
          const ped = a as PedestrianAgent;
          const target = ped.waypoints[ped.wpIdx];
          if (!target) return;
          const dx = target[0] - ped.x;
          const dy = target[1] - ped.y;
          const dist = Math.hypot(dx, dy);

          const crossingNSRoad = ped.journey === 0 || ped.journey === 1;
          const crossingEWRoad = ped.journey === 2 || ped.journey === 3;

          const atCrossingEntrance = ped.wpIdx === 1 &&
            Math.hypot(ped.waypoints[1][0] - ped.x, ped.waypoints[1][1] - ped.y) < 8;

          let mustWait = false;
          if (atCrossingEntrance) {
            const p = effectivePhaseRef.current;
            if (crossingNSRoad && SIGNAL.isNSMoving(p)) mustWait = true;
            if (crossingEWRoad && SIGNAL.isEWMoving(p)) mustWait = true;
          }
          ped.waiting = mustWait;

          if (!mustWait && dist > 1.5) {
            const speed = 0.6;
            ped.x += (dx / dist) * speed;
            ped.y += (dy / dist) * speed;
          } else if (dist <= 1.5) {
            ped.wpIdx++;
            if (ped.wpIdx >= ped.waypoints.length) ped.wpIdx = 0;
          }
        } else {
          a.stopped = shouldStop(a);
          if (!a.stopped) { a.x += a.vx; a.y += a.vy; }
        }
      });

      agentsRef.current = agentsRef.current.filter(a =>
        a.x > -80 && a.x < width + 80 && a.y > -80 && a.y < height + 80
      );

      if (now - lastDensityRef.current > 500) {
        lastDensityRef.current = now;
        const nsQueue = agentsRef.current.filter(a =>
          (a.lane === 'north' || a.lane === 'south') && a.stopped
        ).length;
        const ewQueue = agentsRef.current.filter(a =>
          (a.lane === 'east' || a.lane === 'west') && a.stopped
        ).length;
        onDensityRef.current?.(cameraId, nsQueue, ewQueue);
      }

      drawRoad();
      drawSignals();
      agentsRef.current.forEach(drawAgent);
      agentsRef.current.forEach(drawYoloBox);

      ctx.fillStyle = 'rgba(255,255,255,0.025)';
      for (let i = 0; i < height; i += 3) ctx.fillRect(0, i, width, 1);

      const grad = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height) * 0.75);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, 'rgba(0,0,0,0.45)');
      ctx.fillStyle = grad; ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = 'rgba(10, 10, 15, 0.88)';
      ctx.fillRect(0, 0, width, 26);
      ctx.fillStyle = '#ef4444';
      ctx.beginPath(); ctx.arc(12, 13, 4, 0, Math.PI * 2); ctx.fill();
      ctx.font = 'bold 11px monospace';
      ctx.fillStyle = '#fff'; ctx.fillText(cameraId, 24, 17);
      ctx.fillStyle = '#94a3b8'; ctx.fillText(cameraName.toUpperCase(), 90, 17);

      const p = effectivePhaseRef.current;
      const phaseColor = p.includes('green') ? '#22c55e' : p.includes('yellow') ? '#f59e0b' : '#ef4444';
      ctx.fillStyle = phaseColor;
      ctx.font = 'bold 10px monospace';
      ctx.fillText(`🚦 ${SIGNAL.label(p)}`, width - 130, 17);

      ctx.fillStyle = 'rgba(10, 10, 15, 0.88)';
      ctx.fillRect(0, height - 24, width, 24);
      const vehicles = agentsRef.current.filter(a => a.type !== 'person').length;
      const people = agentsRef.current.filter(a => a.type === 'person').length;
      const hasAmb = agentsRef.current.some(a => a.type === 'ambulance');
      ctx.font = 'bold 10px monospace';
      ctx.fillStyle = '#22c55e'; ctx.fillText(`YOLOv8 · Veh:${vehicles}`, 10, height - 8);
      ctx.fillStyle = '#06b6d4'; ctx.fillText(`Ped:${people}`, 130, height - 8);
      ctx.fillStyle = hasAmb ? '#ef4444' : '#64748b';
      ctx.fillText(
        hasAmb ? '🚨 AMBULANCE PRIORITY'
          : `DENSITY:${vehicles > 14 ? 'HIGH' : vehicles > 7 ? 'MED' : 'LOW'}`,
        200, height - 8
      );
      ctx.fillStyle = '#64748b';
      ctx.fillText(new Date().toLocaleTimeString(), width - 80, height - 8);

      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, [cameraId, cameraName, spawnRate, ambulance]);

  return <canvas ref={canvasRef} className="w-full h-full" />;
};

export default CameraFeed;