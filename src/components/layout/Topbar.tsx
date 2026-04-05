import React from 'react';
import { Button } from '@/components/ui/button';
import { HelpCircle, Trash2, Upload, ChevronRight } from 'lucide-react';

interface BreadcrumbSegment {
  label: string;
  onClick?: () => void;
}

interface TopbarProps {
  title: string;
  breadcrumbs?: BreadcrumbSegment[];
  statusBadge?: { label: string; variant: 'danger' | 'neutral' } | null;
  onHelp: () => void;
  onReset: () => void;
  onNewFile?: () => void;
  showNewFile?: boolean;
  showReset?: boolean;
}

export const Topbar: React.FC<TopbarProps> = ({
  title,
  breadcrumbs,
  statusBadge,
  onHelp,
  onReset,
  onNewFile,
  showNewFile = true,
  showReset = true,
}) => {
  return (
    <div className="h-12 border-b border-border flex items-center justify-between px-5 bg-card flex-shrink-0">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-[15px] font-medium text-foreground font-display whitespace-nowrap">{title}</span>
        {breadcrumbs && breadcrumbs.length > 0 && breadcrumbs.map((seg, idx) => (
          <React.Fragment key={idx}>
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            {seg.onClick ? (
              <button
                onClick={seg.onClick}
                className="text-[13px] text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap btn-press"
              >
                {seg.label}
              </button>
            ) : (
              <span className="text-[13px] text-foreground whitespace-nowrap">{seg.label}</span>
            )}
          </React.Fragment>
        ))}
        {statusBadge && (
          <span
            className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium font-mono-nums ml-2 ${
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
        <Button variant="outline" size="sm" onClick={onHelp} className="h-7 text-[12px] gap-1.5 rounded-md btn-press">
          <HelpCircle className="w-3.5 h-3.5" />
          Help
        </Button>
        {showNewFile && onNewFile && (
          <Button variant="outline" size="sm" onClick={onNewFile} className="h-7 text-[12px] gap-1.5 rounded-md btn-press">
            <Upload className="w-3.5 h-3.5" />
            New File
          </Button>
        )}
        {showReset && (
          <Button variant="outline" size="sm" onClick={onReset} className="h-7 text-[12px] gap-1.5 rounded-md text-destructive border-destructive/30 hover:bg-destructive/10 btn-press">
            <Trash2 className="w-3.5 h-3.5" />
            Reset
          </Button>
        )}
      </div>
    </div>
  );
};
