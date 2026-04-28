import React from 'react';
import { HelpCircle, RefreshCw, ChevronRight, ArrowLeft } from 'lucide-react';

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
  onBack?: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  title,
  breadcrumbs,
  statusBadge,
  onHelp,
  onNewFile,
  showNewFile = true,
  onBack,
}) => {
  return (
    <div className="h-12 border-b border-border flex items-center justify-between px-5 bg-background/80 backdrop-blur-md flex-shrink-0 sticky top-0 z-30">
      <div className="flex items-center gap-1.5 min-w-0">
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 h-7 pl-1.5 pr-2.5 rounded-md text-[12px] text-[hsl(var(--text-secondary))] hover:text-foreground hover:bg-secondary btn-press mr-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>
        )}
        <span className="text-[13px] font-semibold text-foreground whitespace-nowrap tracking-tight">{title}</span>
        {breadcrumbs && breadcrumbs.length > 0 && breadcrumbs.map((seg, idx) => (
          <React.Fragment key={idx}>
            <ChevronRight className="w-3 h-3 text-[hsl(var(--text-tertiary))] flex-shrink-0" />
            {seg.onClick ? (
              <button
                onClick={seg.onClick}
                className="text-[12.5px] text-[hsl(var(--text-secondary))] hover:text-foreground btn-press whitespace-nowrap"
              >
                {seg.label}
              </button>
            ) : (
              <span className="text-[12.5px] text-foreground whitespace-nowrap">{seg.label}</span>
            )}
          </React.Fragment>
        ))}
        {statusBadge && (
          <span
            className={`text-[11px] px-2 py-0.5 rounded-md font-medium font-mono-nums ml-2 ${
              statusBadge.variant === 'danger'
                ? 'bg-destructive/10 text-destructive'
                : 'bg-secondary text-[hsl(var(--text-secondary))]'
            }`}
          >
            {statusBadge.label}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={onHelp}
          className="flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[12px] text-[hsl(var(--text-secondary))] hover:text-foreground hover:bg-secondary btn-press"
        >
          <HelpCircle className="w-3.5 h-3.5" /> Help
        </button>
        {showNewFile && onNewFile && (
          <button
            onClick={onNewFile}
            className="flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[12px] text-[hsl(var(--text-secondary))] hover:text-foreground hover:bg-secondary btn-press"
          >
            <RefreshCw className="w-3.5 h-3.5" /> New
          </button>
        )}
      </div>
    </div>
  );
};
