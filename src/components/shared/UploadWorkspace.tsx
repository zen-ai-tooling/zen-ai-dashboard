/**
 * UploadWorkspace — Data Onboarding Control Room layout
 *
 * Shared shell for all upload screens: Pipeline Header (Active Workflow + connected
 * step bubbles) + Workspace Card (white, 12px radius, hairline border, soft shadow)
 * containing dropzone(s) on the left and an Asset Inventory sidebar on the right
 * where expected-sheet pills "light up" green as sheets are detected.
 *
 * Pure presentation — no business logic.
 */

import * as React from 'react';
import { Upload, FileSpreadsheet, X, Check } from 'lucide-react';

export interface PipelineStep {
  id: number;
  label: string;
}

export interface SheetItem {
  name: string;
  detected?: boolean;
}

interface PipelineHeaderProps {
  workflowName: string;
  workflowVariant?: string;
  description: string;
  steps: PipelineStep[];
  activeStep: number;
}

export const PipelineHeader: React.FC<PipelineHeaderProps> = ({
  workflowName,
  workflowVariant,
  description,
  steps,
  activeStep,
}) => {
  return (
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
            {workflowName}
            {workflowVariant && (
              <span style={{ color: '#6E6E73', fontWeight: 500 }}> ({workflowVariant})</span>
            )}
          </h2>
          <p className="mt-1" style={{ fontSize: 12, color: '#6E6E73', maxWidth: 600 }}>
            {description}
          </p>
        </div>

        <div className="flex items-center" style={{ minHeight: 40 }}>
          {steps.map((step, i) => {
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
                {i < steps.length - 1 && (
                  <div style={{ width: 32, height: 1.5, background: '#D2D2D7', marginBottom: 18 }} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

interface SmartDropzoneProps {
  inputId: string;
  primaryText: string;
  formats?: string[];
  minHeight?: number;
  selectedFile?: { name: string; size: number } | null;
  onFileSelect: (file: File) => void;
  onClear?: () => void;
  accept?: string;
}

export const SmartDropzone: React.FC<SmartDropzoneProps> = ({
  inputId,
  primaryText,
  formats = ['.xlsx', '.xls', '.csv', '.zip'],
  minHeight = 220,
  selectedFile,
  onFileSelect,
  onClear,
  accept = '.xlsx,.xls,.csv,.zip',
}) => {
  const [isDragging, setIsDragging] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  if (selectedFile) {
    return (
      <div
        className="flex items-start justify-between animate-fade-in"
        style={{
          background: '#FFFFFF',
          border: '1px solid #E5E5EA',
          borderLeft: '3px solid #34C759',
          borderRadius: 10,
          padding: '14px 16px',
          minHeight,
        }}
      >
        <div className="flex items-start gap-3 min-w-0">
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
        {onClear && (
          <button
            onClick={onClear}
            className="w-7 h-7 rounded-md flex items-center justify-center text-[#86868B] hover:text-[#1D1D1F] hover:bg-[#F5F5F7] btn-press"
            aria-label="Remove file"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        const f = e.dataTransfer.files?.[0];
        if (f) onFileSelect(f);
      }}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      className="cursor-pointer text-center btn-press flex flex-col items-center justify-center"
      style={{
        minHeight,
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
        id={inputId}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFileSelect(f); }}
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
        {isDragging ? 'Release to upload' : primaryText}
      </p>
      <p className="mt-1" style={{ fontSize: 13, color: '#2563EB' }}>
        or <span className="underline underline-offset-2">click to browse</span>
      </p>
      <div className="flex items-center justify-center gap-1.5 mt-4">
        {formats.map((fmt) => (
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
  );
};

interface AssetInventoryProps {
  title?: string;
  subtitle?: string;
  sheets: SheetItem[];
}

export const AssetInventory: React.FC<AssetInventoryProps> = ({
  title = 'Expected Sheets',
  subtitle = 'Pills light up as sheets are detected.',
  sheets,
}) => {
  return (
    <div style={{ padding: 22, background: '#FAFBFC', height: '100%' }}>
      <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', color: '#86868B' }}>
        {title}
      </p>
      {subtitle && (
        <p className="mt-1" style={{ fontSize: 12, color: '#86868B' }}>
          {subtitle}
        </p>
      )}
      <div className="mt-4 flex flex-col gap-2">
        {sheets.map((sheet) => {
          const detected = !!sheet.detected;
          return (
            <div
              key={sheet.name}
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
                {detected && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
              </span>
              <span style={{ fontSize: 12, fontWeight: 500, color: detected ? '#1D1D1F' : '#6E6E73' }}>
                {sheet.name}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

interface WorkspaceCardProps {
  sectionLabel: string;
  children: React.ReactNode;
  sidebar?: React.ReactNode;
}

export const WorkspaceCard: React.FC<WorkspaceCardProps> = ({ sectionLabel, children, sidebar }) => {
  return (
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
          {sectionLabel}
        </p>
      </div>

      {sidebar ? (
        <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 1fr) 280px' }}>
          <div style={{ padding: 22, borderRight: '1px solid #F2F2F7' }}>{children}</div>
          {sidebar}
        </div>
      ) : (
        <div style={{ padding: 22 }}>{children}</div>
      )}
    </div>
  );
};
