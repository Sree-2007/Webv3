import React, { useState, createContext, useContext, useEffect, useRef } from 'react';
import { LandingPage } from './pages/LandingPage';
import { AuthPage } from './pages/AuthPage';
import { CitizenDashboard } from './pages/CitizenDashboard';
import { ControlPanel } from './pages/ControlPanel';
import { User, Report, SignalState, ReportStatus, SOSAlert } from './types';
import { DEMO_USERS } from './demoUsers';

type View = 'landing' | 'citizenAuth' | 'controlAuth';

const K_USERS = 'drishti_users_v6';
const K_REPORTS = 'drishti_reports_v6';
const K_SIGNALS = 'drishti_signals_v6';
const K_SOS = 'drishti_sos_v6';
const K_SOS_HISTORY = 'drishti_sos_history_v6';

const SEED_REPORTS: Report[] = [
  // ── Own reports by demo citizen ────────────────────────────
  { id: '2', type: 'waterlogging', lat: 12.9085, lng: 77.5890, status: 'pending',
    description: 'Water pooling after last night rain on BTM 16th Main.',
    reportedBy: 'citizen', aiTrust: 82 },

  // ── Other citizens ─────────────────────────────────────────
  { id: '3', type: 'accident', lat: 12.9172, lng: 77.6229, status: 'verified',
    description: 'Minor collision blocking left lane near Silk Board flyover.',
    reportedBy: 'priya.sharma', aiTrust: 91 },
  { id: '4', type: 'waterlogging', lat: 12.9121, lng: 77.6445, status: 'verified',
    description: 'Heavy water logging at HSR 27th Main, autos stuck.',
    reportedBy: 'arjun.reddy', aiTrust: 88 },
  { id: '5', type: 'rally', lat: 12.9352, lng: 77.6245, status: 'verified',
    description: 'Political rally passing through Koramangala 80ft Road.',
    reportedBy: 'kavya.iyer', aiTrust: 76 },
  { id: '6', type: 'construction', lat: 12.9278, lng: 77.5980, status: 'verified',
    description: 'BBMP road repair work — single lane diversion near Jayanagar 4th Block.',
    reportedBy: 'rohan.gupta', aiTrust: 93 },
  { id: '7', type: 'pothole', lat: 12.9240, lng: 77.5910, status: 'pending',
    description: 'Pothole cluster on Jayanagar 9th Block main road.',
    reportedBy: 'meera.nair', aiTrust: 71 },
  { id: '8', type: 'rally', lat: 12.8995, lng: 77.5800, status: 'pending',
    description: 'Local political rally near BTM 2nd Stage — expect delays.',
    reportedBy: 'kavya.iyer', aiTrust: 68 },

  // ═══════════════════════════════════════════════════════════
  //  ROUTE: BTM → Electronic City  (Hosur Road)  ·  4 hazards
  // ═══════════════════════════════════════════════════════════
  { id: 'h1', type: 'construction', lat: 12.9080, lng: 77.5910, status: 'verified',
    description: 'Metro pillar work on BTM 16th Main — road narrowed to single lane.',
    reportedBy: 'suresh.kumar', aiTrust: 92 },
  { id: 'h2', type: 'accident', lat: 12.8990, lng: 77.6195, status: 'verified',
    description: 'Two-vehicle collision under Bommanahalli flyover — right lane blocked.',
    reportedBy: 'priya.sharma', aiTrust: 95 },
  { id: 'h3', type: 'waterlogging', lat: 12.8780, lng: 77.6380, status: 'verified',
    description: 'Standing water on Hosur Road near Singasandra flyover — cars stalling.',
    reportedBy: 'meera.nair', aiTrust: 90 },
  { id: 'h4', type: 'accident', lat: 12.8600, lng: 77.6520, status: 'verified',
    description: 'Bike skid at Electronic City elevated expressway entrance.',
    reportedBy: 'kavya.iyer', aiTrust: 86 },

  // ═══════════════════════════════════════════════════════════
  //  ROUTE: BTM → Koramangala / HSR  (Sarjapur Road)  ·  2 hazards
  // ═══════════════════════════════════════════════════════════
  { id: 'h5', type: 'pothole', lat: 12.9175, lng: 77.6100, status: 'verified',
    description: 'Pothole on Sarjapur Road near Koramangala–Silk Board junction.',
    reportedBy: 'rohan.gupta', aiTrust: 82 },
  { id: 'h6', type: 'waterlogging', lat: 12.9150, lng: 77.6320, status: 'verified',
    description: 'Knee-deep water on Sarjapur Road before HSR 27th Main after overnight rain.',
    reportedBy: 'arjun.reddy', aiTrust: 88 },

  // ═══════════════════════════════════════════════════════════
  //  ROUTE: BTM → Marathahalli  (Outer Ring Road)  ·  2 hazards
  // ═══════════════════════════════════════════════════════════
  { id: 'h7', type: 'construction', lat: 12.9260, lng: 77.6710, status: 'verified',
    description: 'Road repair on Outer Ring Road near Bellandur — one lane closed.',
    reportedBy: 'suresh.kumar', aiTrust: 85 },
  { id: 'h8', type: 'accident', lat: 12.9450, lng: 77.6900, status: 'verified',
    description: 'Multi-vehicle pileup near Marathahalli bridge — heavy congestion.',
    reportedBy: 'priya.sharma', aiTrust: 93 },

  // ── POLICE reports ─────────────────────────────────────────
  { id: '13', type: 'construction', lat: 12.9190, lng: 77.6300, status: 'verified',
    description: 'Metro pillar work near Silk Board junction — service road closed.',
    reportedBy: 'police:officer-blr' },
  { id: '14', type: 'waterlogging', lat: 12.9015, lng: 77.6050, status: 'verified',
    description: 'Underpass flooding near Madiwala market, avoid the dip.',
    reportedBy: 'police:officer-blr' },
  { id: '15', type: 'accident', lat: 12.9569, lng: 77.7011, status: 'verified',
    description: 'Truck breakdown on Marathahalli bridge — heavy congestion.',
    reportedBy: 'police:officer-blr' },
  { id: '16', type: 'construction', lat: 12.9716, lng: 77.6412, status: 'verified',
    description: 'Indiranagar 100ft Road metro work — one-way diversion.',
    reportedBy: 'police:officer-blr' },
];

const SEED_SIGNALS: Record<string, SignalState> = {
  j1: 'ns-green', j2: 'ew-green', j3: 'ns-yellow', j4: 'ew-yellow',
};

const load = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

interface AppState {
  currentUser: User | null;
  setCurrentUser: (u: User | null) => void;
  users: User[];
  addUser: (u: User) => void;
  reports: Report[];
  addReport: (r: Report) => void;
  updateReportStatus: (id: string, s: ReportStatus) => void;
  deleteReport: (id: string) => void;
  signals: Record<string, SignalState>;
  updateSignal: (id: string, s: SignalState) => void;
  sosActive: boolean;
  sosAlert: SOSAlert | null;
  sosHistory: SOSAlert[];
  triggerSOS: (ambulanceUser: string, vehicleNo: string, lat: number, lng: number) => void;
  cancelSOS: (ambulanceUser: string) => void;
  dismissSOS: () => void;
  resolveSOS: () => void;
  deleteSOSHistory: (id: string) => void;
  logout: () => void;
}

const AppContext = createContext<AppState | undefined>(undefined);

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [view, setView] = useState<View>('landing');

  const [users, setUsers] = useState<User[]>(() => load(K_USERS, DEMO_USERS));
  const [reports, setReports] = useState<Report[]>(() => load(K_REPORTS, SEED_REPORTS));
  const [signals, setSignals] = useState<Record<string, SignalState>>(() =>
    load(K_SIGNALS, SEED_SIGNALS)
  );
  const [sosHistory, setSosHistory] = useState<SOSAlert[]>(() => load(K_SOS_HISTORY, []));

  const [sosAlert, setSosAlert] = useState<SOSAlert | null>(() => {
    const stored = load<SOSAlert | null>(K_SOS, null);
    if (stored && Date.now() < stored.expiresAt) return stored;
    return null;
  });

  const prevRef = useRef<{ users: string; reports: string; signals: string; sos: string; sosHist: string }>({
    users: '', reports: '', signals: '', sos: '', sosHist: '',
  });

  useEffect(() => {
    const j = JSON.stringify(users);
    if (j !== prevRef.current.users) { prevRef.current.users = j; localStorage.setItem(K_USERS, j); }
  }, [users]);
  useEffect(() => {
    const j = JSON.stringify(reports);
    if (j !== prevRef.current.reports) { prevRef.current.reports = j; localStorage.setItem(K_REPORTS, j); }
  }, [reports]);
  useEffect(() => {
    const j = JSON.stringify(signals);
    if (j !== prevRef.current.signals) { prevRef.current.signals = j; localStorage.setItem(K_SIGNALS, j); }
  }, [signals]);
  useEffect(() => {
    const j = sosAlert ? JSON.stringify(sosAlert) : '';
    if (j !== prevRef.current.sos) {
      prevRef.current.sos = j;
      if (j) localStorage.setItem(K_SOS, j);
      else localStorage.removeItem(K_SOS);
    }
  }, [sosAlert]);
  useEffect(() => {
    const j = JSON.stringify(sosHistory);
    if (j !== prevRef.current.sosHist) {
      prevRef.current.sosHist = j;
      localStorage.setItem(K_SOS_HISTORY, j);
    }
  }, [sosHistory]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === K_USERS && e.newValue) {
        try { setUsers(JSON.parse(e.newValue)); } catch {}
      } else if (e.key === K_REPORTS && e.newValue) {
        try { setReports(JSON.parse(e.newValue)); } catch {}
      } else if (e.key === K_SIGNALS && e.newValue) {
        try { setSignals(JSON.parse(e.newValue)); } catch {}
      } else if (e.key === K_SOS_HISTORY && e.newValue) {
        try { setSosHistory(JSON.parse(e.newValue)); } catch {}
      } else if (e.key === K_SOS) {
        if (e.newValue) {
          try {
            const alert: SOSAlert = JSON.parse(e.newValue);
            if (Date.now() < alert.expiresAt) setSosAlert(alert);
          } catch {}
        } else {
          setSosAlert(null);
        }
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    if (!sosAlert) return;
    const remaining = sosAlert.expiresAt - Date.now();
    if (remaining <= 0) { setSosAlert(null); return; }
    const t = setTimeout(() => setSosAlert(null), remaining);
    return () => clearTimeout(t);
  }, [sosAlert]);

  const addUser = (u: User) => setUsers(prev => [...prev, u]);
  const addReport = (r: Report) => setReports(prev => [...prev, r]);
  const updateReportStatus = (id: string, s: ReportStatus) =>
    setReports(prev => prev.map(r => (r.id === id ? { ...r, status: s } : r)));
  const deleteReport = (id: string) => setReports(prev => prev.filter(r => r.id !== id));
  const updateSignal = (id: string, s: SignalState) =>
    setSignals(prev => (prev[id] === s ? prev : { ...prev, [id]: s }));

  const triggerSOS = (ambulanceUser: string, vehicleNo: string, lat: number, lng: number) => {
    const alert: SOSAlert = {
      id: Date.now().toString(),
      ambulanceUser,
      ambulanceNo: vehicleNo,
      lat, lng,
      triggeredAt: Date.now(),
      expiresAt: Date.now() + 22000,
    };
    setSosAlert(alert);
    setSosHistory(prev => [...prev, alert]);
  };

  /** Only the ambulance that raised the SOS can cancel it */
  const cancelSOS = (ambulanceUser: string) => {
    setSosAlert(prev => (prev && prev.ambulanceUser === ambulanceUser ? null : prev));
  };

  const dismissSOS = () => setSosAlert(null);
  const resolveSOS = () => setSosAlert(null);
  const deleteSOSHistory = (id: string) => setSosHistory(prev => prev.filter(a => a.id !== id));
  const logout = () => { setCurrentUser(null); setView('landing'); };

  return (
    <AppContext.Provider
      value={{
        currentUser, setCurrentUser, users, addUser,
        reports, addReport, updateReportStatus, deleteReport,
        signals, updateSignal,
        sosActive: !!sosAlert, sosAlert, sosHistory,
        triggerSOS, cancelSOS, dismissSOS, resolveSOS, deleteSOSHistory,
        logout,
      }}
    >
      <div className="min-h-screen bg-[#0a0a0f] text-slate-50 font-sans selection:bg-cyan-500/30">
        {!currentUser ? (
          view === 'landing' ? (
            <LandingPage onCitizen={() => setView('citizenAuth')} onControl={() => setView('controlAuth')} />
          ) : (
            <AuthPage mode={view === 'citizenAuth' ? 'citizen' : 'control'} onBack={() => setView('landing')} />
          )
        ) : currentUser.role === 'citizen' ? (
          <CitizenDashboard />
        ) : (
          <ControlPanel />
        )}
      </div>
    </AppContext.Provider>
  );
}