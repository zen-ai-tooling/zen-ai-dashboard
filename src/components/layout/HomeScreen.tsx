import React from 'react';
import { ArrowRight, Clock, BarChart3, Zap, Shield } from 'lucide-react';

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
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
};

const MODULES = [
  {
    id: 'bleeders_1' as const,
    name: 'Bleeders 1.0',
    desc: 'Identify high-spend, zero-conversion search terms and targets across SP, SB, and SD campaigns.',
    icon: BarChart3,
    gradient: 'from-red-500/8 to-red-500/2',
    accentBorder: 'border-t-red-500',
    dot: 'bg-red-500',
    dotGlow: 'shadow-red-500/25',
  },
  {
    id: 'bleeders_2' as const,
    name: 'Bleeders 2.0',
    desc: 'Track-based analysis with inline decisions and automated Amazon bulk file generation.',
    icon: Zap,
    gradient: 'from-amber-500/8 to-amber-500/2',
    accentBorder: 'border-t-amber-500',
    dot: 'bg-amber-500',
    dotGlow: 'shadow-amber-500/25',
  },
  {
    id: 'lifetime_bleeders' as const,
    name: 'Lifetime Audit',
    desc: 'Extended click audit — find targets with 10+ lifetime clicks and zero sales.',
    icon: Shield,
    gradient: 'from-purple-500/8 to-purple-500/2',
    accentBorder: 'border-t-purple-500',
    dot: 'bg-purple-500',
    dotGlow: 'shadow-purple-500/25',
  },
];

const SHORTCUTS = [
  { label: 'Upload bulk file', key: '⌘U' },
  { label: 'Reset session', key: '⌘R' },
  { label: 'Open help', key: '?' },
];

export const HomeScreen: React.FC<HomeScreenProps> = ({ onSelectModule }) => {
  return (
    <div className="flex flex-col min-h-[calc(100vh-48px)]">
      {/* Main content — pushed up, not centered */}
      <div className="pt-10 pb-8 flex-1">
        {/* Greeting */}
        <div className="mb-8">
          <h1 className="text-[26px] font-semibold text-foreground font-display tracking-tight leading-tight">
            {getGreeting()}
          </h1>
          <p className="text-[13px] text-muted-foreground mt-2 flex items-center gap-2">
            <Clock className="w-3.5 h-3.5" />
            {getTimeString()}
          </p>
        </div>

        {/* Module cards */}
        <div className="mb-3">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-3">
            Modules
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {MODULES.map((m) => {
            const Icon = m.icon;
            return (
              <button
                key={m.id}
                onClick={() => onSelectModule(m.id)}
                className={`group text-left rounded-xl border border-border/60 bg-gradient-to-b ${m.gradient} border-t-2 ${m.accentBorder} overflow-hidden btn-press`}
                style={{ transition: 'border-color 200ms ease, box-shadow 200ms ease, transform 100ms ease' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'hsl(var(--border))';
                  e.currentTarget.style.boxShadow = '0 4px 24px -4px hsl(var(--foreground) / 0.06)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '';
                  e.currentTarget.style.boxShadow = '';
                }}
              >
                <div className="p-5 pb-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <span className={`w-2 h-2 rounded-full ${m.dot} shadow-sm ${m.dotGlow}`} />
                      <span className="text-[15px] font-medium text-foreground font-display">{m.name}</span>
                    </div>
                    <Icon className="w-4 h-4 text-muted-foreground/60" />
                  </div>
                  <p className="text-[12px] text-muted-foreground leading-relaxed">{m.desc}</p>
                </div>
                <div className="px-5 py-3 border-t border-border/40 flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">No recent runs</span>
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity translate-x-0 group-hover:translate-x-0.5" style={{ transition: 'opacity 150ms ease, transform 150ms ease' }} />
                </div>
              </button>
            );
          })}
        </div>

        {/* Quick access section */}
        <div className="mt-10">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-3">
            Quick Access
          </p>
          <div className="flex items-center gap-2">
            {SHORTCUTS.map((s) => (
              <div
                key={s.label}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border/40 bg-secondary/40 text-[12px] text-muted-foreground"
              >
                <span>{s.label}</span>
                <kbd className="text-[10px] font-mono-nums bg-background border border-border rounded px-1.5 py-0.5 text-muted-foreground/70">
                  {s.key}
                </kbd>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-border/40 py-4 flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground/60">
          GNO Ad Ops · Amazon Ads Workflow Tool
        </span>
        <span className="text-[11px] text-muted-foreground/40">
          v2.0
        </span>
      </div>
    </div>
  );
};
