import { Upload, CheckCircle2, X, FileSpreadsheet, ChevronRight, Info } from "lucide-react";
import { useCallback, useState } from "react";

interface UploadCardProps {
  onFileUpload: (files: File[]) => void;
  isVisible: boolean;
}

const SHEET_REQUIREMENTS = [
  'Sponsored Products Campaigns',
  'Sponsored Brands Campaigns',
  'Sponsored Display Campaigns',
  'SP Search Term Report',
  'SB Search Term Report',
];

const FORMAT_PILLS = ['.xlsx', '.xls', '.csv', '.zip'];

export const UploadCard = ({ onFileUpload, isVisible }: UploadCardProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) setSelectedFile(files[0]);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      if (files.length > 0) setSelectedFile(files[0]);
    }
  }, []);

  const handleClear = () => setSelectedFile(null);
  const handleAnalyze = () => { if (selectedFile) onFileUpload([selectedFile]); };

  if (!isVisible) return null;

  return (
    <div className="w-full">
      {/* Breadcrumb callout */}
      <div className="flex items-start gap-2.5 rounded-lg border border-border bg-secondary/60 px-3.5 py-2.5 mb-6">
        <Info className="w-3.5 h-3.5 text-[hsl(var(--text-tertiary))] flex-shrink-0 mt-[2px]" />
        <div className="flex items-center gap-1.5 text-[12px] text-[hsl(var(--text-secondary))] flex-wrap leading-relaxed">
          <span>Amazon Ads</span>
          <ChevronRight className="w-3 h-3 opacity-50" />
          <span>Campaign Manager</span>
          <ChevronRight className="w-3 h-3 opacity-50" />
          <span>Bulk Operations</span>
          <ChevronRight className="w-3 h-3 opacity-50" />
          <span className="text-foreground font-medium">Create Spreadsheet</span>
          <span className="text-[hsl(var(--text-tertiary))]">· 60-day range</span>
        </div>
      </div>

      {!selectedFile ? (
        <>
          {/* Hero upload zone */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onClick={() => document.getElementById('file-input')?.click()}
            className={`group relative rounded-xl border border-dashed cursor-pointer text-center px-8 py-14 btn-press transition-all duration-200 ${
              isDragging
                ? 'border-primary border-[1.5px] drag-pulse'
                : 'border-[hsl(var(--border-strong))] hover:border-primary/60'
            }`}
            style={{
              background: isDragging
                ? 'linear-gradient(180deg, hsl(var(--primary) / 0.06), hsl(var(--background)))'
                : 'linear-gradient(180deg, hsl(var(--secondary)), hsl(var(--background)))',
              minHeight: 220,
            }}
          >
            <input
              id="file-input"
              type="file"
              multiple
              accept=".xlsx,.xls,.csv,.zip"
              onChange={handleFileInput}
              className="hidden"
            />

            <div className="mx-auto mb-5 w-12 h-12 rounded-2xl bg-card border border-border shadow-xs flex items-center justify-center transition-transform duration-200 group-hover:-translate-y-0.5">
              <Upload className="w-5 h-5 text-[hsl(var(--text-secondary))]" strokeWidth={1.6} />
            </div>

            <p className="text-[18px] font-semibold text-foreground tracking-tight">
              {isDragging ? 'Release to upload' : 'Drop your Amazon Bulk Operations file here'}
            </p>
            <p className="text-[13px] text-[hsl(var(--text-secondary))] mt-1.5">
              or <span className="text-primary font-medium">click to browse</span>
            </p>

            <div className="flex items-center justify-center gap-1.5 mt-6">
              {FORMAT_PILLS.map((fmt) => (
                <span
                  key={fmt}
                  className="text-[11px] font-mono-nums bg-secondary border border-border rounded-md px-2 py-0.5 text-[hsl(var(--text-secondary))]"
                >
                  {fmt}
                </span>
              ))}
            </div>
          </div>

          {/* Validation checklist */}
          <div className="mt-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[hsl(var(--text-tertiary))] mb-2">
              Expected sheets
            </p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
              {SHEET_REQUIREMENTS.map((sheet) => (
                <div key={sheet} className="flex items-center gap-2 text-[12.5px] text-[hsl(var(--text-secondary))]">
                  <span className="w-3.5 h-3.5 rounded-full border border-border bg-card flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-2.5 h-2.5 text-[hsl(var(--text-tertiary))] opacity-0" strokeWidth={2.5} />
                  </span>
                  {sheet}
                </div>
              ))}
            </div>
          </div>

          {/* How it works — inline stepper */}
          <div className="flex items-center gap-3 mt-5 px-1 text-[12px] text-[#86868B] flex-wrap">
            {['Upload bulk file', 'Review bleeders', 'Generate decisions'].map((s, i, arr) => (
              <div key={s} className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full border border-[#D2D2D7] bg-card flex items-center justify-center text-[10px] font-semibold text-[#86868B] font-mono-nums">
                    {i + 1}
                  </span>
                  <span>{s}</span>
                </div>
                {i < arr.length - 1 && <span className="text-[#D2D2D7]">→</span>}
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="space-y-4 animate-fade-in">
          {/* Upload zone collapsed */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onClick={() => document.getElementById('file-input')?.click()}
            className={`rounded-md border border-dashed text-center py-3 cursor-pointer btn-press text-[12px] text-[hsl(var(--text-tertiary))] hover:text-foreground hover:bg-secondary/60 ${
              isDragging ? 'border-primary text-primary' : 'border-border'
            }`}
          >
            <input
              id="file-input"
              type="file"
              multiple
              accept=".xlsx,.xls,.csv,.zip"
              onChange={handleFileInput}
              className="hidden"
            />
            Drop a different file to replace
          </div>

          {/* Attached file card */}
          <div className="relative rounded-xl border border-border bg-card p-4 shadow-card flex items-center justify-between overflow-hidden">
            <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-success" />
            <div className="flex items-center gap-3 pl-2 min-w-0">
              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                <FileSpreadsheet className="w-4.5 h-4.5 text-[hsl(var(--text-secondary))]" strokeWidth={1.6} />
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
                Ready to analyze
              </span>
              <button
                onClick={handleClear}
                className="w-6 h-6 rounded-md flex items-center justify-center text-[hsl(var(--text-tertiary))] hover:text-foreground hover:bg-secondary btn-press"
                aria-label="Remove file"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Action — auto width, right aligned */}
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              onClick={handleClear}
              className="h-9 px-4 rounded-md text-[13px] font-medium text-[hsl(var(--text-secondary))] hover:text-foreground hover:bg-secondary btn-press"
            >
              Cancel
            </button>
            <button
              onClick={handleAnalyze}
              className="h-9 px-5 rounded-md bg-primary text-primary-foreground text-[13px] font-semibold btn-press hover:bg-primary/92 shadow-xs"
              style={{ minWidth: 168 }}
            >
              Analyze File →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
