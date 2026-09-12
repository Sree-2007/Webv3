import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { SignalState, SIGNAL } from '../types';

export const LOCATIONS = {
  'silk-board': { name: 'Silk Board Junction', lat: 12.9172, lng: 77.6229 },
  'btm': { name: 'BTM Layout', lat: 12.9063, lng: 77.5857 },
  'jayanagar': { name: 'Jayanagar', lat: 12.9250, lng: 77.5938 },
  'koramangala': { name: 'Koramangala', lat: 12.9352, lng: 77.6245 },
  'hsr': { name: 'HSR Layout', lat: 12.9121, lng: 77.6445 },
  'marathahalli': { name: 'Marathahalli', lat: 12.9569, lng: 77.7011 },
  'electronic-city': { name: 'Electronic City', lat: 12.8452, lng: 77.6602 },
  'indiranagar': { name: 'Indiranagar', lat: 12.9716, lng: 77.6412 },
} as const;

export type LocationKey = keyof typeof LOCATIONS;

const SIGNAL_POSITIONS: Record<string, { lat: number; lng: number; name: string }> = {
  j1: { lat: 12.9172, lng: 77.6229, name: 'Silk Board' },
  j2: { lat: 12.9121, lng: 77.6445, name: 'HSR' },
  j3: { lat: 12.9352, lng: 77.6245, name: 'Koramangala' },
  j4: { lat: 12.9063, lng: 77.5857, name: 'BTM' },
};

interface MapReport {
  id: string;
  type: string;
  lat: number;
  lng: number;
  status: string;
  description: string;
}

interface HazardInput {
  id: string;
  lat: number;
  lng: number;
}

interface Props {
  signals: Record<string, SignalState>;
  reports: MapReport[];
  userPos?: { lat: number; lng: number; label: string };
  destination?: LocationKey | null;
  showSignals?: boolean;
  rerouteActive?: boolean;
  hideRouteBadge?: boolean;
  onMapClick?: (lat: number, lng: number) => void;
  pickedPin?: { lat: number; lng: number } | null;
  focusLocation?: { lat: number; lng: number; label?: string } | null;
}

const PI = Math.PI;

const distMeters = (a: [number, number], b: [number, number]) => {
  const dLat = (b[0] - a[0]) * 111320;
  const dLng = (b[1] - a[1]) * 111320 * Math.cos((a[0] * PI) / 180);
  return Math.hypot(dLat, dLng);
};

const bearing = (a: [number, number], b: [number, number]) =>
  Math.atan2(b[1] - a[1], b[0] - a[0]);

const angleDiff = (a: number, b: number) => {
  let d = Math.abs(a - b) % (2 * PI);
  if (d > PI) d = 2 * PI - d;
  return d;
};

const removeLoops = (coords: [number, number][]): [number, number][] => {
  if (coords.length < 5) return coords;
  const out: [number, number][] = [];
  let i = 0;
  while (i < coords.length) {
    out.push(coords[i]);
    let jumped = false;
    const jMax = Math.min(i + 60, coords.length);
    for (let j = i + 5; j < jMax; j++) {
      if (distMeters(coords[i], coords[j]) < 40) {
        let loopLen = 0;
        for (let k = i; k < j; k++) loopLen += distMeters(coords[k], coords[k + 1]);
        if (loopLen > 80) { i = j; jumped = true; break; }
      }
    }
    if (!jumped) i++;
  }
  return out;
};

const trimEndpoints = (coords: [number, number][]): [number, number][] => {
  if (coords.length < 8) return coords;
  let start = 0;
  while (start < coords.length - 8) {
    if (distMeters(coords[0], coords[start]) > 200) break;
    const d1 = bearing(coords[start], coords[start + 1]);
    const d2 = bearing(coords[start + 5], coords[start + 6]);
    if (angleDiff(d1, d2) > PI * 0.5) start++; else break;
  }
  let end = coords.length - 1;
  while (end > start + 8) {
    if (distMeters(coords[end], coords[coords.length - 1]) > 200) break;
    const d1 = bearing(coords[end - 1], coords[end]);
    const d2 = bearing(coords[end - 6], coords[end - 5]);
    if (angleDiff(d1, d2) > PI * 0.5) end--; else break;
  }
  return coords.slice(start, end + 1);
};

const cleanRoute = (coords: [number, number][]) => trimEndpoints(removeLoops(coords));

const snapToRoad = async (lat: number, lng: number): Promise<{ lat: number; lng: number }> => {
  try {
    const res = await fetch(`https://router.project-osrm.org/nearest/v1/driving/${lng},${lat}?number=1`);
    const data = await res.json();
    if (data.waypoints?.[0]?.location) {
      const [snapLng, snapLat] = data.waypoints[0].location;
      return { lat: snapLat, lng: snapLng };
    }
  } catch {}
  return { lat, lng };
};

const fetchRoute = async (waypoints: { lat: number; lng: number }[]) => {
  const coords = waypoints.map(p => `${p.lng},${p.lat}`).join(';');
  const url =
    `https://router.project-osrm.org/route/v1/driving/${coords}` +
    `?overview=full&geometries=geojson&continue_straight=true&steps=false`;
  const r = await fetch(url);
  return r.json();
};

/**
 * Compute detours on both sides of the route. Returns the list of hazard IDs
 * that actually sit on the direct route (and therefore get avoided).
 */
const computeAvoidanceBoth = (
  route: [number, number][],
  hazards: HazardInput[],
  offsetM = 110,
): {
  left: { lat: number; lng: number }[];
  right: { lat: number; lng: number }[];
  avoidedIds: string[];
} => {
  const left: { lat: number; lng: number }[] = [];
  const right: { lat: number; lng: number }[] = [];
  const avoidedIds: string[] = [];
  if (route.length < 3) return { left, right, avoidedIds };

  for (const h of hazards) {
    let nearestIdx = -1, nd = Infinity;
    for (let i = 0; i < route.length; i++) {
      const d = distMeters([h.lat, h.lng], route[i]);
      if (d < nd) { nd = d; nearestIdx = i; }
    }
    if (nd > 60 || nearestIdx < 3 || nearestIdx > route.length - 4) continue;

    const before = route[Math.max(0, nearestIdx - 3)];
    const after = route[Math.min(route.length - 1, nearestIdx + 3)];
    const dirB = bearing(before, after);

    const perpL = dirB + PI / 2;
    const perpR = dirB - PI / 2;

    const dLatL = (offsetM * Math.sin(perpL)) / 111320;
    const dLngL = (offsetM * Math.cos(perpL)) / (111320 * Math.cos((h.lat * PI) / 180));
    const dLatR = (offsetM * Math.sin(perpR)) / 111320;
    const dLngR = (offsetM * Math.cos(perpR)) / (111320 * Math.cos((h.lat * PI) / 180));

    left.push({ lat: h.lat + dLatL, lng: h.lng + dLngL });
    right.push({ lat: h.lat + dLatR, lng: h.lng + dLngR });
    avoidedIds.push(h.id);
  }
  return { left, right, avoidedIds };
};

export const BengaluruMap: React.FC<Props> = ({
  signals, reports, userPos, destination, showSignals = false, rerouteActive = false,
  hideRouteBadge = false, onMapClick, pickedPin, focusLocation,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const signalsLayerRef = useRef<L.LayerGroup | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);
  const pickedLayerRef = useRef<L.LayerGroup | null>(null);
  const focusLayerRef = useRef<L.LayerGroup | null>(null);
  const highlightLayerRef = useRef<L.LayerGroup | null>(null);
  const onMapClickRef = useRef(onMapClick);
  onMapClickRef.current = onMapClick;

  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
  const [directRouteCoords, setDirectRouteCoords] = useState<[number, number][]>([]);
  const [routeInfo, setRouteInfo] = useState<{
    distance: number;
    duration: number;
    avoided: number;
    directDist: number;
    avoidedIds: string[];
  } | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [highlightedIds, setHighlightedIds] = useState<string[]>([]);

  // Init map with OpenStreetMap tiles
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: [12.9220, 77.6200],
      zoom: 13,
      zoomControl: true,
      attributionControl: false,
      closePopupOnClick: false,
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      subdomains: 'abc',
    }).addTo(map);
    L.control.attribution({ position: 'bottomright', prefix: false })
      .addAttribution('© OpenStreetMap contributors').addTo(map);

    markersLayerRef.current = L.layerGroup().addTo(map);
    signalsLayerRef.current = L.layerGroup().addTo(map);
    routeLayerRef.current = L.layerGroup().addTo(map);
    pickedLayerRef.current = L.layerGroup().addTo(map);
    focusLayerRef.current = L.layerGroup().addTo(map);
    highlightLayerRef.current = L.layerGroup().addTo(map);

    map.on('click', (e: L.LeafletMouseEvent) => {
      if (onMapClickRef.current) onMapClickRef.current(e.latlng.lat, e.latlng.lng);
    });

    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 250);

    const ro = new ResizeObserver(() => map.invalidateSize());
    if (containerRef.current) ro.observe(containerRef.current);

    return () => { ro.disconnect(); map.remove(); mapRef.current = null; };
  }, []);

  const hazardsKey = reports
    .filter(r => r.status === 'verified')
    .map(r => `${r.lat.toFixed(3)},${r.lng.toFixed(3)}`)
    .sort()
    .join('|');

  useEffect(() => {
    if (!destination || !rerouteActive || !userPos) {
      setRouteCoords([]);
      setDirectRouteCoords([]);
      setRouteInfo(null);
      return;
    }
    let cancelled = false;
    const dest = LOCATIONS[destination];
    setRouteLoading(true);

    (async () => {
      try {
        const [snapStart, snapEnd] = await Promise.all([
          snapToRoad(userPos.lat, userPos.lng),
          snapToRoad(dest.lat, dest.lng),
        ]);

        const direct = await fetchRoute([snapStart, snapEnd]);
        if (cancelled) return;
        if (!direct.routes?.[0]) return;

        const directCoordsRaw: [number, number][] = direct.routes[0].geometry.coordinates.map(
          (c: number[]) => [c[1], c[0]]
        );
        const directDist = direct.routes[0].distance / 1000;
        const directDur = direct.routes[0].duration / 60;

        const verifiedHazards: HazardInput[] = reports
          .filter(r => r.status === 'verified')
          .map(r => ({ id: r.id, lat: r.lat, lng: r.lng }));

        const { left, right, avoidedIds } = computeAvoidanceBoth(directCoordsRaw, verifiedHazards, 110);

        if (left.length === 0) {
          const cleaned = cleanRoute(directCoordsRaw);
          setRouteCoords(cleaned);
          setDirectRouteCoords([]);
          setRouteInfo({
            distance: directDist,
            duration: directDur,
            avoided: 0,
            directDist,
            avoidedIds: [],
          });
          return;
        }

        const [rLeft, rRight] = await Promise.all([
          fetchRoute([snapStart, ...left, snapEnd]),
          fetchRoute([snapStart, ...right, snapEnd]),
        ]);
        if (cancelled) return;

        const dLeft = rLeft.routes?.[0]?.distance ?? Infinity;
        const dRight = rRight.routes?.[0]?.distance ?? Infinity;

        const chosen = dLeft <= dRight ? rLeft : rRight;
        const chosenDist = Math.min(dLeft, dRight);
        const capFactor = 1.4;

        let finalCoords: [number, number][];
        let finalDist: number;
        let finalDur: number;

        if (chosen.routes?.[0] && chosenDist <= direct.routes[0].distance * capFactor) {
          finalCoords = chosen.routes[0].geometry.coordinates.map((c: number[]) => [c[1], c[0]]);
          finalDist = chosenDist / 1000;
          finalDur = chosen.routes[0].duration / 60;
        } else {
          finalCoords = directCoordsRaw;
          finalDist = directDist;
          finalDur = directDur;
        }

        const cleanedSafe = cleanRoute(finalCoords);
        const cleanedDirect = cleanRoute(directCoordsRaw);

        setRouteCoords(cleanedSafe);
        setDirectRouteCoords(finalCoords === directCoordsRaw ? [] : cleanedDirect);
        setRouteInfo({
          distance: finalDist,
          duration: finalDur,
          avoided: finalCoords === directCoordsRaw ? 0 : left.length,
          directDist,
          avoidedIds: finalCoords === directCoordsRaw ? [] : avoidedIds,
        });
      } catch {
        if (!cancelled && userPos) {
          setRouteCoords([[userPos.lat, userPos.lng], [dest.lat, dest.lng]]);
          setDirectRouteCoords([]);
        }
      } finally {
        if (!cancelled) setRouteLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [destination, rerouteActive, userPos?.lat, userPos?.lng, hazardsKey]);

  // Draw BOTH routes: red direct (unsafe) + blue safe reroute
  useEffect(() => {
    const layer = routeLayerRef.current;
    const map = mapRef.current;
    if (!layer || !map) return;
    layer.clearLayers();
    if (!rerouteActive || routeCoords.length < 2) return;

    if (directRouteCoords.length > 1) {
      L.polyline(directRouteCoords, {
        color: '#7f1d1d', weight: 9, opacity: 0.35, lineCap: 'round', lineJoin: 'round',
      }).addTo(layer);
      L.polyline(directRouteCoords, {
        color: '#ef4444', weight: 4, opacity: 0.85,
        dashArray: '10 8', lineCap: 'round', lineJoin: 'round',
      }).addTo(layer);
    }

    L.polyline(routeCoords, { color: '#0891b2', weight: 11, opacity: 0.25 }).addTo(layer);
    L.polyline(routeCoords, {
      color: '#06b6d4', weight: 5, opacity: 1, lineCap: 'round', lineJoin: 'round',
    }).addTo(layer);
    L.polyline(routeCoords, {
      color: '#ffffff', weight: 2, opacity: 0.5, dashArray: '8 12',
    }).addTo(layer);

    const allCoords = [...directRouteCoords, ...routeCoords];
    if (allCoords.length > 0) {
      map.fitBounds(L.latLngBounds(allCoords), { padding: [80, 80], maxZoom: 14 });
    }
  }, [routeCoords, directRouteCoords, rerouteActive]);

  // ───── Highlight avoided hazard zones ─────
  useEffect(() => {
    const layer = highlightLayerRef.current;
    const map = mapRef.current;
    if (!layer || !map) return;
    layer.clearLayers();
    if (highlightedIds.length === 0) return;

    highlightedIds.forEach(id => {
      const h = reports.find(r => r.id === id);
      if (!h) return;

      // Pulsing red zone
      L.circle([h.lat, h.lng], {
        radius: 120,
        color: '#ef4444',
        weight: 3,
        fillColor: '#ef4444',
        fillOpacity: 0.25,
        dashArray: '8 6',
      }).addTo(layer);

      // Animated pulse ring
      const pulseIcon = L.divIcon({
        className: 'hazard-pulse',
        html: `
          <div style="position:absolute;left:-40px;top:-40px;width:80px;height:80px;border-radius:50%;background:rgba(239,68,68,0.3);animation:hazard-ping 0.9s cubic-bezier(0,0,0.2,1) infinite;"></div>
          <div style="position:absolute;left:-30px;top:-30px;width:60px;height:60px;border-radius:50%;background:rgba(239,68,68,0.2);animation:hazard-ping 0.9s cubic-bezier(0,0,0.2,1) infinite;animation-delay:0.3s;"></div>
        `,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });
      L.marker([h.lat, h.lng], { icon: pulseIcon, interactive: false, zIndexOffset: 2400 }).addTo(layer);

      // "Avoided!" label above
      const labelIcon = L.divIcon({
        className: 'hazard-avoided-label',
        html: `
          <div style="transform: translate(-50%, -140%); white-space: nowrap;
            background: linear-gradient(135deg, #ef4444, #dc2626); color: white;
            padding: 4px 10px; border-radius: 8px; font-size: 10px; font-weight: 900;
            letter-spacing: 0.5px; text-transform: uppercase;
            box-shadow: 0 4px 14px rgba(239,68,68,0.6); border: 2px solid white;">
            ⚠ AVOIDED
          </div>`,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });
      L.marker([h.lat, h.lng], { icon: labelIcon, interactive: false, zIndexOffset: 2500 }).addTo(layer);
    });

    // Auto-clear after 1.5 seconds
    const t = setTimeout(() => setHighlightedIds([]), 1500);
    return () => clearTimeout(t);
  }, [highlightedIds, reports]);

  useEffect(() => {
    const layer = signalsLayerRef.current;
    if (!layer || !showSignals) return;
    layer.clearLayers();

    Object.entries(SIGNAL_POSITIONS).forEach(([id, pos]) => {
      const state = signals[id] || 'ns-green';
      const nsHex = SIGNAL.lightHex(SIGNAL.nsColor(state));
      const ewHex = SIGNAL.lightHex(SIGNAL.ewColor(state));

      const icon = L.divIcon({
        className: 'custom-signal',
        html: `
          <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -50%);">
            <div style="display: flex; gap: 3px; padding: 3px; background: #ffffff; border-radius: 10px;
                        box-shadow: 0 3px 10px rgba(0,0,0,0.25), 0 0 0 1.5px #e2e8f0;">
              <div style="width: 12px; height: 12px; border-radius: 50%; background: ${nsHex};
                          box-shadow: 0 0 8px ${nsHex};"></div>
              <div style="width: 12px; height: 12px; border-radius: 50%; background: ${ewHex};
                          box-shadow: 0 0 8px ${ewHex};"></div>
            </div>
            <div style="margin-top: 3px; background: #ffffff;
              border: 1.5px solid #e2e8f0; color: #0f172a;
              padding: 2px 7px; border-radius: 6px; font-size: 8.5px;
              font-weight: 800; letter-spacing: 0.4px; white-space: nowrap;
              text-transform: uppercase; box-shadow: 0 2px 6px rgba(0,0,0,0.12);">
              ${pos.name} · N/S | E/W
            </div>
          </div>`,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });
      L.marker([pos.lat, pos.lng], { icon, interactive: false }).addTo(layer);
    });
  }, [signals, showSignals]);

  useEffect(() => {
    const layer = markersLayerRef.current;
    if (!layer) return;
    layer.clearLayers();

    reports.forEach(r => {
      const color = r.status === 'verified' ? '#ef4444' : r.status === 'pending' ? '#f59e0b' : '#64748b';
      const icon = L.divIcon({
        className: 'custom-hazard',
        html: `
          <div style="position: relative; transform: translate(-50%, -100%);">
            <svg width="30" height="40" viewBox="0 0 24 30" style="filter: drop-shadow(0 3px 6px rgba(0,0,0,0.35));">
              <path d="M12 0 C 5.4 0 0 5.4 0 12 C 0 21 12 30 12 30 C 12 30 24 21 24 12 C 24 5.4 18.6 0 12 0 Z"
                fill="${color}" stroke="#ffffff" stroke-width="1.5"/>
              <circle cx="12" cy="12" r="4" fill="#ffffff"/>
            </svg>
            <div style="position: absolute; left: 50%; top: -4px; transform: translateX(-50%);
              background: #ffffff; border: 1.5px solid ${color}; color: #0f172a;
              padding: 1px 6px; border-radius: 5px; font-size: 9px; font-weight: 800;
              white-space: nowrap; text-transform: capitalize; box-shadow: 0 2px 6px rgba(0,0,0,0.15);">
              ${r.type}
            </div>
          </div>`,
        iconSize: [30, 40],
        iconAnchor: [15, 40],
      });

      L.marker([r.lat, r.lng], { icon })
        .bindPopup(
          `<div style="font-family: ui-sans-serif, system-ui; width: 220px;">
            <div style="display: flex; align-items: center; gap: 8px;
                        padding: 10px 12px 6px 12px;
                        border-bottom: 1px solid #f1f5f9;">
              <span style="display: inline-block; width: 8px; height: 8px;
                           border-radius: 50%; background: ${color};
                           box-shadow: 0 0 8px ${color}66;"></span>
              <span style="font-size: 12px; font-weight: 600;
                           text-transform: capitalize; color: #0f172a;">
                ${r.type}
              </span>
              <span style="margin-left: auto; font-size: 10px; font-weight: 600;
                           text-transform: uppercase; letter-spacing: 0.3px;
                           color: ${color};">${r.status}</span>
            </div>
            <div style="padding: 8px 12px 10px 12px;
                        font-size: 12px; line-height: 1.5; color: #475569;">
              ${r.description}
            </div>
          </div>`,
          { className: 'custom-popup', closeButton: true, maxWidth: 240 }
        )
        .addTo(layer);
    });

    if (userPos) {
      const userIcon = L.divIcon({
        className: 'custom-user',
        html: `
          <div style="position: relative; transform: translate(-50%, -50%);">
            <div style="position: absolute; width: 40px; height: 40px; left: -20px; top: -20px;
              background: rgba(6,182,212,0.3); border-radius: 50%; animation: ping 1.5s infinite;"></div>
            <div style="width: 16px; height: 16px; background: #06b6d4; border-radius: 50%;
              border: 3px solid #fff; box-shadow: 0 3px 10px rgba(0,0,0,0.3), 0 0 12px rgba(6,182,212,0.8); position: relative;"></div>
            <div style="position: absolute; top: 20px; left: 50%; transform: translateX(-50%);
              background: #ffffff; border: 1.5px solid #06b6d4; color: #0f172a;
              padding: 2px 8px; border-radius: 6px; font-size: 10px; font-weight: 800;
              white-space: nowrap; box-shadow: 0 2px 6px rgba(0,0,0,0.15);">${userPos.label}</div>
          </div>`,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });
      L.marker([userPos.lat, userPos.lng], { icon: userIcon, interactive: false, zIndexOffset: 1000 }).addTo(layer);
    }

    if (destination) {
      const dest = LOCATIONS[destination];
      const destIcon = L.divIcon({
        className: 'custom-dest',
        html: `
          <div style="position: relative; transform: translate(-50%, -100%);">
            <svg width="32" height="42" viewBox="0 0 24 30" style="filter: drop-shadow(0 3px 8px rgba(6,182,212,0.5));">
              <path d="M12 0 C 5.4 0 0 5.4 0 12 C 0 21 12 30 12 30 C 12 30 24 21 24 12 C 24 5.4 18.6 0 12 0 Z"
                fill="#06b6d4" stroke="#fff" stroke-width="1.5"/>
              <circle cx="12" cy="12" r="4" fill="#fff"/>
            </svg>
            <div style="position: absolute; left: 50%; top: -6px; transform: translateX(-50%);
              background: #ffffff; border: 1.5px solid #06b6d4; color: #0f172a;
              padding: 2px 8px; border-radius: 6px; font-size: 10px; font-weight: 800;
              white-space: nowrap; box-shadow: 0 2px 6px rgba(0,0,0,0.15);">${dest.name}</div>
          </div>`,
        iconSize: [32, 42],
        iconAnchor: [16, 42],
      });
      L.marker([dest.lat, dest.lng], { icon: destIcon }).addTo(layer);
    }
  }, [reports, userPos, destination]);

  useEffect(() => {
    const layer = pickedLayerRef.current;
    if (!layer) return;
    layer.clearLayers();
    if (!pickedPin) return;
    const icon = L.divIcon({
      className: 'custom-picked',
      html: `
        <div style="position: relative; transform: translate(-50%, -100%);">
          <div style="position: absolute; left: 50%; bottom: -8px; transform: translateX(-50%);
            width: 60px; height: 60px; background: rgba(220,38,38,0.25);
            border-radius: 50%; animation: ping 1.5s infinite;"></div>
          <svg width="44" height="58" viewBox="0 0 24 30" style="filter: drop-shadow(0 5px 12px rgba(220,38,38,0.6));">
            <path d="M12 0 C 5.4 0 0 5.4 0 12 C 0 21 12 30 12 30 C 12 30 24 21 24 12 C 24 5.4 18.6 0 12 0 Z"
              fill="#dc2626" stroke="#fff" stroke-width="2"/>
            <circle cx="12" cy="12" r="5" fill="#fff"/>
          </svg>
          <div style="position: absolute; left: 50%; top: -10px; transform: translateX(-50%);
            background: #dc2626; color: #fff; padding: 3px 10px; border-radius: 6px;
            font-size: 10px; font-weight: 800; white-space: nowrap;
            box-shadow: 0 3px 10px rgba(0,0,0,0.4); letter-spacing: 0.3px;">
            HAZARD PICKED
          </div>
        </div>`,
      iconSize: [44, 58],
      iconAnchor: [22, 58],
    });
    L.marker([pickedPin.lat, pickedPin.lng], { icon, zIndexOffset: 3000 }).addTo(layer);
  }, [pickedPin]);

  useEffect(() => {
    const layer = focusLayerRef.current;
    const map = mapRef.current;
    if (!layer || !map) return;
    layer.clearLayers();
    if (!focusLocation) return;

    map.flyTo([focusLocation.lat, focusLocation.lng], 16, { duration: 0.8 });

    const icon = L.divIcon({
      className: 'custom-focus',
      html: `
        <div style="position: relative; transform: translate(-50%, -50%);">
          <div style="position: absolute; width: 70px; height: 70px; left: -35px; top: -35px;
            background: rgba(239,68,68,0.25); border-radius: 50%; animation: ping 1.6s infinite;"></div>
          <div style="width: 22px; height: 22px; background: #ef4444; border-radius: 50%;
            border: 4px solid #fff; box-shadow: 0 0 20px rgba(239,68,68,0.9);"></div>
          ${focusLocation.label ? `
            <div style="position: absolute; top: 26px; left: 50%; transform: translateX(-50%);
              background: #ef4444; color: #fff; padding: 4px 10px; border-radius: 6px;
              font-size: 11px; font-weight: 800; white-space: nowrap;
              box-shadow: 0 3px 10px rgba(0,0,0,0.4);">${focusLocation.label}</div>
          ` : ''}
        </div>`,
      iconSize: [0, 0],
      iconAnchor: [0, 0],
    });
    L.marker([focusLocation.lat, focusLocation.lng], { icon, zIndexOffset: 4000 }).addTo(layer);
  }, [focusLocation]);

  /** Trigger the highlight — click on the "Avoided X hazards" button */
  const triggerHighlight = () => {
    if (!routeInfo || routeInfo.avoidedIds.length === 0) return;
    setHighlightedIds([]); // reset first so the effect re-runs even if same ids
    requestAnimationFrame(() => setHighlightedIds(routeInfo.avoidedIds));
  };

  return (
    <div className="relative w-full h-full rounded-3xl overflow-hidden border border-slate-200 shadow-2xl bg-white">
      <div ref={containerRef} className="absolute inset-0 z-0" />
      <style>{`
        .leaflet-container { background: #f8fafc; font-family: inherit; }
        .custom-popup .leaflet-popup-content-wrapper {
          background: #ffffff; color: #0f172a; border: 1px solid #e2e8f0;
          border-radius: 10px; padding: 0;
          box-shadow: 0 8px 24px -8px rgba(0,0,0,0.18), 0 2px 6px -2px rgba(0,0,0,0.08);
        }
        .custom-popup .leaflet-popup-tip {
          background: #ffffff; border: 1px solid #e2e8f0; box-shadow: none;
        }
        .custom-popup .leaflet-popup-content { margin: 0; }
        .custom-popup .leaflet-popup-close-button {
          width: 22px; height: 22px; padding: 0;
          color: #94a3b8; font-size: 14px; line-height: 22px;
          top: 6px; right: 6px;
        }
        .custom-popup .leaflet-popup-close-button:hover { color: #0f172a; }
        .leaflet-control-zoom a {
          background: #ffffff; color: #0f172a; border: 1px solid #e2e8f0;
          border-radius: 8px !important; margin-bottom: 3px;
          box-shadow: 0 2px 6px -2px rgba(0,0,0,0.1);
        }
        .leaflet-control-zoom a:hover { background: #f1f5f9; }
        .leaflet-control-attribution {
          background: rgba(255,255,255,0.9) !important;
          color: #64748b !important; font-size: 10px !important;
          padding: 2px 6px !important; border-radius: 6px;
          border: 1px solid #e2e8f0;
        }
        @keyframes ping { 75%, 100% { transform: scale(2); opacity: 0; } }
        @keyframes hazard-ping {
          0% { transform: scale(0.5); opacity: 0.9; }
          100% { transform: scale(2.2); opacity: 0; }
        }
      `}</style>

      {/* Route badge with clickable "Avoided X hazards" */}
      {routeInfo && rerouteActive && !hideRouteBadge && (
        <div className="absolute top-4 left-4 z-40 bg-white/95 backdrop-blur border-2 border-cyan-500/40 rounded-2xl px-5 py-4 shadow-xl min-w-[240px]">
          <div className="flex items-center gap-4">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Safe Route</div>
              <div className="text-lg font-bold text-cyan-600">{routeInfo.distance.toFixed(1)} km</div>
            </div>
            <div className="w-px h-8 bg-slate-300" />
            <div>
              <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">ETA</div>
              <div className="text-lg font-bold text-cyan-600">{Math.round(routeInfo.duration)} min</div>
            </div>
          </div>

          {routeInfo.avoided > 0 && (
            <>
              {/* Clickable highlight trigger */}
              <button
                type="button"
                onClick={triggerHighlight}
                className={`mt-3 pt-3 border-t border-slate-200 w-full flex items-center gap-2 text-left transition-all rounded-lg -mx-1 px-1 py-1 hover:bg-emerald-500/10 active:scale-[0.98] ${
                  highlightedIds.length > 0 ? 'bg-emerald-500/10' : ''
                }`}
                title="Click to highlight avoided hazard zones on the map"
              >
                <div className={`w-6 h-6 rounded-full bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center shrink-0 ${
                  highlightedIds.length > 0 ? 'animate-pulse bg-emerald-500/30' : ''
                }`}>
                  <span className="text-emerald-600 text-xs font-bold">✓</span>
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 flex-1">
                  Avoided {routeInfo.avoided} hazard{routeInfo.avoided !== 1 ? 's' : ''} on this route
                </span>
                <span className="text-[9px] font-bold text-emerald-500/70 uppercase tracking-wider shrink-0">
                  {highlightedIds.length > 0 ? '◉ Shown' : 'Tap ▸'}
                </span>
              </button>

              <div className="mt-3 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-1 rounded-full" style={{ background: '#ef4444', boxShadow: '0 0 8px #ef444466' }} />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-red-500">
                    Direct route — {routeInfo.directDist.toFixed(1)} km (unsafe)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-1 rounded-full" style={{ background: '#06b6d4', boxShadow: '0 0 8px #06b6d466' }} />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-600">
                    Safe reroute — {routeInfo.distance.toFixed(1)} km
                  </span>
                </div>
              </div>

              {routeInfo.distance > routeInfo.directDist && (
                <div className="mt-3 pt-2 border-t border-slate-200">
                  <span className="text-[10px] text-slate-500 font-medium">
                    +{(routeInfo.distance - routeInfo.directDist).toFixed(1)} km detour for safer journey
                  </span>
                </div>
              )}
            </>
          )}

          {routeInfo.avoided === 0 && (
            <div className="mt-3 pt-3 border-t border-slate-200 flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-slate-500/15 border border-slate-500/40 flex items-center justify-center shrink-0">
                <span className="text-slate-600 text-xs font-bold">✓</span>
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                No hazards on direct route
              </span>
            </div>
          )}
        </div>
      )}

      {routeLoading && !hideRouteBadge && (
        <div className="absolute top-4 left-4 z-40 bg-white/95 backdrop-blur border border-cyan-500/40 rounded-2xl px-4 py-2">
          <span className="text-xs text-cyan-600 font-bold">Calculating safe route…</span>
        </div>
      )}

      {onMapClick && (
        <div className="absolute bottom-4 left-4 z-40 bg-white/95 backdrop-blur border border-slate-200 rounded-xl px-3 py-2">
          <span className="text-[11px] text-slate-600 font-semibold">💡 Click anywhere to set hazard location</span>
        </div>
      )}
    </div>
  );
};

export default BengaluruMap;