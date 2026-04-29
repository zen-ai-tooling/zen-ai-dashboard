import * as React from 'react';
import { Check } from 'lucide-react';

export interface WorkflowStepBreadcrumbStep {
  label: string;
  status: 'complete' | 'active' | 'pending';
}

interface Props {
  steps: WorkflowStepBreadcrumbStep[];
}

export const WorkflowStepBreadcrumb: React.FC<Props> = ({ steps }) => {
  return (
    <div className="flex items-center gap-2 flex-wrap text-[12px]">
      {steps.map((s, i) => {
        const isLast = i === steps.length - 1;
        const colorBg =
          s.status === 'complete' ? '#34C759'
          : s.status === 'active' ? '#0071E3'
          : '#F0F0F2';
        const colorText =
          s.status === 'complete' ? '#1A7F3E'
          : s.status === 'active' ? '#0071E3'
          : '#86868B';
        const fontWeight = s.status === 'active' ? 600 : 500;

        return (
          <React.Fragment key={s.label}>
            <div className="flex items-center gap-1.5">
              <span
                className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-semibold font-mono-nums"
                style={{
                  background: s.status === 'pending' ? '#F0F0F2' : colorBg,
                  color: s.status === 'pending' ? '#86868B' : '#fff',
                  border: s.status === 'pending' ? '1px solid #D2D2D7' : 'none',
                }}
              >
                {s.status === 'complete' ? <Check className="w-2.5 h-2.5" strokeWidth={3} /> : i + 1}
              </span>
              <span style={{ color: colorText, fontWeight }}>{s.label}</span>
            </div>
            {!isLast && <span className="text-[#D2D2D7]">→</span>}
          </React.Fragment>
        );
      })}
    </div>
  );
};
