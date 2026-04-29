import * as React from 'react';
import { CheckCircle2, Download, ArrowRight } from 'lucide-react';

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
  /** module accent color used as the top border of the summary card */
  accentColor?: string;
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
}) => {
  const totalDecisions = breakdown.reduce((s, b) => s + b.count, 0);
  const noDecisionItem = breakdown.find((b) => /no decision|undecided/i.test(b.label));

  return (
    <div className="max-w-[760px] mx-auto py-12 animate-fade-in">
      <style>{`
        @keyframes hero-pop { 0% { transform: scale(0.5); opacity: 0; } 70% { transform: scale(1.05); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
        @keyframes title-fade { from { opacity: 0; transform: translateY(4px);} to { opacity: 1; transform: translateY(0);} }
        @keyframes sparkle-fade { 0%, 100% { opacity: 0; transform: scale(0.6);} 50% { opacity: 0.85; transform: scale(1);} }
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
          {/* Subtle sparkles */}
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
        <p className="text-[14px] font-mono-nums text-[#86868B] mt-1.5 truncate" title={fileName}>
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

      {/* Session summary — accented top border */}
      <div
        className="surface-card mt-8 p-6"
        style={{ borderTop: `2px solid ${accentColor}` }}
      >
        <h3 className="type-section-eyebrow mb-4">Session summary</h3>
        <div className="grid grid-cols-2 gap-x-8 gap-y-4">
          {summary.map((s) => (
            <div key={s.label} className="flex items-baseline justify-between border-b border-[#F0F0F2] pb-2.5">
              <span className="text-[13px] text-[#6E6E73]">{s.label}</span>
              <span className="text-[20px] font-semibold font-mono-nums text-[#1D1D1F] text-right">{s.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Decisions breakdown */}
      {breakdown.length > 0 && (
        <div className="surface-card mt-4 p-6">
          <h3 className="type-section-eyebrow mb-4">Decisions breakdown</h3>

          {/* Bar — 12px tall */}
          <div className="flex h-3 w-full rounded-full overflow-hidden bg-[#F0F0F2] mb-4">
            {breakdown.map((b) => {
              const pct = totalDecisions > 0 ? (b.count / totalDecisions) * 100 : 0;
              if (pct === 0) return null;
              return (
                <div
                  key={b.label}
                  style={{ width: `${pct}%`, background: b.color, transition: 'width 300ms ease' }}
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
                    style={{ width: 8, height: 8, background: b.color }}
                  />
                  <span className={`text-[13px] ${isUndecided ? 'text-[#86868B] italic' : 'text-[#6E6E73]'}`}>{b.label}</span>
                  <span className="text-[13px] font-mono-nums font-semibold text-[#1D1D1F]">{b.count}</span>
                </div>
              );
            })}
          </div>

          {noDecisionItem && noDecisionItem.count > 0 && (
            <p className="text-[12px] text-[#86868B] mt-3 italic">
              {noDecisionItem.count} row{noDecisionItem.count === 1 ? '' : 's'} left without a decision.
            </p>
          )}
        </div>
      )}

      {onViewFullResults && (
        <div className="text-center mt-6">
          <button
            onClick={onViewFullResults}
            className="text-[13px] font-medium text-[#0071E3] hover:underline btn-press"
          >
            View full results →
          </button>
        </div>
      )}
    </div>
  );
};
