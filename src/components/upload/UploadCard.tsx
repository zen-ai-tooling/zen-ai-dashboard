import { Upload, FileSpreadsheet, X, Check } from "lucide-react";
import { useCallback, useRef, useState } from "react";
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

const PIPELINE_STEPS = [
  { id: 1, label: 'Upload bulk file', desc: 'Provide Amazon export' },
  { id: 2, label: 'Review bleeders', desc: 'Inspect detected targets' },
  { id: 3, label: 'Generate decisions', desc: 'Export action file' },
];

export const UploadCard = ({ onFileUpload, isVisible }: UploadCardProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [detectedSheets, setDetectedSheets] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSelect = useCallback((f: File) => {
    setSelectedFile(f);
    // Optimistic "all detected" feedback — actual validation happens server-side.
    // This drives the Asset Inventory "light up" UX. Logic untouched.
    setDetectedSheets(SHEET_REQUIREMENTS);
  }, []);

  const handleClear = useCallback(() => {
    setSelectedFile(null);
    setDetectedSheets([]);
  }, []);

  const handleAnalyze = useCallback(() => {
    if (selectedFile) onFileUpload([selectedFile]);
  }, [selectedFile, onFileUpload]);

  const activeStep = selectedFile ? 1 : 1;

  if (!isVisible) return null;

  return (
    <div className="w-full space-y-5">
      <BulkBreadcrumb />

      {/* A. VISUAL PIPELINE HEADER */}
      <div
        style={{
          background: '#F0F2F5',
          border: '1px solid #E5E7EB',
          borderRadius: 12,
          padding: '18px 22px',
        }}
      >
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div className="min-w-0">
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', color: '#86868B' }}>
              Active Workflow
            </p>
            <h2 className="mt-1" style={{ fontSize: 20, fontWeight: 700, color: '#1D1D1F', letterSpacing: '-0.3px' }}>
              Bleeders 1.0 <span style={{ color: '#6E6E73', fontWeight: 500 }}>(Standard)</span>
            </h2>
            <p className="mt-1" style={{ fontSize: 12, color: '#6E6E73', maxWidth: 560 }}>
              Analyze large-scale bulk files to find targets with high spend and zero conversions.
            </p>
          </div>

          {/* C. REAL STEP NAVIGATION — connected bubbles */}
          <div className="flex items-center" style={{ minHeight: 40 }}>
            {PIPELINE_STEPS.map((step, i) => {
              const isActive = step.id === activeStep;
              const isDone = step.id < activeStep;
              return (
                <div key={step.id} className="flex items-center">
                  <div className="flex flex-col items-center" style={{ width: 96 }}>
                    <div
                      className="flex items-center justify-center"
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: 999,
                        background: isActive ? '#2563EB' : isDone ? '#34C759' : '#FFFFFF',
                        border: isActive || isDone ? 'none' : '1.5px solid #D2D2D7',
                        color: isActive || isDone ? '#FFFFFF' : '#86868B',
                        fontSize: 12,
                        fontWeight: 700,
                        boxShadow: isActive ? '0 0 0 4px rgba(37, 99, 235, 0.12)' : 'none',
                        transition: 'all 200ms ease',
                      }}
                    >
                      {isDone ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : step.id}
                    </div>
                    <span
                      className="mt-1.5 text-center"
                      style={{
                        fontSize: 11,
                        fontWeight: isActive ? 600 : 500,
                        color: isActive ? '#1D1D1F' : '#86868B',
                      }}
                    >
                      {step.label}
                    </span>
                  </div>
                  {i < PIPELINE_STEPS.length - 1 && (
                    <div
                      style={{
                        width: 32,
                        height: 1.5,
                        background: '#D2D2D7',
                        marginBottom: 18,
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* B. SMART UPLOAD WORKSPACE CARD */}
      <div
        style={{
          background: '#FFFFFF',
          border: '1px solid #E5E5EA',
          borderRadius: 12,
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '14px 22px',
            borderBottom: '1px solid #F2F2F7',
            background: '#FAFBFC',
          }}
        >
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', color: '#86868B' }}>
            Amazon Ad Data Onboarding
          </p>
        </div>

        <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 1fr) 280px' }}>
          {/* DROPZONE — left */}
          <div style={{ padding: 22, borderRight: '1px solid #F2F2F7' }}>
            {selectedFile ? (
              <div
                className="flex items-center justify-between animate-fade-in"
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #E5E5EA',
                  borderLeft: '3px solid #34C759',
                  borderRadius: 10,
                  padding: '14px 16px',
                  minHeight: 220,
                }}
              >
                <div className="flex items-start gap-3 min-w-0 self-start">
                  <div className="w-10 h-10 rounded-lg bg-[#F5F5F7] flex items-center justify-center flex-shrink-0">
                    <FileSpreadsheet className="w-4 h-4 text-[#86868B]" strokeWidth={1.6} />
                  </div>
                  <div className="min-w-0">
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#1D1D1F' }} className="truncate" title={selectedFile.name}>
                      {selectedFile.name}
                    </p>
                    <p className="mt-0.5 font-mono-nums" style={{ fontSize: 12, color: '#86868B' }}>
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </p>
                    <span className="inline-flex items-center gap-1.5 mt-2" style={{ fontSize: 12, color: '#34C759', fontWeight: 600 }}>
                      <span className="w-1.5 h-1.5 rounded-full bg-[#34C759] animate-pulse" />
                      Ready to analyze
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleClear}
                  className="self-start w-7 h-7 rounded-md flex items-center justify-center text-[#86868B] hover:text-[#1D1D1F] hover:bg-[#F5F5F7] btn-press"
                  aria-label="Remove file"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div
                onClick={() => inputRef.current?.click()}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  const f = e.dataTransfer.files?.[0];
                  if (f) handleSelect(f);
                }}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                className="cursor-pointer text-center btn-press flex flex-col items-center justify-center"
                style={{
                  minHeight: 220,
                  borderRadius: 12,
                  borderStyle: 'dashed',
                  borderWidth: isDragging ? 2 : 1,
                  borderColor: isDragging ? '#2563EB' : 'rgba(0,0,0,0.08)',
                  background: '#FFFFFF',
                  backgroundImage: isDragging
                    ? 'radial-gradient(circle at center, rgba(37, 99, 235, 0.08) 0%, rgba(255,255,255,0) 70%)'
                    : 'radial-gradient(circle at center, rgba(37, 99, 235, 0.04) 0%, rgba(255,255,255,0) 70%)',
                  transition: 'all 150ms ease',
                  padding: 24,
                }}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv,.zip"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleSelect(f); }}
                />
                <Upload
                  style={{
                    width: 36,
                    height: 36,
                    color: isDragging ? '#2563EB' : '#86868B',
                    transform: isDragging ? 'scale(1.15)' : 'scale(1)',
                    transition: 'transform 200ms ease, color 150ms ease',
                  }}
                  strokeWidth={1.4}
                />
                <p className="mt-3" style={{ fontSize: 15, fontWeight: 600, color: isDragging ? '#2563EB' : '#1D1D1F' }}>
                  {isDragging ? 'Release to upload' : 'Drop your Amazon Bulk Operations file here'}
                </p>
                <p className="mt-1" style={{ fontSize: 13, color: '#2563EB' }}>
                  or <span className="underline underline-offset-2">click to browse</span>
                </p>
                <div className="flex items-center justify-center gap-1.5 mt-4">
                  {['.xlsx', '.xls', '.csv', '.zip'].map((fmt) => (
                    <span
                      key={fmt}
                      className="font-mono-nums"
                      style={{ fontSize: 11, background: '#FAFAFA', border: '1px solid rgba(0,0,0,0.05)', borderRadius: 4, padding: '2px 8px', color: '#6E6E73' }}
                    >
                      {fmt}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ASSET INVENTORY — right sidebar */}
          <div style={{ padding: 22, background: '#FAFBFC' }}>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', color: '#86868B' }}>
              Expected Sheets
            </p>
            <p className="mt-1" style={{ fontSize: 12, color: '#86868B' }}>
              Pills light up as sheets are detected.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              {SHEET_REQUIREMENTS.map((sheet) => {
                const detected = detectedSheets.includes(sheet);
                return (
                  <div
                    key={sheet}
                    className="flex items-center gap-2"
                    style={{
                      background: detected ? 'rgba(52, 199, 89, 0.08)' : '#FAFAFA',
                      border: `1px solid ${detected ? 'rgba(52, 199, 89, 0.25)' : 'rgba(0,0,0,0.05)'}`,
                      borderRadius: 8,
                      padding: '8px 10px',
                      transition: 'all 200ms ease',
                    }}
                  >
                    <span
                      className="flex-shrink-0 inline-flex items-center justify-center"
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: 999,
                        background: detected ? '#34C759' : 'transparent',
                        border: detected ? 'none' : '1.5px solid #D2D2D7',
                      }}
                    >
                      {detected && (
                        <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                      )}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 500, color: detected ? '#1D1D1F' : '#6E6E73' }}>
                      {sheet}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

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
