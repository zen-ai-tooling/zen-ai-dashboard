import * as React from 'react';

export interface DecisionSegment {
  key: string;
  count: number;
  color: string;
}

interface DecisionProgressBarProps {
  total: number;
  segments: DecisionSegment[]; // decided segments (gray remainder is added automatically)
  className?: string;
}

/**
 * 8px segmented progress bar showing decision composition.
 * Undecided remainder is rendered in light gray (#E5E5EA).
 */
export const DecisionProgressBar: React.FC<DecisionProgressBarProps> = ({
  total,
  segments,
  className = '',
}) => {
  const decided = segments.reduce((s, x) => s + x.count, 0);
  const remainder = Math.max(0, total - decided);

  return (
    <div
      className={`flex w-full max-w-[280px] overflow-hidden bg-[#E5E5EA] ${className}`}
      style={{ height: 8, borderRadius: 4 }}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={decided}
    >
      {segments.map((s) => {
        if (s.count <= 0 || total <= 0) return null;
        const pct = (s.count / total) * 100;
        return (
          <div
            key={s.key}
            style={{
              width: `${pct}%`,
              background: s.color,
              transition: 'width 320ms ease',
            }}
            title={`${s.key}: ${s.count}`}
          />
        );
      })}
      {remainder > 0 && total > 0 && (
        <div style={{ width: `${(remainder / total) * 100}%`, background: '#E5E5EA' }} />
      )}
    </div>
  );
};
