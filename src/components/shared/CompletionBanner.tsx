import * as React from 'react';
import { CheckCircle2, Download } from 'lucide-react';

interface Props {
  fileName: string;
  onDownload?: () => void;
  onStartNew?: () => void;
  title?: string;
}

export const CompletionBanner: React.FC<Props> = ({
  fileName,
  onDownload,
  onStartNew,
  title = 'Workflow complete',
}) => {
  return (
    <div
      className="relative rounded-xl p-4 flex items-center justify-between gap-4 overflow-hidden animate-fade-in"
      style={{
        background: 'rgba(52, 199, 89, 0.08)',
        border: '1px solid rgba(52, 199, 89, 0.25)',
      }}
    >
      <span
        className="absolute left-0 top-0 bottom-0 w-[3px]"
        style={{ background: 'hsl(var(--success))' }}
      />
      <div className="flex items-center gap-3 pl-2 min-w-0">
        <div className="w-9 h-9 rounded-full bg-success/15 flex items-center justify-center flex-shrink-0">
          <CheckCircle2 className="w-4 h-4 text-success" strokeWidth={2.2} />
        </div>
        <div className="min-w-0">
          <p className="text-[16px] font-semibold text-foreground tracking-tight">{title}</p>
          <p className="text-[13px] font-mono-nums text-[hsl(var(--text-secondary))] truncate" title={fileName}>
            {fileName}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {onDownload && (
          <button
            onClick={onDownload}
            className="h-9 px-3.5 rounded-md border border-border bg-card text-[13px] font-medium text-foreground hover:bg-secondary btn-press flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            Download
          </button>
        )}
        {onStartNew && (
          <button
            onClick={onStartNew}
            className="h-9 px-3 rounded-md text-[13px] font-medium text-primary hover:underline btn-press"
          >
            Start new session
          </button>
        )}
      </div>
    </div>
  );
};
