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
  /** Set to false to suppress the inline "How it works" stepper. Defaults to true for back-compat. */
  showHowItWorks?: boolean;
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
  showHowItWorks = true,
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
        <div
          className="flex items-center justify-between"
          style={{
            background: '#FFFFFF',
            border: '1px solid #E5E5EA',
            borderLeft: '3px solid #34C759',
            borderRadius: 10,
            padding: '12px 16px',
          }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-[#F5F5F7] flex items-center justify-center flex-shrink-0">
              <FileSpreadsheet className="w-4 h-4 text-[#86868B]" strokeWidth={1.6} />
            </div>
            <div className="min-w-0">
              <p style={{ fontSize: 14, fontWeight: 600, color: '#1D1D1F' }} className="truncate" title={selectedFile.name}>
                {selectedFile.name}
              </p>
              <p className="mt-0.5 font-mono-nums" style={{ fontSize: 12, color: '#86868B' }}>
                {(selectedFile.size / 1024).toFixed(1)} KB
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <span className="flex items-center gap-1.5" style={{ fontSize: 12, color: '#34C759', fontWeight: 600 }}>
              <span className="w-1.5 h-1.5 rounded-full bg-[#34C759] animate-pulse" />
              Ready
            </span>
            {onClear && (
              <button
                onClick={onClear}
                className="w-6 h-6 rounded-md flex items-center justify-center text-[#86868B] hover:text-[#1D1D1F] hover:bg-[#F5F5F7] btn-press"
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
        className={cn('group relative cursor-pointer text-center px-6 py-10 btn-press transition-all duration-200')}
        style={{
          minHeight,
          borderRadius: 12,
          border: isDragging ? '2px solid #0071E3' : '1.5px dashed #C7C7CC',
          background: isDragging ? 'rgba(0, 113, 227, 0.05)' : '#FAFAFA',
        }}
        onMouseEnter={(e) => {
          if (!isDragging) {
            e.currentTarget.style.background = 'rgba(0, 113, 227, 0.02)';
            e.currentTarget.style.border = '1.5px dashed #0071E3';
          }
        }}
        onMouseLeave={(e) => {
          if (!isDragging) {
            e.currentTarget.style.background = '#FAFAFA';
            e.currentTarget.style.border = '1.5px dashed #C7C7CC';
          }
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
          <Upload
            className="transition-all duration-200 group-hover:-translate-y-0.5 group-hover:text-[#0071E3]"
            style={{
              width: isDragging ? 46 : 40,
              height: isDragging ? 46 : 40,
              color: isDragging ? '#0071E3' : '#86868B',
              transform: isDragging ? 'scale(1.15)' : 'scale(1)',
            }}
            strokeWidth={1.4}
          />
        </div>

        <p style={{ fontSize: 16, fontWeight: 600, color: isDragging ? '#0071E3' : '#1D1D1F' }}>
          {isDragging ? 'Release to upload' : primaryText}
        </p>
        <p className="mt-1.5" style={{ fontSize: 14, color: '#0071E3' }}>
          or <span className="underline underline-offset-2">click to browse</span>
        </p>
        {helperText && (
          <p className="mt-2" style={{ fontSize: 12, color: '#86868B' }}>{helperText}</p>
        )}

        <div className="flex items-center justify-center gap-1.5 mt-5">
          {formats.map((fmt) => (
            <span
              key={fmt}
              className="font-mono-nums"
              style={{ fontSize: 12, background: '#F0F0F0', borderRadius: 4, padding: '2px 8px', color: '#6E6E73' }}
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
            <p className="mb-2" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', color: '#86868B' }}>
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
                  <div key={sheet} className="flex items-center gap-2" style={{ fontSize: 13, color: '#6E6E73' }}>
                    {detected ? (
                      <span
                        className="flex-shrink-0 inline-flex items-center justify-center"
                        style={{ width: 16, height: 16, borderRadius: 999, background: '#34C759' }}
                      >
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <path d="M2 5L4 7L8 3" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                    ) : (
                      <span
                        className="flex-shrink-0 inline-block"
                        style={{ width: 16, height: 16, borderRadius: 999, border: '1.5px solid #D2D2D7' }}
                      />
                    )}
                    <span className={detected ? 'text-[#1D1D1F]' : ''}>{sheet}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* How it works — inline stepper. Suppressible to avoid duplicates on multi-zone uploaders. */}
      {showHowItWorks && (
        <div className="flex items-center gap-3 pt-3 px-1 flex-wrap" style={{ fontSize: 13, color: '#6E6E73' }}>
          {['Upload bulk file', 'Review bleeders', 'Generate decisions'].map((s, i, arr) => (
            <React.Fragment key={s}>
              <div className="flex items-center gap-1.5">
                <span
                  className="inline-flex items-center justify-center font-mono-nums"
                  style={{ width: 20, height: 20, borderRadius: 999, border: '1.5px solid #D2D2D7', background: '#FFFFFF', fontSize: 12, fontWeight: 600, color: '#86868B' }}
                >
                  {i + 1}
                </span>
                <span>{s}</span>
              </div>
              {i < arr.length - 1 && <span style={{ color: '#D2D2D7' }}>→</span>}
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
};
