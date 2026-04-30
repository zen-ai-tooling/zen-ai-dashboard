import React, { useMemo } from 'react';
import { Clock, ChevronRight, CheckCircle2, AlertTriangle, HelpCircle, SlidersHorizontal, FileText } from 'lucide-react';
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
    desc: 'Find targets with zero sales that are wasting your budget',
    dot: 'hsl(var(--destructive))',
    accent: '#EF4444',
    gradient: 'linear-gradient(180deg, rgba(239, 68, 68, 0.06) 0%, #FFFFFF 50%)',
    borderColor: '#E5E5EA',
    tag: 'Standard',
    historyKey: 'bleeders_1',
  },
  {
    id: 'bleeders_2' as const,
    name: 'Bleeders 2.0',
    desc: 'Find low-performing targets with high ACoS and low sales',
    dot: 'hsl(var(--amber))',
    accent: '#F59E0B',
    gradient: 'linear-gradient(180deg, rgba(245, 158, 11, 0.06) 0%, #FFFFFF 50%)',
    borderColor: 'rgba(245,158,11,0.3)',
    tag: 'Recommended',
    historyKey: 'bleeders_2',
  },
  {
    id: 'lifetime_bleeders' as const,
    name: 'Lifetime Audit',
    desc: 'Find targets that have never converted across their entire lifetime',
    dot: 'hsl(265 70% 60%)',
    accent: '#8B5CF6',
    gradient: 'linear-gradient(180deg, rgba(139, 92, 246, 0.06) 0%, #FFFFFF 50%)',
    borderColor: '#E5E5EA',
    tag: 'Audit',
    historyKey: 'lifetime',
  },
];

const MODULE_LABELS: Record<string, string> = {
  bleeders_1: 'Bleeders 1.0',
  bleeders_2: 'Bleeders 2.0',
  lifetime: 'Lifetime Audit',
};

const MODULE_ACCENT: Record<string, string> = {
  bleeders_1: '#EF4444',
  bleeders_2: '#F59E0B',
  lifetime: '#8B5CF6',
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

  const monthStats = useMemo(() => {
    const now = new Date();
    const monthEntries = entries.filter((e) => {
      const d = new Date(e.completedAt);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    });
    const totalSpend = monthEntries.reduce((sum, e) => sum + (e.atRiskSpend || 0), 0);
    return { sessions: monthEntries.length, totalSpend };
  }, [entries]);

  const hasSessions = entries.length > 0;

  return (
    <div className="flex flex-col" style={{ paddingTop: 40 }}>
      {/* Greeting + value hook */}
      <div>
        <p className="type-eyebrow">{getTimeString()}</p>
        <h1 className="type-page-title mt-2">{getGreeting()}, operator</h1>
        {hasSessions ? (
          <p
            className="mt-3 max-w-2xl"
            style={{ fontSize: 16, fontWeight: 400, color: '#6E6E73', lineHeight: 1.5 }}
          >
            You've addressed{' '}
            <span style={{ fontSize: 24, fontWeight: 700, color: '#1D1D1F' }}>
              ${Math.round(monthStats.totalSpend).toLocaleString()}
            </span>{' '}
            in at-risk spend across{' '}
            <span style={{ fontSize: 16, fontWeight: 600, color: '#1D1D1F' }}>
              {monthStats.sessions} session{monthStats.sessions === 1 ? '' : 's'}
            </span>{' '}
            this month
          </p>
        ) : (
          <p className="type-page-sub mt-3 max-w-md">
            Start your first session to begin identifying wasted ad spend.
          </p>
        )}
      </div>

      {/* Workflows — 48px from greeting */}
      <div style={{ marginTop: 48 }}>
        <p className="type-section-eyebrow mb-4">Workflows</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {MODULES.map((m) => {
            const lastRun = lastRunByModule[m.historyKey];
            const isRecommended = m.tag === 'Recommended';
            return (
              <button
                key={m.id}
                onClick={() => onSelectModule(m.id)}
                className="group text-left rounded-xl border p-6 relative overflow-hidden flex flex-col workflow-card"
                style={{
                  minHeight: '180px',
                  cursor: 'pointer',
                  borderColor: m.borderColor,
                  background: m.gradient,
                  boxShadow: isRecommended
                    ? '0 4px 16px rgba(0,0,0,0.08)'
                    : '0 1px 3px rgba(0,0,0,0.04)',
                  transition: 'transform 200ms ease, box-shadow 200ms ease',
                }}
                onMouseEnter={(ev) => {
                  ev.currentTarget.style.transform = 'translateY(-2px)';
                  ev.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)';
                }}
                onMouseLeave={(ev) => {
                  ev.currentTarget.style.transform = 'translateY(0)';
                  ev.currentTarget.style.boxShadow = isRecommended
                    ? '0 4px 16px rgba(0,0,0,0.08)'
                    : '0 1px 3px rgba(0,0,0,0.04)';
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

                {lastRun ? (
                  <div className="flex items-center justify-between mt-5 pt-4 border-t border-[#F0F0F2]">
                    <span className="flex items-center gap-1.5 text-[12px] text-[#1D1D1F] font-medium">
                      <Clock className="w-3 h-3" strokeWidth={1.8} />
                      Last run {formatRelative(lastRun)}
                    </span>
                    <span
                      className="text-[12px] font-semibold flex items-center gap-1"
                      style={{ color: m.accent }}
                    >
                      Start{' '}
                      <span
                        className="start-arrow inline-block"
                        style={{ transition: 'transform 200ms ease' }}
                      >
                        →
                      </span>
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center justify-end mt-5">
                    <span
                      className="text-[12px] font-semibold flex items-center gap-1"
                      style={{ color: m.accent }}
                    >
                      Start{' '}
                      <span
                        className="start-arrow inline-block"
                        style={{ transition: 'transform 200ms ease' }}
                      >
                        →
                      </span>
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Recent activity — 40px from workflows */}
      <div style={{ marginTop: 40 }}>
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
            {recent.map((e) => {
              const accent = MODULE_ACCENT[e.module] ?? '#86868B';
              const success = e.bleedersFound >= 0;
              const Icon = success ? CheckCircle2 : AlertTriangle;
              return (
                <div
                  key={e.id}
                  className="rounded-[10px] border border-[#E5E5EA] bg-white px-5 py-4 flex items-center gap-3 cursor-pointer"
                  style={{
                    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                    borderLeft: `3px solid ${accent}`,
                    transition: 'background 150ms ease',
                  }}
                  onMouseEnter={(ev) => (ev.currentTarget.style.background = '#F3F4F6')}
                  onMouseLeave={(ev) => (ev.currentTarget.style.background = '#FFFFFF')}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Icon
                        className="w-3.5 h-3.5 flex-shrink-0"
                        strokeWidth={2}
                        style={{ color: success ? '#34C759' : '#F59E0B' }}
                      />
                      <span className="text-[14px] font-semibold text-[#1D1D1F] truncate">
                        {MODULE_LABELS[e.module] ?? e.module}
                      </span>
                      {e.track && (
                        <span className="text-[10.5px] font-mono-nums px-1.5 py-px rounded bg-[#F5F5F7] text-[#86868B]">
                          {e.track}
                        </span>
                      )}
                    </div>
                    <p className="text-[12px] text-[#86868B] truncate mt-0.5 ml-5">
                      {e.clientName} · {e.fileName}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="flex items-center justify-end gap-1.5">
                      <span
                        className="rounded-full"
                        style={{ width: 6, height: 6, background: accent }}
                      />
                      <span
                        className="font-mono-nums text-[#1D1D1F]"
                        style={{ fontSize: 14, fontWeight: 600 }}
                      >
                        {e.bleedersFound.toLocaleString()} bleeders
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>
                      {formatRelative(e.completedAt)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick start — 32px from recent activity (related secondary section) */}
      <div style={{ marginTop: 32 }}>
        <p className="type-section-eyebrow mb-4">Quick start</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { title: 'What are bleeders?', desc: 'Targets with high spend and zero or near-zero conversions.', Icon: HelpCircle },
            { title: 'How thresholds work', desc: 'SB/SD use Target ACoS + 10%. SP uses Target ACoS + 20%.', Icon: SlidersHorizontal },
            { title: 'Bulk file guide', desc: 'Export 60-day Bulk Operations from Campaign Manager.', Icon: FileText },
          ].map((q) => (
            <div
              key={q.title}
              className="rounded-[10px] border border-[#E5E5EA] flex items-start justify-between gap-3 cursor-pointer tile-hover"
              style={{
                background: '#FFFFFF',
                borderLeft: '2px solid rgba(37, 99, 235, 0.15)',
                padding: 16,
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
              }}
            >
              <div className="flex items-start gap-3 min-w-0">
                <q.Icon
                  className="flex-shrink-0 mt-0.5"
                  style={{ width: 18, height: 18, color: '#6E6E73' }}
                  strokeWidth={1.8}
                />
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold text-[#1D1D1F] tracking-tight">
                    {q.title}
                  </div>
                  <p className="text-[12.5px] text-[#6E6E73] mt-1.5 leading-relaxed">{q.desc}</p>
                </div>
              </div>
              <ChevronRight
                className="flex-shrink-0 mt-0.5"
                style={{ width: 16, height: 16, color: '#C7C7CC' }}
                strokeWidth={1.8}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Footer — 48px from quick start */}
      <div
        className="border-t border-[#F0F0F2] py-4 flex items-center justify-between"
        style={{ marginTop: 48 }}
      >
        <span className="text-[12px] text-[#86868B]">Zen AI · Amazon Ads Workflow</span>
        <div className="flex items-center gap-4">
          <a
            href="mailto:feedback@adprune.com"
            className="text-[12px] text-[#86868B] hover:text-[#1D1D1F] transition-colors"
          >
            Feedback
          </a>
          <a
            href="https://docs.lovable.dev"
            target="_blank"
            rel="noreferrer"
            className="text-[12px] text-[#86868B] hover:text-[#1D1D1F] transition-colors"
          >
            Changelog
          </a>
          <span className="text-[12px] text-[#A1A1A6] font-mono-nums">v2.0</span>
        </div>
      </div>
    </div>
  );
};
