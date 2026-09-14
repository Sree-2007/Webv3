export type UserRole = 'citizen' | 'control';

export interface User {
  username: string;
  password?: string;
  name?: string;
  role: UserRole;
  vehicleType: string;
  vehicleNo: string;
  customVehicleType?: string;
  policeId?: string;
  area?: string;
  /** Demo gamification — credits for accurate / fast reporting */
  creditPoints?: number;
}

export type HazardType = 'accident' | 'waterlogging' | 'rally' | 'construction' | 'pothole' | 'other';
export type ReportStatus = 'pending' | 'verified' | 'rejected';

export type SignalState = 'ns-green' | 'ns-yellow' | 'ew-green' | 'ew-yellow';

export interface Report {
  id: string;
  type: HazardType;
  customType?: string;
  lat: number;
  lng: number;
  status: ReportStatus;
  description: string;
  reportedBy?: string;
  image?: string;
  aiTrust?: number;
  /** Timestamp of submission — used to compute response-speed bonus */
  reportedAt?: number;
}

export interface SOSAlert {
  id: string;
  ambulanceNo: string;
  ambulanceUser: string;
  lat: number;
  lng: number;
  triggeredAt: number;
  expiresAt: number;
}

export type LightColor = 'red' | 'yellow' | 'green';

export const SIGNAL = {
  nsColor: (s: SignalState): LightColor => {
    if (s === 'ns-green') return 'green';
    if (s === 'ns-yellow') return 'yellow';
    return 'red';
  },
  ewColor: (s: SignalState): LightColor => {
    if (s === 'ew-green') return 'green';
    if (s === 'ew-yellow') return 'yellow';
    return 'red';
  },
  isNSMoving: (s: SignalState) => s === 'ns-green' || s === 'ns-yellow',
  isEWMoving: (s: SignalState) => s === 'ew-green' || s === 'ew-yellow',
  label: (s: SignalState): string => {
    switch (s) {
      case 'ns-green': return 'N/S · GREEN';
      case 'ns-yellow': return 'N/S · YELLOW';
      case 'ew-green': return 'E/W · GREEN';
      case 'ew-yellow': return 'E/W · YELLOW';
    }
  },
  next: (s: SignalState): SignalState => {
    switch (s) {
      case 'ns-green': return 'ns-yellow';
      case 'ns-yellow': return 'ew-green';
      case 'ew-green': return 'ew-yellow';
      case 'ew-yellow': return 'ns-green';
    }
  },
  lightHex: (c: LightColor): string => {
    if (c === 'red') return '#ef4444';
    if (c === 'yellow') return '#f59e0b';
    return '#22c55e';
  },
} as const;

export const computeAiTrust = (
  type: HazardType,
  desc: string,
  hasPhoto: boolean,
): number => {
  if (!hasPhoto) return 0;
  let score = 68 + Math.random() * 20;
  const keywords: Record<HazardType, string[]> = {
    accident: ['collision', 'crash', 'hit', 'damage', 'vehicle', 'bike', 'car', 'injured', 'skid'],
    waterlogging: ['water', 'flood', 'pool', 'rain', 'logging', 'submerged', 'stagnant'],
    rally: ['rally', 'protest', 'crowd', 'march', 'procession', 'gathering'],
    construction: ['construction', 'work', 'barrier', 'diversion', 'repair', 'boring', 'digging'],
    pothole: ['pothole', 'hole', 'road damage', 'pit', 'crack', 'bump'],
    other: [],
  };
  const lc = desc.toLowerCase();
  const hits = keywords[type].filter(k => lc.includes(k)).length;
  score += hits * 4;
  return Math.min(99, Math.round(score));
};

/** Credit adjustment rules for reports */
export const CREDIT_RULES = {
  verified: 15,    // reward accurate reports
  rejected: -10,   // penalize misleading reports
  minPoints: 0,    // never let credits fall below this
} as const;

/* ─────────────────────────────────────────────────────────────
   Haversine distance in km between two lat/lng points.
   Used by the Citizen Dashboard for:
     - "X km away" labels on each parking zone
     - "Ambulance is X km away" toast during SOS
   ───────────────────────────────────────────────────────────── */
export const haversineKm = (
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number => {
  const R = 6371; // Earth's mean radius in km
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};
