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
  /** Optional right-side trailing slot — e.g. "23/48 decisions · 💰 $1,026 addressed" */
  trailing?: React.ReactNode;
}

const ACCENT_BORDER: Record<Accent, string> = {
  red: 'border-t-[2px] border-t-[hsl(var(--destructive))]',
  amber: 'border-t-[2px] border-t-[hsl(var(--amber))]',
  purple: 'border-t-[2px] border-t-[hsl(265_70%_60%)]',
};

/**
 * Single horizontal command bar:
 * [stats] | [pipeline stepper] | [trailing]
 * Vertical dividers between sections, all on one row.
 */
export const CompactStatsBar: React.FC<Props> = ({ stats, steps, accent = 'red', trailing }) => {
  return (
    <div
      className={`rounded-xl border border-border bg-card overflow-hidden ${ACCENT_BORDER[accent]}`}
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
    >
      <div className="flex items-center gap-5 px-5 h-14 flex-wrap md:flex-nowrap">
        {/* Stats group */}
        <div className="flex items-center gap-4 flex-shrink-0">
          {stats.map((s, i) => (
            <React.Fragment key={i}>
              {i > 0 && <span className="text-[#D1D5DB]">·</span>}
              <div className="flex items-baseline gap-1.5">
                <span
                  className={`text-[16px] font-semibold tabular-nums leading-none ${
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
        <span className="hidden md:block h-6 w-px bg-[#E5E7EB]" aria-hidden />

        {/* Pipeline stepper */}
        <div className="flex items-center flex-1 min-w-0">
          {steps.map((step, i) => {
            const isLast = i === steps.length - 1;
            const dot =
              step.status === 'complete' ? (
                <div className="w-3.5 h-3.5 rounded-full bg-success flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                </div>
              ) : step.status === 'active' ? (
                <div className="w-3.5 h-3.5 rounded-full bg-primary flex-shrink-0 step-pulse" />
              ) : (
                <div className="w-3.5 h-3.5 rounded-full border-2 border-border bg-card flex-shrink-0" />
              );
            return (
              <React.Fragment key={i}>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {dot}
                  <span
                    className={`text-[11.5px] font-medium whitespace-nowrap ${
                      step.status === 'complete'
                        ? 'text-[#9CA3AF]'
                        : step.status === 'active'
                        ? 'text-[#111827]'
                        : 'text-[#9CA3AF]'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
                {!isLast && (
                  <div
                    className={`flex-1 h-px mx-3 min-w-[16px] ${
                      step.status === 'complete' ? 'bg-success' : 'bg-border'
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {trailing && (
          <>
            <span className="hidden md:block h-6 w-px bg-[#E5E7EB]" aria-hidden />
            <div className="flex items-center gap-3 flex-shrink-0">{trailing}</div>
          </>
        )}
      </div>
    </div>
  );
};
