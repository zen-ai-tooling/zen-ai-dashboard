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
  addressedSavings?: number;
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
  totalSpend: _totalSpend,
  sheetsCount: _sheetsCount,
  addressedSavings,
  shortSheetLabel,
}) => {
  const [skipped, setSkipped] = React.useState<Set<string>>(new Set());
  const [history, setHistory] = React.useState<string[]>([]);
  const [cursor, setCursor] = React.useState(0);
  const [direction, setDirection] = React.useState<'left' | 'right'>('right');
  const [phase, setPhase] = React.useState<'idle' | 'exiting'>('idle');
  const [showThreshold, setShowThreshold] = React.useState(false);
  const [showLegend, setShowLegend] = React.useState(true);

  // Refs that survive re-renders — used by debounced key handler
  const lastKeyAtRef = React.useRef(0);
  const phaseRef = React.useRef<'idle' | 'exiting'>('idle');
  React.useEffect(() => { phaseRef.current = phase; }, [phase]);

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
  const _savingsAnimated = useCountUp(savingsTarget);

  const current = queue[cursor];
  const currentSpecs = current ? decisionSpecsBySheet(current.sheet) : [];
  const currentDecision = current ? decisions[current.key] : undefined;

  // Sequential exit -> advance -> enter. Keeps only one card visible at a time.
  const sequence = (dir: 'left' | 'right', advance: () => void) => {
    if (phaseRef.current === 'exiting') return;
    setDirection(dir);
    setPhase('exiting');
    window.setTimeout(() => {
      advance();
      setPhase('idle');
    }, 130);
  };

  const handleDecide = (val: string) => {
    if (!current) return;
    const wasUndecided = !decisions[current.key];
    if (wasUndecided) setHistory(h => [...h, current.key]);
    onDecide(current.key, val);
    sequence('right', () => {
      setCursor(c => Math.min(c + 1, queue.length - 1));
    });
  };

  const handleSkip = () => {
    if (!current || decisions[current.key]) return;
    setSkipped(s => new Set(s).add(current.key));
    sequence('right', () => {
      setCursor(c => Math.min(c + 1, queue.length - 1));
    });
  };

  // Z behavior: if current card has a decision, clear it in place (no advance).
  // Otherwise undo the most recent decision and navigate back to that card.
  const handleUndo = () => {
    if (current && decisions[current.key]) {
      onUndo?.(current.key);
      setHistory(h => h.filter(k => k !== current.key));
      return;
    }
    const last = history[history.length - 1];
    if (!last) return;
    onUndo?.(last);
    setHistory(h => h.slice(0, -1));
    const idx = queue.findIndex(q => q.key === last);
    if (idx >= 0) {
      sequence('left', () => setCursor(idx));
    }
  };

  const handlePrev = () => {
    sequence('left', () => setCursor(c => Math.max(0, c - 1)));
  };
  const handleNext = () => {
    sequence('right', () => setCursor(c => Math.min(queue.length - 1, c + 1)));
  };

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      try {
        if (e.target && (e.target as HTMLElement).closest('input,textarea,select,[contenteditable="true"]')) return;
        if (e.metaKey || e.ctrlKey || e.altKey) return;
        // Debounce: 100ms between accepted keypresses
        const now = Date.now();
        if (now - lastKeyAtRef.current < 100) return;
        lastKeyAtRef.current = now;

        const k = e.key.toLowerCase();
        if (e.key === 'ArrowLeft') { e.preventDefault(); handlePrev(); return; }
        if (e.key === 'ArrowRight') { e.preventDefault(); handleNext(); return; }
        if (k === 's') { e.preventDefault(); handleSkip(); return; }
        if (k === 'z') { e.preventDefault(); handleUndo(); return; }
        if (k === 'escape') { e.preventDefault(); onSwitchToReview(); return; }
        const spec = currentSpecs.find(s => s.shortcut.toLowerCase() === k);
        if (spec) { e.preventDefault(); handleDecide(spec.value); }
      } catch (err) {
        // Never let a key handler crash the component
        // eslint-disable-next-line no-console
        console.error('[TriageMode] key handler error', err);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.key, currentSpecs, queue.length, cursor, history]);

  const suggestionFor = (it: TriageItem) => {
    const sug = suggestB1Row({ clicks: it.clicks, spend: it.spend, sales: it.sales, orders: it.orders });
    const map: Record<string, { label: string; accent: string; bg: string }> = {
      pause:   { label: 'PAUSE',   accent: '#EF4444', bg: 'rgba(239, 68, 68, 0.06)' },
      review:  { label: 'REVIEW',  accent: '#F59E0B', bg: 'rgba(245, 158, 11, 0.06)' },
      monitor: { label: 'MONITOR', accent: '#6B7280', bg: 'rgba(107, 114, 128, 0.06)' },
      keep:    { label: '',        accent: '',        bg: '' },
    };
    const banner = map[sug.kind] ?? map.keep;
    return { ...banner, rationale: sug.rationale, kind: sug.kind };
  };

  const counterValue = addressedSavings ?? savingsTarget;

  return (
    <div className="triage-content">
      {/* 1. 3px teal progress bar — top of content area */}
      <div style={{ height: 3, width: '100%', background: 'rgba(255,255,255,0.06)' }}>
        <div
          className="h-full transition-all duration-500 ease-out"
          style={{ width: `${progressPct}%`, background: '#0D9488' }}
        />
      </div>

      {/* 2. Top-left exit link */}
      <button
        onClick={onSwitchToReview}
        className="absolute hover:text-white transition-colors"
        style={{ top: 16, left: 16, color: '#9CA3AF', fontSize: 13, zIndex: 5 }}
      >
        ← Exit triage
      </button>

      {/* 3. Top-right counter */}
      <div
        className="absolute flex items-center gap-3 tabular-nums"
        style={{ top: 16, right: 16, color: '#FFFFFF', fontSize: 13, zIndex: 5 }}
      >
        <span>{decisionsMade}/{total}</span>
        <span style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.25)' }} />
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden>💰</span>
          <span>${Math.round(counterValue).toLocaleString()} addressed</span>
        </span>
      </div>

      {/* 4. Flex-centered card area */}
      <div
        className="flex items-start justify-center px-4"
        style={{ minHeight: 'calc(100vh - 52px - 3px)', paddingTop: 56, paddingBottom: 96 }}
      >
        {total === 0 ? (
          <div className="bg-white text-center" style={{ borderRadius: 16, padding: 40, maxWidth: 640, width: '85%' }}>
            <h2 className="text-[20px] font-semibold" style={{ color: '#111827' }}>No bleeders to review</h2>
            <p className="mt-2 text-[13px]" style={{ color: '#6B7280' }}>There's nothing to triage right now.</p>
            <button
              onClick={onSwitchToReview}
              className="mt-5 inline-flex items-center justify-center h-10 px-5 rounded-lg text-[13px] font-semibold text-white"
              style={{ background: '#0D9488' }}
            >
              Exit triage
            </button>
          </div>
        ) : allDone ? (
          <CompletionCard
            total={total}
            savings={savingsTarget}
            onGenerate={onGenerate}
            onReview={onSwitchToReview}
          />
        ) : current ? (
          <div
            key={current.key + ':' + (phase === 'exiting' ? 'out' : 'in') + ':' + direction}
            className="bg-white text-[#111827] overflow-y-auto"
            style={{
              width: '85%',
              maxWidth: 640,
              maxHeight: 'calc(100vh - 160px)',
              borderRadius: 16,
              padding: 22,
              boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
              animation: phase === 'exiting'
                ? (direction === 'right'
                    ? 'triage-out-left 120ms ease-in forwards'
                    : 'triage-out-right 120ms ease-in forwards')
                : (direction === 'right'
                    ? 'triage-in-right 150ms ease-out'
                    : 'triage-in-left 150ms ease-out'),
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
              <div className="text-[12px] tabular-nums flex items-center gap-2" style={{ color: '#9CA3AF' }}>
                <span>
                  <span className="font-semibold" style={{ color: '#374151' }}>{cursor + 1}</span> of {queue.length}
                </span>
                {currentDecision && (() => {
                  const spec = currentSpecs.find(s => s.value === currentDecision);
                  if (!spec) return null;
                  return (
                    <span className="inline-flex items-center gap-1.5" style={{ color: spec.bg }}>
                      <span style={{ width: 6, height: 6, borderRadius: 999, background: spec.bg, display: 'inline-block' }} />
                      <span style={{ fontWeight: 600 }}>{spec.label}</span>
                    </span>
                  );
                })()}
              </div>
            </div>
            {/* card progress bar — overall session completion */}
            <div className="mt-3 w-full overflow-hidden" style={{ height: 4, background: '#F3F4F6', borderRadius: 2 }}>
              <div className="h-full transition-all duration-300" style={{ width: `${progressPct}%`, background: '#0D9488', borderRadius: 2 }} />
            </div>

            {/* b. Entity name */}
            <h2
              className="break-words"
              style={{ marginTop: 14, fontSize: 24, fontWeight: 700, color: '#111827', lineHeight: 1.2, letterSpacing: '-0.02em' }}
            >
              {current.entity}
            </h2>

            {/* c. Metadata row — campaign (≤35 chars) · match pill */}
            <div className="flex items-center gap-2 flex-wrap" style={{ marginTop: 6, fontSize: 13, color: '#9CA3AF' }}>
              <span title={current.campaign}>
                {current.campaign && current.campaign.length > 35
                  ? `${current.campaign.slice(0, 35)}…`
                  : (current.campaign || '—')}
              </span>
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

            {/* d. Metrics row — 4 equal columns */}
            <div className="grid grid-cols-4 gap-4" style={{ marginTop: 16 }}>
              <Metric label="Spend" value={`$${current.spend.toFixed(2)}`} accent="#EF4444" />
              <Metric label="Clicks" value={current.clicks.toLocaleString()} accent="#111827" />
              <Metric
                label="Sales"
                value={current.sales == null ? '—' : `$${current.sales.toFixed(2)}`}
                accent={
                  current.sales == null ? '#9CA3AF'
                  : current.sales <= 0 ? '#EF4444'
                  : '#059669'
                }
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

            {/* e. Suggestion banner — 4px left border, label + reason on one line */}
            {(() => {
              const s = suggestionFor(current);
              if (!s.label) return null;
              return (
                <div
                  className="rounded-lg"
                  style={{
                    marginTop: 14,
                    background: s.bg,
                    borderLeft: `4px solid ${s.accent}`,
                    padding: '12px 14px',
                  }}
                >
                  <div className="flex items-start gap-3">
                    <Sparkles className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: s.accent }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-1.5 flex-wrap">
                        <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: s.accent }}>
                          {s.label}
                        </span>
                        <span style={{ fontSize: 13, color: '#374151' }}>
                          — {s.rationale}
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

            {/* f. Action buttons — equal-width grid filling card inner width */}
            <div
              className="grid"
              style={{
                marginTop: 16,
                gap: 8,
                width: '100%',
                gridTemplateColumns: `repeat(${currentSpecs.length}, 1fr)`,
              }}
            >
              {currentSpecs.map((spec) => {
                const isSelected = currentDecision === spec.value;
                const hasDecision = !!currentDecision;
                return (
                  <button
                    key={spec.value}
                    onClick={() => handleDecide(spec.value)}
                    className="relative btn-press transition-all flex items-center justify-center w-full"
                    style={{
                      height: 46,
                      borderRadius: 10,
                      background: spec.bg,
                      color: '#FFFFFF',
                      fontSize: 13,
                      fontWeight: 700,
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                      boxShadow: isSelected ? '0 0 0 2px #FFFFFF, 0 0 0 4px ' + spec.bg + '55' : undefined,
                      opacity: hasDecision && !isSelected ? 0.8 : 1,
                    }}
                  >
                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" strokeWidth={2.6} />}
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
                        background: 'rgba(0,0,0,0.15)',
                        color: '#FFFFFF',
                      }}
                    >
                      {spec.shortcut.toUpperCase()}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* g. Secondary actions */}
            <div className="flex items-center justify-between" style={{ marginTop: 10 }}>
              <button
                onClick={handleUndo}
                disabled={!currentDecision && history.length === 0}
                className="text-[13px] inline-flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-80"
                style={{ color: '#9CA3AF' }}
              >
                <Undo2 className="w-3.5 h-3.5" /> {currentDecision ? 'Clear decision (Z)' : 'Undo last (Z)'}
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
          <div className="bg-white text-center" style={{ borderRadius: 16, padding: 40, maxWidth: 640, width: '85%' }}>
            <h2 className="text-[20px] font-semibold" style={{ color: '#111827' }}>No bleeders to review</h2>
            <p className="mt-2 text-[13px]" style={{ color: '#6B7280' }}>There's nothing to triage right now.</p>
            <button
              onClick={onSwitchToReview}
              className="mt-5 inline-flex items-center justify-center h-10 px-5 rounded-lg text-[13px] font-semibold text-white"
              style={{ background: '#0D9488' }}
            >
              Exit triage
            </button>
          </div>
        )}
      </div>

      {/* 8. Floating Generate file pill — bottom-center */}
      {!allDone && (
        <button
          onClick={onGenerate}
          disabled={decisionsMade === 0}
          className="fixed inline-flex items-center gap-1.5 hover:opacity-90 btn-press disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            left: '50%',
            transform: 'translateX(-50%)',
            bottom: 24,
            background: '#0D9488',
            color: '#FFFFFF',
            borderRadius: 24,
            padding: '10px 24px',
            fontSize: 13,
            fontWeight: 600,
            boxShadow: '0 4px 16px rgba(13,148,136,0.4)',
            zIndex: 50,
          }}
        >
          Generate file ({decisionsMade}/{total}) <ArrowRight className="w-3.5 h-3.5" />
        </button>
      )}

      {/* 9. Shortcuts panel — fixed bottom-right */}
      {showLegend ? (
        <div
          className="fixed"
          style={{
            right: 24,
            bottom: 24,
            width: 192,
            background: '#1F2937',
            border: '1px solid #374151',
            borderRadius: 10,
            padding: '14px 16px',
            zIndex: 50,
          }}
        >
          <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
            <span className="inline-flex items-center gap-1.5" style={{ color: '#FFFFFF', fontSize: 12, fontWeight: 600 }}>
              ⌨ Shortcuts
            </span>
            <button
              onClick={() => setShowLegend(false)}
              className="hover:opacity-70"
              aria-label="Hide shortcuts"
              style={{ color: '#9CA3AF', fontSize: 14, lineHeight: 1 }}
            >
              ×
            </button>
          </div>
          <div className="flex flex-col" style={{ gap: 8, fontSize: 12 }}>
            {currentSpecs.map(s => (
              <ShortcutRow key={s.value} label={s.label} k={s.shortcut.toUpperCase()} />
            ))}
            <ShortcutRow label="SKIP" k="S" />
            <ShortcutRow label="UNDO" k="Z" />
            <ShortcutRow label="PREV" k="←" />
            <ShortcutRow label="NEXT" k="→" />
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowLegend(true)}
          className="fixed inline-flex items-center gap-1.5 rounded-full px-3 h-8 text-[11.5px] hover:opacity-90"
          style={{
            right: 24, bottom: 24,
            background: '#1F2937', border: '1px solid #374151', color: '#FFFFFF',
            zIndex: 50,
          }}
        >
          ⌨ Shortcuts
        </button>
      )}

    </div>
  );
};

const ShortcutRow: React.FC<{ label: string; k: string }> = ({ label, k }) => (
  <div className="flex justify-between items-center">
    <span style={{ color: '#9CA3AF' }}>{label}</span>
    <kbd
      className="font-mono-nums"
      style={{
        padding: '1px 6px',
        borderRadius: 3,
        background: '#374151',
        color: '#FFFFFF',
        fontSize: 11,
      }}
    >
      {k}
    </kbd>
  </div>
);

const Metric: React.FC<{ label: string; value: string; accent?: string }> = ({ label, value, accent }) => (
  <div>
    <div
      style={{
        fontSize: 10,
        fontWeight: 500,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        color: '#9CA3AF',
        marginBottom: 6,
      }}
    >
      {label}
    </div>
    <div
      className="tabular-nums"
      style={{
        fontSize: 28,
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

const CompletionCard: React.FC<{
  total: number;
  savings: number;
  onGenerate: () => void;
  onReview: () => void;
}> = ({ total, savings, onGenerate, onReview }) => (
  <div
    className="bg-white text-center animate-fade-in"
    style={{
      width: '85%',
      maxWidth: 640,
      borderRadius: 16,
      padding: '48px 40px',
      boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
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
