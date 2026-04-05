import React from 'react';
import { Button } from '@/components/ui/button';
import { HelpCircle, Trash2, Upload } from 'lucide-react';

interface TopbarProps {
  title: string;
  statusBadge?: { label: string; variant: 'danger' | 'neutral' } | null;
  onHelp: () => void;
  onReset: () => void;
  onNewFile?: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ title, statusBadge, onHelp, onReset, onNewFile }) => {
  return (
    <div className="h-12 border-b border-border flex items-center justify-between px-5 bg-card flex-shrink-0">
      <div className="flex items-center gap-3">
        <span className="text-[14px] font-medium text-foreground">{title}</span>
        {statusBadge && (
          <span
            className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium tabular-nums ${
              statusBadge.variant === 'danger'
                ? 'bg-destructive/10 text-destructive border border-destructive/20'
                : 'bg-muted text-muted-foreground border border-border'
            }`}
          >
            {statusBadge.label}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        <Button variant="outline" size="sm" onClick={onHelp} className="h-7 text-[12px] gap-1.5 rounded-md">
          <HelpCircle className="w-3.5 h-3.5" />
          Help
        </Button>
        {onNewFile && (
          <Button variant="outline" size="sm" onClick={onNewFile} className="h-7 text-[12px] gap-1.5 rounded-md">
            <Upload className="w-3.5 h-3.5" />
            New File
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={onReset} className="h-7 text-[12px] gap-1.5 rounded-md text-destructive border-destructive/30 hover:bg-destructive/10">
          <Trash2 className="w-3.5 h-3.5" />
          Reset
        </Button>
      </div>
    </div>
  );
};
