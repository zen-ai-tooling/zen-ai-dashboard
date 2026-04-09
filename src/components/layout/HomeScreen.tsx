import React from 'react';
import { ArrowRight, Clock } from 'lucide-react';

type ActiveModule = 'bleeders_1' | 'bleeders_2' | 'lifetime_bleeders' | null;

interface HomeScreenProps {
  onSelectModule: (module: ActiveModule) => void;
}

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning, operator';
  if (hour < 17) return 'Good afternoon, operator';
  return 'Good evening, operator';
};

const getTimeString = () => {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });
};

const MODULES = [
  {
    id: 'bleeders_1' as const,
    name: 'Bleeders 1.0',
    desc: 'Identify high-spend, zero-conversion search terms and targets across SP, SB, and SD campaigns.',
    dot: '#EF4444',
  },
  {
    id: 'bleeders_2' as const,
    name: 'Bleeders 2.0',
    desc: 'Track-based analysis with inline decisions and automated Amazon bulk file generation.',
    dot: '#F59E0B',
  },
  {
    id: 'lifetime_bleeders' as const,
    name: 'Lifetime Audit',
    desc: 'Extended click audit — find targets with 10+ lifetime clicks and zero sales.',
    dot: '#8B5CF6',
  },
];

export const HomeScreen: React.FC<HomeScreenProps> = ({ onSelectModule }) => {
  return (
    <div className="flex flex-col min-h-[calc(100vh-48px)]">
      <div className="pt-8 pb-8 flex-1">
        {/* Greeting */}
        <div className="mb-8">
          <h1 className="text-[22px] font-semibold text-foreground tracking-tight">{getGreeting()}</h1>
          <p className="text-[13px] text-[hsl(var(--text-secondary))] mt-1.5 flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-[hsl(var(--text-tertiary))]" />
            {getTimeString()}
          </p>
        </div>

        {/* Module cards */}
        <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[hsl(var(--text-tertiary))] mb-3">
          Modules
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {MODULES.map((m) => (
            <button
              key={m.id}
              onClick={() => onSelectModule(m.id)}
              className="group text-left rounded-xl border border-border bg-card p-5 btn-press card-hover"
            >
              <div className="flex items-center gap-2.5 mb-2.5">
                <span className="w-[7px] h-[7px] rounded-full flex-shrink-0" style={{ backgroundColor: m.dot }} />
                <span className="text-[15px] font-semibold text-foreground">{m.name}</span>
              </div>
              <p className="text-[13px] text-[hsl(var(--text-secondary))] leading-relaxed">{m.desc}</p>
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/60">
                <span className="text-[11px] text-[hsl(var(--text-tertiary))]">No recent runs</span>
                <ArrowRight className="w-3.5 h-3.5 text-[hsl(var(--text-tertiary))] opacity-0 group-hover:opacity-100" style={{ transition: 'opacity 150ms ease' }} />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-border/60 py-4 flex items-center justify-between">
        <span className="text-[11px] text-[hsl(var(--text-tertiary))]">Zen AI · Amazon Ads Workflow Tool</span>
        <span className="text-[11px] text-[hsl(var(--text-tertiary))/0.5]">v2.0</span>
      </div>
    </div>
  );
};
