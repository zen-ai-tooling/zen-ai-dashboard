import { Upload, CheckCircle2, X } from "lucide-react";
import { useCallback, useState } from "react";

interface UploadCardProps {
  onFileUpload: (files: File[]) => void;
  isVisible: boolean;
}

const FILE_PILLS = [
  'SP Campaigns',
  'SB Campaigns',
  'SD Campaigns',
  'Search Terms',
];

export const UploadCard = ({ onFileUpload, isVisible }: UploadCardProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        setSelectedFile(files[0]);
        onFileUpload(files);
      }
    },
    [onFileUpload]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
          setSelectedFile(files[0]);
          onFileUpload(files);
        }
      }
    },
    [onFileUpload]
  );

  const handleClear = () => {
    setSelectedFile(null);
  };

  if (!isVisible) return null;

  return (
    <div className="w-full">
      {!selectedFile ? (
        <>
          <div
            className={`border border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-primary bg-[hsl(var(--sidebar-active-bg))]'
                : 'border-border/60 hover:border-border hover:bg-muted/30'
            }`}
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onClick={() => document.getElementById("file-input")?.click()}
          >
            <input
              id="file-input"
              type="file"
              multiple
              accept=".xlsx,.xls,.csv,.zip"
              onChange={handleFileInput}
              className="hidden"
            />

            <Upload className="w-6 h-6 text-muted-foreground mx-auto mb-3" />
            <p className="text-[13px] font-medium text-foreground">
              Drop your Amazon Bulk Operations file here
            </p>
            <p className="text-[12px] text-muted-foreground mt-1">
              or click to browse · .xlsx .xls .csv .zip
            </p>
          </div>

          {/* Info pills */}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {FILE_PILLS.map((pill) => (
              <span key={pill} className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground bg-muted rounded-full px-2.5 py-1">
                <CheckCircle2 className="w-3 h-3 text-muted-foreground/60" />
                {pill}
              </span>
            ))}
          </div>
        </>
      ) : (
        <div className="border border-border rounded-lg p-4 flex items-center justify-between bg-card">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
              <Upload className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-[13px] font-medium text-foreground">{selectedFile.name}</p>
              <p className="text-[11px] text-muted-foreground">
                {(selectedFile.size / 1024).toFixed(1)} KB
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-[11px] text-success font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-success" />
              Ready to analyze
            </span>
            <button onClick={handleClear} className="p-1 hover:bg-muted rounded btn-press">
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
