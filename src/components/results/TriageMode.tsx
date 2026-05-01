import * as React from 'react';
import { CheckCircle2, ArrowLeft, ArrowRight, SkipForward, Undo2, Info, Keyboard, X, Sparkles, AlertTriangle } from 'lucide-react';
import { suggestB1Row } from '@/lib/ui/bleeder1Suggestion';

/**
 * Triage Mode — focused, one-card-at-a-time decision interface for Bleeders.
 *
 * Pure UI: receives the same `decisions` map and `setDecision` handler used by
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

function shortcutLabelForList(specs: TriageDecisionSpec[]): string {
  return specs.map(s => s.shortcut.toUpperCase()).join(' · ');
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

  const handlePrev = () => { setDirection('left'); setCursor(c => Math.max(0, c - 1)); };
  const handleNext = () => { setDirection('right'); setCursor(c => Math.min(queue.length - 1, c + 1)); };

  // Keyboard shortcuts.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target && (e.target as HTMLElement).closest('input,textarea,select,[contenteditable="true"]')) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === 'arrowleft') { e.preventDefault(); handlePrev(); return; }
      if (k === 'arrowright') { e.preventDefault(); handleNext(); return; }
      if (k === 's') { e.preventDefault(); handleSkip(); return; }
      if (k === 'z') { e.preventDefault(); handleUndo(); return; }
      // Decision shortcuts
      const spec = currentSpecs.find(s => s.shortcut.toLowerCase() === k);
      if (spec) { e.preventDefault(); handleDecide(spec.value); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.key, currentSpecs, queue.length, cursor, history]);

  // Suggestion mapping (uses existing engine, shapes for triage banner).
  const suggestionFor = (it: TriageItem) => {
    const sug = suggestB1Row({ clicks: it.clicks, spend: it.spend, sales: it.sales, orders: it.orders });
    // Map kind -> banner color
    const map: Record<string, { label: string; bg: string; border: string; color: string }> = {
      pause:   { label: 'PAUSE',   bg: '#FEF2F2', border: '#FECACA', color: '#B91C1C' },
      review:  { label: 'REVIEW',  bg: '#FFF7ED', border: '#FED7AA', color: '#C2410C' },
      monitor: { label: 'MONITOR', bg: '#FEFCE8', border: '#FEF08A', color: '#A16207' },
      keep:    { label: 'NO STRONG SIGNAL', bg: '#F9FAFB', border: '#E5E7EB', color: '#6B7280' },
    };
    const banner = map[sug.kind] ?? map.keep;
    return { ...banner, rationale: sug.rationale, kind: sug.kind };
  };

  return (
    <div className="space-y-4">
      {/* ZONE 1 — Top command bar */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Left: stats */}
          <div className="text-[13px] text-foreground font-mono-nums">
            <span className="font-semibold">{total}</span>
            <span className="text-[hsl(var(--text-secondary))]"> bleeders</span>
            <span className="mx-2 text-[hsl(var(--text-tertiary))]">·</span>
            <span className="font-semibold">${Math.round(totalSpend).toLocaleString()}</span>
            <span className="text-[hsl(var(--text-secondary))]"> at risk</span>
            <span className="mx-2 text-[hsl(var(--text-tertiary))]">·</span>
            <span className="font-semibold">{sheetsCount}</span>
            <span className="text-[hsl(var(--text-secondary))]"> sheets</span>
          </div>

          {/* Center: progress counter */}
          <div className="flex items-center gap-2">
            {allDone ? (
              <div className="flex items-center gap-1.5 text-[13px] font-semibold" style={{ color: '#16A34A' }}>
                <CheckCircle2 className="w-4 h-4" />
                All decisions made
              </div>
            ) : (
              <div className="text-[13px] font-mono-nums">
                <span className="font-semibold text-foreground">{decisionsMade}</span>
                <span className="text-[hsl(var(--text-tertiary))]">/{total}</span>
                <span className="ml-1 text-[hsl(var(--text-secondary))]">decisions</span>
              </div>
            )}
          </div>

          {/* Right: savings */}
          <div className="text-[13px] font-mono-nums flex items-center gap-1.5">
            <span aria-hidden>💰</span>
            <span className="font-semibold tabular-nums" style={{ color: '#16A34A' }}>
              ${savingsAnimated.toLocaleString()}
            </span>
            <span className="text-[hsl(var(--text-secondary))]">addressed</span>
          </div>
        </div>

        {/* Pipeline stepper — condensed */}
        <div className="mt-3 flex items-center gap-2 text-[11.5px] text-[hsl(var(--text-secondary))]">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: '#34C759' }} />
            File analyzed
          </span>
          <span className="text-[hsl(var(--text-tertiary))]">→</span>
          <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
            <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: '#0071E3' }} />
            Make decisions
          </span>
          <span className="text-[hsl(var(--text-tertiary))]">→</span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: '#D2D2D7' }} />
            Generate Amazon file
          </span>
        </div>
      </div>

      {/* ZONE 2 — Triage card OR completion */}
      {allDone ? (
        <div className="rounded-xl border border-border bg-card p-10 text-center">
          <div className="mx-auto w-14 h-14 rounded-full flex items-center justify-center animate-scale-in"
               style={{ background: '#DCFCE7' }}>
            <CheckCircle2 className="w-8 h-8" style={{ color: '#16A34A' }} strokeWidth={2.4} />
          </div>
          <h2 className="mt-5 text-[22px] font-semibold text-foreground">
            All {total} bleeders addressed
          </h2>
          <p className="mt-1.5 text-[14px] text-[hsl(var(--text-secondary))]">
            <span className="font-semibold" style={{ color: '#16A34A' }}>${Math.round(savingsTarget).toLocaleString()}</span> protected from at-risk spend.
          </p>
          <div className="mt-6 flex items-center justify-center gap-2.5">
            <button
              onClick={onSwitchToReview}
              className="px-4 h-10 rounded-lg border border-border bg-card text-[13px] font-medium text-foreground hover:bg-secondary btn-press"
            >
              Review decisions →
            </button>
            <button
              onClick={onGenerate}
              className="px-4 h-10 rounded-lg text-[13px] font-medium text-white btn-press"
              style={{ background: '#2563EB' }}
            >
              Generate Amazon file →
            </button>
          </div>
        </div>
      ) : current ? (
        <div
          key={current.key + (direction === 'right' ? '-r' : '-l')}
          className="rounded-xl border border-border bg-card p-7 animate-fade-in"
          style={{
            animation: direction === 'right'
              ? 'triage-in-right 220ms ease-out'
              : 'triage-in-left 220ms ease-out',
          }}
        >
          {/* Header row */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="inline-flex items-center text-[10.5px] font-medium uppercase tracking-[0.08em] px-2 py-1 rounded-md"
                style={{ background: '#F3F4F6', color: '#6B7280' }}
              >
                {shortSheetLabel(current.sheet)}
              </span>
              {decisions[current.key] && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-md"
                      style={{ background: '#DCFCE7', color: '#16A34A' }}>
                  <CheckCircle2 className="w-3 h-3" />
                  Decided · {decisions[current.key]}
                </span>
              )}
              {!decisions[current.key] && skipped.has(current.key) && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-md"
                      style={{ background: '#FEF3C7', color: '#92400E' }}>
                  <AlertTriangle className="w-3 h-3" />
                  Skipped
                </span>
              )}
            </div>
            <div className="text-right">
              <div className="text-[11.5px] text-[hsl(var(--text-secondary))] font-mono-nums">
                {cursor + 1} of {queue.length}
              </div>
              <div className="mt-1 w-[160px] h-[3px] rounded-full overflow-hidden" style={{ background: '#E5E7EB' }}>
                <div
                  className="h-full transition-all duration-300"
                  style={{ width: `${((cursor + 1) / Math.max(queue.length, 1)) * 100}%`, background: '#2563EB' }}
                />
              </div>
            </div>
          </div>

          {/* Headline + meta */}
          <h2 className="mt-4 text-[20px] font-semibold text-foreground leading-tight break-words">
            {current.entity}
          </h2>
          <div className="mt-1.5 text-[12.5px] text-[hsl(var(--text-secondary))] flex items-center gap-2 flex-wrap">
            <span className="truncate max-w-[40%]" title={current.campaign}>{current.campaign}</span>
            <span className="text-[hsl(var(--text-tertiary))]">·</span>
            <span className="truncate max-w-[35%]" title={current.adGroup}>{current.adGroup || '—'}</span>
            {current.matchType && (
              <>
                <span className="text-[hsl(var(--text-tertiary))]">·</span>
                <span className="inline-block text-[10.5px] font-medium px-1.5 py-0.5 rounded"
                      style={{ background: '#EFF6FF', color: '#1D4ED8' }}>
                  {current.matchType}
                </span>
              </>
            )}
          </div>

          {/* Metrics row */}
          <div className="mt-6 grid grid-cols-4 gap-4">
            <Metric
              label="Spend"
              value={`$${current.spend.toFixed(2)}`}
              big
              accent="#B91C1C"
            />
            <Metric label="Clicks" value={current.clicks.toLocaleString()} />
            <Metric label="Sales" value={`$${current.sales.toFixed(2)}`} />
            <Metric
              label="ACoS"
              value={current.acosNum >= 0 && current.acos ? current.acos : '—'}
              accent={current.acosNum >= 100 ? '#B91C1C' : current.acosNum >= 0 ? '#16A34A' : undefined}
            />
          </div>

          {/* AI suggestion */}
          {(() => {
            const s = suggestionFor(current);
            return (
              <div
                className="mt-6 rounded-lg border p-3.5"
                style={{ background: s.bg, borderColor: s.border }}
              >
                <div className="flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: s.color }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold tracking-[0.08em]" style={{ color: s.color }}>
                        {s.label}
                      </span>
                      <button
                        onClick={() => setShowThreshold(v => !v)}
                        className="text-[hsl(var(--text-tertiary))] hover:text-foreground"
                        aria-label="Threshold logic"
                      >
                        <Info className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="mt-0.5 text-[12.5px]" style={{ color: s.color }}>
                      {s.rationale}
                    </div>
                    {showThreshold && (
                      <div className="mt-2 text-[11.5px] text-[hsl(var(--text-secondary))] leading-relaxed">
                        Triggered by: clicks ≥ 15 with zero sales → Pause · clicks ≥ 13 → Review ·
                        clicks ≥ 10 → Monitor. ACoS &gt; 100% inflates risk band.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ZONE 3 — Decision actions */}
          <div className="mt-6 grid gap-2.5" style={{ gridTemplateColumns: `repeat(${currentSpecs.length}, minmax(0, 1fr))` }}>
            {currentSpecs.map((spec) => {
              const isSelected = decisions[current.key] === spec.value;
              return (
                <button
                  key={spec.value}
                  onClick={() => handleDecide(spec.value)}
                  className="h-12 rounded-lg text-[13.5px] font-semibold btn-press transition-all flex items-center justify-center gap-2"
                  style={{
                    background: spec.bg,
                    color: '#FFFFFF',
                    boxShadow: isSelected ? `0 0 0 3px ${spec.bg}40` : undefined,
                    opacity: isSelected ? 0.9 : 1,
                  }}
                >
                  {spec.label}
                  <span
                    className="text-[10px] font-mono-nums px-1.5 py-0.5 rounded"
                    style={{ background: 'rgba(255,255,255,0.22)' }}
                  >
                    {spec.shortcut.toUpperCase()}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Sub-actions */}
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={handleUndo}
                disabled={history.length === 0}
                className="text-[12px] inline-flex items-center gap-1 text-[hsl(var(--text-secondary))] hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Undo2 className="w-3 h-3" /> Back · undo last
              </button>
              <button
                onClick={handleSkip}
                className="text-[12px] inline-flex items-center gap-1 text-[hsl(var(--text-secondary))] hover:text-foreground"
              >
                <SkipForward className="w-3 h-3" /> Skip · S
              </button>
            </div>
            <div className="text-[11px] text-[hsl(var(--text-tertiary))] font-mono-nums">
              {shortcutLabelForList(currentSpecs)}
            </div>
          </div>

          {/* Prev/next nav row */}
          <div className="mt-2 flex items-center justify-between text-[11.5px] text-[hsl(var(--text-tertiary))]">
            <button onClick={handlePrev} className="inline-flex items-center gap-1 hover:text-foreground">
              <ArrowLeft className="w-3 h-3" /> Prev
            </button>
            <button onClick={handleNext} className="inline-flex items-center gap-1 hover:text-foreground">
              Next <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card p-10 text-center text-[13px] text-[hsl(var(--text-secondary))]">
          No bleeders to triage.
        </div>
      )}

      {/* Floating shortcut legend */}
      {showLegend && (
        <div
          className="fixed bottom-4 right-4 z-30 rounded-lg border border-border bg-card shadow-pop p-3 text-[11.5px] animate-fade-in"
          style={{ minWidth: 220 }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
              <Keyboard className="w-3.5 h-3.5" /> Shortcuts
            </span>
            <button
              onClick={() => setShowLegend(false)}
              className="text-[hsl(var(--text-tertiary))] hover:text-foreground"
              aria-label="Hide shortcuts"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-1 text-[hsl(var(--text-secondary))] font-mono-nums">
            {currentSpecs.map(s => (
              <div key={s.value} className="flex justify-between gap-3">
                <span>{s.label}</span>
                <kbd className="px-1.5 py-0.5 rounded bg-secondary text-foreground">{s.shortcut.toUpperCase()}</kbd>
              </div>
            ))}
            <div className="flex justify-between gap-3"><span>Skip</span><kbd className="px-1.5 py-0.5 rounded bg-secondary text-foreground">S</kbd></div>
            <div className="flex justify-between gap-3"><span>Undo last</span><kbd className="px-1.5 py-0.5 rounded bg-secondary text-foreground">Z</kbd></div>
            <div className="flex justify-between gap-3"><span>Prev / Next</span><kbd className="px-1.5 py-0.5 rounded bg-secondary text-foreground">← →</kbd></div>
          </div>
        </div>
      )}
      {!showLegend && (
        <button
          onClick={() => setShowLegend(true)}
          className="fixed bottom-4 right-4 z-30 inline-flex items-center gap-1.5 rounded-full border border-border bg-card shadow-pop px-3 h-8 text-[11.5px] text-[hsl(var(--text-secondary))] hover:text-foreground"
        >
          <Keyboard className="w-3.5 h-3.5" /> Shortcuts
        </button>
      )}
    </div>
  );
};

const Metric: React.FC<{ label: string; value: string; big?: boolean; accent?: string }> = ({ label, value, big, accent }) => (
  <div>
    <div className="text-[10.5px] uppercase tracking-[0.08em] text-[hsl(var(--text-tertiary))] font-medium">
      {label}
    </div>
    <div
      className="mt-1 font-mono-nums font-semibold tabular-nums"
      style={{
        fontSize: big ? 26 : 20,
        color: accent ?? '#1D1D1F',
        lineHeight: 1.1,
      }}
    >
      {value}
    </div>
  </div>
);
