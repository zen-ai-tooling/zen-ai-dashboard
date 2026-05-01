import * as React from 'react';
import { CheckCircle2, SkipForward, Undo2, Info, Keyboard, X, Sparkles, AlertTriangle } from 'lucide-react';
import { suggestB1Row } from '@/lib/ui/bleeder1Suggestion';

/**
 * Triage Mode — focused, one-card-at-a-time decision interface for Bleeders.
 *
 * Pure UI. Receives the same `decisions` map and `setDecision` handler used by
 * the Review All table, so the underlying business logic, persistence, and
 * generation flow are unchanged. Toggling between Triage and Review preserves
 * all decisions.
 */

export interface TriageItem {
  /** Unique key — must match the key used in the decisions map (e.g. `${sheet}-ROWINDEX-${idx}`). */
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
  /** Whether this decision counts toward the "savings addressed" counter. */
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
  /** Total spend of all bleeders, used in completion message. */
  totalSpend: number;
  sheetsCount: number;
  shortSheetLabel: (s: string) => string;
}

/** Smooth count-up animation for the savings counter. */
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
  // Skipped items pushed to end; build queue order on first render and after skips.
  const [skipped, setSkipped] = React.useState<Set<string>>(new Set());
  const [history, setHistory] = React.useState<string[]>([]); // for undo
  const [cursor, setCursor] = React.useState(0);
  const [direction, setDirection] = React.useState<'left' | 'right'>('right');
  const [showLegend, setShowLegend] = React.useState(true);
  const [showThreshold, setShowThreshold] = React.useState(false);

  // Build queue: undecided & non-skipped first, then skipped at end, then decided.
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

  // Clamp cursor when queue shifts.
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

  // Savings = sum of spend of items decided as "counts as savings" (Pause / Cut Bid / Negative).
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
    // Advance to next undecided in current queue order.
    window.setTimeout(() => {
      setCursor(c => Math.min(c + 1, queue.length - 1));
    }, 180);
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
    // Move cursor to that item.
    const idx = queue.findIndex(q => q.key === last);
    if (idx >= 0) setCursor(idx);
  };

  // Keyboard shortcuts. (No more arrow-key Prev/Next — undo (Z) replaces it.)
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target && (e.target as HTMLElement).closest('input,textarea,select,[contenteditable="true"]')) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === 's') { e.preventDefault(); handleSkip(); return; }
      if (k === 'z') { e.preventDefault(); handleUndo(); return; }
      const spec = currentSpecs.find(s => s.shortcut.toLowerCase() === k);
      if (spec) { e.preventDefault(); handleDecide(spec.value); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.key, currentSpecs, queue.length, cursor, history]);

  // Suggestion mapping (uses existing engine, shapes for triage banner — unified spec colors).
  const suggestionFor = (it: TriageItem) => {
    const sug = suggestB1Row({ clicks: it.clicks, spend: it.spend, sales: it.sales, orders: it.orders });
    const map: Record<string, { label: string; accent: string; bg: string }> = {
      pause:   { label: 'PAUSE',            accent: '#EF4444', bg: 'rgba(239, 68, 68, 0.10)' },
      review:  { label: 'REVIEW',           accent: '#F59E0B', bg: 'rgba(245, 158, 11, 0.10)' },
      monitor: { label: 'MONITOR',          accent: '#F59E0B', bg: 'rgba(245, 158, 11, 0.08)' },
      keep:    { label: 'NO STRONG SIGNAL', accent: '#9CA3AF', bg: 'rgba(156, 163, 175, 0.10)' },
    };
    const banner = map[sug.kind] ?? map.keep;
    return { ...banner, rationale: sug.rationale, kind: sug.kind };
  };

  // ─────────────────────────────────────────────────────────
  // Layout: full-bleed dark command bar + progress + centered card
  // ─────────────────────────────────────────────────────────
  return (
    <div className="relative" style={{ minHeight: 'calc(100vh - 120px)' }}>
      {/* ZONE 1 — Command bar (sticky, dark, full-width) */}
      <div
        className="sticky top-0 z-20"
        style={{ background: '#1A1A2E', color: '#FFFFFF', borderBottom: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="flex items-center gap-6 px-5 h-12">
          {/* Left: stats */}
          <div className="text-[12.5px] font-mono-nums whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.65)' }}>
            <span className="font-semibold" style={{ color: '#FFFFFF' }}>{total}</span> bleeders
            <span className="mx-2" style={{ color: 'rgba(255,255,255,0.30)' }}>·</span>
            <span className="font-semibold" style={{ color: '#FFFFFF' }}>${Math.round(totalSpend).toLocaleString()}</span> at risk
            <span className="mx-2" style={{ color: 'rgba(255,255,255,0.30)' }}>·</span>
            <span className="font-semibold" style={{ color: '#FFFFFF' }}>{sheetsCount}</span> sheets
          </div>

          {/* Center: pipeline stepper */}
          <div className="hidden md:flex items-center gap-2 text-[11.5px] flex-1 justify-center" style={{ color: 'rgba(255,255,255,0.55)' }}>
            <PipelineStep state="done" label="File analyzed" />
            <Arrow />
            <PipelineStep state={allDone ? 'done' : 'active'} label="Make decisions" />
            <Arrow />
            <PipelineStep state={allDone ? 'active' : 'pending'} label="Generate Amazon file" />
          </div>

          {/* Right: counters */}
          <div className="flex items-center gap-5 ml-auto whitespace-nowrap">
            <div className="text-[12.5px] font-mono-nums">
              <span className="font-semibold" style={{ color: '#FFFFFF' }}>{decisionsMade}/{total}</span>
              <span className="ml-1" style={{ color: 'rgba(255,255,255,0.55)' }}>decisions</span>
            </div>
            <div className="text-[12.5px] font-mono-nums inline-flex items-center gap-1.5">
              <span aria-hidden>💰</span>
              <span className="font-semibold tabular-nums" style={{ color: '#10B981' }}>
                ${savingsAnimated.toLocaleString()}
              </span>
              <span style={{ color: 'rgba(255,255,255,0.55)' }}>addressed</span>
            </div>
          </div>
        </div>

        {/* Full-width thin progress bar — primary momentum indicator */}
        <div className="h-1 w-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
          <div
            className="h-full transition-all duration-500 ease-out"
            style={{ width: `${progressPct}%`, background: '#4F6EF7' }}
          />
        </div>
      </div>

      {/* ZONE 2 — Centered triage card / completion */}
      <div className="flex items-start justify-center px-5 py-10">
        {allDone ? (
          <div
            className="w-full bg-card text-center animate-fade-in"
            style={{
              maxWidth: 680,
              borderRadius: 16,
              padding: '48px 40px',
              boxShadow: '0 4px 24px rgba(17, 24, 39, 0.06), 0 1px 2px rgba(17, 24, 39, 0.04)',
              border: '1px solid #E5E7EB',
            }}
          >
            <div
              className="mx-auto w-14 h-14 rounded-full flex items-center justify-center animate-scale-in"
              style={{ background: 'rgba(16, 185, 129, 0.12)' }}
            >
              <CheckCircle2 className="w-8 h-8" style={{ color: '#10B981' }} strokeWidth={2.4} />
            </div>
            <h2 className="mt-5 text-[24px] font-semibold" style={{ color: '#111827' }}>
              All {total} bleeders addressed
            </h2>
            <p className="mt-2 text-[14px]" style={{ color: '#6B7280' }}>
              <span className="font-semibold" style={{ color: '#10B981' }}>
                ${Math.round(savingsTarget).toLocaleString()}
              </span>{' '}
              protected from at-risk spend.
            </p>
            <div className="mt-7 flex items-center justify-center gap-2.5">
              <button
                onClick={onSwitchToReview}
                className="px-4 h-10 rounded-lg border text-[13px] font-medium btn-press"
                style={{ borderColor: '#E5E7EB', background: '#FFFFFF', color: '#374151' }}
              >
                Review decisions →
              </button>
              <button
                onClick={onGenerate}
                className="px-5 h-10 rounded-lg text-[13px] font-semibold text-white btn-press"
                style={{ background: '#4F6EF7' }}
              >
                Generate Amazon file →
              </button>
            </div>
          </div>
        ) : current ? (
          <div
            key={current.key + (direction === 'right' ? '-r' : '-l')}
            className="w-full bg-card"
            style={{
              maxWidth: 680,
              borderRadius: 16,
              padding: '28px 32px 24px 32px',
              boxShadow: '0 4px 24px rgba(17, 24, 39, 0.06), 0 1px 2px rgba(17, 24, 39, 0.04)',
              border: '1px solid #E5E7EB',
              animation: direction === 'right'
                ? 'triage-in-right 220ms ease-out'
                : 'triage-in-left 220ms ease-out',
            }}
          >
            {/* a. Header row: category pill · "1 of 48" */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="inline-flex items-center text-[10.5px] font-semibold uppercase tracking-[0.10em] px-2 py-1 rounded-md"
                  style={{ background: '#F3F4F6', color: '#6B7280' }}
                >
                  {shortSheetLabel(current.sheet)}
                </span>
                {decisions[current.key] && (
                  <span
                    className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-md"
                    style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#047857' }}
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    Decided · {decisions[current.key]}
                  </span>
                )}
                {!decisions[current.key] && skipped.has(current.key) && (
                  <span
                    className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-md"
                    style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#92400E' }}
                  >
                    <AlertTriangle className="w-3 h-3" />
                    Skipped
                  </span>
                )}
              </div>
              <div className="text-[12px] font-mono-nums" style={{ color: '#9CA3AF' }}>
                <span className="font-semibold" style={{ color: '#374151' }}>{cursor + 1}</span> of {queue.length}
              </div>
            </div>

            {/* b. Entity name — 28px, bold, untruncated */}
            <h2
              className="mt-5 break-words"
              style={{ fontSize: 28, fontWeight: 700, color: '#111827', lineHeight: 1.2, letterSpacing: '-0.01em' }}
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
                    style={{ background: '#FFFFFF', color: '#6B7280', border: '1px solid #E5E7EB' }}
                  >
                    {current.matchType}
                  </span>
                </>
              )}
            </div>

            {/* d. Metrics row — 4 equal columns */}
            <div className="mt-7 grid grid-cols-4 gap-4">
              <Metric
                label="Spend"
                value={`$${current.spend.toFixed(2)}`}
                accent="#EF4444"
              />
              <Metric label="Clicks" value={current.clicks.toLocaleString()} />
              <Metric label="Sales" value={`$${current.sales.toFixed(2)}`} />
              <Metric
                label="ACoS"
                value={current.acosNum >= 0 && current.acos ? current.acos : '—'}
                accent={
                  current.acosNum < 0 ? '#9CA3AF'
                  : current.acosNum >= 100 ? '#EF4444'
                  : '#10B981'
                }
              />
            </div>

            {/* e. Suggestion banner — full-width, 4px left border, tinted bg */}
            {(() => {
              const s = suggestionFor(current);
              return (
                <div
                  className="mt-7 rounded-lg p-3.5"
                  style={{
                    background: s.bg,
                    borderLeft: `4px solid ${s.accent}`,
                  }}
                >
                  <div className="flex items-start gap-3">
                    <Sparkles className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: s.accent }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-bold tracking-[0.08em]" style={{ color: s.accent }}>
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

            {/* f. Action buttons — equal width, 48px tall, filled */}
            <div
              className="mt-6 grid gap-2.5"
              style={{ gridTemplateColumns: `repeat(${currentSpecs.length}, minmax(0, 1fr))` }}
            >
              {currentSpecs.map((spec) => {
                const isSelected = decisions[current.key] === spec.value;
                return (
                  <button
                    key={spec.value}
                    onClick={() => handleDecide(spec.value)}
                    className="relative rounded-lg btn-press transition-all flex items-center justify-center"
                    style={{
                      height: 48,
                      background: spec.bg,
                      color: '#FFFFFF',
                      fontSize: 14,
                      fontWeight: 700,
                      letterSpacing: '0.02em',
                      boxShadow: isSelected ? `0 0 0 3px ${spec.bg}40` : undefined,
                      opacity: isSelected ? 0.92 : 1,
                    }}
                  >
                    {spec.label}
                    <span
                      className="absolute font-mono-nums"
                      style={{
                        right: 8,
                        bottom: 6,
                        fontSize: 10,
                        fontWeight: 600,
                        padding: '1px 5px',
                        borderRadius: 4,
                        background: 'rgba(255,255,255,0.22)',
                        color: 'rgba(255,255,255,0.92)',
                      }}
                    >
                      {spec.shortcut.toUpperCase()}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* g. Secondary actions — undo (left) · skip (right) */}
            <div className="mt-4 flex items-center justify-between">
              <button
                onClick={handleUndo}
                disabled={history.length === 0}
                className="text-[12px] inline-flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-80"
                style={{ color: '#9CA3AF' }}
              >
                <Undo2 className="w-3.5 h-3.5" /> Undo last (Z)
              </button>
              <button
                onClick={handleSkip}
                className="text-[12px] inline-flex items-center gap-1.5 hover:opacity-80"
                style={{ color: '#9CA3AF' }}
              >
                Skip for now (S) <SkipForward className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <div
            className="w-full text-center text-[13px] bg-card"
            style={{
              maxWidth: 680,
              borderRadius: 16,
              padding: '40px',
              border: '1px solid #E5E7EB',
              color: '#6B7280',
            }}
          >
            No bleeders to triage.
          </div>
        )}
      </div>

      {/* ZONE 3 — Floating shortcuts panel (bottom-right, 200px, never overlaps) */}
      {showLegend ? (
        <div
          className="fixed bottom-4 right-4 z-30 animate-fade-in"
          style={{
            width: 200,
            background: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: 10,
            boxShadow: '0 8px 24px rgba(17, 24, 39, 0.10)',
            padding: '10px 12px',
            fontSize: 11.5,
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="inline-flex items-center gap-1.5 font-semibold" style={{ color: '#111827' }}>
              <Keyboard className="w-3.5 h-3.5" /> Shortcuts
            </span>
            <button
              onClick={() => setShowLegend(false)}
              className="hover:opacity-70"
              aria-label="Hide shortcuts"
              style={{ color: '#9CA3AF' }}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-1 font-mono-nums" style={{ color: '#6B7280' }}>
            {currentSpecs.map(s => (
              <div key={s.value} className="flex justify-between gap-3 items-center">
                <span style={{ color: '#374151' }}>{s.label}</span>
                <kbd className="px-1.5 py-0.5 rounded" style={{ background: '#F3F4F6', color: '#111827' }}>
                  {s.shortcut.toUpperCase()}
                </kbd>
              </div>
            ))}
            <div className="flex justify-between gap-3 items-center">
              <span style={{ color: '#374151' }}>Skip</span>
              <kbd className="px-1.5 py-0.5 rounded" style={{ background: '#F3F4F6', color: '#111827' }}>S</kbd>
            </div>
            <div className="flex justify-between gap-3 items-center">
              <span style={{ color: '#374151' }}>Undo last</span>
              <kbd className="px-1.5 py-0.5 rounded" style={{ background: '#F3F4F6', color: '#111827' }}>Z</kbd>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowLegend(true)}
          className="fixed bottom-4 right-4 z-30 inline-flex items-center gap-1.5 rounded-full px-3 h-8 text-[11.5px] hover:opacity-90"
          style={{
            background: '#FFFFFF',
            border: '1px solid #E5E7EB',
            color: '#6B7280',
            boxShadow: '0 4px 12px rgba(17, 24, 39, 0.08)',
          }}
        >
          <Keyboard className="w-3.5 h-3.5" /> Shortcuts
        </button>
      )}
    </div>
  );
};

const Metric: React.FC<{ label: string; value: string; accent?: string }> = ({ label, value, accent }) => (
  <div>
    <div
      className="font-semibold"
      style={{
        fontSize: 11,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        color: '#9CA3AF',
      }}
    >
      {label}
    </div>
    <div
      className="mt-1.5 font-mono-nums tabular-nums"
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
    state === 'done' ? '#10B981'
    : state === 'active' ? '#4F6EF7'
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
  <span style={{ color: 'rgba(255,255,255,0.30)' }}>→</span>
);
