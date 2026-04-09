import React from 'react';
import { Button } from '@/components/ui/button';
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
  onReset,
  onNewFile,
  showNewFile = true,
  showReset = true,
  onBack,
}) => {
  return (
    <div className="h-12 border-b border-border flex items-center justify-between px-6 bg-card flex-shrink-0">
      <div className="flex items-center gap-2 min-w-0">
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center justify-center w-7 h-7 rounded-lg text-[hsl(var(--text-tertiary))] hover:text-foreground hover:bg-secondary btn-press mr-0.5"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        )}
        <span className="text-[14px] font-semibold text-foreground whitespace-nowrap">{title}</span>
        {breadcrumbs && breadcrumbs.length > 0 && breadcrumbs.map((seg, idx) => (
          <React.Fragment key={idx}>
            <ChevronRight className="w-3 h-3 text-[hsl(var(--text-tertiary))] flex-shrink-0" />
            {seg.onClick ? (
              <button
                onClick={seg.onClick}
                className="text-[13px] text-[hsl(var(--text-secondary))] hover:text-foreground btn-press whitespace-nowrap"
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
            className={`text-[12px] px-2.5 py-0.5 rounded-full font-medium font-mono-nums ml-2 ${
              statusBadge.variant === 'danger'
                ? 'bg-[hsl(var(--red-light))] text-destructive border border-[hsl(var(--red-border))]'
                : 'bg-secondary text-muted-foreground border border-border'
            }`}
          >
            {statusBadge.label}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        <button
          onClick={onHelp}
          className="flex items-center gap-1.5 text-[13px] text-[hsl(var(--text-secondary))] border border-border rounded-lg px-3 py-[5px] hover:bg-[hsl(var(--page-bg))] btn-press"
        >
          <HelpCircle className="w-3.5 h-3.5" /> Help
        </button>
        {showNewFile && onNewFile && (
          <button
            onClick={onNewFile}
            className="flex items-center gap-1.5 text-[13px] text-[hsl(var(--text-secondary))] border border-border rounded-lg px-3 py-[5px] hover:bg-[hsl(var(--page-bg))] btn-press"
          >
            <RefreshCw className="w-3.5 h-3.5" /> New
          </button>
        )}
      </div>
    </div>
  );
};
