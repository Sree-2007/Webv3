import React from 'react';
import { SonarGrid } from '@/components/ui/sonar-grid';
import { GlassButton } from '@/components/ui/glass-button';
import { Activity, Shield, Zap, Leaf } from 'lucide-react';
import { motion } from 'motion/react';

interface Props {
  onCitizen: () => void;
  onControl: () => void;
}

export const LandingPage: React.FC<Props> = ({ onCitizen, onControl }) => {
  return (
    <SonarGrid
      className="min-h-screen w-full bg-slate-950 flex flex-col p-6"
      color="#06b6d4"
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-900/30 via-slate-950/90 to-slate-950 -z-10" />

      {/* ───────────── TOP TAGLINE ROW ───────────── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="flex justify-between items-center text-[10px] md:text-[11px] tracking-[0.25em] text-cyan-300/50 uppercase font-medium mb-4 z-10"
      >
        <span className="hidden md:block">Smart Cities / Safer Roads / A Smoother Tomorrow</span>
        <span className="ml-auto hidden md:block text-right leading-relaxed">
          AI + Data + Connected Roads<br className="hidden lg:block" /> = A Smarter City
        </span>
      </motion.div>

      {/* ───────────── NAV BAR ───────────── */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        className="flex justify-between items-center mb-16 z-10"
      >
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-cyan-500/20 flex items-center justify-center border-2 border-cyan-500/50 shadow-[0_0_25px_rgba(6,182,212,0.4)]">
            <EyeLogo />
          </div>
          <span className="text-2xl font-bold tracking-tight text-white">DRISHTI</span>
        </div>

        {/* Two login buttons (top right) */}
        <div className="flex items-center gap-3">
          <GlassButton onClick={onCitizen} className="text-white">
            <span className="px-2">Citizen Login</span>
          </GlassButton>
          <GlassButton onClick={onControl} className="text-cyan-400 border-cyan-500/30">
            <span className="px-2">Control Panel Login</span>
          </GlassButton>
        </div>
      </motion.nav>

      {/* ───────────── HERO SECTION ───────────── */}
      <div className="max-w-5xl mx-auto w-full flex flex-col items-center text-center z-10 flex-1">
        {/* SEE TRAFFIC DIFFERENTLY badge */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="mb-6"
        >
          <div className="inline-flex items-center gap-3 text-[11px] tracking-[0.35em] uppercase font-semibold text-cyan-300/70">
            <span className="w-8 h-px bg-cyan-500/40" />
            See Traffic Differently
            <span className="w-8 h-px bg-cyan-500/40" />
          </div>
        </motion.div>

        {/* Big DRISHTI title with eye */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.8, ease: 'easeOut' }}
          className="flex items-center gap-6 mb-6"
        >
          <div className="w-16 h-16 md:w-24 md:h-24 rounded-full bg-cyan-500/20 flex items-center justify-center border-2 border-cyan-500/60 shadow-[0_0_50px_rgba(6,182,212,0.55)]">
            <EyeLogoLarge />
          </div>
          <h1 className="text-6xl md:text-8xl lg:text-9xl font-bold tracking-tighter text-white drop-shadow-2xl">
            DRISHTI
          </h1>
        </motion.div>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.7 }}
          className="text-xl md:text-2xl lg:text-3xl text-cyan-100/85 mb-4 max-w-3xl font-light tracking-wide"
        >
          Dynamic Roadway Intelligence System for Hazard Tracking &amp; Intervention
        </motion.p>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.7 }}
          className="text-base md:text-lg text-slate-400 mb-4 max-w-2xl"
        >
          Smart Urban Traffic Management.
        </motion.p>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.7 }}
          className="text-base md:text-lg text-cyan-200/60 mb-14 max-w-2xl italic"
        >
          Real-time insight. Smarter decisions. Better mobility.
        </motion.p>

        {/* ───────────── FEATURES GRID ───────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full mb-16">
          {[
            {
              icon: Shield,
              title: 'Real-time Monitoring',
              desc: 'AI-powered cameras track traffic, detect incidents, and identify congestion — instantly.',
              color: 'cyan',
              delay: 0.65,
              floatDur: 4.5,
            },
            {
              icon: Zap,
              title: 'Dynamic Signal Control',
              desc: 'Adapts to live traffic conditions for smoother flow and reduced waiting time.',
              color: 'amber',
              delay: 0.75,
              floatDur: 5.2,
            },
            {
              icon: Activity,
              title: 'Data-Driven Insights',
              desc: 'Helps planners make smarter decisions with real-time analytics and predictive trends.',
              color: 'violet',
              delay: 0.85,
              floatDur: 4.8,
            },
            {
              icon: Leaf,
              title: 'Greener, Cleaner Cities',
              desc: 'Less idling, lower emissions, a healthier urban future.',
              color: 'emerald',
              delay: 0.95,
              floatDur: 5.5,
            },
          ].map((f, i) => {
            const colorClasses = {
              cyan: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
              amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
              violet: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
              emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
            }[f.color];

            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: f.delay, duration: 0.7, ease: 'easeOut' }}
                // Floating animation — subtle up/down loop
                whileInView={{
                  y: [0, -8, 0],
                }}
                viewport={{ once: false }}
                // Extra hover lift
                whileHover={{ scale: 1.03, y: -4 }}
                // Combine with a continuous loop when in view
                style={{ animationDuration: `${f.floatDur}s` }}
                className={`relative bg-slate-900/60 backdrop-blur-xl border ${colorClasses.split(' ').slice(2).join(' ')} p-7 rounded-3xl flex flex-col items-start text-left hover:bg-slate-800/80 transition-colors duration-300`}
              >
                {/* Floating pulse ring */}
                <motion.div
                  animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.7, 0.4] }}
                  transition={{ duration: f.floatDur, repeat: Infinity, ease: 'easeInOut' }}
                  className={`absolute top-6 right-6 w-12 h-12 rounded-full ${colorClasses.split(' ')[1]}`}
                />
                <f.icon className={`w-8 h-8 mb-4 ${colorClasses.split(' ')[0]}`} />
                <h3 className="font-semibold text-white text-base mb-3">{f.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
              </motion.div>
            );
          })}
        </div>

        {/* ───────────── BOTTOM CTA ───────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1, duration: 0.7 }}
          className="flex flex-col items-center gap-4 pb-8"
        >
          <p className="text-xs uppercase tracking-[0.3em] text-cyan-300/60 font-semibold">
            Smart India Hackathon 2026
          </p>
          <div className="flex items-center gap-4 text-[10px] text-slate-500 uppercase tracking-widest">
            <span>Less Congestion</span>
            <span className="w-1 h-1 rounded-full bg-slate-600" />
            <span>Safer Commutes</span>
            <span className="w-1 h-1 rounded-full bg-slate-600" />
            <span>Lower Emissions</span>
            <span className="w-1 h-1 rounded-full bg-slate-600" />
            <span>A More Livable City</span>
          </div>
        </motion.div>
      </div>
    </SonarGrid>
  );
};

/* ────────── SVG LOGOS ────────── */
const EyeLogo: React.FC = () => (
  <svg viewBox="0 0 40 40" className="w-6 h-6" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="20" cy="20" rx="16" ry="10" fill="none" stroke="#06b6d4" strokeWidth="2.5" />
    <circle cx="20" cy="20" r="5" fill="#06b6d4" />
    <circle cx="20" cy="20" r="2" fill="#0f172a" />
  </svg>
);

const EyeLogoLarge: React.FC = () => (
  <svg viewBox="0 0 40 40" className="w-10 h-10 md:w-14 md:h-14" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="20" cy="20" rx="16" ry="10" fill="none" stroke="#22d3ee" strokeWidth="2.5" />
    <circle cx="20" cy="20" r="6" fill="#22d3ee" />
    <circle cx="20" cy="20" r="2.5" fill="#0f172a" />
    <circle cx="21.5" cy="18.5" r="0.8" fill="#ffffff" opacity="0.8" />
  </svg>
);

export default LandingPage;