import * as React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function decisionDotColor(d: string | undefined | null): string {
  if (!d) return 'transparent';
  if (d === 'Keep') return '#10B981';
  if (d === 'Pause') return '#EF4444';
  if (d.startsWith('Cut')) return '#F59E0B';
  if (d.startsWith('Negat')) return '#4F6EF7';
  return '#9CA3AF';
}

/**
 * Spec colors:
 *  Pause   → #EF4444 (red)
 *  Cut Bid → #F59E0B (amber)
 *  Keep    → #10B981 (green)
 *  Negative→ #4F6EF7 (blue)
 *  Action  → #9CA3AF (gray, no decision)
 */
export function decisionTextColor(d: string | undefined | null): string {
  if (!d) return '#9CA3AF';
  if (d === 'Keep') return '#10B981';
  if (d === 'Pause') return '#EF4444';
  if (d.startsWith('Cut')) return '#F59E0B';
  if (d.startsWith('Negat')) return '#4F6EF7';
  return '#111827';
}

export function decisionRowClass(d: string | undefined | null): string {
  if (!d) return '';
  if (d === 'Keep') return 'row-decision-keep';
  if (d === 'Pause') return 'row-decision-pause';
  if (d.startsWith('Cut')) return 'row-decision-cut';
  if (d.startsWith('Negat')) return 'row-decision-negate';
  return '';
}

interface DecisionSelectProps {
  value: string | undefined;
  onChange: (val: string) => void;
  options: string[];
  placeholder?: string;
  width?: string;
}

export const DecisionSelect: React.FC<DecisionSelectProps> = ({
  value, onChange, options, placeholder = 'Action', width = '130px',
}) => {
  // Inset left-border indicator: blue when undecided, decision color when set
  const insetColor = value ? decisionTextColor(value) : '#3B82F6';
  const triggerRef = React.useRef<HTMLButtonElement>(null);

  const handleChange = (val: string) => {
    onChange(val);
    // Flash the row with the decision's color tint for 300ms
    const row = triggerRef.current?.closest('tr');
    if (row) {
      const flashClass =
        val === 'Pause' ? 'row-flash-pause' :
        val === 'Keep' ? 'row-flash-keep' :
        val.startsWith('Cut') ? 'row-flash-cut' :
        val.startsWith('Negat') ? 'row-flash-negate' :
        '';
      if (flashClass) {
        row.classList.remove('row-flash-pause', 'row-flash-keep', 'row-flash-cut', 'row-flash-negate');
        // Force reflow so the animation restarts even if same class is reapplied
        void (row as HTMLElement).offsetWidth;
        row.classList.add(flashClass);
        window.setTimeout(() => row.classList.remove(flashClass), 340);
      }
    }
  };

  return (
    <Select value={value || ''} onValueChange={handleChange}>
      <SelectTrigger
        ref={triggerRef}
        className="text-[13px] font-medium decision-trigger"
        style={{
          width,
          color: decisionTextColor(value),
          height: 30,
          padding: '6px 12px',
          background: '#FFFFFF',
          border: '1.5px solid #D1D5DB',
          borderRadius: 8,
          boxShadow: `inset 3px 0 0 ${insetColor}`,
          transition: 'box-shadow 150ms ease, color 150ms ease, border-color 150ms ease',
        }}
      >
        {value ? (
          <span className="flex items-center gap-1.5 truncate" style={{ color: decisionTextColor(value) }}>
            <span
              className="decision-dot flex-shrink-0"
              style={{ background: decisionDotColor(value) }}
            />
            <span className="truncate">{value}</span>
          </span>
        ) : (
          <SelectValue placeholder={placeholder} />
        )}
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt} value={opt} className="text-[12.5px]">
            <span className="flex items-center gap-2" style={{ color: decisionTextColor(opt) }}>
              <span className="decision-dot" style={{ background: decisionDotColor(opt) }} />
              {opt}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
