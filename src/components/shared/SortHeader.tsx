import * as React from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';

type Dir = 'asc' | 'desc';

export function useSortable<K extends string>(initialKey: K, initialDir: Dir = 'desc') {
  const [sortKey, setSortKey] = React.useState<K>(initialKey);
  const [sortDir, setSortDir] = React.useState<Dir>(initialDir);

  const toggle = (k: K) => {
    if (k === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(k); setSortDir('desc'); }
  };

  return { sortKey, sortDir, toggle };
}

interface SortHeaderProps {
  active: boolean;
  dir: 'asc' | 'desc';
  onClick: () => void;
  className?: string;
  align?: 'left' | 'right';
  children: React.ReactNode;
}

export const SortHeader: React.FC<SortHeaderProps> = ({ active, dir, onClick, className = '', align = 'left', children }) => {
  const Icon = !active ? ArrowUpDown : dir === 'asc' ? ArrowUp : ArrowDown;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group inline-flex items-center gap-1 select-none cursor-pointer transition-colors ${
        align === 'right' ? 'flex-row-reverse' : ''
      } ${className}`}
      style={{ color: active ? 'hsl(var(--accent-blue))' : undefined }}
    >
      <span className={active ? 'font-semibold' : 'group-hover:text-foreground transition-colors'}>
        {children}
      </span>
      <Icon
        className={`w-3 h-3 transition-opacity ${
          active ? 'opacity-100' : 'opacity-0 group-hover:opacity-60'
        }`}
        strokeWidth={2}
      />
    </button>
  );
};
