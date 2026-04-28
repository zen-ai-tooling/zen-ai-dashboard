import React from 'react';
import { ArrowUpRight } from 'lucide-react';

type ActiveModule = 'bleeders_1' | 'bleeders_2' | 'lifetime_bleeders' | null;

interface HomeScreenProps {
  onSelectModule: (module: ActiveModule) => void;
}

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

const getTimeString = () =>
  new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

const MODULES = [
  {
    id: 'bleeders_1' as const,
    name: 'Bleeders 1.0',
    desc: 'Identify high-spend, zero-conversion search terms and targets across SP, SB, and SD campaigns.',
    dot: 'hsl(var(--destructive))',
    tag: 'Standard',
  },
  {
    id: 'bleeders_2' as const,
    name: 'Bleeders 2.0',
    desc: 'Track-based analysis with inline decisions and automated Amazon bulk file generation.',
    dot: 'hsl(var(--amber))',
    tag: 'Recommended',
  },
  {
    id: 'lifetime_bleeders' as const,
    name: 'Lifetime Audit',
    desc: 'Extended click audit — find targets with 10+ lifetime clicks and zero sales.',
    dot: 'hsl(265 70% 60%)',
    tag: 'Audit',
  },
];

export const HomeScreen: React.FC<HomeScreenProps> = ({ onSelectModule }) => {
  return (
    <div className="flex flex-col min-h-[calc(100vh-120px)]">
      <div className="pt-6 pb-10 flex-1">
        {/* Greeting */}
        <div className="mb-10">
          <p className="text-[12px] text-[hsl(var(--text-tertiary))] tracking-wide uppercase font-medium">{getTimeString()}</p>
          <h1 className="text-[28px] font-semibold text-foreground tracking-tight mt-1">{getGreeting()}, operator</h1>
          <p className="text-[14px] text-[hsl(var(--text-secondary))] mt-2 max-w-md">
            Pick a workflow below to start a new session.
          </p>
        </div>

        {/* Module cards */}
        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[hsl(var(--text-tertiary))] mb-3">
          Workflows
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {MODULES.map((m) => (
            <button
              key={m.id}
              onClick={() => onSelectModule(m.id)}
              className="group text-left rounded-xl border border-border bg-card p-5 shadow-card btn-press card-hover relative overflow-hidden"
            >
              <div className="flex items-start justify-between mb-3">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: m.dot }} />
                <span className="text-[10px] font-medium uppercase tracking-wider text-[hsl(var(--text-tertiary))]">
                  {m.tag}
                </span>
              </div>
              <div className="text-[15px] font-semibold text-foreground tracking-tight">{m.name}</div>
              <p className="text-[12.5px] text-[hsl(var(--text-secondary))] leading-relaxed mt-1.5">{m.desc}</p>
              <div className="flex items-center justify-between mt-5 pt-3 border-t border-border/70">
                <span className="text-[11px] text-[hsl(var(--text-tertiary))]">No recent runs</span>
                <ArrowUpRight
                  className="w-3.5 h-3.5 text-[hsl(var(--text-tertiary))] opacity-0 group-hover:opacity-100 group-hover:text-foreground transition-all duration-150"
                />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-border/60 py-4 flex items-center justify-between">
        <span className="text-[11px] text-[hsl(var(--text-tertiary))]">Zen AI · Amazon Ads Workflow</span>
        <span className="text-[11px] text-[hsl(var(--text-tertiary))] opacity-50 font-mono-nums">v2.0</span>
      </div>
    </div>
  );
};
