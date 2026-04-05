import { Upload, FileSpreadsheet, FileArchive } from "lucide-react";
import { useCallback } from "react";
import { cn } from "@/lib/utils";

interface UploadCardProps {
  onFileUpload: (files: File[]) => void;
  isVisible: boolean;
}

export const UploadCard = ({ onFileUpload, isVisible }: UploadCardProps) => {
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const files = Array.from(e.dataTransfer.files);
      onFileUpload(files);
    },
    [onFileUpload]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        const files = Array.from(e.target.files);
        onFileUpload(files);
      }
    },
    [onFileUpload]
  );

  if (!isVisible) return null;

  return (
    <div className="w-full max-w-2xl mx-auto my-6 animate-in fade-in slide-in-from-top-4 duration-500">
      <div
        className="border-2 border-dashed border-[hsl(var(--upload-border))] rounded-2xl p-8 text-center bg-card hover:bg-[hsl(var(--upload-hover))] transition-colors cursor-pointer"
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
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
        
        <div className="flex justify-center mb-4">
          <div className="p-4 bg-primary/10 rounded-full">
            <Upload className="w-8 h-8 text-primary" />
          </div>
        </div>
        
        <h3 className="text-lg font-semibold mb-2">Upload Amazon Bulk Operations Export</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Drag & drop or click to browse
        </p>
        
        <div className="space-y-2 text-xs text-muted-foreground">
          <div className="flex items-center justify-center gap-2">
            <FileSpreadsheet className="w-4 h-4" />
            <span>.xlsx or .xls (multi-tab preferred)</span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <FileSpreadsheet className="w-4 h-4" />
            <span>.csv (single tab)</span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <FileArchive className="w-4 h-4" />
            <span>.zip containing valid files</span>
          </div>
        </div>
      </div>
    </div>
  );
};
