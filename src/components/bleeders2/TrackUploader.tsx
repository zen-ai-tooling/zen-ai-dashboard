import React from "react";
import { Upload, CheckCircle2, X, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import type { Bleeder2Track } from "./TrackSelector";

interface TrackUploaderProps {
  track: Bleeder2Track;
  onUpload: (track: Bleeder2Track, file: File) => void;
  error?: string;
  uploadedFile?: { name: string; size: number; uploadedAt: number } | null;
  isValidating?: boolean;
}

const trackLabels: Record<Bleeder2Track, string> = {
  SBSD: "SB/SD Bad Keywords",
  SP: "SP Bad Search Terms",
  SP_KEYWORDS: "SP Bad Keywords (Targeting)",
  ACOS100: "Campaigns ≥ 100% ACoS",
};

const FILE_PILLS = ['SP Campaigns', 'SB Campaigns', 'SD Campaigns', 'Search Terms'];

export const TrackUploader: React.FC<TrackUploaderProps> = ({ track, onUpload, error, uploadedFile, isValidating }) => {
  const [isDragging, setIsDragging] = React.useState(false);

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files[0]) onUpload(track, files[0]);
  };

  return (
    <div className="w-full space-y-3">
      <div>
        <h2 className="text-[14px] font-medium text-foreground font-display">{trackLabels[track]}</h2>
        <p className="text-[12px] text-muted-foreground mt-0.5">
          Upload your Amazon Bulk Operations export for this track.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-[12px]">{error}</AlertDescription>
        </Alert>
      )}

      {isValidating ? (
        <div className="border border-border rounded-lg p-6 flex items-center justify-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span className="text-[13px] text-muted-foreground">Validating file...</span>
        </div>
      ) : uploadedFile && !error ? (
        <div className="border border-border rounded-lg p-4 flex items-center justify-between bg-card">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
              <Upload className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-[13px] font-medium text-foreground">{uploadedFile.name}</p>
              <p className="text-[11px] text-muted-foreground">{(uploadedFile.size / 1024).toFixed(1)} KB</p>
            </div>
          </div>
          <span className="flex items-center gap-1 text-[11px] text-success font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-success" />
            Ready
          </span>
        </div>
      ) : (
        <>
          <div
            className={`border border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-primary bg-[hsl(var(--sidebar-active-bg))]'
                : 'border-border/60 hover:border-border hover:bg-muted/30'
            }`}
            onClick={() => document.getElementById(`track-upload-${track}`)?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              id={`track-upload-${track}`}
              type="file"
              accept=".xlsx,.xls,.csv,.zip"
              onChange={(e) => { if (e.target.files?.[0]) onUpload(track, e.target.files[0]); }}
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

          <div className="flex items-center gap-2 flex-wrap">
            {FILE_PILLS.map((pill) => (
              <span key={pill} className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground bg-muted rounded-full px-2.5 py-1">
                <CheckCircle2 className="w-3 h-3 text-muted-foreground/60" />
                {pill}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
