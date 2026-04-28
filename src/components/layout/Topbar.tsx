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
    <div
      className="flex items-center justify-between px-6 flex-shrink-0 sticky top-0 z-30"
      style={{ height: '52px', background: '#FFFFFF', borderBottom: '1px solid #E5E5EA' }}
    >
      {/* Left: back + breadcrumb */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 h-8 pl-2 pr-3 rounded-md text-[13px] text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-[#F5F5F7] btn-press"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>
        )}
        <span className="text-[14px] font-semibold text-[#1D1D1F] whitespace-nowrap tracking-tight">{title}</span>
        {breadcrumbs && breadcrumbs.length > 0 && breadcrumbs.map((seg, idx) => (
          <React.Fragment key={idx}>
            <ChevronRight className="w-3.5 h-3.5 text-[#C7C7CC] flex-shrink-0" />
            {seg.onClick ? (
              <button
                onClick={seg.onClick}
                className="text-[13px] text-[#6E6E73] hover:text-[#1D1D1F] btn-press whitespace-nowrap"
              >
                {seg.label}
              </button>
            ) : (
              <span className="text-[13px] text-[#1D1D1F] font-medium whitespace-nowrap">{seg.label}</span>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Center: status badge */}
      <div className="flex items-center justify-center flex-shrink-0">
        {statusBadge && (
          <span
            className={`text-[12px] px-2.5 py-1 rounded-md font-medium font-mono-nums ${
              statusBadge.variant === 'danger'
                ? 'bg-destructive/10 text-destructive'
                : 'bg-[#F5F5F7] text-[#6E6E73]'
            }`}
          >
            {statusBadge.label}
          </span>
        )}
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-1 flex-1 justify-end">
        <button
          onClick={onHelp}
          className="flex items-center gap-1.5 h-8 px-3 rounded-md text-[13px] text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-[#F5F5F7] btn-press"
        >
          <HelpCircle className="w-3.5 h-3.5" /> Help
        </button>
        {showNewFile && onNewFile && (
          <button
            onClick={onNewFile}
            className="flex items-center gap-1.5 h-8 px-3 rounded-md text-[13px] text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-[#F5F5F7] btn-press"
          >
            <RefreshCw className="w-3.5 h-3.5" /> New
          </button>
        )}
      </div>
    </div>
  );
};
