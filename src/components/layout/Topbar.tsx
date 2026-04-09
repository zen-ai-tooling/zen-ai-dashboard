import React from 'react';
import { Button } from '@/components/ui/button';
import { HelpCircle, Trash2, Upload, ChevronRight, ArrowLeft } from 'lucide-react';

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
    <div className="h-12 border-b border-border/60 flex items-center justify-between px-5 bg-background flex-shrink-0">
      <div className="flex items-center gap-2 min-w-0">
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center justify-center w-7 h-7 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground btn-press mr-1"
            style={{ transition: 'all 150ms ease' }}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        )}
        <span className="text-[14px] font-medium text-foreground font-display whitespace-nowrap">{title}</span>
        {breadcrumbs && breadcrumbs.length > 0 && breadcrumbs.map((seg, idx) => (
          <React.Fragment key={idx}>
            <ChevronRight className="w-3 h-3 text-muted-foreground/50 flex-shrink-0" />
            {seg.onClick ? (
              <button
                onClick={seg.onClick}
                className="text-[13px] text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap btn-press"
              >
                {seg.label}
              </button>
            ) : (
              <span className="text-[13px] text-foreground/80 whitespace-nowrap">{seg.label}</span>
            )}
          </React.Fragment>
        ))}
        {statusBadge && (
          <span
            className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium font-mono-nums ml-2 ${
              statusBadge.variant === 'danger'
                ? 'bg-destructive/8 text-destructive border border-destructive/15'
                : 'bg-muted text-muted-foreground border border-border/60'
            }`}
          >
            {statusBadge.label}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        <Button variant="ghost" size="sm" onClick={onHelp} className="h-7 text-[12px] gap-1.5 rounded-md btn-press text-muted-foreground hover:text-foreground">
          <HelpCircle className="w-3.5 h-3.5" />
          Help
        </Button>
        {showNewFile && onNewFile && (
          <Button variant="ghost" size="sm" onClick={onNewFile} className="h-7 text-[12px] gap-1.5 rounded-md btn-press text-muted-foreground hover:text-foreground">
            <Upload className="w-3.5 h-3.5" />
            New File
          </Button>
        )}
        {showReset && (
          <Button variant="ghost" size="sm" onClick={onReset} className="h-7 text-[12px] gap-1.5 rounded-md text-muted-foreground hover:text-destructive btn-press">
            <Trash2 className="w-3.5 h-3.5" />
            Reset
          </Button>
        )}
      </div>
    </div>
  );
};
