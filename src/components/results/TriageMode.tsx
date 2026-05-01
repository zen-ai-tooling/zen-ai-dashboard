import * as React from 'react';
import { CheckCircle2, SkipForward, Undo2, Info, Sparkles, ArrowRight } from 'lucide-react';
import { suggestB1Row } from '@/lib/ui/bleeder1Suggestion';

/**
 * Triage Mode — full-bleed, immersive one-card-at-a-time decision interface.
 * Sidebar slides out via body.triage-active class. Pure UI on top of the same
 * decisions map and setDecision handler used by Review All — toggling preserves
 * all decisions.
 */

export interface TriageItem {
  key: string;
  sheet: string;
  campaign: string;
  adGroup: string;
  entity: string;
  matchType?: string;
  clicks: number;
  spend: number;
  sales: number;
  acos: string;
  acosNum: number;
  orders: number;
}

export interface TriageDecisionSpec {
  value: string;
  label: string;
  bg: string;
  color: string;
  shortcut: string;
  countsAsSavings: boolean;
}

interface TriageModeProps {
  items: TriageItem[];
  decisions: Record<string, string>;
  decisionSpecsBySheet: (sheet: string) => TriageDecisionSpec[];
  onDecide: (key: string, decision: string) => void;
  onUndo?: (key: string) => void;
  onGenerate: () => void;
  onSwitchToReview: () => void;
  totalSpend: number;
  sheetsCount: number;
  shortSheetLabel: (s: string) => string;
}

function useCountUp(target: number, durationMs = 500): number {
  const [val, setVal] = React.useState(target);
  const fromRef = React.useRef(target);
  const startRef = React.useRef<number | null>(null);
  React.useEffect(() => {
    fromRef.current = val;
    startRef.current = null;
    let raf = 0;
    const step = (ts: number) => {
      if (startRef.current == null) startRef.current = ts;
      const t = Math.min(1, (ts - startRef.current) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setVal(Math.round(fromRef.current + (target - fromRef.current) * eased));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);
  return val;
}

export const TriageMode: React.FC<TriageModeProps> = ({
  items,
  decisions,
  decisionSpecsBySheet,
  onDecide,
  onUndo,
  onGenerate,
  onSwitchToReview,
  totalSpend,
  sheetsCount,
  shortSheetLabel,
}) => {
  const [skipped, setSkipped] = React.useState<Set<string>>(new Set());
  const [history, setHistory] = React.useState<string[]>([]);
  const [cursor, setCursor] = React.useState(0);
  const [direction, setDirection] = React.useState<'left' | 'right'>('right');
  const [showThreshold, setShowThreshold] = React.useState(false);

  // Toggle the body class so the global sidebar slides out and the topbar hides.
  React.useEffect(() => {
    document.body.classList.add('triage-active');
    return () => { document.body.classList.remove('triage-active'); };
  }, []);

  const queue = React.useMemo(() => {
    const undecided: TriageItem[] = [];
    const skippedItems: TriageItem[] = [];
    const decided: TriageItem[] = [];
    items.forEach((it) => {
      if (decisions[it.key]) decided.push(it);
      else if (skipped.has(it.key)) skippedItems.push(it);
      else undecided.push(it);
    });
    return [...undecided, ...skippedItems, ...decided];
  }, [items, decisions, skipped]);

  React.useEffect(() => {
    if (cursor >= queue.length) setCursor(Math.max(0, queue.length - 1));
  }, [queue.length, cursor]);

  const total = items.length;
  const decisionsMade = React.useMemo(
    () => items.filter(it => decisions[it.key]).length,
    [items, decisions]
  );

  const allDone = decisionsMade >= total && total > 0;
  const progressPct = total > 0 ? (decisionsMade / total) * 100 : 0;

  const savingsTarget = React.useMemo(() => {
    let s = 0;
    items.forEach((it) => {
      const d = decisions[it.key];
      if (!d) return;
      const specs = decisionSpecsBySheet(it.sheet);
      const spec = specs.find(x => x.value === d);
      if (spec?.countsAsSavings) s += it.spend || 0;
    });
    return s;
  }, [items, decisions, decisionSpecsBySheet]);
  const savingsAnimated = useCountUp(savingsTarget);

  const current = queue[cursor];
  const currentSpecs = current ? decisionSpecsBySheet(current.sheet) : [];

  const handleDecide = (val: string) => {
    if (!current) return;
    setHistory(h => [...h, current.key]);
    onDecide(current.key, val);
    setDirection('right');
    window.setTimeout(() => {
      setCursor(c => Math.min(c + 1, queue.length - 1));
    }, 150);
  };

  const handleSkip = () => {
    if (!current || decisions[current.key]) return;
    setSkipped(s => new Set(s).add(current.key));
    setDirection('right');
    setCursor(c => Math.min(c + 1, queue.length - 1));
  };

  const handleUndo = () => {
    const last = history[history.length - 1];
    if (!last) return;
    onUndo?.(last);
    setHistory(h => h.slice(0, -1));
    setDirection('left');
    const idx = queue.findIndex(q => q.key === last);
    if (idx >= 0) setCursor(idx);
  };

  const handlePrev = () => { setDirection('left'); setCursor(c => Math.max(0, c - 1)); };
  const handleNext = () => { setDirection('right'); setCursor(c => Math.min(queue.length - 1, c + 1)); };

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target && (e.target as HTMLElement).closest('input,textarea,select,[contenteditable="true"]')) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (e.key === 'ArrowLeft') { e.preventDefault(); handlePrev(); return; }
      if (e.key === 'ArrowRight') { e.preventDefault(); handleNext(); return; }
      if (k === 's') { e.preventDefault(); handleSkip(); return; }
      if (k === 'z') { e.preventDefault(); handleUndo(); return; }
      if (k === 'escape') { e.preventDefault(); onSwitchToReview(); return; }
      const spec = currentSpecs.find(s => s.shortcut.toLowerCase() === k);
      if (spec) { e.preventDefault(); handleDecide(spec.value); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.key, currentSpecs, queue.length, cursor, history]);

  const suggestionFor = (it: TriageItem) => {
    const sug = suggestB1Row({ clicks: it.clicks, spend: it.spend, sales: it.sales, orders: it.orders });
    const map: Record<string, { label: string; accent: string; bg: string }> = {
      pause:   { label: 'PAUSE',   accent: '#EF4444', bg: 'rgba(239, 68, 68, 0.08)' },
      review:  { label: 'REVIEW',  accent: '#F59E0B', bg: 'rgba(245, 158, 11, 0.08)' },
      monitor: { label: 'MONITOR', accent: '#6B7280', bg: 'rgba(107, 114, 128, 0.08)' },
      keep:    { label: '',        accent: '',        bg: '' },
    };
    const banner = map[sug.kind] ?? map.keep;
    return { ...banner, rationale: sug.rationale, kind: sug.kind };
  };

  return (
    <div className="triage-fullbleed">
      {/* 3px teal progress bar flush to top of viewport */}
      <div className="absolute top-0 left-0 right-0" style={{ height: 3, background: 'rgba(255,255,255,0.06)' }}>
        <div
          className="h-full transition-all duration-500 ease-out"
          style={{ width: `${progressPct}%`, background: '#0D9488' }}
        />
      </div>

      {/* Top-left exit link */}
      <button
        onClick={onSwitchToReview}
        className="absolute hover:text-white transition-colors"
        style={{ top: 16, left: 20, color: '#9CA3AF', fontSize: 13 }}
      >
        ← Exit triage
      </button>

      {/* Centered card area — fills viewport below the 3px progress bar */}
      <div
        className="absolute left-0 right-0 flex items-center justify-center px-4"
        style={{ top: 3, bottom: 0 }}
      >
        {allDone ? (
          <CompletionCard
            total={total}
            savings={savingsTarget}
            onGenerate={onGenerate}
            onReview={onSwitchToReview}
          />
        ) : current ? (
          <div
            key={current.key + (direction === 'right' ? '-r' : '-l')}
            className="bg-white text-[#111827]"
            style={{
              width: '90vw',
              maxWidth: 640,
              borderRadius: 16,
              padding: 32,
              boxShadow: '0 25px 60px rgba(0,0,0,0.4)',
              animation: direction === 'right'
                ? 'triage-in-right 220ms ease-out'
                : 'triage-in-left 220ms ease-out',
            }}
          >
            {/* a. Header row */}
            <div className="flex items-center justify-between gap-4">
              <span
                className="inline-flex items-center text-[10.5px] font-semibold uppercase tracking-[0.10em] px-2 py-1 rounded-md"
                style={{ background: '#F3F4F6', color: '#6B7280' }}
              >
                {shortSheetLabel(current.sheet)}
              </span>
              <div className="text-[12px] tabular-nums" style={{ color: '#9CA3AF' }}>
                <span className="font-semibold" style={{ color: '#374151' }}>{cursor + 1}</span> of {queue.length}
              </div>
            </div>
            {/* card progress bar */}
            <div className="mt-2 w-full rounded-full overflow-hidden" style={{ height: 4, background: '#F3F4F6' }}>
              <div className="h-full transition-all duration-300" style={{ width: `${progressPct}%`, background: '#0D9488' }} />
            </div>

            {/* b. Entity name */}
            <h2
              className="mt-5 break-words"
              style={{ fontSize: 28, fontWeight: 700, color: '#111827', lineHeight: 1.2, letterSpacing: '-0.02em' }}
            >
              {current.entity}
            </h2>

            {/* c. Metadata row */}
            <div className="mt-2 flex items-center gap-2 flex-wrap" style={{ fontSize: 13, color: '#9CA3AF' }}>
              <span title={current.campaign} className="truncate max-w-[40%]">{current.campaign}</span>
              <span style={{ color: '#D1D5DB' }}>·</span>
              <span title={current.adGroup} className="truncate max-w-[35%]">{current.adGroup || '—'}</span>
              {current.matchType && (
                <>
                  <span style={{ color: '#D1D5DB' }}>·</span>
                  <span
                    className="inline-block text-[11px] font-medium px-2 py-0.5 rounded"
                    style={{ background: '#FFFFFF', color: '#374151', border: '1px solid #E5E7EB' }}
                  >
                    {current.matchType}
                  </span>
                </>
              )}
            </div>

            {/* d. Metrics row */}
            <div className="mt-6 grid grid-cols-4 gap-4">
              <Metric label="Spend" value={`$${current.spend.toFixed(2)}`} accent="#EF4444" />
              <Metric label="Clicks" value={current.clicks.toLocaleString()} />
              <Metric
                label="Sales"
                value={`$${current.sales.toFixed(2)}`}
                accent={current.sales <= 0 ? '#EF4444' : '#059669'}
              />
              <Metric
                label="ACoS"
                value={current.acosNum >= 0 && current.acos ? current.acos : '—'}
                accent={
                  current.acosNum < 0 ? '#9CA3AF'
                  : current.acosNum >= 100 ? '#EF4444'
                  : '#059669'
                }
              />
            </div>

            {/* e. Suggestion banner */}
            {(() => {
              const s = suggestionFor(current);
              if (!s.label) return null;
              return (
                <div
                  className="mt-5 rounded-lg"
                  style={{
                    background: s.bg,
                    borderLeft: `4px solid ${s.accent}`,
                    padding: '14px 16px',
                  }}
                >
                  <div className="flex items-start gap-3">
                    <Sparkles className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: s.accent }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[14px] font-bold tracking-[0.04em]" style={{ color: s.accent }}>
                          {s.label}
                        </span>
                        <button
                          onClick={() => setShowThreshold(v => !v)}
                          className="hover:opacity-70"
                          aria-label="Threshold logic"
                          style={{ color: s.accent }}
                        >
                          <Info className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="mt-0.5 text-[13px]" style={{ color: '#374151' }}>
                        {s.rationale}
                      </div>
                      {showThreshold && (
                        <div className="mt-2 text-[11.5px] leading-relaxed" style={{ color: '#6B7280' }}>
                          Triggered by: clicks ≥ 15 with zero sales → Pause · clicks ≥ 13 → Review ·
                          clicks ≥ 10 → Monitor. ACoS &gt; 100% inflates risk band.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* f. Action buttons */}
            <div
              className="mt-5 grid gap-2"
              style={{ gridTemplateColumns: `repeat(${currentSpecs.length}, minmax(0, 1fr))` }}
            >
              {currentSpecs.map((spec) => {
                const isSelected = decisions[current.key] === spec.value;
                return (
                  <button
                    key={spec.value}
                    onClick={() => handleDecide(spec.value)}
                    className="relative btn-press transition-all flex items-center justify-center"
                    style={{
                      height: 52,
                      borderRadius: 10,
                      background: spec.bg,
                      color: '#FFFFFF',
                      fontSize: 14,
                      fontWeight: 600,
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                      boxShadow: isSelected ? `0 0 0 3px ${spec.bg}55` : undefined,
                      opacity: isSelected ? 0.92 : 1,
                    }}
                  >
                    {spec.label}
                    <span
                      className="absolute font-mono-nums"
                      style={{
                        right: 6,
                        bottom: 5,
                        fontSize: 11,
                        fontWeight: 600,
                        padding: '1px 5px',
                        borderRadius: 3,
                        background: 'rgba(255,255,255,0.2)',
                        color: 'rgba(255,255,255,0.95)',
                      }}
                    >
                      {spec.shortcut.toUpperCase()}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* g. Secondary actions */}
            <div className="mt-3 flex items-center justify-between">
              <button
                onClick={handleUndo}
                disabled={history.length === 0}
                className="text-[13px] inline-flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-80"
                style={{ color: '#9CA3AF' }}
              >
                <Undo2 className="w-3.5 h-3.5" /> Undo last (Z)
              </button>
              <button
                onClick={handleSkip}
                className="text-[13px] inline-flex items-center gap-1.5 hover:opacity-80"
                style={{ color: '#9CA3AF' }}
              >
                Skip for now (S) <SkipForward className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white text-[#6B7280] text-center text-[13px]" style={{ borderRadius: 16, padding: 40, maxWidth: 640 }}>
            No bleeders to triage.
          </div>
        )}
      </div>

    </div>
  );
};

const ShortcutRow: React.FC<{ label: string; k: string }> = ({ label, k }) => (
  <div className="flex justify-between gap-3 items-center">
    <span style={{ color: '#9CA3AF' }}>{label}</span>
    <kbd
      className="font-mono-nums"
      style={{ padding: '1px 6px', borderRadius: 4, background: '#374151', color: '#FFFFFF', fontSize: 11 }}
    >
      {k}
    </kbd>
  </div>
);

const Metric: React.FC<{ label: string; value: string; accent?: string }> = ({ label, value, accent }) => (
  <div>
    <div
      style={{
        fontSize: 11,
        fontWeight: 500,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        color: '#9CA3AF',
        marginBottom: 4,
      }}
    >
      {label}
    </div>
    <div
      className="tabular-nums"
      style={{
        fontSize: 32,
        fontWeight: 700,
        color: accent ?? '#111827',
        lineHeight: 1.05,
        letterSpacing: '-0.02em',
      }}
    >
      {value}
    </div>
  </div>
);

const PipelineStep: React.FC<{ state: 'done' | 'active' | 'pending'; label: string }> = ({ state, label }) => {
  const dot =
    state === 'done' ? '#059669'
    : state === 'active' ? '#0D9488'
    : 'rgba(255,255,255,0.30)';
  const text =
    state === 'active' ? '#FFFFFF'
    : state === 'done' ? 'rgba(255,255,255,0.75)'
    : 'rgba(255,255,255,0.45)';
  return (
    <span className="inline-flex items-center gap-1.5" style={{ color: text, fontWeight: state === 'active' ? 600 : 400 }}>
      <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: dot }} />
      {label}
    </span>
  );
};

const Arrow: React.FC = () => (
  <ArrowRight style={{ width: 14, height: 14, color: 'rgba(255,255,255,0.30)' }} strokeWidth={2} />
);

const CompletionCard: React.FC<{
  total: number;
  savings: number;
  onGenerate: () => void;
  onReview: () => void;
}> = ({ total, savings, onGenerate, onReview }) => (
  <div
    className="bg-white text-center animate-fade-in"
    style={{
      width: '90vw',
      maxWidth: 640,
      borderRadius: 16,
      padding: '48px 40px',
      boxShadow: '0 25px 60px rgba(0,0,0,0.4)',
    }}
  >
    <div
      className="mx-auto w-14 h-14 rounded-full flex items-center justify-center animate-scale-in"
      style={{ background: 'rgba(5, 150, 105, 0.12)' }}
    >
      <CheckCircle2 className="w-8 h-8" style={{ color: '#059669' }} strokeWidth={2.4} />
    </div>
    <h2 className="mt-5 text-[24px] font-semibold" style={{ color: '#111827' }}>
      All {total} decisions made
    </h2>
    <p className="mt-2 text-[14px]" style={{ color: '#6B7280' }}>
      <span className="font-semibold" style={{ color: '#059669' }}>
        ${Math.round(savings).toLocaleString()}
      </span>{' '}
      addressed
    </p>
    <button
      onClick={onGenerate}
      className="mt-6 w-full inline-flex items-center justify-center gap-1.5 h-11 rounded-lg text-[14px] font-semibold text-white btn-press"
      style={{ background: '#0D9488' }}
    >
      Generate Amazon file <ArrowRight className="w-4 h-4" />
    </button>
    <button
      onClick={onReview}
      className="mt-3 text-[13px] hover:underline"
      style={{ color: '#9CA3AF' }}
    >
      Review decisions first
    </button>
  </div>
);
