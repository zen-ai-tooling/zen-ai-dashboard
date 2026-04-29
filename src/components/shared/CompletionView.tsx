import * as React from 'react';
import { CheckCircle2, Download, ArrowRight, Info } from 'lucide-react';

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
}

const Sparkle: React.FC<{ color: string; style?: React.CSSProperties; delay?: number }> = ({ color, style, delay = 0 }) => (
  <span
    aria-hidden
    className="absolute rounded-full"
    style={{
      width: 6,
      height: 6,
      background: color,
      opacity: 0,
      animation: `sparkle-fade 2.4s ease-in-out ${delay}ms infinite`,
      ...style,
    }}
  />
);

export const CompletionView: React.FC<CompletionViewProps> = ({
  fileName,
  title = 'Workflow complete',
  summary,
  breakdown,
  onDownload,
  onStartNew,
  onViewFullResults,
  accentColor = '#34C759',
  impactHeadline,
  impactSubtitle,
  totalRows,
}) => {
  const decidedTotal = breakdown
    .filter((b) => !/no decision|undecided/i.test(b.label))
    .reduce((s, b) => s + b.count, 0);
  const total = totalRows ?? breakdown.reduce((s, b) => s + b.count, 0);
  const noDecisionItem = breakdown.find((b) => /no decision|undecided/i.test(b.label));
  const allDecided = total > 0 && decidedTotal >= total;

  return (
    <div className="min-h-[calc(100vh-180px)] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-[760px] animate-fade-in">
        <style>{`
          @keyframes hero-pop { 0% { transform: scale(0.5); opacity: 0; } 70% { transform: scale(1.05); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
          @keyframes title-fade { from { opacity: 0; transform: translateY(4px);} to { opacity: 1; transform: translateY(0);} }
          @keyframes sparkle-fade { 0%, 100% { opacity: 0; transform: scale(0.6);} 50% { opacity: 0.85; transform: scale(1);} }
          @keyframes impact-fade { from { opacity: 0; transform: translateY(6px);} to { opacity: 1; transform: translateY(0);} }
        `}</style>

        {/* Hero */}
        <div className="text-center">
          <div className="relative inline-block">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mb-5 mx-auto"
              style={{
                background: 'rgba(52, 199, 89, 0.12)',
                boxShadow: '0 0 24px rgba(52, 199, 89, 0.2)',
                animation: 'hero-pop 360ms cubic-bezier(0.34, 1.56, 0.64, 1) both',
              }}
            >
              <CheckCircle2 className="w-10 h-10" strokeWidth={2.2} style={{ color: '#34C759' }} />
            </div>
            <Sparkle color="#34C759" style={{ top: -2, left: -10 }} delay={300} />
            <Sparkle color="#0071E3" style={{ top: 6, right: -14 }} delay={700} />
            <Sparkle color="#FF9500" style={{ bottom: 18, left: -14 }} delay={1100} />
            <Sparkle color="#34C759" style={{ bottom: 4, right: -8 }} delay={1500} />
          </div>

          <h1
            className="text-[28px] font-semibold text-[#1D1D1F] tracking-tight"
            style={{ animation: 'title-fade 320ms ease-out 200ms both' }}
          >
            {title}
          </h1>
          <p className="text-[13px] font-mono-nums text-[#86868B] mt-1.5 truncate" title={fileName}>
            {fileName}
          </p>

          <div className="flex items-center justify-center gap-2.5 mt-6">
            {onDownload && (
              <button
                onClick={onDownload}
                className="h-10 px-5 rounded-md border bg-white text-[13px] font-medium text-[#1D1D1F] hover:bg-[#F5F5F7] btn-press inline-flex items-center gap-1.5"
                style={{ borderColor: '#D2D2D7' }}
              >
                <Download className="w-3.5 h-3.5" />
                Download
              </button>
            )}
            {onStartNew && (
              <button
                onClick={onStartNew}
                className="h-10 px-5 rounded-md text-[13px] font-semibold btn-press inline-flex items-center gap-1.5"
                style={{ background: '#0071E3', color: '#fff' }}
              >
                Start new session
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Session impact — accent top, headline number */}
        <div
          className="surface-card mt-8 p-6"
          style={{ borderTop: `2px solid ${accentColor}`, animation: 'impact-fade 360ms ease-out 280ms both' }}
        >
          <h3 className="type-section-eyebrow mb-3 text-center">Session impact</h3>

          {impactHeadline && (
            <div className="text-center mb-5">
              <div className="text-[32px] font-semibold font-mono-nums tracking-tight text-[#1D1D1F] leading-none">
                {impactHeadline}
              </div>
              {impactSubtitle && (
                <div className="text-[13px] text-[#6E6E73] mt-2">{impactSubtitle}</div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-x-8 gap-y-3 pt-4 border-t border-[#F0F0F2]">
            {summary.map((s) => (
              <div key={s.label} className="flex items-baseline justify-between">
                <span className="text-[12.5px] text-[#6E6E73]">{s.label}</span>
                <span className="text-[14px] font-semibold font-mono-nums text-[#1D1D1F] text-right">{s.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Decisions breakdown */}
        {breakdown.length > 0 && (
          <div className="surface-card mt-4 p-6">
            <h3 className="type-section-eyebrow mb-4">Decisions breakdown</h3>

            {/* Bar — 16px tall, rounded ends */}
            <div className="flex h-4 w-full rounded-full overflow-hidden bg-[#F0F0F2] mb-4">
              {breakdown.map((b) => {
                const pct = total > 0 ? (b.count / total) * 100 : 0;
                if (pct === 0) return null;
                const isUndecided = /no decision|undecided/i.test(b.label);
                return (
                  <div
                    key={b.label}
                    style={{
                      width: `${pct}%`,
                      background: isUndecided ? '#E5E5EA' : b.color,
                      transition: 'width 320ms ease',
                    }}
                    title={`${b.label}: ${b.count}`}
                  />
                );
              })}
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {breakdown.map((b) => {
                const isUndecided = /no decision|undecided/i.test(b.label);
                return (
                  <div key={b.label} className="flex items-center gap-2">
                    <span
                      className="rounded-full"
                      style={{ width: 8, height: 8, background: isUndecided ? '#E5E5EA' : b.color }}
                    />
                    <span className={`text-[13px] ${isUndecided ? 'text-[#86868B]' : 'text-[#6E6E73]'}`}>{b.label}</span>
                    <span className="text-[13px] font-mono-nums font-semibold text-[#1D1D1F]">{b.count}</span>
                  </div>
                );
              })}
            </div>

            {allDecided ? (
              <p className="text-[12.5px] mt-4 inline-flex items-center gap-1.5 font-medium" style={{ color: '#34C759' }}>
                <CheckCircle2 className="w-3.5 h-3.5" />
                Every bleeder has been addressed
              </p>
            ) : noDecisionItem && noDecisionItem.count > 0 ? (
              <p className="text-[12.5px] text-[#86868B] mt-4">
                {noDecisionItem.count} row{noDecisionItem.count === 1 ? '' : 's'} were left at their current state
              </p>
            ) : null}
          </div>
        )}

        {/* What's next */}
        <div
          className="mt-4 rounded-xl p-5 flex items-start gap-3"
          style={{
            background: '#F4F7FB',
            border: '1px solid #E2E8F0',
            borderLeft: '3px solid #0071E3',
          }}
        >
          <div
            className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(0, 113, 227, 0.10)' }}
          >
            <Info className="w-4 h-4" style={{ color: '#0071E3' }} />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="type-section-eyebrow mb-1.5">What's next</h4>
            <p className="text-[13.5px] text-[#1D1D1F] leading-snug">
              Your Amazon bulk file is ready to upload back into Campaign Manager.
            </p>
            <p className="text-[12.5px] text-[#6E6E73] mt-1.5 font-mono-nums">
              Amazon Ads → Campaign Manager → Bulk Operations → Upload
            </p>
          </div>
        </div>

        {onViewFullResults && (
          <div className="text-center mt-6">
            <button
              onClick={onViewFullResults}
              className="text-[13px] font-medium text-[#0071E3] hover:underline btn-press"
            >
              View full results → Review all {total} bleeders and decisions
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
