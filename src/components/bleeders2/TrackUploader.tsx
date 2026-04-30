import React from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BulkBreadcrumb } from "@/components/shared/BulkBreadcrumb";
import {
  PipelineHeader,
  WorkspaceCard,
  SmartDropzone,
  AssetInventory,
} from "@/components/shared/UploadWorkspace";
import type { Bleeder2Track } from "./TrackSelector";

interface TrackUploaderProps {
  track: Bleeder2Track;
  onUpload: (track: Bleeder2Track, file: File) => void;
  error?: string;
  uploadedFile?: { name: string; size: number; uploadedAt: number } | null;
  isValidating?: boolean;
}

const trackVariant: Record<Bleeder2Track, string> = {
  SBSD: 'SB/SD Bad Targets',
  SP: 'SP Bad Search Terms',
  SP_KEYWORDS: 'SP Bad Targets',
  ACOS100: 'Campaigns ≥ 100% ACoS',
};

const trackDescriptions: Record<Bleeder2Track, string> = {
  SBSD: 'Find high-ACoS targets across Sponsored Brands & Display campaigns.',
  SP: 'Find wasteful customer search terms in Sponsored Products.',
  SP_KEYWORDS: 'Find underperforming keywords & product targets in Sponsored Products.',
  ACOS100: 'Find campaigns where spend exceeds sales (ACoS ≥ 100%).',
};

const trackExpectedSheets: Record<Bleeder2Track, string[]> = {
  SBSD: ['Sponsored Brands Campaigns', 'Sponsored Display Campaigns'],
  SP: ['SP Search Term Report'],
  SP_KEYWORDS: ['Sponsored Products Campaigns'],
  ACOS100: ['Sponsored Products Campaigns', 'Sponsored Brands Campaigns', 'Sponsored Display Campaigns'],
};

const PIPELINE_STEPS = [
  { id: 1, label: 'Upload bulk file' },
  { id: 2, label: 'Review bleeders' },
  { id: 3, label: 'Generate decisions' },
];

export const TrackUploader: React.FC<TrackUploaderProps> = ({ track, onUpload, error, uploadedFile, isValidating }) => {
  const expected = trackExpectedSheets[track];
  const isReady = !!uploadedFile && !error;

  return (
    <div className="w-full space-y-5">
      <BulkBreadcrumb />

      <PipelineHeader
        workflowName="Bleeders 2.0"
        workflowVariant={trackVariant[track]}
        description={trackDescriptions[track]}
        steps={PIPELINE_STEPS}
        activeStep={1}
      />

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-[12px]">{error}</AlertDescription>
        </Alert>
      )}

      {isValidating ? (
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #E5E5EA',
            borderRadius: 12,
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
            padding: 24,
          }}
          className="flex items-center justify-center gap-2"
        >
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span style={{ fontSize: 13, color: '#6E6E73' }}>Validating file…</span>
        </div>
      ) : (
        <WorkspaceCard
          sectionLabel="Amazon Ad Data Onboarding"
          sidebar={
            <AssetInventory
              sheets={expected.map((name) => ({ name, detected: isReady }))}
            />
          }
        >
          <SmartDropzone
            inputId={`track-upload-${track}`}
            primaryText="Drop your Amazon Bulk Operations file here"
            selectedFile={isReady && uploadedFile ? { name: uploadedFile.name, size: uploadedFile.size } : null}
            onFileSelect={(file) => onUpload(track, file)}
          />
        </WorkspaceCard>
      )}
    </div>
  );
};
