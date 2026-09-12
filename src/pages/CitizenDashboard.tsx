import React, { useState, useRef } from 'react';
import { useApp } from '../App';
import { GlassButton } from '@/components/ui/glass-button';
import { HelpPopper } from '@/components/ui/help-popper';
import {
  AlertTriangle, Navigation, Upload, ShieldAlert, LogOut, MapPin,
  CheckCircle2, MousePointerClick, Ambulance, X, Camera, Trash2, XCircle,
} from 'lucide-react';
import { HazardType, computeAiTrust, haversineKm } from '../types';
import { BengaluruMap, LOCATIONS, LocationKey } from '@/components/BengaluruMap';

const START_POSITIONS: Record<string, { lat: number; lng: number; label: string }> = {
  Ambulance: { lat: 12.9250, lng: 77.5938, label: 'Ambulance · Jayanagar' },
  Car: { lat: 12.9063, lng: 77.5857, label: 'Your Car · BTM' },
  Bike: { lat: 12.9120, lng: 77.6100, label: 'Your Bike · Koramangala' },
  Cycle: { lat: 12.9180, lng: 77.6000, label: 'Your Cycle · Jayanagar' },
};
const DEFAULT_POS = { lat: 12.9063, lng: 77.5857, label: 'Your Location' };

export const CitizenDashboard: React.FC = () => {
  const {
    currentUser, reports, addReport, sosActive, triggerSOS, cancelSOS, signals, logout, sosAlert,
  } = useApp();
  const [showReportModal, setShowReportModal] = useState(false);
  const [destination, setDestination] = useState<LocationKey | null>(null);
  const [rerouteActive, setRerouteActive] = useState(false);
  const [hazardType, setHazardType] = useState<HazardType>('accident');
  const [customHazard, setCustomHazard] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [pickedPin, setPickedPin] = useState<{ lat: number; lng: number } | null>(null);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [photoName, setPhotoName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAmbulance = currentUser?.vehicleType === 'Ambulance';
  const userPos = START_POSITIONS[currentUser?.vehicleType || ''] || DEFAULT_POS;

  const visibleReports = reports.filter(r =>
    r.reportedBy === currentUser?.username || r.status === 'verified'
  );

  // Is the currently active SOS raised by me?
  const isMySOS = !!(sosAlert && sosAlert.ambulanceUser === currentUser?.username);
  // Show "Ambulance nearby" toast to everyone EXCEPT the reporting ambulance
  const showSOSToast = !!(sosAlert && sosAlert.ambulanceUser !== currentUser?.username);
  // Distance from me to the ambulance (in km)
  const sosDistanceKm = sosAlert ? haversineKm(userPos, sosAlert) : 0;
  const sosEtaMin = Math.max(1, Math.round((sosDistanceKm / 30) * 60)); // assumes 30 km/h avg speed

  const openReportModal = () => {
    setPickedPin({ lat: userPos.lat, lng: userPos.lng });
    setPhotoDataUrl(null);
    setPhotoName('');
    setShowReportModal(true);
  };
  const closeReportModal = () => {
    setShowReportModal(false);
    setPickedPin(null);
    setCustomHazard('');
    setPhotoDataUrl(null);
    setPhotoName('');
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      setToast('Photo must be under 4 MB');
      setTimeout(() => setToast(null), 3000);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setPhotoDataUrl(reader.result as string);
      setPhotoName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = () => {
    setPhotoDataUrl(null);
    setPhotoName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleReportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pickedPin || !photoDataUrl) return;
    const form = e.target as HTMLFormElement;
    const description = (form.elements.namedItem('desc') as HTMLTextAreaElement).value;
    const trust = computeAiTrust(hazardType, description, true);

    addReport({
      id: Date.now().toString(),
      type: hazardType,
      customType: hazardType === 'other' ? customHazard : undefined,
      lat: pickedPin.lat,
      lng: pickedPin.lng,
      status: 'pending',
      description,
      reportedBy: currentUser?.username,
      image: photoDataUrl,
      aiTrust: trust,
    });
    closeReportModal();
    setToast(`Report sent to Control Panel · AI Trust ${trust}%`);
    setTimeout(() => setToast(null), 4500);
  };

  const handleSOS = () => {
    triggerSOS(
      currentUser?.username || 'ambulance',
      currentUser?.vehicleNo || 'AMB-01',
      userPos.lat,
      userPos.lng
    );
  };

  const handleCancelSOS = () => {
    if (currentUser?.username) {
      cancelSOS(currentUser.username);
      setToast('SOS cancelled · Control Panel notified');
      setTimeout(() => setToast(null), 3000);
    }
  };

  const canSubmit = pickedPin && photoDataUrl;

  return (
    <div className="min-h-screen flex flex-col p-6 max-w-[1600px] mx-auto">
      <header className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 flex items-center justify-center border border-cyan-500/50">
            <span className="text-cyan-400 font-bold text-xl">D</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Citizen Dashboard</h1>
            <p className="text-xs text-slate-400">
              Welcome, {currentUser?.username} • {currentUser?.vehicleType} ({currentUser?.vehicleNo})
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isAmbulance && !isMySOS && (
            <button onClick={handleSOS}
              className="flex items-center gap-3 px-6 py-3 rounded-2xl font-bold transition-all bg-red-500/20 text-red-400 border-2 border-red-500/50 hover:bg-red-500/30">
              <ShieldAlert className="w-5 h-5" />
              EMERGENCY SOS
            </button>
          )}
          {isAmbulance && isMySOS && (
            <button onClick={handleCancelSOS}
              className="flex items-center gap-3 px-6 py-3 rounded-2xl font-bold transition-all bg-red-500 text-white animate-pulse shadow-[0_0_30px_rgba(239,68,68,0.8)] hover:bg-red-400">
              <XCircle className="w-5 h-5" />
              CANCEL SOS
            </button>
          )}
          <GlassButton size="default" onClick={openReportModal}>
            <div className="flex items-center gap-2 px-2"><AlertTriangle className="w-5 h-5" /> Report</div>
          </GlassButton>
          <button onClick={logout} className="p-3 rounded-xl border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900 transition-colors">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1">
        <div className="space-y-6">
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Navigation className="w-5 h-5 text-cyan-400" /> Route Planner
            </h3>
            <label className="block text-xs font-medium text-slate-400 mb-2">Destination</label>
            <select value={destination ?? ''} onChange={e => { setDestination((e.target.value || null) as LocationKey); setRerouteActive(false); }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-cyan-500 mb-4 text-sm">
              <option value="">— Select destination —</option>
              {Object.entries(LOCATIONS).filter(([k]) => k !== 'btm').map(([key, loc]) => (
                <option key={key} value={key}>{loc.name}</option>
              ))}
            </select>
            <button disabled={!destination} onClick={() => setRerouteActive(!rerouteActive)}
              className={`w-full py-3 rounded-xl font-bold text-sm transition-colors ${
                !destination ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : rerouteActive ? 'bg-cyan-500 text-slate-950'
                  : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/20'
              }`}>
              {rerouteActive ? '✓ Safe Route Active' : 'Find Safe Route'}
            </button>
            {destination && rerouteActive && (
              <div className="mt-4 p-3 bg-cyan-500/5 border border-cyan-500/20 rounded-xl">
                <p className="text-[11px] text-cyan-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3" /> AI detours around {visibleReports.filter(r => r.status === 'verified').length} hazard{visibleReports.filter(r => r.status === 'verified').length !== 1 ? 's' : ''}
                </p>
              </div>
            )}
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 flex-1 overflow-auto max-h-[500px]">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center justify-between">
              <span>My Reports & Verified</span>
              <span className="text-[10px] text-cyan-400 font-mono">LIVE</span>
            </h3>
            <div className="space-y-3">
              {visibleReports.length === 0 && (
                <p className="text-xs text-slate-500 italic">No active hazards visible to you.</p>
              )}
              {visibleReports.map(report => {
                const isMine = report.reportedBy === currentUser?.username;
                return (
                  <div key={report.id} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-start gap-3 hover:border-slate-700 transition-colors">
                    <AlertTriangle className={`w-5 h-5 mt-0.5 shrink-0 ${report.status === 'verified' ? 'text-red-500' : 'text-amber-500'}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-white capitalize">{report.customType || report.type}</p>
                        {isMine && (
                          <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300">
                            YOUR REPORT
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">{report.description}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${
                          report.status === 'verified' ? 'bg-red-500/20 text-red-400'
                            : report.status === 'rejected' ? 'bg-slate-800 text-slate-400'
                            : 'bg-amber-500/20 text-amber-400'
                        }`}>{report.status}</span>
                        {report.reportedBy && !isMine && (
                          <span className="text-[10px] text-slate-500 font-mono">@{report.reportedBy}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 h-[720px] relative">
          <BengaluruMap
            signals={signals}
            reports={visibleReports.map(r => ({
              id: r.id,
              type: r.customType || r.type,
              lat: r.lat, lng: r.lng,
              status: r.status,
              description: r.description,
            }))}
            userPos={userPos}
            destination={destination}
            rerouteActive={rerouteActive}
            showSignals={false}
            hideRouteBadge={showReportModal}
            onMapClick={showReportModal ? (lat, lng) => setPickedPin({ lat, lng }) : undefined}
            pickedPin={showReportModal ? pickedPin : null}
          />
        </div>
      </div>

      <div className="fixed bottom-6 left-6 z-[500]">
        <HelpPopper
          side="top"
          align="start"
          items={[
            { label: 'How to report a hazard', onSelect: () => setShowReportModal(true) },
            { label: 'How reroute works' },
            { label: 'Emergency SOS guide' },
          ]}
          sections={[
            {
              title: 'Support',
              items: [
                { label: 'Contact control panel', external: true },
                { label: 'Report a bug' },
              ],
            },
          ]}
        />
      </div>

      {showSOSToast && (
        <div className="fixed top-6 right-6 z-[1500] max-w-sm bg-gradient-to-br from-red-500 to-red-600 text-white p-5 rounded-2xl shadow-2xl border-2 border-red-300 animate-slide-in">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0 animate-pulse">
              <Ambulance className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-sm uppercase tracking-wider mb-1">🚨 Ambulance Nearby</p>
              <p className="text-xs leading-relaxed text-white/95">
                <strong>{sosAlert!.ambulanceNo}</strong> is responding to an emergency in your area.
                Please pull over and give way.
              </p>
              <div className="mt-2 pt-2 border-t border-white/20 flex items-center justify-between text-[11px]">
                <span className="font-bold text-white">
                  Ambulance is <span className="text-yellow-200">{sosDistanceKm.toFixed(1)} km</span> from you
                </span>
                <span className="text-white/70">~{sosEtaMin} min away</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {isMySOS && (
        <div className="fixed top-6 right-6 z-[1500] max-w-sm bg-gradient-to-br from-red-600 to-red-700 text-white p-5 rounded-2xl shadow-2xl border-2 border-red-300 animate-slide-in">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0 animate-pulse">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-sm uppercase tracking-wider mb-1">SOS Broadcast Active</p>
              <p className="text-xs leading-relaxed text-white/95">
                Control Panel + nearby citizens have been alerted. Green corridor will open on your route.
              </p>
              <button onClick={handleCancelSOS}
                className="mt-3 w-full py-2 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-bold border border-white/30 transition-colors">
                ✕ Cancel SOS
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[2000] bg-cyan-500 text-slate-950 px-6 py-3 rounded-2xl font-bold shadow-2xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> {toast}
        </div>
      )}

      {showReportModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[1000] p-4">
          <div className="relative bg-slate-900 border border-slate-800 rounded-3xl p-8 w-full max-w-md shadow-2xl max-h-[92vh] overflow-auto">
            <button onClick={closeReportModal}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors" title="Close">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-2xl font-bold text-white mb-2">Report Hazard</h2>
            <p className="text-xs text-slate-400 mb-6 flex items-center gap-1.5">
              <MousePointerClick className="w-3.5 h-3.5 text-cyan-400" /> Photo required · Click map to fine-tune location
            </p>
            <form onSubmit={handleReportSubmit}>
              <div className="space-y-5">
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                  <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1">Pinned Location</p>
                  <p className="text-xs text-cyan-400 font-mono">
                    {pickedPin ? `${pickedPin.lat.toFixed(5)}, ${pickedPin.lng.toFixed(5)}` : 'No location set'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Hazard Type</label>
                  <select value={hazardType} onChange={e => setHazardType(e.target.value as HazardType)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-cyan-500">
                    <option value="accident">Accident</option>
                    <option value="waterlogging">Waterlogging</option>
                    <option value="rally">Rally/Protest</option>
                    <option value="construction">Construction</option>
                    <option value="pothole">Pothole</option>
                    <option value="other">Others (specify)</option>
                  </select>
                </div>
                {hazardType === 'other' && (
                  <input required type="text" placeholder="Describe the hazard..." value={customHazard}
                    onChange={e => setCustomHazard(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-cyan-500 outline-none" />
                )}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Description <span className="text-red-400">*</span>
                  </label>
                  <textarea name="desc" rows={3} required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-cyan-500"
                    placeholder="Describe the situation... (keywords like collision, flood, pothole improve AI trust)" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Photo Evidence <span className="text-red-400">*</span>
                    <span className="text-[10px] text-slate-500 ml-1 font-normal">(required for AI verification)</span>
                  </label>
                  {!photoDataUrl ? (
                    <label className="block cursor-pointer">
                      <input ref={fileInputRef} type="file" accept="image/*" capture="environment"
                        onChange={handlePhotoUpload} className="hidden" />
                      <div className="border-2 border-dashed border-slate-700 rounded-2xl p-6 flex flex-col items-center justify-center text-slate-500 hover:border-cyan-500/50 hover:bg-slate-950/70 transition-all bg-slate-950/50">
                        <div className="w-12 h-12 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mb-3">
                          <Camera className="w-6 h-6 text-cyan-400" />
                        </div>
                        <span className="text-sm font-medium text-slate-300">Tap to capture / upload photo</span>
                        <span className="text-[10px] text-slate-500 mt-1">JPG, PNG · Max 4 MB</span>
                      </div>
                    </label>
                  ) : (
                    <div className="relative rounded-2xl overflow-hidden border border-cyan-500/40 bg-slate-950">
                      <img src={photoDataUrl} alt="Hazard evidence" className="w-full h-44 object-cover" />
                      <button type="button" onClick={removePhoto}
                        className="absolute top-2 right-2 p-2 rounded-xl bg-red-500/90 text-white hover:bg-red-500 transition-colors shadow-lg">
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <div className="absolute bottom-2 left-2 bg-slate-900/90 backdrop-blur border border-cyan-500/40 text-cyan-300 text-[10px] font-bold px-2 py-1 rounded-lg">
                        ✓ {photoName || 'photo.jpg'}
                      </div>
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
                  <MapPin className="w-3 h-3" /> Sent to Control Panel · AI will compute trust score
                </p>
              </div>
              <div className="flex gap-3 mt-8">
                <button type="button" onClick={closeReportModal}
                  className="flex-1 py-3 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 font-medium">Cancel</button>
                <button type="submit" disabled={!canSubmit}
                  className="flex-1 py-3 rounded-xl bg-cyan-500 text-slate-950 font-bold hover:bg-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                  {canSubmit ? 'Submit Report' : 'Photo Required'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slide-in {
          from { transform: translateX(120%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-slide-in { animation: slide-in 0.4s ease-out; }
      `}</style>
    </div>
  );
};