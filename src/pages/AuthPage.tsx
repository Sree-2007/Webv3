import React, { useState } from 'react';
import { useApp } from '../App';
import { ArrowLeft, Eye, EyeOff, Shield, User as UserIcon } from 'lucide-react';
import { User } from '../types';
import { DEMO_CITIZEN_USERS, DEMO_CONTROL_USERS } from '../demoUsers';

interface Props {
  mode: 'citizen' | 'control';
  onBack: () => void;
}

export const AuthPage: React.FC<Props> = ({ mode, onBack }) => {
  const { setCurrentUser, users, addUser } = useApp();
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [regData, setRegData] = useState({
    username: '', password: '',
    vehicleType: 'Car', vehicleNo: '', customVehicleType: '',
    name: '', policeId: '', area: '',
  });

  const isCitizen = mode === 'citizen';
  const demoList = isCitizen ? DEMO_CITIZEN_USERS : DEMO_CONTROL_USERS;

  const findUser = (username: string, password: string): User | null => {
    const u = username.trim();
    const fromState = users.find(x => x.username === u && x.password === password);
    if (fromState) return fromState;
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
      setError(`This account is not a ${isCitizen ? 'Citizen' : 'Control Panel'} account.`);
      return;
    }
    setCurrentUser(user);
  };

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

    const newUser: User = isCitizen
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

  // Shared input classes — explicitly dark text on white bg
  const inputBase =
    'w-full px-4 py-3 border border-gray-300 rounded-xl bg-white text-gray-900 placeholder-gray-400 ' +
    'focus:outline-none focus:ring-2 transition-all text-[15px]';
  const inputAccent = isCitizen
    ? ' focus:ring-cyan-500 focus:border-cyan-500'
    : ' focus:ring-amber-500 focus:border-amber-500';

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 flex relative">

      {/* ═════════════ BACK BUTTON — topmost-leftmost of the entire page ═════════════ */}
      <button
        onClick={onBack}
        aria-label="Go back"
        className="fixed top-5 left-5 z-[999] w-11 h-11 rounded-full flex items-center justify-center
                   bg-slate-900/75 hover:bg-slate-900 backdrop-blur-md border border-white/15
                   shadow-lg transition-all active:scale-95"
      >
        <ArrowLeft className="w-5 h-5 text-white" />
      </button>

      {/* ═════════════ LEFT PANEL — IMAGE / BRAND (hidden on mobile) ═════════════ */}
      <div className="hidden md:flex md:w-1/2 relative overflow-hidden min-h-screen">
        <img
          src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTFOj8prGU99dzkO1WafZhdaypz3JbHbOByT5D7RY_BgQ&s=10"
          alt="DRISHTI Brand"
          className="absolute inset-0 w-full h-full object-cover opacity-40"
        />
        <div
          className={`absolute inset-0 bg-gradient-to-br ${
            isCitizen
              ? 'from-cyan-900/80 via-slate-950/90 to-slate-950'
              : 'from-amber-900/80 via-slate-950/90 to-slate-950'
          }`}
        />

        {/* Brand content centered */}
        <div className="relative z-10 flex flex-col justify-center items-center w-full px-10 text-center">
          <div
            className={`w-28 h-28 rounded-full flex items-center justify-center border-2 mb-8 ${
              isCitizen
                ? 'bg-cyan-500/15 border-cyan-500/60 shadow-[0_0_60px_rgba(6,182,212,0.5)]'
                : 'bg-amber-500/15 border-amber-500/60 shadow-[0_0_60px_rgba(245,158,11,0.5)]'
            }`}
          >
            <EyeMark color={isCitizen ? '#22d3ee' : '#fbbf24'} />
          </div>

          <h1 className="text-6xl font-bold tracking-tighter text-white mb-3">
            DRISHTI
          </h1>
          <p
            className={`text-sm tracking-[0.35em] uppercase font-semibold mb-6 ${
              isCitizen ? 'text-cyan-300/80' : 'text-amber-300/80'
            }`}
          >
            See Traffic Differently
          </p>
          <p className="text-base text-slate-300/80 max-w-md leading-relaxed">
            Dynamic Roadway Intelligence System for Hazard Tracking &amp; Intervention
          </p>

          <div className="mt-10 flex items-center gap-3 text-[10px] uppercase tracking-widest text-slate-500">
            <span>Smart Cities</span>
            <span className="w-1 h-1 rounded-full bg-slate-600" />
            <span>Safer Roads</span>
            <span className="w-1 h-1 rounded-full bg-slate-600" />
            <span>Smoother Tomorrow</span>
          </div>
        </div>
      </div>

      {/* ═════════════ RIGHT PANEL — FORM (scrollable) ═════════════ */}
      <div className="w-full md:w-1/2 flex justify-center bg-white relative">
        {/* Scrollable container */}
        <div className="w-full max-w-md px-6 md:px-8 py-20 md:py-10 overflow-y-auto">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-3">
              {isCitizen ? (
                <UserIcon className="w-6 h-6 text-cyan-600" />
              ) : (
                <Shield className="w-6 h-6 text-amber-600" />
              )}
              <h1 className="text-3xl font-bold text-gray-900">
                {isLogin ? 'Welcome Back' : 'Create an Account'}
              </h1>
            </div>
            <p className="text-gray-600 text-sm">
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
              <button
                type="button"
                onClick={() => { setIsLogin(!isLogin); setError(''); }}
                className={`${
                  isCitizen
                    ? 'text-cyan-600 hover:text-cyan-700'
                    : 'text-amber-600 hover:text-amber-700'
                } font-medium`}
              >
                {isLogin ? 'Sign up' : 'Log in'}
              </button>
            </p>
            <p className={`text-xs mt-1 ${isCitizen ? 'text-cyan-600' : 'text-amber-600'}`}>
              {isCitizen ? 'Citizen Portal' : 'Control Panel · Police / Operator'}
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm text-center">
              {error}
            </div>
          )}

          {/* ───────── LOGIN FORM ───────── */}
          {isLogin ? (
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Username
                </label>
                <input
                  type="text"
                  autoComplete="username"
                  value={loginData.username}
                  onChange={e => setLoginData({ ...loginData, username: e.target.value })}
                  placeholder={isCitizen ? 'citizen' : 'police'}
                  className={inputBase + inputAccent}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={loginData.password}
                    onChange={e => setLoginData({ ...loginData, password: e.target.value })}
                    placeholder="••••••••"
                    className={inputBase + inputAccent + ' pr-12'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5 text-gray-500" />
                    ) : (
                      <Eye className="w-5 h-5 text-gray-500" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className={`w-full py-3 px-4 rounded-xl font-medium text-white transition-colors ${
                  isCitizen
                    ? 'bg-cyan-600 hover:bg-cyan-700'
                    : 'bg-amber-500 hover:bg-amber-600'
                }`}
              >
                Sign In
              </button>
            </form>
          ) : (
            /* ───────── REGISTER FORM ───────── */
            <form onSubmit={handleRegister} className="space-y-5">
              {!isCitizen && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name
                    </label>
                    <input
                      required
                      type="text"
                      value={regData.name}
                      onChange={e => setRegData({ ...regData, name: e.target.value })}
                      placeholder="Insp. Rajesh Kumar"
                      className={inputBase + inputAccent}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Police ID
                      </label>
                      <input
                        required
                        type="text"
                        value={regData.policeId}
                        onChange={e => setRegData({ ...regData, policeId: e.target.value })}
                        placeholder="BLR-1234"
                        className={inputBase + inputAccent}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Area
                      </label>
                      <input
                        required
                        type="text"
                        value={regData.area}
                        onChange={e => setRegData({ ...regData, area: e.target.value })}
                        placeholder="Silk Board"
                        className={inputBase + inputAccent}
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Username
                </label>
                <input
                  required
                  type="text"
                  value={regData.username}
                  onChange={e => setRegData({ ...regData, username: e.target.value })}
                  className={inputBase + inputAccent}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    required
                    type={showPassword ? 'text' : 'password'}
                    value={regData.password}
                    onChange={e => setRegData({ ...regData, password: e.target.value })}
                    className={inputBase + inputAccent + ' pr-12'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5 text-gray-500" />
                    ) : (
                      <Eye className="w-5 h-5 text-gray-500" />
                    )}
                  </button>
                </div>
              </div>

              {isCitizen && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Vehicle Type
                    </label>
                    <select
                      value={regData.vehicleType}
                      onChange={e => setRegData({ ...regData, vehicleType: e.target.value })}
                      className={inputBase + inputAccent + ' appearance-none cursor-pointer'}
                      style={{
                        backgroundImage:
                          "url(\"data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e\")",
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'right 12px center',
                        backgroundSize: '18px',
                        paddingRight: '40px',
                      }}
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
                      onChange={e =>
                        setRegData({ ...regData, customVehicleType: e.target.value })
                      }
                      className={inputBase + inputAccent}
                    />
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Vehicle Number
                    </label>
                    <input
                      required
                      type="text"
                      placeholder="KA-01-AB-1234"
                      value={regData.vehicleNo}
                      onChange={e => setRegData({ ...regData, vehicleNo: e.target.value })}
                      className={inputBase + inputAccent}
                    />
                  </div>
                </>
              )}

              <button
                type="submit"
                className={`w-full py-3 px-4 rounded-xl font-medium text-white transition-colors ${
                  isCitizen
                    ? 'bg-cyan-600 hover:bg-cyan-700'
                    : 'bg-amber-500 hover:bg-amber-600'
                }`}
              >
                Create Account
              </button>
            </form>
          )}

          {/* ───────── DEMO QUICK-LOGIN ───────── */}
          <div className="mt-6 pt-6 border-b-0 border-t border-gray-200">
            <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-3">
              One-Click Demo Login
            </p>
            <div className="grid grid-cols-1 gap-2">
              {demoList.map(u => (
                <button
                  key={u.username}
                  type="button"
                  onClick={() => quickLogin(u)}
                  className="group flex items-center justify-between px-4 py-3 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 transition-all text-left"
                >
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {u.vehicleType === 'Ambulance'
                        ? '🚑 Ambulance Driver'
                        : u.role === 'control'
                        ? '👮 Police Officer'
                        : '🚗 Citizen Driver'}
                    </p>
                    <p className="text-[10px] text-gray-500 font-mono mt-0.5">
                      {u.username} / {u.password}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity ${
                      isCitizen ? 'text-cyan-600' : 'text-amber-600'
                    }`}
                  >
                    Login →
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Bottom spacer for scroll comfort */}
          <div className="h-6" />
        </div>
      </div>
    </div>
  );
};

/* ──────── EYE ICON ──────── */
const EyeMark: React.FC<{ color: string }> = ({ color }) => (
  <svg viewBox="0 0 40 40" className="w-16 h-16" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="20" cy="20" rx="16" ry="10" fill="none" stroke={color} strokeWidth="2.5" />
    <circle cx="20" cy="20" r="6" fill={color} />
    <circle cx="20" cy="20" r="2.5" fill="#0f172a" />
    <circle cx="21.5" cy="18.5" r="0.8" fill="#ffffff" opacity="0.85" />
  </svg>
);

export default AuthPage;
