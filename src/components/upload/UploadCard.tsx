import { Upload, X, FileSpreadsheet } from "lucide-react";
import { useCallback, useState } from "react";
import { StandardUploadZone } from "@/components/shared/StandardUploadZone";
import { BulkBreadcrumb } from "@/components/shared/BulkBreadcrumb";

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

export const UploadCard = ({ onFileUpload, isVisible }: UploadCardProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleClear = useCallback(() => setSelectedFile(null), []);
  const handleAnalyze = useCallback(() => { if (selectedFile) onFileUpload([selectedFile]); }, [selectedFile, onFileUpload]);

  if (!isVisible) return null;

  return (
    <div className="w-full space-y-5">
      {/* Breadcrumb on top — matches Bleeders 2.0 standard */}
      <BulkBreadcrumb />

      {/* Title + subtitle */}
      <div>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: '#1D1D1F', letterSpacing: '-0.3px' }}>
          Upload your bulk file
        </h2>
        <p className="mt-1.5" style={{ fontSize: 14, color: '#6E6E73' }}>
          Bleeders 1.0 — find high-spend, zero-conversion targets across all campaigns.
        </p>
      </div>

      <StandardUploadZone
        inputId="file-input-b1"
        onFileSelect={(f) => setSelectedFile(f)}
        selectedFile={selectedFile ? { name: selectedFile.name, size: selectedFile.size } : null}
        onClear={handleClear}
        expectedSheets={SHEET_REQUIREMENTS}
      />

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
            style={{ background: '#0071E3', color: '#FFFFFF', padding: '12px 24px', fontSize: 14, fontWeight: 600 }}
          >
            Analyze File →
          </button>
        </div>
      )}
    </div>
  );
};
