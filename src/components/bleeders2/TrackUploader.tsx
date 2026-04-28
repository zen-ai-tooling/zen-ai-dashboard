import React from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { StandardUploadZone } from "@/components/shared/StandardUploadZone";
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

const trackHelpers: Record<Bleeder2Track, string> = {
  SBSD: "Sponsored Brands & Display targeting reports",
  SP: "Sponsored Products search term report",
  SP_KEYWORDS: "Sponsored Products targeting/keywords report",
  ACOS100: "Campaign performance report",
};

export const TrackUploader: React.FC<TrackUploaderProps> = ({ track, onUpload, error, uploadedFile, isValidating }) => {
  return (
    <div className="w-full space-y-4">
      <div>
        <h2 className="text-[16px] font-semibold text-foreground tracking-tight">{trackLabels[track]}</h2>
        <p className="text-[13px] text-[hsl(var(--text-secondary))] mt-0.5">
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
        <div className="rounded-xl border border-border bg-card p-6 flex items-center justify-center gap-2 shadow-card">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span className="text-[13px] text-[hsl(var(--text-secondary))]">Validating file...</span>
        </div>
      ) : (
        <StandardUploadZone
          inputId={`track-upload-${track}`}
          onFileSelect={(file) => onUpload(track, file)}
          selectedFile={uploadedFile && !error ? { name: uploadedFile.name, size: uploadedFile.size } : null}
          helperText={trackHelpers[track]}
        />
      )}
    </div>
  );
};
