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
          s.status === 'complete' ? '#10B981'
          : s.status === 'active' ? '#4F6EF7'
          : '#F3F4F6';
        const colorText =
          s.status === 'complete' ? '#047857'
          : s.status === 'active' ? '#4F6EF7'
          : '#9CA3AF';
        const fontWeight = s.status === 'active' ? 600 : 500;

        return (
          <React.Fragment key={s.label}>
            <div className="flex items-center gap-1.5">
              <span
                className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-semibold font-mono-nums"
                style={{
                  background: s.status === 'pending' ? '#F3F4F6' : colorBg,
                  color: s.status === 'pending' ? '#9CA3AF' : '#fff',
                  border: s.status === 'pending' ? '1px solid #D1D5DB' : 'none',
                }}
              >
                {s.status === 'complete' ? <Check className="w-2.5 h-2.5" strokeWidth={3} /> : i + 1}
              </span>
              <span style={{ color: colorText, fontWeight }}>{s.label}</span>
            </div>
            {!isLast && <span className="text-[#D1D5DB]">→</span>}
          </React.Fragment>
        );
      })}
    </div>
  );
};
