import { Upload, X, FileSpreadsheet } from "lucide-react";
import { useCallback, useState } from "react";
import { StandardUploadZone } from "@/components/shared/StandardUploadZone";
import { BulkBreadcrumb } from "@/components/shared/BulkBreadcrumb";

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

export const UploadCard = ({ onFileUpload, isVisible }: UploadCardProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleClear = useCallback(() => setSelectedFile(null), []);
  const handleAnalyze = useCallback(() => { if (selectedFile) onFileUpload([selectedFile]); }, [selectedFile, onFileUpload]);

  if (!isVisible) return null;

  return (
    <div className="w-full space-y-5">
      {/* Breadcrumb on top — matches Bleeders 2.0 standard */}
      <BulkBreadcrumb />

      {/* Title + subtitle */}
      <div>
        <h2 className="text-[24px] font-semibold text-foreground tracking-tight">Upload your bulk file</h2>
        <p className="text-[14px] text-[#86868B] mt-1.5">
          Bleeders 1.0 — find high-spend, zero-conversion targets across all campaigns.
        </p>
      </div>

      {!selectedFile ? (
        <StandardUploadZone
          inputId="file-input-b1"
          onFileSelect={(f) => setSelectedFile(f)}
          expectedSheets={SHEET_REQUIREMENTS}
        />
      ) : (
        <div className="space-y-4 animate-fade-in">
          {/* Attached file card — single, simplified */}
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
