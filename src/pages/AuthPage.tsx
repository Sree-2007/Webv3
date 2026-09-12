import React, { useState } from 'react';
import { useApp } from '../App';
import { GlassButton } from '@/components/ui/glass-button';
import { ArrowLeft, Shield, User as UserIcon, Sparkles } from 'lucide-react';
import { User, UserRole } from '../types';
import { DEMO_CITIZEN_USERS, DEMO_CONTROL_USERS } from '../demoUsers';

interface Props {
  mode: 'citizen' | 'control';
  onBack: () => void;
}

export const AuthPage: React.FC<Props> = ({ mode, onBack }) => {
  const { setCurrentUser, users, addUser } = useApp();
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');

  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [regData, setRegData] = useState({
    username: '', password: '',
    vehicleType: 'Car', vehicleNo: '', customVehicleType: '',
    name: '', policeId: '', area: '',
  });

  const isCitizen = mode === 'citizen';
  const demoList = isCitizen ? DEMO_CITIZEN_USERS : DEMO_CONTROL_USERS;

  /**
   * Bulletproof login: try state first, fall back to demo list.
   * Trims whitespace from username, compares password exactly.
   */
  const findUser = (username: string, password: string): User | null => {
    const u = username.trim();
    // Search the live state first (so registered users work)
    const fromState = users.find(x => x.username === u && x.password === password);
    if (fromState) return fromState;
    // Fallback to demo users (safety net)
    const fromDemo = demoList.find(x => x.username === u && x.password === password);
    return fromDemo ?? null;
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const user = findUser(loginData.username, loginData.password);
    if (!user) {
      setError('Invalid credentials. Use a demo login below or check your details.');
      return;
    }
    if (user.role !== mode) {
      setError(
        `This account is not a ${mode === 'citizen' ? 'Citizen' : 'Control Panel'} account.`
      );
      return;
    }
    setCurrentUser(user);
  };

  /** One-click demo login — bypasses form entirely */
  const quickLogin = (user: User) => {
    setError('');
    if (user.role !== mode) {
      setError('Wrong portal for this account. Go back and try the other one.');
      return;
    }
    setCurrentUser(user);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const uname = regData.username.trim();
    if (!uname) { setError('Username cannot be empty'); return; }
    if (users.find(u => u.username === uname)) {
      setError('Username already exists');
      return;
    }

    const newUser: User =
      mode === 'citizen'
        ? {
            username: uname,
            password: regData.password,
            role: 'citizen',
            vehicleType: regData.vehicleType,
            vehicleNo: regData.vehicleNo,
            customVehicleType:
              regData.vehicleType === 'Other' ? regData.customVehicleType : undefined,
          }
        : {
            username: uname,
            password: regData.password,
            role: 'control',
            vehicleType: 'Govt',
            vehicleNo: regData.policeId || 'POLICE-NEW',
            name: regData.name,
            policeId: regData.policeId,
            area: regData.area,
          };
    addUser(newUser);
    setCurrentUser(newUser);
  };

  const accent = isCitizen ? 'cyan' : 'amber';

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative">
      <div
        className={`absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] ${
          isCitizen ? 'from-cyan-900/20' : 'from-amber-900/20'
        } via-slate-950 to-slate-950 -z-10`}
      />

      <div className="w-full max-w-md">
        <button
          onClick={onBack}
          className="mb-6 flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </button>

        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-2">
            {isCitizen ? (
              <UserIcon className="w-6 h-6 text-cyan-400" />
            ) : (
              <Shield className="w-6 h-6 text-amber-400" />
            )}
            <h1 className="text-2xl font-bold text-white">
              {isCitizen ? 'Citizen Portal' : 'Control Panel'}
            </h1>
          </div>
          <p className="text-slate-400 text-sm mb-6">
            {isCitizen
              ? 'Access route planner, SOS, and hazard reporting.'
              : 'Operator & Traffic Police Command Center.'}
          </p>

          <div className="flex bg-slate-950 p-1 rounded-full border border-slate-800 mb-6">
            <button
              onClick={() => { setIsLogin(true); setError(''); }}
              className="flex-1 px-6 py-2 rounded-full text-sm font-bold transition-colors"
              style={
                isLogin
                  ? { background: isCitizen ? '#06b6d4' : '#f59e0b', color: '#0a0a0f' }
                  : { color: '#94a3b8' }
              }
            >
              Login
            </button>
            <button
              onClick={() => { setIsLogin(false); setError(''); }}
              className="flex-1 px-6 py-2 rounded-full text-sm font-bold transition-colors"
              style={
                !isLogin
                  ? { background: isCitizen ? '#06b6d4' : '#f59e0b', color: '#0a0a0f' }
                  : { color: '#94a3b8' }
              }
            >
              Register
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded-xl text-red-400 text-sm text-center">
              {error}
            </div>
          )}

          {isLogin ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Username</label>
                <input
                  type="text"
                  autoComplete="username"
                  value={loginData.username}
                  onChange={e => setLoginData({ ...loginData, username: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-cyan-500 outline-none"
                  placeholder={isCitizen ? 'citizen' : 'police'}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Password</label>
                <input
                  type="password"
                  autoComplete="current-password"
                  value={loginData.password}
                  onChange={e => setLoginData({ ...loginData, password: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-cyan-500 outline-none"
                  placeholder="••••••••"
                />
              </div>
              <GlassButton type="submit" className="w-full justify-center mt-6">
                <span className="px-4">Sign In</span>
              </GlassButton>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              {!isCitizen && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Full Name</label>
                    <input
                      required
                      type="text"
                      value={regData.name}
                      onChange={e => setRegData({ ...regData, name: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Police ID</label>
                      <input
                        required
                        type="text"
                        value={regData.policeId}
                        onChange={e => setRegData({ ...regData, policeId: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-amber-500 outline-none"
                        placeholder="BLR-1234"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Area</label>
                      <input
                        required
                        type="text"
                        value={regData.area}
                        onChange={e => setRegData({ ...regData, area: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-amber-500 outline-none"
                        placeholder="Silk Board"
                      />
                    </div>
                  </div>
                </>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Username</label>
                <input
                  required
                  type="text"
                  value={regData.username}
                  onChange={e => setRegData({ ...regData, username: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-cyan-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Password</label>
                <input
                  required
                  type="password"
                  value={regData.password}
                  onChange={e => setRegData({ ...regData, password: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-cyan-500 outline-none"
                />
              </div>

              {isCitizen && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Vehicle Type</label>
                    <select
                      value={regData.vehicleType}
                      onChange={e => setRegData({ ...regData, vehicleType: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none"
                    >
                      <option value="Car">Car</option>
                      <option value="Bike">Bike</option>
                      <option value="Cycle">Cycle</option>
                      <option value="Ambulance">Ambulance (SOS Enabled)</option>
                      <option value="Govt">Government</option>
                      <option value="School">School</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  {regData.vehicleType === 'Other' && (
                    <input
                      required
                      type="text"
                      placeholder="Specify vehicle type"
                      value={regData.customVehicleType}
                      onChange={e => setRegData({ ...regData, customVehicleType: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-cyan-500 outline-none"
                    />
                  )}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Vehicle Number</label>
                    <input
                      required
                      type="text"
                      placeholder="KA-01-AB-1234"
                      value={regData.vehicleNo}
                      onChange={e => setRegData({ ...regData, vehicleNo: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-cyan-500 outline-none"
                    />
                  </div>
                </>
              )}

              <GlassButton type="submit" className="w-full justify-center mt-6">
                <span className="px-4">Register</span>
              </GlassButton>
            </form>
          )}

          {/* ---- ONE-CLICK DEMO LOGINS ---- */}
          <div className="mt-6 pt-6 border-t border-slate-800">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles
                className="w-3.5 h-3.5"
                style={{ color: isCitizen ? '#06b6d4' : '#f59e0b' }}
              />
              <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">
                One-Click Demo Login
              </p>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {demoList.map(u => (
                <button
                  key={u.username}
                  type="button"
                  onClick={() => quickLogin(u)}
                  className="group flex items-center justify-between px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-600 hover:bg-slate-900 transition-all text-left"
                >
                  <div>
                    <p className="text-sm font-bold text-white">
                      {u.vehicleType === 'Ambulance'
                        ? '🚑 Ambulance Driver'
                        : u.role === 'control'
                        ? '👮 Police Officer'
                        : '🚗 Citizen Driver'}
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                      {u.username} / {u.password}
                    </p>
                  </div>
                  <span
                    className="text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ color: isCitizen ? '#06b6d4' : '#f59e0b' }}
                  >
                    Login →
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};