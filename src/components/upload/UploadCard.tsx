import { useCallback, useState } from "react";
import { ArrowRight } from "lucide-react";
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
            className="rounded-lg btn-press"
            style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', color: '#374151', height: 36, padding: '0 16px', fontSize: 14, fontWeight: 500 }}
          >
            Cancel
          </button>
          <button
            onClick={handleAnalyze}
            className="rounded-lg btn-press inline-flex items-center gap-1.5"
            style={{ background: '#4F6EF7', color: '#FFFFFF', height: 36, padding: '0 16px', fontSize: 14, fontWeight: 500 }}
          >
            Analyze File
            <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.2} />
          </button>
        </div>
      )}
    </div>
  );
};
