import * as React from 'react';
import { Upload, CheckCircle2, Circle, X, FileSpreadsheet } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StandardUploadZoneProps {
  onFileSelect: (file: File) => void;
  selectedFile?: { name: string; size: number } | null;
  onClear?: () => void;
  expectedSheets?: string[];
  detectedSheets?: string[];
  inputId?: string;
  primaryText?: string;
  helperText?: string;
  formats?: string[];
  minHeight?: number;
}

const DEFAULT_FORMATS = ['.xlsx', '.xls', '.csv', '.zip'];

export const StandardUploadZone: React.FC<StandardUploadZoneProps> = ({
  onFileSelect,
  selectedFile,
  onClear,
  expectedSheets,
  detectedSheets = [],
  inputId = 'std-upload',
  primaryText = 'Drop your Amazon Bulk Operations file here',
  helperText,
  formats = DEFAULT_FORMATS,
  minHeight = 200,
}) => {
  const [isDragging, setIsDragging] = React.useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) onFileSelect(f);
  };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) onFileSelect(f);
  };

  if (selectedFile) {
    return (
      <div className="space-y-3 animate-fade-in">
        <div className="relative rounded-xl border border-border bg-card p-4 shadow-card flex items-center justify-between overflow-hidden">
          <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-success" />
          <div className="flex items-center gap-3 pl-2 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
              <FileSpreadsheet className="w-4 h-4 text-[hsl(var(--text-secondary))]" strokeWidth={1.6} />
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-foreground truncate" title={selectedFile.name}>
                {selectedFile.name}
              </p>
              <p className="text-[11.5px] text-[hsl(var(--text-tertiary))] mt-0.5 font-mono-nums">
                {(selectedFile.size / 1024).toFixed(1)} KB
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <span className="flex items-center gap-1.5 text-[11.5px] text-success font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              Ready
            </span>
            {onClear && (
              <button
                onClick={onClear}
                className="w-6 h-6 rounded-md flex items-center justify-center text-[hsl(var(--text-tertiary))] hover:text-foreground hover:bg-secondary btn-press"
                aria-label="Remove file"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div
        onClick={() => document.getElementById(inputId)?.click()}
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        className={cn(
          'group relative rounded-xl bg-card cursor-pointer text-center px-6 py-10 btn-press transition-all duration-200',
          'border-[1.5px] border-dashed',
          isDragging ? 'border-primary' : 'border-[#D2D2D7] hover:border-primary/60'
        )}
        style={{
          minHeight,
          background: isDragging ? 'rgba(0, 113, 227, 0.03)' : '#FFFFFF',
        }}
      >
        <input
          id={inputId}
          type="file"
          accept=".xlsx,.xls,.csv,.zip"
          onChange={handleInput}
          className="hidden"
        />

        <div className="mx-auto mb-4 flex items-center justify-center">
          <Upload className="w-10 h-10 text-[#86868B] transition-transform duration-200 group-hover:-translate-y-0.5" strokeWidth={1.4} />
        </div>

        <p className="text-[16px] font-semibold text-[#1D1D1F] tracking-tight">
          {isDragging ? 'Release to upload' : primaryText}
        </p>
        <p className="text-[14px] mt-1.5">
          or <span className="text-[#0071E3] underline underline-offset-2">click to browse</span>
        </p>
        {helperText && (
          <p className="text-[12px] text-[hsl(var(--text-tertiary))] mt-2">{helperText}</p>
        )}

        <div className="flex items-center justify-center gap-1.5 mt-5">
          {formats.map((fmt) => (
            <span
              key={fmt}
              className="text-[12px] font-mono-nums bg-[#F5F5F7] rounded-md px-2 py-0.5 text-[hsl(var(--text-secondary))]"
            >
              {fmt}
            </span>
          ))}
        </div>
      </div>

      {expectedSheets && expectedSheets.length > 0 && (() => {
        const useRow = expectedSheets.length <= 2;
        return (
          <div className="px-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[hsl(var(--text-tertiary))] mb-2">
              Expected sheets
            </p>
            <div
              className={
                useRow
                  ? 'flex flex-wrap gap-x-8 gap-y-2 py-1'
                  : 'grid grid-cols-2 gap-x-6 gap-y-2'
              }
            >
              {expectedSheets.map((sheet) => {
                const detected = detectedSheets.includes(sheet);
                return (
                  <div key={sheet} className="flex items-center gap-2 text-[13px] text-[hsl(var(--text-secondary))]">
                    {detected ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-success flex-shrink-0" strokeWidth={2.2} />
                    ) : (
                      <Circle className="w-3.5 h-3.5 text-[hsl(var(--text-tertiary))] opacity-50 flex-shrink-0" strokeWidth={1.5} />
                    )}
                    <span className={detected ? 'text-foreground' : ''}>{sheet}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* How it works — inline stepper */}
      <div className="flex items-center gap-3 pt-3 px-1 text-[12px] text-[#86868B] flex-wrap">
        {['Upload bulk file', 'Review bleeders', 'Generate decisions'].map((s, i, arr) => (
          <React.Fragment key={s}>
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full border border-[#D2D2D7] bg-white flex items-center justify-center text-[10px] font-semibold text-[#86868B] font-mono-nums">
                {i + 1}
              </span>
              <span>{s}</span>
            </div>
            {i < arr.length - 1 && <span className="text-[#D2D2D7]">→</span>}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};
