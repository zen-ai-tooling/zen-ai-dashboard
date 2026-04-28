import React from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { StandardUploadZone } from "@/components/shared/StandardUploadZone";
import { BulkBreadcrumb } from "@/components/shared/BulkBreadcrumb";
import type { Bleeder2Track } from "./TrackSelector";

interface TrackUploaderProps {
  track: Bleeder2Track;
  onUpload: (track: Bleeder2Track, file: File) => void;
  error?: string;
  uploadedFile?: { name: string; size: number; uploadedAt: number } | null;
  isValidating?: boolean;
}

const trackTitles: Record<Bleeder2Track, string> = {
  SBSD: 'SB/SD Bad Targets — find high-ACoS targets across Sponsored Brands & Display campaigns',
  SP: 'SP Bad Search Terms — find wasteful customer search terms in Sponsored Products',
  SP_KEYWORDS: 'SP Bad Targets — find underperforming keywords & product targets in Sponsored Products',
  ACOS100: 'Campaigns ≥ 100% ACoS — find campaigns where spend exceeds sales',
};

const trackExpectedSheets: Record<Bleeder2Track, string[]> = {
  SBSD: ['Sponsored Brands Campaigns', 'Sponsored Display Campaigns'],
  SP: ['SP Search Term Report'],
  SP_KEYWORDS: ['Sponsored Products Campaigns'],
  ACOS100: ['Sponsored Products Campaigns', 'Sponsored Brands Campaigns', 'Sponsored Display Campaigns'],
};

export const TrackUploader: React.FC<TrackUploaderProps> = ({ track, onUpload, error, uploadedFile, isValidating }) => {
  return (
    <div className="w-full space-y-5">
      <BulkBreadcrumb />

      <div>
        <h2 className="text-[20px] font-semibold text-foreground tracking-tight">Upload your bulk file</h2>
        <p className="text-[13px] text-[hsl(var(--text-secondary))] mt-1">{trackTitles[track]}</p>
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
          expectedSheets={trackExpectedSheets[track]}
        />
      )}
    </div>
  );
};
