import * as React from 'react';
import { ChevronDown } from 'lucide-react';

export interface SpendItem {
  label: string;
  spend: number;
}

interface SpendDistributionStripProps {
  items: SpendItem[];
  /** Optional override for the section label */
  title?: string;
}

/**
 * Compact, collapsible spend distribution visualization.
 * - One dot per bleeder, sized proportionally to spend
 * - Top 25% red, middle 50% amber, bottom 25% gray
 * - Hover tooltip with entity + spend
 * - Summary line: "Top N bleeders account for X% of at-risk spend"
 *
 * Collapsed by default. Pure presentation; no business logic.
 */
export const SpendDistributionStrip: React.FC<SpendDistributionStripProps> = ({
  items,
  title = 'Spend distribution',
}) => {
  const [open, setOpen] = React.useState(false);

  const { sorted, total, highCutoff, lowCutoff, maxSpend } = React.useMemo(() => {
    const valid = items.filter((i) => (i.spend || 0) > 0);
    const sorted = [...valid].sort((a, b) => (b.spend || 0) - (a.spend || 0));
    const total = sorted.reduce((s, i) => s + (i.spend || 0), 0);
    const ascending = [...sorted].map((i) => i.spend).sort((a, b) => a - b);
    const q = (p: number) =>
      ascending.length === 0 ? 0 : ascending[Math.min(ascending.length - 1, Math.floor(ascending.length * p))];
    return {
      sorted,
      total,
      highCutoff: q(0.75),
      lowCutoff: q(0.25),
      maxSpend: sorted[0]?.spend || 1,
    };
  }, [items]);

  if (sorted.length === 0) return null;

  // Top-N summary: pick 3 if we have at least 4 entries, otherwise top 1
  const topN = Math.min(3, sorted.length);
  const topShare = total > 0 ? (sorted.slice(0, topN).reduce((s, i) => s + i.spend, 0) / total) * 100 : 0;

  // Dot size: 4–14px proportional to spend
  const dotSize = (spend: number) => {
    const ratio = maxSpend > 0 ? spend / maxSpend : 0;
    return 4 + Math.round(ratio * 10);
  };

  const dotColor = (spend: number) => {
    if (spend >= highCutoff && spend > 0) return '#FF453A';
    if (spend <= lowCutoff) return '#8E8E93';
    return '#F59E0B';
  };

  return (
    <div
      style={{
        background: '#FFFFFF',
        border: '1px solid #E5E7EB',
        borderRadius: 10,
        padding: '12px 16px',
      }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between btn-press"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          <ChevronDown
            className="w-3.5 h-3.5 text-[#9CA3AF]"
            style={{
              transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
              transition: 'transform 200ms ease',
            }}
          />
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '1px',
              color: '#9CA3AF',
            }}
          >
            {title}
          </span>
        </span>
        <span style={{ fontSize: 12, color: '#9CA3AF' }}>
          {sorted.length} {sorted.length === 1 ? 'bleeder' : 'bleeders'}
        </span>
      </button>

      {open && (
        <div className="mt-3" style={{ animation: 'cv-fade-in 200ms ease-out both' }}>
          {/* Strip — flex row, one dot per bleeder */}
          <div
            className="flex items-center gap-[3px] flex-wrap"
            style={{ minHeight: 18 }}
          >
            {sorted.map((item, idx) => {
              const size = dotSize(item.spend);
              const color = dotColor(item.spend);
              return (
                <span
                  key={`${item.label}-${idx}`}
                  title={`${item.label} · $${item.spend.toLocaleString('en-US', { maximumFractionDigits: 2 })}`}
                  style={{
                    width: size,
                    height: size,
                    borderRadius: 999,
                    background: color,
                    display: 'inline-block',
                    cursor: 'help',
                    transition: 'transform 150ms ease',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.4)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
                />
              );
            })}
          </div>

          {/* Summary line */}
          <p className="mt-2.5" style={{ fontSize: 12, color: '#374151' }}>
            Top {topN} {topN === 1 ? 'bleeder accounts' : 'bleeders account'} for{' '}
            <span className="font-mono-nums" style={{ color: '#111827', fontWeight: 600 }}>
              {topShare.toFixed(0)}%
            </span>{' '}
            of at-risk spend
          </p>
        </div>
      )}
    </div>
  );
};
