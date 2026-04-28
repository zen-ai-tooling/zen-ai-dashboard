import * as React from 'react';
import { CheckCircle2 } from 'lucide-react';

export interface WorkflowStep {
  label: string;
  status: 'complete' | 'active' | 'pending';
}

interface Props {
  steps: WorkflowStep[];
}

export const WorkflowSteps: React.FC<Props> = ({ steps }) => {
  return (
    <div className="rounded-xl border border-border bg-card shadow-card px-6 py-4">
      <div className="flex items-center">
        {steps.map((step, i) => {
          const isLast = i === steps.length - 1;
          const dotEl = step.status === 'complete' ? (
            <div className="w-5 h-5 rounded-full bg-success flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-3 h-3 text-white" />
            </div>
          ) : step.status === 'active' ? (
            <div className="w-5 h-5 rounded-full bg-primary flex-shrink-0 step-pulse" />
          ) : (
            <div className="w-5 h-5 rounded-full border-2 border-border bg-card flex-shrink-0" />
          );
          return (
            <React.Fragment key={i}>
              <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                {dotEl}
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
                  className={`flex-1 h-px mx-3 mb-5 ${
                    step.status === 'complete' ? 'bg-success' : 'bg-border'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
