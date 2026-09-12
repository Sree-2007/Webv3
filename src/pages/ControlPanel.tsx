import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../App';
import { GlassButton } from '@/components/ui/glass-button';
import {
  Camera, Activity, Shield, AlertTriangle, CheckCircle, XCircle, Ambulance,
  Zap, LayoutGrid, Monitor, LogOut, Trash2, Bell, ArrowUp, ArrowDown, ArrowLeft, ArrowRight,
  Plus, X, MapPin, History, MousePointerClick, Crosshair, Sparkles, Image as ImageIcon,
} from 'lucide-react';
import { SignalState, SIGNAL, LightColor, HazardType, Report, ReportStatus } from '../types';
import { BengaluruMap } from '@/components/BengaluruMap';
import { CameraFeed } from '@/components/CameraFeed';

type CameraId = 'CAM-01' | 'CAM-02' | 'CAM-03' | 'CAM-04';
type Layout = 'single' | 'grid';
type ReportTab = ReportStatus;

interface Junction {
  id: string;
  code: CameraId;
  name: string;
  spawnRate: number;
  ambulance: boolean;
}

const JUNCTIONS: Junction[] = [
  { id: 'j1', code: 'CAM-01', name: 'Silk Board', spawnRate: 3.5, ambulance: true },
  { id: 'j2', code: 'CAM-02', name: 'HSR Layout', spawnRate: 3.0, ambulance: false },
  { id: 'j3', code: 'CAM-03', name: 'Koramangala', spawnRate: 2.5, ambulance: false },
  { id: 'j4', code: 'CAM-04', name: 'BTM Layout', spawnRate: 3.0, ambulance: true },
];

const TrafficLightColumn: React.FC<{ color: LightColor; label: string }> = ({ color, label }) => {
  const lightStyle = (c: LightColor) => {
    const active = color === c;
    const hex = SIGNAL.lightHex(c);
    return {
      width: 26, height: 26, borderRadius: '50%',
      background: active ? hex : '#1e293b',
      boxShadow: active ? `0 0 16px ${hex}, 0 0 8px ${hex}` : 'inset 0 1px 3px rgba(0,0,0,0.5)',
      border: active ? `2px solid ${hex}` : '2px solid #0f172a',
      transition: 'all 0.25s',
    } as React.CSSProperties;
  };
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="bg-slate-900 p-2.5 rounded-full border border-slate-800 flex flex-col gap-2">
        <div style={lightStyle('red')} />
        <div style={lightStyle('yellow')} />
        <div style={lightStyle('green')} />
      </div>
      <span className="text-[10px] font-bold text-slate-400 tracking-widest">{label}</span>
    </div>
  );
};

export const ControlPanel: React.FC = () => {
  const {
    signals, updateSignal, reports, addReport, updateReportStatus, deleteReport,
    currentUser, logout, sosAlert, dismissSOS, sosHistory, deleteSOSHistory,
  } = useApp();
  const [activeTab, setActiveTab] = useState<'cameras' | 'map' | 'signals' | 'reports'>('cameras');
  const [autoMode, setAutoMode] = useState(true);
  const [layout, setLayout] = useState<Layout>('grid');
  const [activeCamera, setActiveCamera] = useState<CameraId>('CAM-01');
  const [corridorActive, setCorridorActive] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [newReportAlert, setNewReportAlert] = useState<string | null>(null);
  const reportsCountRef = useRef(reports.length);

  const [showSOSHistory, setShowSOSHistory] = useState(false);
  const [focusLocation, setFocusLocation] = useState<{ lat: number; lng: number; label?: string } | null>(null);
  const [viewImageModal, setViewImageModal] = useState<string | null>(null);
  const [showSOSModal, setShowSOSModal] = useState(false);
  const [reportTab, setReportTab] = useState<ReportTab>('pending');

  // Police Add Report
  const [showAddReport, setShowAddReport] = useState(false);
  const [policeReportType, setPoliceReportType] = useState<HazardType>('accident');
  const [policeCustomType, setPoliceCustomType] = useState('');
  const [policeDescription, setPoliceDescription] = useState('');
  const [policePin, setPolicePin] = useState<{ lat: number; lng: number } | null>(null);
  const [showMapPicker, setShowMapPicker] = useState(false);

  const signalsRef = useRef(signals);
  signalsRef.current = signals;
  const corridorRef = useRef(corridorActive);
  corridorRef.current = corridorActive;
  const phaseStartRef = useRef<Record<string, number>>({});
  const densityRef = useRef<Record<string, { ns: number; ew: number }>>({});

  const handleDensity = (cameraId: string, ns: number, ew: number) => {
    densityRef.current[cameraId] = { ns, ew };
  };

  // Auto-show SOS modal on new SOS
  useEffect(() => {
    if (sosAlert) setShowSOSModal(true);
  }, [sosAlert?.id]);

  useEffect(() => {
    if (reports.length > reportsCountRef.current) {
      const latest = reports[reports.length - 1];
      setNewReportAlert(`New hazard: ${latest.customType || latest.type} · ${latest.reportedBy || 'citizen'}${latest.aiTrust ? ` · AI ${latest.aiTrust}%` : ''}`);
      setTimeout(() => setNewReportAlert(null), 6000);
    }
    reportsCountRef.current = reports.length;
  }, [reports]);

  useEffect(() => {
    if (!sosAlert) return;
    setCorridorActive(true);
    if (autoMode) {
      const order = ['j1', 'j4', 'j3', 'j2'];
      order.forEach((id, i) => {
        setTimeout(() => {
          updateSignal(id, 'ns-green');
          phaseStartRef.current[id] = Date.now();
        }, i * 700);
      });
    }
    const t = setTimeout(() => {
      setCorridorActive(false);
      if (autoMode) {
        ['j1', 'j2', 'j3', 'j4'].forEach(id => {
          updateSignal(id, 'ew-green');
          phaseStartRef.current[id] = Date.now();
        });
      }
    }, 9000);
    return () => clearTimeout(t);
  }, [sosAlert, autoMode, updateSignal]);

  useEffect(() => {
    if (!autoMode) return;
    const now = Date.now();
    if (Object.keys(phaseStartRef.current).length === 0) {
      phaseStartRef.current = { j1: now, j2: now - 2000, j3: now - 4000, j4: now - 6000 };
    }
    const interval = setInterval(() => {
      if (corridorRef.current) return;
      const nowTs = Date.now();
      const curr = signalsRef.current;
      Object.keys(curr).forEach(id => {
        const phase = curr[id];
        const start = phaseStartRef.current[id] ?? nowTs;
        const elapsed = nowTs - start;
        let duration: number;
        if (phase.includes('yellow')) {
          duration = 2000;
        } else {
          const junction = JUNCTIONS.find(j => j.id === id);
          const density = junction ? densityRef.current[junction.code] : undefined;
          if (density) {
            const currentDir = phase.startsWith('ns') ? 'ns' : 'ew';
            const currentQ = currentDir === 'ns' ? density.ns : density.ew;
            const otherQ = currentDir === 'ns' ? density.ew : density.ns;
            const delta = currentQ - otherQ;
            duration = Math.max(3000, Math.min(15000, 6000 + delta * 1000));
          } else {
            duration = 8000;
          }
        }
        if (elapsed > duration) {
          phaseStartRef.current[id] = nowTs;
          updateSignal(id, SIGNAL.next(phase));
        }
      });
    }, 500);
    return () => clearInterval(interval);
  }, [autoMode, updateSignal]);

  const officerPos = currentUser?.area?.toLowerCase().includes('silk')
    ? { lat: 12.9172, lng: 77.6229, label: currentUser.name || 'Officer' }
    : { lat: 12.9220, lng: 77.6200, label: currentUser?.name || 'Officer' };

  const pendingCount = reports.filter(r => r.status === 'pending').length;

  const filteredReports = reports.filter(r => r.status === reportTab);
  const counts = {
    pending: reports.filter(r => r.status === 'pending').length,
    verified: reports.filter(r => r.status === 'verified').length,
    rejected: reports.filter(r => r.status === 'rejected').length,
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const focusOnMap = (lat: number, lng: number, label?: string) => {
    setFocusLocation({ lat, lng, label });
    setActiveTab('map');
    setShowSOSHistory(false);
    showToast('Location highlighted on map');
  };

  const submitPoliceReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!policePin) { showToast('Please pick a location on the map'); return; }
    addReport({
      id: Date.now().toString(),
      type: policeReportType,
      customType: policeReportType === 'other' ? policeCustomType : undefined,
      lat: policePin.lat,
      lng: policePin.lng,
      status: 'verified',
      description: policeDescription,
      reportedBy: `police:${currentUser?.username || 'officer'}`,
    });
    setShowAddReport(false);
    setShowMapPicker(false);
    setPolicePin(null);
    setPoliceDescription('');
    setPoliceCustomType('');
    showToast('Hazard added & verified ✓');
  };

  const closeAddReport = () => {
    setShowAddReport(false);
    setShowMapPicker(false);
    setPolicePin(null);
    setPoliceDescription('');
    setPoliceCustomType('');
  };

  const handleDismissSOS = () => {
    dismissSOS();
    setShowSOSModal(false);
    showToast('SOS alert dismissed from dashboard');
  };

  const renderReportCard = (report: Report) => (
    <div key={report.id} className={`bg-slate-950 border rounded-2xl p-5 flex flex-col transition-all duration-300 ${
      report.status === 'verified' ? 'border-red-500/40 shadow-[0_0_20px_rgba(239,68,68,0.15)]' :
      report.status === 'rejected' ? 'border-slate-700 opacity-60' :
      'border-amber-500/40'
    }`}>
      {report.image && (
        <div className="relative mb-3 rounded-xl overflow-hidden border border-slate-800 group">
          <img src={report.image} alt="Hazard evidence"
            className="w-full h-44 object-cover cursor-zoom-in transition-transform duration-300 group-hover:scale-105"
            onClick={() => setViewImageModal(report.image!)} />
          {report.aiTrust !== undefined && report.aiTrust > 0 && (
            <div className={`absolute top-2 right-2 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold border-2 shadow-xl backdrop-blur-md ${
              report.aiTrust >= 85 ? 'bg-green-500/30 text-green-50 border-green-400/70'
                : report.aiTrust >= 70 ? 'bg-amber-500/30 text-amber-50 border-amber-400/70'
                : 'bg-red-500/30 text-red-50 border-red-400/70'
            }`}>
              <Sparkles className="w-3 h-3" />
              <span>AI {report.aiTrust}%</span>
            </div>
          )}
          <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-slate-900/90 backdrop-blur-md border border-slate-700 text-slate-300 text-[9px] font-bold px-2 py-1 rounded-md pointer-events-none opacity-80 group-hover:opacity-100 transition-opacity">
            <ImageIcon className="w-2.5 h-2.5" /> Tap to enlarge
          </div>
        </div>
      )}

      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <AlertTriangle className={`w-5 h-5 ${
            report.status === 'verified' ? 'text-red-500' :
            report.status === 'rejected' ? 'text-slate-500' : 'text-amber-500'
          }`} />
          <span className="font-bold text-white capitalize">{report.customType || report.type}</span>
          {report.reportedBy?.startsWith('police:') && (
            <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
              POLICE
            </span>
          )}
        </div>
        <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-full ${
          report.status === 'verified' ? 'bg-red-500/20 text-red-400 border border-red-500/30'
            : report.status === 'rejected' ? 'bg-slate-800 text-slate-400 border border-slate-700'
            : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
        }`}>{report.status}</span>
      </div>
      <p className="text-sm text-slate-400 mb-3 flex-1 leading-relaxed">{report.description}</p>
      {!report.image && report.aiTrust ? (
        <div className="mb-3">
          <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold border ${
            report.aiTrust >= 85 ? 'bg-green-500/20 text-green-300 border-green-500/50'
              : report.aiTrust >= 70 ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
              : 'bg-red-500/20 text-red-300 border-red-500/50'
          }`}>
            <Sparkles className="w-3 h-3" /> AI Trust: {report.aiTrust}%
          </div>
        </div>
      ) : null}
      <p className="text-[10px] text-slate-500 mb-4 font-mono">
        📍 {report.lat.toFixed(5)}, {report.lng.toFixed(5)}
        {report.reportedBy && ` · @${report.reportedBy}`}
      </p>
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => focusOnMap(report.lat, report.lng, report.customType || report.type)}
          className="py-2.5 px-3 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/20 flex items-center justify-center transition-colors"
          title="Show on map">
          <Crosshair className="w-3.5 h-3.5" />
        </button>
        {report.status !== 'verified' && (
          <button onClick={() => { updateReportStatus(report.id, 'verified'); showToast('Report verified ✓'); }}
            className="flex-1 min-w-[80px] py-2.5 rounded-xl bg-green-500/20 text-green-400 border border-green-500/50 hover:bg-green-500/30 flex items-center justify-center gap-1.5 text-xs font-bold transition-colors">
            <CheckCircle className="w-3.5 h-3.5" /> Verify
          </button>
        )}
        {report.status !== 'rejected' && (
          <button onClick={() => { updateReportStatus(report.id, 'rejected'); showToast('Report rejected'); }}
            className="flex-1 min-w-[80px] py-2.5 rounded-xl bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 flex items-center justify-center gap-1.5 text-xs font-bold transition-colors">
            <XCircle className="w-3.5 h-3.5" /> Reject
          </button>
        )}
        <button onClick={() => { deleteReport(report.id); showToast('Report deleted'); }}
          className="py-2.5 px-3 rounded-xl bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 flex items-center justify-center transition-colors"
          title="Delete permanently">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col p-6 max-w-[1600px] mx-auto">
      <header className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center border border-amber-500/50">
            <Shield className="w-7 h-7 text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Control Panel</h1>
            <p className="text-xs text-amber-400 font-medium tracking-wider">
              {currentUser?.name || 'OPERATOR'} · {currentUser?.policeId || 'BLR-OPS'} · {currentUser?.area || 'HQ'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {corridorActive && (
            <button onClick={() => setShowSOSHistory(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-green-500/20 border border-green-500/50 rounded-2xl animate-pulse shadow-[0_0_20px_rgba(34,197,94,0.3)] hover:bg-green-500/30 transition-colors cursor-pointer">
              <Ambulance className="w-5 h-5 text-green-400" />
              <span className="text-green-400 font-bold text-sm tracking-wide">GREEN CORRIDOR ACTIVE</span>
              <span className="text-green-300 text-xs">▸</span>
            </button>
          )}
          <button onClick={() => setShowSOSHistory(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-2xl hover:bg-slate-800 transition-colors text-slate-300">
            <History className="w-4 h-4" />
            <span className="text-xs font-bold">SOS LOG</span>
            {sosHistory.length > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                {sosHistory.length}
              </span>
            )}
          </button>
          <button onClick={() => setAutoMode(!autoMode)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-sm transition-all border ${
              autoMode ? 'bg-green-500/10 text-green-400 border-green-500/40'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/40'
            }`}>
            {autoMode ? <Zap className="w-4 h-4" /> : <Activity className="w-4 h-4" />}
            {autoMode ? 'AI ADAPTIVE' : 'MANUAL'}
          </button>
          <button onClick={logout} className="p-2.5 rounded-xl border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900 transition-colors">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="flex gap-3 mb-6 flex-wrap">
        {[
          { id: 'cameras', label: 'Live Cameras (YOLOv8)', icon: Camera },
          { id: 'map', label: 'City Map & Signals', icon: LayoutGrid },
          { id: 'signals', label: 'Signal Control', icon: Zap },
          { id: 'reports', label: `Reports${pendingCount > 0 ? ` (${pendingCount})` : ''}`, icon: AlertTriangle },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2.5 px-6 py-3 rounded-2xl font-bold transition-all text-sm ${
              activeTab === tab.id
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                : 'bg-slate-900 text-slate-400 border border-slate-800 hover:bg-slate-800'
            }`}>
            <tab.icon className="w-4 h-4" /> {tab.label}
          </button>
        ))}
      </div>

      <div
        className="flex-1 bg-slate-900/60 border border-slate-800 rounded-3xl p-6 relative"
        style={{ minHeight: 800 }}
      >
        {/* ═══════════════════════════════════════════════════════
            CAMERAS — always absolute inset-6 flex-col.
            Same box in every state → Canvas never resizes → RAF
            loop never restarts. Only opacity / z-index toggle.
           ═══════════════════════════════════════════════════════ */}
        <div
          className="absolute inset-6 flex flex-col transition-opacity duration-200"
          style={{
            opacity: activeTab === 'cameras' ? 1 : 0,
            pointerEvents: activeTab === 'cameras' ? 'auto' : 'none',
            zIndex: activeTab === 'cameras' ? 10 : 0,
          }}
          aria-hidden={activeTab !== 'cameras'}
        >
          <div className="flex-1 flex flex-col min-h-0" style={{ minHeight: 620 }}>
            <div className="flex justify-between items-center mb-5 flex-wrap gap-3">
              <div className="flex gap-2 flex-wrap">
                {JUNCTIONS.map(j => (
                  <button key={j.code} onClick={() => { setActiveCamera(j.code); setLayout('single'); }}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                      activeCamera === j.code && layout === 'single'
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
                    }`}>
                    <span className="w-2 h-2 rounded-full" style={{
                      background: SIGNAL.isNSMoving(signals[j.id]) || SIGNAL.isEWMoving(signals[j.id]) ? '#22c55e' : '#ef4444',
                    }} />
                    {j.code}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button onClick={() => setLayout('grid')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
                    layout === 'grid' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                  }`}><LayoutGrid className="w-3.5 h-3.5" /> Grid</button>
                <button onClick={() => setLayout('single')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
                    layout === 'single' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                  }`}><Monitor className="w-3.5 h-3.5" /> Single</button>
              </div>
            </div>

            <div className="relative flex-1 min-h-0" style={{ minHeight: 560 }}>
              {JUNCTIONS.map((j, idx) => {
                const isSingle = layout === 'single';
                const isActive = activeCamera === j.code;
                const visible = !isSingle || isActive;
                const gridPos: React.CSSProperties = {
                  top: idx < 2 ? 0 : 'calc(50% + 8px)',
                  left: idx % 2 === 0 ? 0 : 'calc(50% + 8px)',
                  width: 'calc(50% - 8px)', height: 'calc(50% - 8px)',
                  opacity: 1, zIndex: 1,
                };
                const singlePos: React.CSSProperties = {
                  top: 0, left: 0, width: '100%', height: '100%',
                  opacity: visible ? 1 : 0,
                  zIndex: visible ? 10 : 0,
                  pointerEvents: visible ? 'auto' : 'none',
                };
                return (
                  <div key={j.code}
                    className="absolute bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 transition-all duration-300 ease-out"
                    style={isSingle ? singlePos : gridPos}>
                    <CameraFeed cameraId={j.code} cameraName={j.name} spawnRate={j.spawnRate}
                      ambulance={j.ambulance} phase={signals[j.id]} onDensity={handleDensity} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════
            MAP — always absolute inset-6 flex-col.
            Leaflet's container never changes size between tab
            switches → tiles render correctly from the first frame.
           ═══════════════════════════════════════════════════════ */}
        <div
          className="absolute inset-6 flex flex-col transition-opacity duration-200"
          style={{
            opacity: activeTab === 'map' ? 1 : 0,
            pointerEvents: activeTab === 'map' ? 'auto' : 'none',
            zIndex: activeTab === 'map' ? 10 : 0,
          }}
          aria-hidden={activeTab !== 'map'}
        >
          <div className="flex justify-between items-center mb-4 flex-wrap gap-3 shrink-0">
            <h2 className="text-xl font-bold text-white">Real-Time City Map · Bengaluru</h2>
            <div className="flex items-center gap-3">
              {focusLocation && (
                <button onClick={() => setFocusLocation(null)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold hover:bg-red-500/20 transition-colors">
                  <X className="w-3 h-3" /> Clear highlight
                </button>
              )}
              <span className="text-xs text-slate-400">
                {reports.filter(r => r.status !== 'rejected').length} hazards · {Object.keys(signals).length} signals
              </span>
            </div>
          </div>
          <div className="flex-1 min-h-0" style={{ minHeight: 640 }}>
            <BengaluruMap
              signals={signals}
              reports={reports.filter(r => r.status !== 'rejected').map(r => ({
                id: r.id, type: r.customType || r.type, lat: r.lat, lng: r.lng,
                status: r.status, description: r.description,
              }))}
              userPos={officerPos}
              showSignals={true}
              focusLocation={focusLocation}
            />
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════
            SIGNALS — conditional
           ═══════════════════════════════════════════════════════ */}
        {activeTab === 'signals' && (
          <div className="h-full overflow-auto">
            <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
              <h2 className="text-xl font-bold text-white">Intersection Signal Control</h2>
              {autoMode && (
                <span className="text-xs text-green-400 font-bold flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  AI Adaptive — density-based green durations
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              {JUNCTIONS.map(j => {
                const phase = signals[j.id];
                const nsColor = SIGNAL.nsColor(phase);
                const ewColor = SIGNAL.ewColor(phase);
                const nsMoving = SIGNAL.isNSMoving(phase);
                const ewMoving = SIGNAL.isEWMoving(phase);
                const density = densityRef.current[j.code];

                return (
                  <div key={j.id} className="bg-slate-950 border border-slate-800 rounded-3xl p-6 flex flex-col items-center">
                    <div className="text-center mb-5">
                      <h3 className="text-slate-200 font-bold tracking-widest">{j.name.toUpperCase()}</h3>
                      <p className="text-[10px] text-slate-500 font-mono mt-1">{j.id.toUpperCase()}</p>
                    </div>
                    <div className="relative w-32 h-32 mb-5">
                      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-8 bg-slate-800 rounded" />
                      <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-8 bg-slate-800 rounded" />
                      <div className={`absolute top-1 left-1/2 -translate-x-1/2 ${nsMoving ? 'opacity-100' : 'opacity-30'}`}>
                        <ArrowDown className={`w-5 h-5 ${nsMoving ? 'text-green-400' : 'text-red-400'}`} />
                      </div>
                      <div className={`absolute bottom-1 left-1/2 -translate-x-1/2 ${nsMoving ? 'opacity-100' : 'opacity-30'}`}>
                        <ArrowUp className={`w-5 h-5 ${nsMoving ? 'text-green-400' : 'text-red-400'}`} />
                      </div>
                      <div className={`absolute right-1 top-1/2 -translate-y-1/2 ${ewMoving ? 'opacity-100' : 'opacity-30'}`}>
                        <ArrowLeft className={`w-5 h-5 ${ewMoving ? 'text-green-400' : 'text-red-400'}`} />
                      </div>
                      <div className={`absolute left-1 top-1/2 -translate-y-1/2 ${ewMoving ? 'opacity-100' : 'opacity-30'}`}>
                        <ArrowRight className={`w-5 h-5 ${ewMoving ? 'text-green-400' : 'text-red-400'}`} />
                      </div>
                    </div>
                    <div className="flex gap-6 mb-5">
                      <TrafficLightColumn color={nsColor} label="N / S" />
                      <TrafficLightColumn color={ewColor} label="E / W" />
                    </div>
                    <div className={`w-full text-center text-xs font-bold py-2 rounded-xl mb-2 ${
                      phase.includes('green') ? 'bg-green-500/15 text-green-400 border border-green-500/40'
                        : phase.includes('yellow') ? 'bg-amber-500/15 text-amber-400 border border-amber-500/40'
                        : 'bg-red-500/15 text-red-400 border border-red-500/40'
                    }`}>
                      {SIGNAL.label(phase)}
                    </div>
                    {density && (
                      <div className="w-full flex gap-2 mb-4 text-[9px] font-bold">
                        <div className="flex-1 px-2 py-1 rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-center">
                          N/S Q: {density.ns}
                        </div>
                        <div className="flex-1 px-2 py-1 rounded bg-orange-500/10 border border-orange-500/20 text-orange-300 text-center">
                          E/W Q: {density.ew}
                        </div>
                      </div>
                    )}
                    <div className="flex gap-2 w-full">
                      <button disabled={autoMode} onClick={() => updateSignal(j.id, 'ns-green')}
                        className={`flex-1 py-2.5 rounded-xl text-[10px] font-bold transition-all ${
                          autoMode ? 'opacity-30 cursor-not-allowed bg-slate-800 text-slate-500'
                            : 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/40 hover:bg-cyan-500/25'
                        }`}>N/S GO</button>
                      <button disabled={autoMode} onClick={() => updateSignal(j.id, 'ew-green')}
                        className={`flex-1 py-2.5 rounded-xl text-[10px] font-bold transition-all ${
                          autoMode ? 'opacity-30 cursor-not-allowed bg-slate-800 text-slate-500'
                            : 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/40 hover:bg-cyan-500/25'
                        }`}>E/W GO</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════
            REPORTS — conditional with 3 tabs
           ═══════════════════════════════════════════════════════ */}
        {activeTab === 'reports' && (
          <div className="h-full overflow-hidden flex flex-col">
            <div className="flex justify-between items-center mb-5 flex-wrap gap-3">
              <div>
                <h2 className="text-xl font-bold text-white">Incident Reports</h2>
                <p className="text-xs text-slate-500 mt-1">Verify, reject, or add hazards directly</p>
              </div>
              <button onClick={() => setShowAddReport(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition-colors shadow-lg">
                <Plus className="w-4 h-4" /> Add Report
              </button>
            </div>

            <div className="relative bg-slate-950/60 p-1.5 rounded-2xl border border-slate-800 flex gap-1 mb-5">
              {(['pending', 'verified', 'rejected'] as ReportTab[]).map(tab => {
                const isActive = reportTab === tab;
                const count = counts[tab];
                const palette =
                  tab === 'pending'
                    ? { bg: 'bg-amber-500', text: 'text-slate-950', inactive: 'text-amber-400', ring: 'ring-amber-500/30' }
                    : tab === 'verified'
                    ? { bg: 'bg-red-500', text: 'text-white', inactive: 'text-red-400', ring: 'ring-red-500/30' }
                    : { bg: 'bg-slate-600', text: 'text-white', inactive: 'text-slate-400', ring: 'ring-slate-500/30' };
                const Icon = tab === 'pending' ? AlertTriangle : tab === 'verified' ? CheckCircle : XCircle;
                return (
                  <button
                    key={tab}
                    onClick={() => setReportTab(tab)}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-sm transition-all duration-300 ${
                      isActive
                        ? `${palette.bg} ${palette.text} shadow-lg ring-2 ${palette.ring}`
                        : `bg-transparent ${palette.inactive} hover:bg-slate-900`
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="capitalize">{tab}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      isActive ? 'bg-black/20' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex-1 overflow-auto">
              <div
                key={reportTab}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-tab-fade"
              >
                {filteredReports.length === 0 && (
                  <div className="col-span-full flex flex-col items-center justify-center py-16 text-slate-500">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
                      reportTab === 'pending' ? 'bg-amber-500/10 border border-amber-500/30'
                        : reportTab === 'verified' ? 'bg-red-500/10 border border-red-500/30'
                        : 'bg-slate-800 border border-slate-700'
                    }`}>
                      {reportTab === 'pending' ? <AlertTriangle className="w-8 h-8 text-amber-500" /> :
                        reportTab === 'verified' ? <CheckCircle className="w-8 h-8 text-red-500" /> :
                        <XCircle className="w-8 h-8 text-slate-500" />}
                    </div>
                    <p className="text-sm italic">No {reportTab} reports</p>
                  </div>
                )}
                {filteredReports.map(renderReportCard)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* New report alert */}
      {newReportAlert && (
        <div className="fixed top-24 right-8 z-[1500] bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 px-6 py-4 rounded-2xl font-bold shadow-2xl flex items-center gap-3 animate-slide-in">
          <Bell className="w-5 h-5" /> {newReportAlert}
        </div>
      )}

      {/* SOS banner (dashboard-level, dismissible via X) */}
      {sosAlert && !showSOSModal && (
        <button
          onClick={() => setShowSOSModal(true)}
          className="fixed top-24 left-1/2 -translate-x-1/2 z-[1500] flex items-center gap-3 px-5 py-3 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-2xl font-bold shadow-2xl border-2 border-red-300 animate-pulse max-w-lg"
        >
          <Ambulance className="w-5 h-5" />
          <span className="text-sm">
            🚨 SOS ACTIVE · {sosAlert.ambulanceNo} · @{sosAlert.ambulanceUser}
          </span>
          <span
            role="button"
            onClick={(e) => { e.stopPropagation(); handleDismissSOS(); }}
            className="ml-2 p-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
            title="Dismiss SOS"
          >
            <X className="w-4 h-4" />
          </span>
        </button>
      )}

      {/* SOS full-screen popup */}
      {sosAlert && showSOSModal && (
        <div className="fixed inset-0 z-[2000] bg-black/85 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
          <div className="relative w-full max-w-2xl bg-gradient-to-br from-red-950 via-slate-900 to-slate-950 border-4 border-red-500 rounded-3xl p-10 shadow-[0_0_80px_rgba(239,68,68,0.6)] animate-scale-in">
            <div className="absolute -inset-1 rounded-3xl border-4 border-red-500/40 animate-pulse pointer-events-none" />

            <button
              onClick={handleDismissSOS}
              className="absolute top-4 right-4 p-2 rounded-xl bg-red-500/20 hover:bg-red-500/40 text-red-100 transition-colors border border-red-500/40"
              title="Dismiss SOS"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="relative">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-2xl bg-red-500 flex items-center justify-center animate-pulse shadow-[0_0_30px_rgba(239,68,68,0.9)]">
                  <Ambulance className="w-9 h-9 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-red-400 text-xs font-bold tracking-[0.3em] uppercase">Emergency SOS</span>
                  </div>
                  <h2 className="text-3xl font-bold text-white">Ambulance Priority Alert</h2>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5 mb-6">
                <div className="bg-slate-950/70 border border-red-500/30 rounded-2xl p-5">
                  <p className="text-[10px] uppercase tracking-widest text-red-400 font-bold mb-2">Ambulance</p>
                  <p className="text-xl font-bold text-white font-mono">{sosAlert.ambulanceNo}</p>
                  <p className="text-xs text-slate-400 mt-1">Driver: @{sosAlert.ambulanceUser}</p>
                </div>
                <div className="bg-slate-950/70 border border-red-500/30 rounded-2xl p-5">
                  <p className="text-[10px] uppercase tracking-widest text-red-400 font-bold mb-2">Location</p>
                  <p className="text-sm font-bold text-white font-mono">
                    {sosAlert.lat.toFixed(5)}, {sosAlert.lng.toFixed(5)}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">Nearest junction: Silk Board</p>
                </div>
              </div>

              <div className="bg-red-500/10 border border-red-500/40 rounded-2xl p-5 mb-6">
                <p className="text-sm text-red-200 leading-relaxed">
                  <strong className="text-red-300">ACTION REQUIRED:</strong> Green corridor activated.
                  Manual override locked until the ambulance clears the corridor.
                </p>
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-red-300">
                  <div className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
                  <span className="text-xs font-bold tracking-wider">
                    AUTO-CLEARS IN {Math.max(0, Math.ceil((sosAlert.expiresAt - Date.now()) / 1000))}s
                  </span>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowSOSModal(false)}
                    className="px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition-colors border border-slate-700"
                  >
                    Minimize
                  </button>
                  <button
                    onClick={handleDismissSOS}
                    className="px-6 py-3 rounded-2xl bg-red-500 hover:bg-red-400 text-white font-bold transition-colors shadow-lg"
                  >
                    Acknowledge & Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image viewer modal */}
      {viewImageModal && (
        <div className="fixed inset-0 z-[2200] bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in"
          onClick={() => setViewImageModal(null)}>
          <button className="absolute top-6 right-6 p-3 rounded-xl bg-slate-900/90 text-white hover:bg-slate-800 transition-colors"
            onClick={() => setViewImageModal(null)}>
            <X className="w-6 h-6" />
          </button>
          <img src={viewImageModal} alt="Hazard evidence" className="max-w-full max-h-full rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      {/* SOS history */}
      {showSOSHistory && (
        <div className="fixed inset-0 z-[1800] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
          <div className="relative w-full max-w-2xl max-h-[85vh] bg-slate-900 border-2 border-red-500/40 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-red-500/20 flex items-center justify-center border border-red-500/50">
                  <Ambulance className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">SOS Emergency Log</h2>
                  <p className="text-xs text-slate-400">{sosHistory.length} {sosHistory.length === 1 ? 'alert' : 'alerts'} on record</p>
                </div>
              </div>
              <button onClick={() => setShowSOSHistory(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-6 space-y-4">
              {sosHistory.length === 0 && (
                <div className="text-center py-12">
                  <Ambulance className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                  <p className="text-sm text-slate-500 italic">No SOS alerts recorded yet.</p>
                </div>
              )}
              {[...sosHistory].reverse().map(alert => {
                const isActive = sosAlert?.id === alert.id;
                const ago = Math.floor((Date.now() - alert.triggeredAt) / 1000);
                const timeLabel = ago < 60 ? `${ago}s ago` : `${Math.floor(ago / 60)}m ago`;
                return (
                  <div key={alert.id} className={`flex items-stretch gap-4 p-4 rounded-2xl border-2 transition-colors ${
                    isActive ? 'bg-red-500/10 border-red-500/60 animate-pulse' : 'bg-slate-950 border-slate-800'
                  }`}>
                    <div className={`w-12 rounded-xl flex items-center justify-center ${isActive ? 'bg-red-500' : 'bg-slate-800'}`}>
                      <Ambulance className={`w-6 h-6 ${isActive ? 'text-white animate-pulse' : 'text-slate-500'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <p className="font-bold text-white font-mono">{alert.ambulanceNo}</p>
                        {isActive && (
                          <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-red-500 text-white animate-pulse">
                            LIVE
                          </span>
                        )}
                        <span className="text-[10px] text-slate-500 font-mono ml-auto">{timeLabel}</span>
                      </div>
                      <p className="text-xs text-slate-400 mb-1">Driver: @{alert.ambulanceUser}</p>
                      <p className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {alert.lat.toFixed(5)}, {alert.lng.toFixed(5)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => focusOnMap(alert.lat, alert.lng, `🚑 ${alert.ambulanceNo}`)}
                        className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/20 transition-colors">
                        <Crosshair className="w-4 h-4" />
                      </button>
                      <button onClick={() => { deleteSOSHistory(alert.id); showToast('Removed from SOS log'); }}
                        className="p-3 rounded-xl bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Police Add Report */}
      {showAddReport && (
        <div className="fixed inset-0 z-[1800] bg-black/90 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
          <div className="relative w-full max-w-6xl max-h-[92vh] bg-slate-900 border-2 border-amber-500/40 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center border border-amber-500/50">
                  <Shield className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Add Hazard Report</h2>
                  <p className="text-xs text-amber-400">Officer entry · auto-verified · no photo required</p>
                </div>
              </div>
              <button onClick={closeAddReport}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 overflow-hidden">
              <form onSubmit={submitPoliceReport} className="p-6 overflow-auto border-r border-slate-800 flex flex-col">
                <div className="space-y-5 flex-1">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Hazard Type</label>
                    <select value={policeReportType} onChange={e => setPoliceReportType(e.target.value as HazardType)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-amber-500">
                      <option value="accident">Accident</option>
                      <option value="waterlogging">Waterlogging</option>
                      <option value="rally">Rally/Protest</option>
                      <option value="construction">Construction</option>
                      <option value="pothole">Pothole</option>
                      <option value="other">Others (specify)</option>
                    </select>
                  </div>
                  {policeReportType === 'other' && (
                    <input required type="text" placeholder="Describe the hazard type..." value={policeCustomType}
                      onChange={e => setPoliceCustomType(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-amber-500 outline-none" />
                  )}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
                    <textarea required rows={5} value={policeDescription}
                      onChange={e => setPoliceDescription(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                      placeholder="Field observations..." />
                  </div>
                  <div className={`p-4 rounded-xl border-2 transition-all ${
                    policePin ? 'bg-emerald-500/5 border-emerald-500/40' : 'bg-slate-950 border-slate-800 border-dashed'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Pinned Location</p>
                      {policePin && (
                        <button type="button" onClick={() => setPolicePin(null)}
                          className="text-[10px] font-bold text-red-400 hover:text-red-300 flex items-center gap-1">
                          <X className="w-3 h-3" /> Clear
                        </button>
                      )}
                    </div>
                    {policePin ? (
                      <p className="text-sm text-emerald-400 font-mono font-bold">
                        ✓ {policePin.lat.toFixed(6)}, {policePin.lng.toFixed(6)}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-500 italic flex items-center gap-2">
                        <MousePointerClick className="w-3.5 h-3.5 text-amber-400" />
                        Click anywhere on the map to drop the hazard pin
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button type="button" onClick={closeAddReport}
                    className="flex-1 py-3 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 font-medium transition-colors">
                    Cancel
                  </button>
                  <button type="submit" disabled={!policePin}
                    className="flex-1 py-3 rounded-xl bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                    {policePin ? 'Submit Report' : 'Pick Location First'}
                  </button>
                </div>
              </form>

              <div className="relative overflow-hidden">
                <BengaluruMap
                  signals={{}}
                  reports={[]}
                  userPos={officerPos}
                  showSignals={false}
                  rerouteActive={false}
                  onMapClick={(lat, lng) => setPolicePin({ lat, lng })}
                  pickedPin={policePin}
                />
                {!policePin && (
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 bg-amber-500/95 backdrop-blur text-slate-950 px-4 py-2 rounded-full font-bold text-xs shadow-2xl animate-bounce pointer-events-none">
                    ↓ Click to place hazard pin
                  </div>
                )}
                {policePin && (
                  <div className="absolute top-4 left-4 z-40 bg-emerald-500/95 backdrop-blur text-white px-4 py-2 rounded-full font-bold text-xs shadow-2xl pointer-events-none flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5" /> Pin placed successfully
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[2000] bg-amber-500 text-slate-950 px-6 py-3 rounded-2xl font-bold shadow-2xl">
          {toast}
        </div>
      )}

      <style>{`
        @keyframes slide-in {
          from { transform: translateX(120%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-slide-in { animation: slide-in 0.4s ease-out; }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in { animation: fade-in 0.25s ease-out; }
        @keyframes scale-in {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-scale-in { animation: scale-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
        @keyframes tab-fade {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-tab-fade { animation: tab-fade 0.35s cubic-bezier(0.22, 1, 0.36, 1); }
      `}</style>
    </div>
  );
};