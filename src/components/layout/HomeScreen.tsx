import React from 'react';
import { ArrowUpRight, Clock, ChevronRight } from 'lucide-react';
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
    <div className="flex flex-col">
      <div className="pb-10" style={{ paddingTop: 40 }}>
        {/* Greeting — make it a moment */}
        <div className="mb-12">
          <p className="type-eyebrow">{getTimeString()}</p>
          <h1 className="type-page-title mt-2">{getGreeting()}, operator</h1>
          <p className="type-page-sub mt-3 max-w-md">
            Pick a workflow below to start a new session.
          </p>
        </div>

        {/* Module cards */}
        <p className="type-section-eyebrow mb-4">Workflows</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {MODULES.map((m) => {
            const lastRun = lastRunByModule[m.historyKey];
            const isRecommended = m.tag === 'Recommended';
            return (
              <button
                key={m.id}
                onClick={() => onSelectModule(m.id)}
                className="group text-left rounded-xl border border-[#E5E5EA] bg-white p-6 btn-press tile-hover relative overflow-hidden flex flex-col"
                style={{
                  minHeight: '180px',
                  boxShadow: isRecommended
                    ? '0 4px 16px rgba(0,0,0,0.08)'
                    : '0 1px 3px rgba(0,0,0,0.04)',
                }}
              >
                <div className="flex items-start justify-between mb-4">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: m.dot }} />
                  {isRecommended ? (
                    <span
                      className="text-[10px] font-semibold uppercase text-white px-2.5 py-1 rounded-full"
                      style={{ background: 'hsl(var(--amber))', letterSpacing: '0.08em' }}
                    >
                      Recommended
                    </span>
                  ) : (
                    <span
                      className="text-[10px] font-semibold uppercase text-[#86868B]"
                      style={{ letterSpacing: '0.08em' }}
                    >
                      {m.tag}
                    </span>
                  )}
                </div>
                <div className="type-card-title">{m.name}</div>
                <p className="type-card-desc mt-2 flex-1">{m.desc}</p>
                <div className="flex items-center justify-between mt-5 pt-4 border-t border-[#F0F0F2]">
                  {lastRun ? (
                    <span className="flex items-center gap-1.5 text-[12px] text-[#1D1D1F] font-medium">
                      <Clock className="w-3 h-3" strokeWidth={1.8} />
                      Last run {formatRelative(lastRun)}
                    </span>
                  ) : (
                    <span />
                  )}
                  <ArrowUpRight className="w-3.5 h-3.5 text-[#86868B] opacity-0 group-hover:opacity-100 transition-all duration-150" />
                </div>
              </button>
            );
          })}
        </div>

        {/* Recent activity */}
        <div className="mt-14">
          <p className="type-section-eyebrow mb-4">Recent activity</p>
          {recent.length === 0 ? (
            <div
              className="rounded-[10px] border border-[#E5E5EA] bg-white px-5 py-10 text-center"
              style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}
            >
              <Clock className="w-4 h-4 mx-auto text-[#86868B] opacity-60" strokeWidth={1.6} />
              <p className="text-[13px] text-[#6E6E73] mt-2 font-medium">No sessions yet</p>
              <p className="text-[12px] text-[#86868B] mt-1">
                Pick a workflow above to get started.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {recent.map((e) => (
                <div
                  key={e.id}
                  className="rounded-[10px] border border-[#E5E5EA] bg-white px-5 py-4 flex items-center gap-3 tile-hover"
                  style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-[14px] font-semibold text-[#1D1D1F] truncate">
                        {MODULE_LABELS[e.module] ?? e.module}
                      </span>
                      {e.track && (
                        <span className="text-[10.5px] font-mono-nums px-1.5 py-px rounded bg-[#F5F5F7] text-[#86868B]">
                          {e.track}
                        </span>
                      )}
                    </div>
                    <p className="text-[12px] text-[#86868B] truncate mt-0.5">
                      {e.clientName} · {e.fileName}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="flex items-center justify-end gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
                      <span className="text-[14px] font-mono-nums font-semibold text-[#1D1D1F]">
                        {e.bleedersFound.toLocaleString()} bleeders
                      </span>
                    </div>
                    <div className="text-[12px] text-[#86868B] mt-0.5">
                      {formatRelative(e.completedAt)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick start */}
        <div className="mt-14">
          <p className="type-section-eyebrow mb-4">Quick start</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { title: 'What are bleeders?', desc: 'Targets with high spend and zero or near-zero conversions.' },
              { title: 'How thresholds work', desc: 'SB/SD use Target ACoS + 10%. SP uses Target ACoS + 20%.' },
              { title: 'Bulk file guide', desc: 'Export 60-day Bulk Operations from Campaign Manager.' },
            ].map((q) => (
              <div
                key={q.title}
                className="rounded-[10px] border border-[#E5E5EA] bg-white p-4 tile-hover flex items-start justify-between gap-3 cursor-pointer"
                style={{
                  boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                  borderLeft: '3px solid rgba(0,113,227,0.3)',
                }}
              >
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold text-[#1D1D1F] tracking-tight">
                    {q.title}
                  </div>
                  <p className="text-[12.5px] text-[#6E6E73] mt-1.5 leading-relaxed">{q.desc}</p>
                </div>
                <ChevronRight
                  className="w-4 h-4 text-[#C7C7CC] flex-shrink-0 mt-0.5"
                  strokeWidth={1.8}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-[#F0F0F2] py-4 flex items-center justify-between">
        <span className="text-[12px] text-[#86868B]">Zen AI · Amazon Ads Workflow</span>
        <span className="text-[12px] text-[#A1A1A6] font-mono-nums">v2.0</span>
      </div>
    </div>
  );
};
