import * as React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function decisionDotColor(d: string | undefined | null): string {
  if (!d) return 'transparent';
  if (d === 'Keep') return 'hsl(var(--success))';
  if (d === 'Pause') return 'hsl(var(--destructive))';
  if (d.startsWith('Cut')) return 'hsl(var(--amber))';
  if (d.startsWith('Negat')) return 'hsl(var(--destructive))';
  return 'hsl(var(--text-tertiary))';
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
  return (
    <Select value={value || ''} onValueChange={onChange}>
      <SelectTrigger
        className="h-7 text-[12px] rounded-md px-2 font-medium"
        style={{ width }}
      >
        {value ? (
          <span className="flex items-center gap-1.5 truncate">
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
            <span className="flex items-center gap-2">
              <span className="decision-dot" style={{ background: decisionDotColor(opt) }} />
              {opt}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
