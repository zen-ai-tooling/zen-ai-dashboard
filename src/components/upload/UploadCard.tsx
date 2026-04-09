import { Upload, CheckCircle2, X } from "lucide-react";
import { useCallback, useState } from "react";

interface UploadCardProps {
  onFileUpload: (files: File[]) => void;
  isVisible: boolean;
}

const FILE_PILLS = ['SP Campaigns', 'SB Campaigns', 'SD Campaigns', 'Search Terms'];
const FORMAT_PILLS = ['.xlsx', '.xls', '.csv', '.zip'];

export const UploadCard = ({ onFileUpload, isVisible }: UploadCardProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) setSelectedFile(files[0]);
    },
    []
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        const files = Array.from(e.target.files);
        if (files.length > 0) setSelectedFile(files[0]);
      }
    },
    []
  );

  const handleClear = () => setSelectedFile(null);

  const handleAnalyze = () => {
    if (selectedFile) onFileUpload([selectedFile]);
  };

  if (!isVisible) return null;

  return (
    <div className="w-full space-y-4">
      {!selectedFile ? (
        <>
          <div
            className={`rounded-xl border-2 border-dashed py-12 px-8 text-center cursor-pointer btn-press ${
              isDragging
                ? 'border-[hsl(var(--accent-blue))] bg-[hsl(var(--accent-blue-light))/0.3]'
                : 'border-[hsl(var(--border-strong))] hover:border-[hsl(var(--accent-blue))] hover:bg-[hsl(var(--accent-blue-light))/0.15]'
            }`}
            style={{ transition: 'border-color 150ms ease, background-color 150ms ease' }}
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onClick={() => document.getElementById("file-input")?.click()}
          >
            <input id="file-input" type="file" multiple accept=".xlsx,.xls,.csv,.zip" onChange={handleFileInput} className="hidden" />
            <Upload className="w-8 h-8 text-[hsl(var(--text-tertiary))] mx-auto mb-3" />
            <p className="text-[16px] font-medium text-foreground">Drop your Amazon Bulk Operations file here</p>
            <p className="text-[13px] text-[hsl(var(--text-tertiary))] mt-1">or click to browse</p>
            <div className="flex items-center justify-center gap-2 mt-4">
              {FORMAT_PILLS.map((fmt) => (
                <span key={fmt} className="text-[11px] font-mono-nums bg-secondary border border-border rounded-md px-2 py-1 text-[hsl(var(--text-tertiary))]">
                  {fmt}
                </span>
              ))}
            </div>
          </div>

          {/* What to include */}
          <div>
            <p className="text-[12px] text-[hsl(var(--text-tertiary))] mb-2">Your file should contain these sheets:</p>
            <div className="flex items-center gap-2 flex-wrap">
              {FILE_PILLS.map((pill) => (
                <span key={pill} className="inline-flex items-center gap-1.5 text-[12px] text-[hsl(var(--green))] bg-[hsl(var(--green-light))] border border-[hsl(var(--green-border))] rounded-full px-2.5 py-1">
                  <CheckCircle2 className="w-3 h-3" /> {pill}
                </span>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="space-y-3">
          <div className="rounded-xl border border-border bg-card p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[hsl(var(--accent-blue-light))] flex items-center justify-center">
                <Upload className="w-4 h-4 text-[hsl(var(--accent-blue))]" />
              </div>
              <div>
                <p className="text-[13px] font-medium text-foreground">{selectedFile.name}</p>
                <p className="text-[11px] text-[hsl(var(--text-tertiary))]">{(selectedFile.size / 1024).toFixed(1)} KB</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-[11px] text-[hsl(var(--green))] font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--green))]" /> Ready to analyze
              </span>
              <button onClick={handleClear} className="p-1 hover:bg-secondary rounded btn-press">
                <X className="w-3.5 h-3.5 text-[hsl(var(--text-tertiary))]" />
              </button>
            </div>
          </div>
          <button
            onClick={handleAnalyze}
            className="w-full h-11 rounded-lg bg-[hsl(var(--accent-blue))] text-white text-[14px] font-medium btn-press hover:opacity-90"
            style={{ transition: 'opacity 150ms ease' }}
          >
            Analyze File →
          </button>
        </div>
      )}
    </div>
  );
};
