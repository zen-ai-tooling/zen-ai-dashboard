import * as React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function decisionDotColor(d: string | undefined | null): string {
  if (!d) return 'transparent';
  if (d === 'Keep') return '#34C759';
  if (d === 'Pause') return '#FF3B30';
  if (d.startsWith('Cut')) return '#FF9500';
  if (d.startsWith('Negat')) return '#0071E3';
  return '#86868B';
}

/**
 * Spec colors:
 *  Pause   → #FF3B30 (red)
 *  Cut Bid → #FF9500 (amber)
 *  Keep    → #34C759 (green)
 *  Negative→ #0071E3 (blue)
 *  Action  → #86868B (gray, no decision)
 */
export function decisionTextColor(d: string | undefined | null): string {
  if (!d) return '#86868B';
  if (d === 'Keep') return '#34C759';
  if (d === 'Pause') return '#FF3B30';
  if (d.startsWith('Cut')) return '#FF9500';
  if (d.startsWith('Negat')) return '#0071E3';
  return '#1D1D1F';
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
  value, onChange, options, placeholder = 'Action', width = '128px',
}) => {
  // Inset left-border indicator: blue when undecided, decision color when set
  const insetColor = value ? decisionTextColor(value) : '#0071E3';
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
          border: '1.5px solid #D2D2D7',
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
