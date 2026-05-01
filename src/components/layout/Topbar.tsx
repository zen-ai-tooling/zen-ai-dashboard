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
      className="app-topbar flex items-center justify-between px-6 flex-shrink-0 sticky top-0 z-30"
      style={{ height: '52px', background: '#FFFFFF', borderBottom: '1px solid #E5E7EB' }}
    >
      {/* Left: back + breadcrumb */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 h-8 pl-2 pr-3 rounded-md text-[13px] text-[#374151] hover:text-[#111827] hover:bg-[#F3F4F6] btn-press"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>
        )}
        <span className="text-[14px] font-semibold text-[#111827] whitespace-nowrap tracking-tight">{title}</span>
        {breadcrumbs && breadcrumbs.length > 0 && breadcrumbs.map((seg, idx) => (
          <React.Fragment key={idx}>
            <ChevronRight className="w-3.5 h-3.5 text-[#D1D5DB] flex-shrink-0" />
            {seg.onClick ? (
              <button
                onClick={seg.onClick}
                className="text-[13px] text-[#374151] hover:text-[#111827] btn-press whitespace-nowrap"
              >
                {seg.label}
              </button>
            ) : (
              <span className="text-[13px] text-[#111827] font-medium whitespace-nowrap">{seg.label}</span>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Center: status badge */}
      <div className="flex items-center justify-center flex-shrink-0">
        {statusBadge && (
          <span
            className="text-[12px] py-1 rounded-md font-medium font-mono-nums"
            style={
              statusBadge.variant === 'danger'
                ? { background: '#1F2937', color: '#FFFFFF', borderLeft: '3px solid #EF4444', paddingLeft: 10, paddingRight: 10 }
                : { background: '#F3F4F6', color: '#374151', paddingLeft: 10, paddingRight: 10 }
            }
          >
            {statusBadge.label}
          </span>
        )}
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-1 flex-1 justify-end">
        <button
          onClick={onHelp}
          className="flex items-center gap-1.5 h-8 px-3 rounded-md text-[13px] text-[#374151] hover:text-[#111827] hover:bg-[#F3F4F6] btn-press"
        >
          <HelpCircle className="w-3.5 h-3.5" /> Help
        </button>
        {showNewFile && onNewFile && (
          <button
            onClick={onNewFile}
            className="flex items-center gap-1.5 h-8 px-3 rounded-md text-[13px] text-[#374151] hover:text-[#111827] hover:bg-[#F3F4F6] btn-press"
          >
            <RefreshCw className="w-3.5 h-3.5" /> New
          </button>
        )}
      </div>
    </div>
  );
};
