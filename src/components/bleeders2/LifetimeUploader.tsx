/**
 * Lifetime Bleeders Two-File Upload Workflow Component
 *
 * Standardized upload UI that matches Bleeders 1.0/2.0 patterns:
 * - StandardUploadZone for both files (Lifetime Targeting Report + Reference Bulk File)
 * - Stacked vertically with Step 1 / Step 2 labels
 * - Subtle blue-gray info callout explaining "Why two files?"
 * - "How it works" stepper at the bottom
 * - "Analyze Files →" button enabled when both files are uploaded
 */

import * as React from 'react';
import { Info, Loader2 } from 'lucide-react';
import { StandardUploadZone } from '@/components/shared/StandardUploadZone';

interface LifetimeUploaderProps {
  onAnalyze: (lifetimeReport: File, bulkFile: File) => Promise<void>;
  isProcessing?: boolean;
}

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
    <div className="w-full space-y-5 max-w-[760px] mx-auto">
      {/* Title + subtitle */}
      <div>
        <h2 className="text-[24px] font-semibold text-foreground tracking-tight">
          Upload your lifetime audit files
        </h2>
        <p className="text-[14px] text-[#86868B] mt-1.5">
          Lifetime Audit — find targets with high lifetime clicks and zero sales.
        </p>
      </div>

      {/* Why two files — subtle info callout (blue-gray, info icon) */}
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

      {/* Step 1 — Lifetime Targeting Report */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#0071E3] text-white text-[11px] font-semibold font-mono-nums">
            1
          </span>
          <h3 className="text-[14px] font-semibold text-foreground">
            Lifetime Targeting Report
          </h3>
          <span className="text-[12px] text-[#86868B]">
            · Campaign Manager → Targeting → Lifetime filter → Export
          </span>
        </div>
        <StandardUploadZone
          inputId="lifetime-report-input"
          onFileSelect={(f) => {
            if (validateLifetime(f)) {
              setLifetimeFile(f);
              setError(null);
            }
          }}
          selectedFile={lifetimeFile ? { name: lifetimeFile.name, size: lifetimeFile.size } : null}
          onClear={() => setLifetimeFile(null)}
          primaryText="Drop your Lifetime Targeting Report here"
          formats={['.xlsx', '.xls', '.csv']}
          minHeight={160}
          showHowItWorks={false}
        />
      </div>

      {/* Step 2 — Reference Bulk File */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#0071E3] text-white text-[11px] font-semibold font-mono-nums">
            2
          </span>
          <h3 className="text-[14px] font-semibold text-foreground">
            Reference Bulk File
          </h3>
          <span className="text-[12px] text-[#86868B]">
            · Amazon Ads → Bulk Operations → Create Spreadsheet (30-day)
          </span>
        </div>
        <StandardUploadZone
          inputId="lifetime-bulk-input"
          onFileSelect={(f) => {
            if (validateBulk(f)) {
              setBulkFile(f);
              setError(null);
            }
          }}
          selectedFile={bulkFile ? { name: bulkFile.name, size: bulkFile.size } : null}
          onClear={() => setBulkFile(null)}
          primaryText="Drop your Reference Bulk File here"
          formats={['.xlsx', '.xls', '.csv', '.zip']}
          minHeight={160}
          showHowItWorks={false}
        />
      </div>

      {/* Error */}
      {error && (
        <div
          className="rounded-lg px-3.5 py-2.5 text-[13px]"
          style={{
            background: 'rgba(255, 59, 48, 0.06)',
            border: '1px solid rgba(255, 59, 48, 0.25)',
            color: '#B71C1C',
          }}
        >
          {error}
        </div>
      )}

      {/* Action row */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <div className="text-[12px] text-[#86868B]">
          {!lifetimeFile && !bulkFile && 'Upload both files to continue'}
          {lifetimeFile && !bulkFile && 'Upload reference bulk file to continue'}
          {!lifetimeFile && bulkFile && 'Upload lifetime targeting report to continue'}
          {ready && 'Both files ready'}
        </div>
        <button
          onClick={handleAnalyze}
          disabled={!ready}
          className="h-9 px-5 rounded-md bg-primary text-primary-foreground text-[13px] font-semibold btn-press hover:bg-primary/92 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
          style={{ minWidth: 168 }}
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

      {/* How it works — inline stepper */}
      <div className="flex items-center gap-3 pt-3 px-1 text-[12px] text-[#86868B] flex-wrap">
        {['Upload files', 'Review bleeders', 'Generate decisions'].map((s, i, arr) => (
          <React.Fragment key={s}>
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full border border-[#D2D2D7] bg-white flex items-center justify-center text-[10px] font-semibold text-[#86868B] font-mono-nums">
                {i + 1}
              </span>
              <span>{s}</span>
            </div>
            {i < arr.length - 1 && <span className="text-[#D2D2D7]">→</span>}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default LifetimeUploader;
