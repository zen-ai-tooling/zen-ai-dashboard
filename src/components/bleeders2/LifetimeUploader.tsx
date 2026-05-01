/**
 * Lifetime Bleeders Two-File Upload Workflow Component
 *
 * Re-architected to match the Data Onboarding Control Room pattern shared across
 * Bleeders 1.0 and 2.0: PipelineHeader + WorkspaceCard + SmartDropzone + AssetInventory.
 *
 * Two dropzones are stacked inside the workspace (Step 1 + Step 2) and the sidebar
 * lights up each file's "asset" pill as it is provided. Business logic untouched.
 */

import * as React from 'react';
import { Info, Loader2 } from 'lucide-react';
import {
  PipelineHeader,
  WorkspaceCard,
  SmartDropzone,
  AssetInventory,
} from '@/components/shared/UploadWorkspace';

interface LifetimeUploaderProps {
  onAnalyze: (lifetimeReport: File, bulkFile: File) => Promise<void>;
  isProcessing?: boolean;
}

const PIPELINE_STEPS = [
  { id: 1, label: 'Upload files' },
  { id: 2, label: 'Review bleeders' },
  { id: 3, label: 'Generate decisions' },
];

export const LifetimeUploader: React.FC<LifetimeUploaderProps> = ({
  onAnalyze,
  isProcessing = false,
}) => {
  const [lifetimeFile, setLifetimeFile] = React.useState<File | null>(null);
  const [bulkFile, setBulkFile] = React.useState<File | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const validateLifetime = (file: File) => {
    if (!/\.(xlsx|xls|csv)$/i.test(file.name)) {
      setError('Lifetime report must be .xlsx, .xls, or .csv');
      return false;
    }
    return true;
  };

  const validateBulk = (file: File) => {
    if (!/\.(xlsx|xls|csv|zip)$/i.test(file.name)) {
      setError('Reference bulk file must be .xlsx, .xls, .csv, or .zip');
      return false;
    }
    return true;
  };

  const handleAnalyze = async () => {
    if (!lifetimeFile || !bulkFile || isProcessing) return;
    setError(null);
    try {
      await onAnalyze(lifetimeFile, bulkFile);
    } catch (err: any) {
      setError(err?.message || 'Analysis failed');
    }
  };

  const ready = !!lifetimeFile && !!bulkFile && !isProcessing;

  return (
    <div className="w-full space-y-5">
      <PipelineHeader
        workflowName="Lifetime Audit"
        workflowVariant="Two-file workflow"
        description="Find targets with high lifetime clicks and zero sales by combining a Lifetime Targeting Report with a Reference Bulk File."
        steps={PIPELINE_STEPS}
        activeStep={1}
      />

      {/* Why two files — subtle info callout */}
      <div
        className="rounded-lg p-3.5 flex items-start gap-2.5"
        style={{
          background: '#F4F7FB',
          border: '1px solid #E2E8F0',
          borderLeft: '3px solid #94A3B8',
        }}
      >
        <Info className="w-4 h-4 text-[#475569] flex-shrink-0 mt-[1px]" strokeWidth={1.8} />
        <div className="text-[12.5px] text-[#475569] leading-relaxed">
          <span className="font-semibold text-[#334155]">Why two files? </span>
          The Lifetime Report has performance data but no Amazon IDs. The Reference Bulk File
          provides the IDs needed to generate Amazon-compatible update rows.
        </div>
      </div>

      <WorkspaceCard
        sectionLabel="Amazon Ad Data Onboarding"
        sidebar={
          <AssetInventory
            title="Required Assets"
            subtitle="Both files must be provided to continue."
            sheets={[
              { name: 'Lifetime Targeting Report', detected: !!lifetimeFile },
              { name: 'Reference Bulk File', detected: !!bulkFile },
            ]}
          />
        }
      >
        <div className="space-y-4">
          {/* Step 1 — Lifetime Targeting Report */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#4F6EF7] text-white text-[11px] font-semibold font-mono-nums">
                1
              </span>
              <h3 className="text-[14px] font-semibold text-foreground">
                Lifetime Targeting Report
              </h3>
              <span className="text-[12px] text-[#9CA3AF]">
                · Campaign Manager → Targeting → Lifetime filter → Export
              </span>
            </div>
            <SmartDropzone
              inputId="lifetime-report-input"
              primaryText="Drop your Lifetime Targeting Report here"
              formats={['.xlsx', '.xls', '.csv']}
              accept=".xlsx,.xls,.csv"
              minHeight={160}
              selectedFile={lifetimeFile ? { name: lifetimeFile.name, size: lifetimeFile.size } : null}
              onFileSelect={(f) => {
                if (validateLifetime(f)) {
                  setLifetimeFile(f);
                  setError(null);
                }
              }}
              onClear={() => setLifetimeFile(null)}
            />
          </div>

          {/* Step 2 — Reference Bulk File */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#4F6EF7] text-white text-[11px] font-semibold font-mono-nums">
                2
              </span>
              <h3 className="text-[14px] font-semibold text-foreground">
                Reference Bulk File
              </h3>
              <span className="text-[12px] text-[#9CA3AF]">
                · Amazon Ads → Bulk Operations → Create Spreadsheet (30-day)
              </span>
            </div>
            <SmartDropzone
              inputId="lifetime-bulk-input"
              primaryText="Drop your Reference Bulk File here"
              formats={['.xlsx', '.xls', '.csv', '.zip']}
              accept=".xlsx,.xls,.csv,.zip"
              minHeight={160}
              selectedFile={bulkFile ? { name: bulkFile.name, size: bulkFile.size } : null}
              onFileSelect={(f) => {
                if (validateBulk(f)) {
                  setBulkFile(f);
                  setError(null);
                }
              }}
              onClear={() => setBulkFile(null)}
            />
          </div>
        </div>
      </WorkspaceCard>

      {/* Error */}
      {error && (
        <div
          className="rounded-lg px-3.5 py-2.5 text-[13px]"
          style={{
            background: 'rgba(255, 59, 48, 0.06)',
            border: '1px solid rgba(255, 59, 48, 0.25)',
            color: '#B91C1C',
          }}
        >
          {error}
        </div>
      )}

      {/* Action row */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <div className="text-[12px] text-[#9CA3AF]">
          {!lifetimeFile && !bulkFile && 'Upload both files to continue'}
          {lifetimeFile && !bulkFile && 'Upload reference bulk file to continue'}
          {!lifetimeFile && bulkFile && 'Upload lifetime targeting report to continue'}
          {ready && 'Both files ready'}
        </div>
        <button
          onClick={handleAnalyze}
          disabled={!ready}
          className="rounded-[10px] btn-press disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
          style={{
            background: '#4F6EF7',
            color: '#FFFFFF',
            padding: '12px 24px',
            fontSize: 14,
            fontWeight: 600,
            minWidth: 168,
            justifyContent: 'center',
          }}
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Analyzing…
            </>
          ) : (
            <>Analyze Files →</>
          )}
        </button>
      </div>
    </div>
  );
};

export default LifetimeUploader;
