import React, { useState, createContext, useContext, useEffect, useRef } from 'react';
import { LandingPage } from './pages/LandingPage';
import { AuthPage } from './pages/AuthPage';
import { CitizenDashboard } from './pages/CitizenDashboard';
import { ControlPanel } from './pages/ControlPanel';
import { User, Report, SignalState, ReportStatus, SOSAlert, CREDIT_RULES } from './types';
import { DEMO_USERS } from './demoUsers';

type View = 'landing' | 'citizenAuth' | 'controlAuth';

const K_USERS = 'drishti_users_v9';
const K_REPORTS = 'drishti_reports_v9';
const K_SIGNALS = 'drishti_signals_v9';
const K_SOS = 'drishti_sos_v9';
const K_SOS_HISTORY = 'drishti_sos_history_v9';

const SEED_REPORTS: Report[] = [
  { id: '2', type: 'waterlogging', lat: 12.9085, lng: 77.5890, status: 'pending',
    description: 'Water pooling after last night rain on BTM 16th Main.',
    reportedBy: 'citizen', aiTrust: 82, reportedAt: Date.now() - 1000 * 60 * 8 },
  { id: '3', type: 'accident', lat: 12.9172, lng: 77.6229, status: 'verified',
    description: 'Minor collision blocking left lane near Silk Board flyover.',
    reportedBy: 'priya.sharma', aiTrust: 91, reportedAt: Date.now() - 1000 * 60 * 30 },
  { id: '4', type: 'waterlogging', lat: 12.9121, lng: 77.6445, status: 'verified',
    description: 'Heavy water logging at HSR 27th Main, autos stuck.',
    reportedBy: 'arjun.reddy', aiTrust: 88, reportedAt: Date.now() - 1000 * 60 * 45 },
  { id: '5', type: 'rally', lat: 12.9352, lng: 77.6245, status: 'verified',
    description: 'Political rally passing through Koramangala 80ft Road.',
    reportedBy: 'kavya.iyer', aiTrust: 76, reportedAt: Date.now() - 1000 * 60 * 60 },
  { id: '6', type: 'construction', lat: 12.9278, lng: 77.5980, status: 'verified',
    description: 'BBMP road repair work — single lane diversion near Jayanagar 4th Block.',
    reportedBy: 'rohan.gupta', aiTrust: 93, reportedAt: Date.now() - 1000 * 60 * 90 },
  { id: '7', type: 'pothole', lat: 12.9240, lng: 77.5910, status: 'pending',
    description: 'Pothole cluster on Jayanagar 9th Block main road.',
    reportedBy: 'meera.nair', aiTrust: 71, reportedAt: Date.now() - 1000 * 60 * 20 },
  { id: '8', type: 'rally', lat: 12.8995, lng: 77.5800, status: 'pending',
    description: 'Local political rally near BTM 2nd Stage — expect delays.',
    reportedBy: 'kavya.iyer', aiTrust: 68, reportedAt: Date.now() - 1000 * 60 * 12 },
  { id: '9', type: 'accident', lat: 12.8847, lng: 77.6143, status: 'verified',
    description: 'Two-vehicle collision near Bommanahalli on Hosur Road — right lane blocked.',
    reportedBy: 'priya.sharma', aiTrust: 95, reportedAt: Date.now() - 1000 * 60 * 120 },
  { id: '10', type: 'waterlogging', lat: 12.8680, lng: 77.6370, status: 'verified',
    description: 'Severe waterlogging near Singasandra on Hosur Road.',
    reportedBy: 'arjun.reddy', aiTrust: 90, reportedAt: Date.now() - 1000 * 60 * 150 },
  { id: '13', type: 'construction', lat: 12.9190, lng: 77.6300, status: 'verified',
    description: 'Metro pillar work near Silk Board junction — service road closed.',
    reportedBy: 'police:officer-blr', reportedAt: Date.now() - 1000 * 60 * 200 },
  { id: '14', type: 'waterlogging', lat: 12.9015, lng: 77.6050, status: 'verified',
    description: 'Underpass flooding near Madiwala market, avoid the dip.',
    reportedBy: 'police:officer-blr', reportedAt: Date.now() - 1000 * 60 * 240 },
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

/** Report contribution to credits — pending contributes 0. */
const creditForStatus = (status: ReportStatus): number => {
  if (status === 'verified') return CREDIT_RULES.verified;
  if (status === 'rejected') return CREDIT_RULES.rejected;
  return 0;
};

interface AppState {
  currentUser: User | null;
  setCurrentUser: (u: User | null) => void;
  users: User[];
  addUser: (u: User) => void;
  adjustCredits: (username: string, delta: number) => void;
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

  /**
   * SOS is now sticky — it stays active until the ambulance manually cancels it.
   * On reload, we restore whatever SOS was last saved.
   */
  const [sosAlert, setSosAlert] = useState<SOSAlert | null>(() => {
    return load<SOSAlert | null>(K_SOS, null);
  });

  const reportsRef = useRef(reports);
  reportsRef.current = reports;
  const usersRef = useRef(users);
  usersRef.current = users;

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
          try { setSosAlert(JSON.parse(e.newValue)); } catch {}
        } else {
          setSosAlert(null);
        }
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const addUser = (u: User) => setUsers(prev => [...prev, u]);

  const adjustCredits = (username: string, delta: number) => {
    if (!username || delta === 0) return;
    setUsers(prev => prev.map(u =>
      u.username === username
        ? { ...u, creditPoints: Math.max(CREDIT_RULES.minPoints, (u.creditPoints ?? 0) + delta) }
        : u
    ));
  };

  const addReport = (r: Report) => setReports(prev => [...prev, r]);

  const updateReportStatus = (id: string, newStatus: ReportStatus) => {
    const report = reportsRef.current.find(r => r.id === id);
    if (!report) return;
    if (report.status === newStatus) return;

    if (
      report.reportedBy &&
      !report.reportedBy.startsWith('police:') &&
      usersRef.current.some(u => u.username === report.reportedBy)
    ) {
      const oldContribution = creditForStatus(report.status);
      const newContribution = creditForStatus(newStatus);
      const delta = newContribution - oldContribution;
      if (delta !== 0) adjustCredits(report.reportedBy, delta);
    }

    setReports(prev => prev.map(r => (r.id === id ? { ...r, status: newStatus } : r)));
  };

  const deleteReport = (id: string) => setReports(prev => prev.filter(r => r.id !== id));
  const updateSignal = (id: string, s: SignalState) =>
    setSignals(prev => (prev[id] === s ? prev : { ...prev, [id]: s }));

  /**
   * Trigger a new SOS. The alert stays active until cancelled by the ambulance.
   * `expiresAt` is set to a very far-future value so nothing auto-clears it.
   */
  const triggerSOS = (ambulanceUser: string, vehicleNo: string, lat: number, lng: number) => {
    const alert: SOSAlert = {
      id: Date.now().toString(),
      ambulanceUser,
      ambulanceNo: vehicleNo,
      lat, lng,
      triggeredAt: Date.now(),
      // No auto-expire. This value is high enough to be effectively permanent.
      expiresAt: 9999999999999,
    };
    setSosAlert(alert);
    setSosHistory(prev => [...prev, alert]);
  };

  /** Only the ambulance that raised the SOS can cancel it. */
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
        currentUser, setCurrentUser, users, addUser, adjustCredits,
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