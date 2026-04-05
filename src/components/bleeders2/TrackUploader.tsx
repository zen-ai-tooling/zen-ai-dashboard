import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Upload, FileText } from "lucide-react";
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

const helperText =
  "Upload your Amazon Bulk Operations export (.xlsx, .xls, .csv, or .zip). " +
  "Make sure it includes at least these sheets: Sponsored Products Campaigns, Sponsored Brands Campaigns, Sponsored Display Campaigns, SP Search Term Report.";

export const TrackUploader: React.FC<TrackUploaderProps> = ({ track, onUpload, error, uploadedFile, isValidating }) => {
  const [isDragging, setIsDragging] = React.useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      onUpload(track, files[0]);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          {trackLabels[track]}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{helperText}</p>
        </div>

        {uploadedFile && !error && (
          <Alert className="bg-green-50 dark:bg-green-950/20 border-green-200">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <div className="font-medium text-green-700 dark:text-green-400">File uploaded successfully</div>
                <div className="text-xs text-muted-foreground">
                  {uploadedFile.name} ({(uploadedFile.size / 1024).toFixed(1)} KB)
                </div>
              </div>
            </div>
          </Alert>
        )}

        {isValidating && (
          <Alert className="bg-blue-50 dark:bg-blue-950/20 border-blue-200">
            <AlertCircle className="h-4 w-4 animate-spin" />
            <AlertDescription>Validating file...</AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-all cursor-pointer ${
            isDragging
              ? "border-primary bg-primary/5 scale-[1.02]"
              : "border-border bg-card hover:bg-accent/5"
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
            onChange={(e) => {
              if (e.target.files?.[0]) {
                onUpload(track, e.target.files[0]);
              }
            }}
            className="hidden"
          />

          <div className="flex justify-center mb-3">
            <div className="p-3 bg-primary/10 rounded-full">
              <Upload className="w-6 h-6 text-primary" />
            </div>
          </div>

          <h3 className="text-sm font-semibold mb-2">
            {isDragging ? "Drop file here" : "Upload Bulk Operations file"}
          </h3>
          <p className="text-xs text-muted-foreground">Click to browse or drag & drop .xlsx, .xls, .csv, or .zip</p>
        </div>
      </CardContent>
    </Card>
  );
};
