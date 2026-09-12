import React from 'react';
import { SonarGrid } from '@/components/ui/sonar-grid';
import { GlassButton } from '@/components/ui/glass-button';
import { ArrowRight, Activity, Shield, Zap, Leaf } from 'lucide-react';
import { motion } from 'motion/react';

interface Props {
  onCitizen: () => void;
  onControl: () => void;
}

export const LandingPage: React.FC<Props> = ({ onCitizen, onControl }) => {
  return (
    <SonarGrid className="min-h-screen w-full bg-slate-950 flex flex-col items-center justify-center p-6" color="#06b6d4">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-900/30 via-slate-950/90 to-slate-950 -z-10" />
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="max-w-5xl w-full flex flex-col items-center text-center z-10"
      >
        <div className="flex items-center gap-6 mb-8">
          <div className="w-20 h-20 rounded-full bg-cyan-500/20 flex items-center justify-center border-2 border-cyan-500/50 shadow-[0_0_40px_rgba(6,182,212,0.4)]">
            <Activity className="w-10 h-10 text-cyan-400" />
          </div>
          <h1 className="text-7xl md:text-9xl font-bold tracking-tighter text-white drop-shadow-2xl">DRISHTI</h1>
        </div>
        <p className="text-2xl md:text-3xl text-cyan-100/80 mb-16 max-w-3xl font-light tracking-wide">
          Smart Urban Traffic Management. Real-time insight. Smarter decisions. Better mobility.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 w-full mb-20">
          {[
            { icon: Shield, title: 'Real-time Monitoring', desc: 'AI-powered cameras track traffic and incidents instantly.' },
            { icon: Zap, title: 'Dynamic Signal Control', desc: 'Adapts to live conditions for smoother flow.' },
            { icon: Activity, title: 'Data-Driven Insights', desc: 'Predictive trends for urban planners.' },
            { icon: Leaf, title: 'Greener Cities', desc: 'Less idling, lower emissions, healthier future.' },
          ].map((f, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + 0.1 * i }}
              className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 p-8 rounded-3xl flex flex-col items-center text-center hover:bg-slate-800/80 transition-colors">
              <f.icon className="w-10 h-10 text-cyan-400 mb-5" />
              <h3 className="font-semibold text-white text-lg mb-3">{f.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.6 }}
          className="flex flex-wrap gap-6 justify-center">
          <GlassButton onClick={onCitizen} className="text-white px-8 py-4">
            <div className="flex items-center gap-3 text-lg">Citizen Login <ArrowRight className="w-5 h-5" /></div>
          </GlassButton>
          <GlassButton onClick={onControl} className="text-cyan-400 border-cyan-500/30 px-8 py-4">
            <div className="text-lg">Control Panel Login</div>
          </GlassButton>
        </motion.div>
      </motion.div>
    </SonarGrid>
  );
};