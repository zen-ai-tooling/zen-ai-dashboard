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
}

export const CompletionView: React.FC<CompletionViewProps> = ({
  fileName,
  title = 'Workflow complete',
  summary,
  breakdown,
  onDownload,
  onStartNew,
  onViewFullResults,
}) => {
  const totalDecisions = breakdown.reduce((s, b) => s + b.count, 0);

  return (
    <div className="max-w-[760px] mx-auto py-12 animate-fade-in">
      {/* Hero */}
      <div className="text-center">
        <div
          className="mx-auto w-[72px] h-[72px] rounded-full flex items-center justify-center mb-5 step-complete-pop"
          style={{ background: 'rgba(52, 199, 89, 0.12)' }}
        >
          <CheckCircle2 className="w-12 h-12" strokeWidth={2} style={{ color: '#34C759' }} />
        </div>
        <h1 className="text-[24px] font-semibold text-[#1D1D1F] tracking-tight">{title}</h1>
        <p className="text-[14px] font-mono-nums text-[#86868B] mt-1.5 truncate" title={fileName}>
          {fileName}
        </p>

        <div className="flex items-center justify-center gap-2.5 mt-6">
          {onDownload && (
            <button
              onClick={onDownload}
              className="h-10 px-5 rounded-md border border-[#D2D2D7] bg-white text-[13px] font-medium text-[#1D1D1F] hover:bg-[#F5F5F7] btn-press inline-flex items-center gap-1.5"
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

      {/* Session summary */}
      <div className="surface-card mt-8 p-6">
        <h3 className="type-section-eyebrow mb-4">Session summary</h3>
        <div className="grid grid-cols-2 gap-x-8 gap-y-4">
          {summary.map((s) => (
            <div key={s.label} className="flex items-baseline justify-between border-b border-[#F0F0F2] pb-2.5">
              <span className="text-[13px] text-[#6E6E73]">{s.label}</span>
              <span className="text-[15px] font-semibold font-mono-nums text-[#1D1D1F]">{s.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Decisions breakdown */}
      {breakdown.length > 0 && (
        <div className="surface-card mt-4 p-6">
          <h3 className="type-section-eyebrow mb-4">Decisions breakdown</h3>

          {/* Bar */}
          <div className="flex h-2 w-full rounded-full overflow-hidden bg-[#F0F0F2] mb-4">
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
            {breakdown.map((b) => (
              <div key={b.label} className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ background: b.color }}
                />
                <span className="text-[13px] text-[#6E6E73]">{b.label}</span>
                <span className="text-[13px] font-mono-nums font-semibold text-[#1D1D1F]">{b.count}</span>
              </div>
            ))}
          </div>
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
