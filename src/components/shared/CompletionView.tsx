import * as React from 'react';
import { CheckCircle2, Download, ArrowRight, Info } from 'lucide-react';
import { ImpactDonut } from './ImpactDonut';

export interface CompletionSummaryItem {
  label: string;
  value: string;
}

export interface DecisionBreakdownItem {
  label: string;
  count: number;
  color: string; // hex
}

interface CompletionViewProps {
  fileName: string;
  title?: string;
  summary: CompletionSummaryItem[];
  breakdown: DecisionBreakdownItem[];
  onDownload?: () => void;
  onStartNew?: () => void;
  onViewFullResults?: () => void;
  /** module accent color used as the top border of the impact card */
  accentColor?: string;
  /** Headline number (e.g. "$1,026 in at-risk spend addressed") */
  impactHeadline?: string;
  impactSubtitle?: string;
  totalRows?: number;
  /** Optional: at-risk spend addressed via decisions, used to render the impact donut */
  addressedSpend?: number;
  /** Optional: at-risk spend on rows still without a decision */
  undecidedSpend?: number;
}

export const CompletionView: React.FC<CompletionViewProps> = ({
  fileName,
  title = 'Workflow complete',
  summary,
  breakdown,
  onDownload,
  onStartNew,
  onViewFullResults,
  accentColor = '#10B981',
  impactHeadline,
  impactSubtitle,
  totalRows,
  addressedSpend,
  undecidedSpend,
}) => {
  const decidedTotal = breakdown
    .filter((b) => !/no decision|undecided/i.test(b.label))
    .reduce((s, b) => s + b.count, 0);
  const total = totalRows ?? breakdown.reduce((s, b) => s + b.count, 0);
  const noDecisionItem = breakdown.find((b) => /no decision|undecided/i.test(b.label));
  const allDecided = total > 0 && decidedTotal >= total;
  const noCount = noDecisionItem?.count ?? 0;

  // Donut data — prefer spend if provided, otherwise fall back to row counts
  const donutAddressed = addressedSpend ?? decidedTotal;
  const donutUndecided = undecidedSpend ?? noCount;

  return (
    <div
      className="flex flex-col items-center justify-center px-4 py-8"
      style={{ minHeight: 'calc(100vh - 52px)' }}
    >
      <div className="w-full max-w-[760px]">
        <style>{`
          @keyframes cv-hero-pop { 0% { transform: scale(0.5); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
          @keyframes cv-glow-fade { from { opacity: 0; } to { opacity: 1; } }
          @keyframes cv-fade-in { from { opacity: 0; } to { opacity: 1; } }
          @keyframes cv-slide-up { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        `}</style>

        {/* Hero */}
        <div className="text-center">
          <div className="relative inline-block mb-5">
            {/* Soft radial glow — fades in alongside checkmark */}
            <div
              aria-hidden
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
              style={{
                width: 120,
                height: 120,
                background: 'radial-gradient(circle, rgba(34, 197, 94, 0.06) 0%, transparent 70%)',
                animation: 'cv-glow-fade 400ms ease-out both',
              }}
            />
            <div
              className="relative w-[72px] h-[72px] rounded-full flex items-center justify-center mx-auto"
              style={{
                background: '#10B981',
                animation: 'cv-hero-pop 400ms cubic-bezier(0.34, 1.56, 0.64, 1) both',
              }}
            >
              <CheckCircle2 className="w-10 h-10 text-white" strokeWidth={2.4} />
            </div>
          </div>

          <h1
            className="font-bold text-[#111827]"
            style={{ fontSize: 24, letterSpacing: '-0.3px', animation: 'cv-fade-in 200ms ease-out 400ms both' }}
          >
            {title}
          </h1>
          <p
            className="text-[12px] font-mono-nums text-[#9CA3AF] mt-1.5 truncate"
            title={fileName}
            style={{ animation: 'cv-fade-in 200ms ease-out 500ms both' }}
          >
            {fileName}
          </p>

          <div
            className="flex items-center justify-center gap-2.5 mt-6"
            style={{ animation: 'cv-fade-in 200ms ease-out 600ms both' }}
          >
            {onDownload && (
              <button
                onClick={onDownload}
                className="rounded-[10px] btn-press inline-flex items-center gap-1.5"
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #D1D5DB',
                  color: '#111827',
                  padding: '12px 24px',
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                <Download className="w-4 h-4" />
                Download
              </button>
            )}
            {onStartNew && (
              <button
                onClick={onStartNew}
                className="rounded-[10px] btn-press inline-flex items-center gap-1.5"
                style={{
                  background: '#4F6EF7',
                  color: '#fff',
                  padding: '12px 24px',
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                Start new session
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Session impact */}
        <div
          className="mt-8 p-6"
          style={{
            background: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderTop: `2px solid ${accentColor}`,
            borderRadius: 12,
            boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 0 1px rgba(0,0,0,0.04)',
            animation: 'cv-slide-up 200ms ease-out 700ms both',
          }}
        >
          <h3
            className="mb-3 text-center"
            style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', color: '#9CA3AF' }}
          >
            Session impact
          </h3>

          {impactHeadline && (
            <div className="flex items-center justify-center gap-5 mb-5">
              <ImpactDonut addressed={donutAddressed} undecided={donutUndecided} size={80} />
              <div className="text-left">
                <div
                  className="font-mono-nums text-[#111827] leading-none"
                  style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-1px' }}
                >
                  {impactHeadline}
                </div>
                {impactSubtitle && (
                  <div className="text-[13px] text-[#374151] mt-2.5">{impactSubtitle}</div>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-x-8 gap-y-3 pt-4 border-t border-[#F3F4F6]">
            {summary.map((s) => (
              <div key={s.label} className="flex items-baseline justify-between">
                <span style={{ fontSize: 13, color: '#374151' }}>{s.label}</span>
                <span className="font-mono-nums text-right" style={{ fontSize: 16, fontWeight: 600, color: '#111827' }}>
                  {s.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Decisions breakdown */}
        {breakdown.length > 0 && (
          <div
            className="mt-4 p-6"
            style={{
              background: '#FFFFFF',
              border: '1px solid #E5E7EB',
              borderTop: `2px solid ${accentColor}`,
              borderRadius: 12,
              boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 0 1px rgba(0,0,0,0.04)',
              animation: 'cv-slide-up 200ms ease-out 850ms both',
            }}
          >
            <h3
              className="mb-4"
              style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', color: '#9CA3AF' }}
            >
              Decisions breakdown
            </h3>

            {/* Bar — 16px tall, rounded ends, white gaps between segments, inline % when wide enough */}
            <div
              className="flex w-full overflow-hidden bg-[#F3F4F6] mb-4"
              style={{ height: 16, borderRadius: 8, gap: 1 }}
            >
              {breakdown.map((b) => {
                const pct = total > 0 ? (b.count / total) * 100 : 0;
                if (pct === 0) return null;
                const isUndecided = /no decision|undecided/i.test(b.label);
                const showLabel = pct >= 15;
                return (
                  <div
                    key={b.label}
                    className="flex items-center justify-center"
                    style={{
                      width: `${pct}%`,
                      background: isUndecided ? '#E5E7EB' : b.color,
                      transition: 'width 320ms ease',
                    }}
                    title={`${b.label}: ${b.count} (${pct.toFixed(0)}%)`}
                  >
                    {showLabel && (
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: isUndecided ? '#374151' : '#FFFFFF',
                          letterSpacing: 0.2,
                        }}
                      >
                        {pct.toFixed(0)}%
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {breakdown.map((b) => {
                const isUndecided = /no decision|undecided/i.test(b.label);
                const pct = total > 0 ? (b.count / total) * 100 : 0;
                const showPctInLegend = pct > 0 && pct < 15;
                return (
                  <div key={b.label} className="flex items-center gap-2">
                    <span
                      className="rounded-full"
                      style={{ width: 8, height: 8, background: isUndecided ? '#E5E7EB' : b.color }}
                    />
                    <span style={{ fontSize: 13, color: isUndecided ? '#9CA3AF' : '#374151' }}>{b.label}</span>
                    <span className="font-mono-nums" style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>
                      {b.count}
                    </span>
                    {showPctInLegend && (
                      <span className="font-mono-nums" style={{ fontSize: 11, color: '#9CA3AF' }}>
                        ({pct.toFixed(0)}%)
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {allDecided ? (
              <p
                className="mt-4 inline-flex items-center gap-1.5"
                style={{ fontSize: 13, color: '#10B981', fontWeight: 600 }}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Every bleeder has been addressed
              </p>
            ) : noCount > 0 ? (
              <p className="mt-4" style={{ fontSize: 13, color: '#9CA3AF' }}>
                {noCount === 1
                  ? '1 bleeder skipped — not included in your file'
                  : `${noCount} bleeders skipped — not included in your file`}
              </p>
            ) : null}
          </div>
        )}

        {/* What's next */}
        <div
          className="mt-4 flex items-start gap-3"
          style={{
            background: 'rgba(79, 110, 247, 0.06)',
            borderLeft: '3px solid #4F6EF7',
            borderRadius: 8,
            padding: '16px 20px',
            animation: 'cv-slide-up 200ms ease-out 1000ms both',
          }}
        >
          <div
            className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(79, 110, 247, 0.10)' }}
          >
            <Info className="w-4 h-4" style={{ color: '#4F6EF7' }} />
          </div>
          <div className="min-w-0 flex-1">
            <h4
              className="mb-1.5"
              style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', color: '#9CA3AF' }}
            >
              What's next
            </h4>
            <p style={{ fontSize: 14, color: '#111827', lineHeight: 1.45 }}>
              Your Amazon bulk file is ready to upload back into Campaign Manager.
            </p>
            <p className="mt-1.5 inline-flex items-center gap-1 flex-wrap" style={{ fontSize: 13, color: '#374151' }}>
              <span>Amazon Ads</span>
              <span style={{ color: '#D1D5DB' }}>›</span>
              <span>Campaign Manager</span>
              <span style={{ color: '#D1D5DB' }}>›</span>
              <span>Bulk Operations</span>
              <span style={{ color: '#D1D5DB' }}>›</span>
              <span>Upload</span>
            </p>
          </div>
        </div>

        {onViewFullResults && (
          <div className="text-center mt-6" style={{ animation: 'cv-fade-in 150ms ease-out 1100ms both' }}>
            <button
              onClick={onViewFullResults}
              className="hover:underline btn-press inline-flex items-center gap-1.5"
              style={{ fontSize: 13, fontWeight: 500, color: '#4F6EF7' }}
            >
              View full results
              <ArrowRight className="w-3.5 h-3.5" />
              <span style={{ color: '#9CA3AF' }}>Review all {total} bleeders and decisions</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
