import React from 'react';
import { ArrowUpRight, Clock } from 'lucide-react';
import { useHistory } from '@/context/HistoryContext';

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
    historyKey: 'bleeders_1',
  },
  {
    id: 'bleeders_2' as const,
    name: 'Bleeders 2.0',
    desc: 'Track-based analysis with inline decisions and automated Amazon bulk file generation.',
    dot: 'hsl(var(--amber))',
    tag: 'Recommended',
    historyKey: 'bleeders_2',
  },
  {
    id: 'lifetime_bleeders' as const,
    name: 'Lifetime Audit',
    desc: 'Extended click audit — find targets with 10+ lifetime clicks and zero sales.',
    dot: 'hsl(265 70% 60%)',
    tag: 'Audit',
    historyKey: 'lifetime',
  },
];

const MODULE_LABELS: Record<string, string> = {
  bleeders_1: 'Bleeders 1.0',
  bleeders_2: 'Bleeders 2.0',
  lifetime: 'Lifetime Audit',
};

const formatRelative = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export const HomeScreen: React.FC<HomeScreenProps> = ({ onSelectModule }) => {
  const { entries } = useHistory();

  const lastRunByModule: Record<string, string | undefined> = {};
  entries.forEach((e) => {
    if (!lastRunByModule[e.module]) lastRunByModule[e.module] = e.completedAt;
  });

  const recent = entries.slice(0, 3);

  return (
    <div className="flex flex-col min-h-[calc(100vh-120px)]">
      <div className="pt-4 pb-10 flex-1">
        {/* Greeting */}
        <div className="mb-8">
          <p className="text-[12px] text-[hsl(var(--text-tertiary))] tracking-wide uppercase font-medium">{getTimeString()}</p>
          <h1 className="text-[28px] font-semibold text-foreground tracking-tight mt-1">{getGreeting()}, operator</h1>
          <p className="text-[14px] text-[hsl(var(--text-secondary))] mt-2 max-w-md">
            Pick a workflow below to start a new session.
          </p>
        </div>

        {/* Module cards */}
        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[hsl(var(--text-tertiary))] mb-3" style={{ letterSpacing: '0.5px' }}>
          Workflows
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {MODULES.map((m) => {
            const lastRun = lastRunByModule[m.historyKey];
            return (
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
                  <span className="text-[11px] text-[hsl(var(--text-tertiary))]">
                    {lastRun ? `Last run ${formatRelative(lastRun)}` : 'No runs yet'}
                  </span>
                  <ArrowUpRight
                    className="w-3.5 h-3.5 text-[hsl(var(--text-tertiary))] opacity-0 group-hover:opacity-100 group-hover:text-foreground transition-all duration-150"
                  />
                </div>
              </button>
            );
          })}
        </div>

        {/* Recent activity */}
        <div className="mt-10">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[hsl(var(--text-tertiary))] mb-3" style={{ letterSpacing: '0.5px' }}>
            Recent activity
          </p>
          {recent.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card/40 px-5 py-8 text-center">
              <Clock className="w-4 h-4 mx-auto text-[hsl(var(--text-tertiary))] opacity-60" strokeWidth={1.6} />
              <p className="text-[12.5px] text-[hsl(var(--text-secondary))] mt-2">
                No sessions yet — pick a workflow above to get started.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card shadow-card divide-y divide-border overflow-hidden">
              {recent.map((e) => (
                <div key={e.id} className="px-4 py-3 flex items-center gap-3 hover:bg-secondary/40 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-[13px] font-medium text-foreground truncate">
                        {MODULE_LABELS[e.module] ?? e.module}
                      </span>
                      {e.track && (
                        <span className="text-[10.5px] font-mono-nums px-1.5 py-px rounded bg-secondary text-[hsl(var(--text-tertiary))]">
                          {e.track}
                        </span>
                      )}
                    </div>
                    <p className="text-[11.5px] text-[hsl(var(--text-tertiary))] truncate mt-0.5">
                      {e.clientName} · {e.fileName}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-[12.5px] font-mono-nums text-foreground">
                      {e.bleedersFound.toLocaleString()} bleeders
                    </div>
                    <div className="text-[11px] text-[hsl(var(--text-tertiary))] mt-0.5">
                      {formatRelative(e.completedAt)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-border/60 py-4 flex items-center justify-between">
        <span className="text-[12px] text-[hsl(var(--text-tertiary))]">Zen AI · Amazon Ads Workflow</span>
        <span className="text-[12px] text-[hsl(var(--text-tertiary))] opacity-70 font-mono-nums">v2.0</span>
      </div>
    </div>
  );
};
