import * as React from 'react';
import { CheckCircle2 } from 'lucide-react';

export type Accent = 'red' | 'amber' | 'purple';

export interface CompactStat {
  value: string;
  label: string;
  danger?: boolean;
}

export interface StepDef {
  label: string;
  status: 'complete' | 'active' | 'pending';
}

interface Props {
  stats: CompactStat[];
  steps: StepDef[];
  accent?: Accent;
}

const ACCENT_BORDER: Record<Accent, string> = {
  red: 'border-t-[2px] border-t-[hsl(var(--destructive))]',
  amber: 'border-t-[2px] border-t-[hsl(var(--amber))]',
  purple: 'border-t-[2px] border-t-[hsl(265_70%_60%)]',
};

const ACCENT_BG: Record<Accent, string> = {
  red: 'rgba(255, 59, 48, 0.02)',
  amber: 'rgba(255, 149, 0, 0.025)',
  purple: 'rgba(168, 85, 247, 0.025)',
};

export const CompactStatsBar: React.FC<Props> = ({ stats, steps, accent = 'red' }) => {
  return (
    <div
      className={`rounded-xl border border-border shadow-card overflow-hidden ${ACCENT_BORDER[accent]}`}
      style={{ background: ACCENT_BG[accent] }}
    >
      {/* Inline stats row */}
      <div className="flex items-center gap-4 px-5 py-3 flex-wrap">
        {stats.map((s, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span className="h-4 w-px bg-border" aria-hidden />}
            <div className="flex items-baseline gap-1.5">
              <span
                className={`text-[20px] font-semibold font-mono-nums leading-none ${
                  s.danger ? 'text-destructive' : 'text-foreground'
                }`}
              >
                {s.value}
              </span>
              <span className="text-[12px] text-[#9CA3AF]">{s.label}</span>
            </div>
          </React.Fragment>
        ))}
      </div>

      {/* Divider */}
      <div className="border-t border-[#E5E7EB]" />

      {/* Steps */}
      <div className="px-5 py-3 bg-card/60">
        <div className="flex items-center">
          {steps.map((step, i) => {
            const isLast = i === steps.length - 1;
            const dot = step.status === 'complete' ? (
              <div className="w-4 h-4 rounded-full bg-success flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-2.5 h-2.5 text-white" />
              </div>
            ) : step.status === 'active' ? (
              <div className="w-4 h-4 rounded-full bg-primary flex-shrink-0 step-pulse" />
            ) : (
              <div className="w-4 h-4 rounded-full border-2 border-border bg-card flex-shrink-0" />
            );
            return (
              <React.Fragment key={i}>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {dot}
                  <span
                    className={`text-[11px] font-medium whitespace-nowrap ${
                      step.status === 'complete'
                        ? 'text-success'
                        : step.status === 'active'
                        ? 'text-primary'
                        : 'text-[hsl(var(--text-tertiary))]'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
                {!isLast && (
                  <div
                    className={`flex-1 h-px mx-3 ${
                      step.status === 'complete' ? 'bg-success' : 'bg-border'
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};
