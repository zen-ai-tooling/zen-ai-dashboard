import { useCallback, useState } from "react";
import { BulkBreadcrumb } from "@/components/shared/BulkBreadcrumb";
import {
  PipelineHeader,
  WorkspaceCard,
  SmartDropzone,
  AssetInventory,
} from "@/components/shared/UploadWorkspace";

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

const PIPELINE_STEPS = [
  { id: 1, label: 'Upload bulk file' },
  { id: 2, label: 'Review bleeders' },
  { id: 3, label: 'Generate decisions' },
];

export const UploadCard = ({ onFileUpload, isVisible }: UploadCardProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [detectedSheets, setDetectedSheets] = useState<string[]>([]);

  const handleSelect = useCallback((f: File) => {
    setSelectedFile(f);
    // Optimistic "all detected" — actual sheet validation runs in core engine. UX only.
    setDetectedSheets(SHEET_REQUIREMENTS);
  }, []);

  const handleClear = useCallback(() => {
    setSelectedFile(null);
    setDetectedSheets([]);
  }, []);

  const handleAnalyze = useCallback(() => {
    if (selectedFile) onFileUpload([selectedFile]);
  }, [selectedFile, onFileUpload]);

  if (!isVisible) return null;

  return (
    <div className="w-full space-y-5">
      <BulkBreadcrumb />

      <PipelineHeader
        workflowName="Bleeders 1.0"
        workflowVariant="Standard"
        description="Analyze large-scale bulk files to find targets with high spend and zero conversions."
        steps={PIPELINE_STEPS}
        activeStep={1}
      />

      <WorkspaceCard
        sectionLabel="Amazon Ad Data Onboarding"
        sidebar={
          <AssetInventory
            sheets={SHEET_REQUIREMENTS.map((name) => ({ name, detected: detectedSheets.includes(name) }))}
          />
        }
      >
        <SmartDropzone
          inputId="file-input-b1"
          primaryText="Drop your Amazon Bulk Operations file here"
          selectedFile={selectedFile ? { name: selectedFile.name, size: selectedFile.size } : null}
          onFileSelect={handleSelect}
          onClear={handleClear}
        />
      </WorkspaceCard>

      {selectedFile && (
        <div className="flex items-center justify-end gap-2 pt-1 animate-fade-in">
          <button
            onClick={handleClear}
            className="rounded-[10px] btn-press"
            style={{ background: '#FFFFFF', border: '1px solid #D2D2D7', color: '#1D1D1F', padding: '12px 24px', fontSize: 14, fontWeight: 600 }}
          >
            Cancel
          </button>
          <button
            onClick={handleAnalyze}
            className="rounded-[10px] btn-press"
            style={{ background: '#2563EB', color: '#FFFFFF', padding: '12px 24px', fontSize: 14, fontWeight: 600 }}
          >
            Analyze File →
          </button>
        </div>
      )}
    </div>
  );
};
