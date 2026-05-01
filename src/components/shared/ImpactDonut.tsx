import * as React from 'react';
import { Check } from 'lucide-react';

interface ImpactDonutProps {
  /** Spend (or count) that has been addressed via decisions */
  addressed: number;
  /** Spend (or count) on rows still without a decision */
  undecided: number;
  /** Diameter in px */
  size?: number;
}

/**
 * Small donut chart showing the share of at-risk spend that has been addressed.
 * - Blue = addressed, gray = undecided
 * - 100% addressed → solid blue with white check in the center
 */
export const ImpactDonut: React.FC<ImpactDonutProps> = ({
  addressed,
  undecided,
  size = 80,
}) => {
  const total = Math.max(addressed + undecided, 0);
  const pct = total > 0 ? Math.round((addressed / total) * 100) : 0;
  const allDone = total > 0 && addressed >= total;

  const stroke = 10;
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const dash = circumference * (total > 0 ? addressed / total : 0);

  return (
    <div
      className="relative flex-shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${pct}% of at-risk spend addressed`}
    >
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {/* Track */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="#E5E7EB"
          strokeWidth={stroke}
        />
        {/* Addressed arc */}
        {total > 0 && (
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="#4F6EF7"
            strokeWidth={stroke}
            strokeDasharray={`${dash} ${circumference - dash}`}
            strokeLinecap="butt"
            style={{ transition: 'stroke-dasharray 360ms ease' }}
          />
        )}
      </svg>
      <div
        className="absolute inset-0 flex items-center justify-center"
      >
        {allDone ? (
          <span
            className="rounded-full flex items-center justify-center"
            style={{ width: 28, height: 28, background: '#4F6EF7' }}
          >
            <Check className="w-4 h-4 text-white" strokeWidth={2.6} />
          </span>
        ) : (
          <span
            className="font-mono-nums"
            style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}
          >
            {pct}%
          </span>
        )}
      </div>
    </div>
  );
};
