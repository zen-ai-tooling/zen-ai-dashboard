import React, { useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Download, CheckCircle2, Loader2, XCircle, ChevronDown, AlertTriangle, DollarSign, Percent } from "lucide-react";
import { toast } from "sonner";
import type { Bleeder2TrackResult, Bleeder2TrackType } from "@/lib/bleeder2TrackAnalyzer";
import { DecisionFileDropzone } from "./DecisionFileDropzone";
import { suggestDecision, getConfidenceStyle } from '@/lib/ui/suggestionEngine';
import type { Suggestion } from '@/lib/ui/suggestionEngine';
import { DecisionSelect, decisionRowClass } from "@/components/shared/DecisionSelect";
import { WorkflowSteps } from "@/components/shared/WorkflowSteps";
import { CompletionBanner } from "@/components/shared/CompletionBanner";

interface Bleeder2TrackResultsProps {
  result: Bleeder2TrackResult;
  onDownload: () => void;
  onUploadDecision: (trackType: Bleeder2TrackType, file: File) => void;
  onAdjustThresholds: () => void;
  onUploadNewFile: (trackType: Bleeder2TrackType) => void;
  decisionFile?: File | null;
  amazonFile?: { workbook: any; fileName: string } | null;
  onDownloadAmazon?: () => void;
}

const TRACK_LABELS: Record<Bleeder2TrackType, string> = {
  'SBSD': 'SB/SD Bad Targets',
  'SP': 'SP Bad Search Terms',
  'SP_KEYWORDS': 'SP Bad Targets',
  'ACOS100': 'Campaigns >100% ACoS'
};

const TRACK_DECISIONS: Record<Bleeder2TrackType, string[]> = {
  'SBSD': ['Pause', 'Negative', 'Cut Bid', 'Keep'],
  'SP': ['Pause', 'Negative', 'Cut Bid', 'Keep'],
  'SP_KEYWORDS': ['Pause', 'Negative', 'Cut Bid', 'Keep'],
  'ACOS100': ['Pause', 'Negative', 'Cut Bid', 'Keep'],
};

export const Bleeder2TrackResults: React.FC<Bleeder2TrackResultsProps> = ({
  result, onDownload, onUploadDecision, onAdjustThresholds, onUploadNewFile,
  decisionFile, amazonFile, onDownloadAmazon
}) => {
  const [decisions, setDecisions] = useState<Record<number, string>>({});
  const [cutBidPcts, setCutBidPcts] = useState<Record<number, number>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateDone, setGenerateDone] = useState(false);

  const hasBleeders = result.bleeders.length > 0;

  const suggestions = useMemo(() => result.bleeders.map(bleeder =>
    suggestDecision({
      acos: bleeder.acos,
      spend: bleeder.spend,
      orders: bleeder.orders,
      clicks: bleeder.clicks,
      matchType: bleeder.matchType,
      entity: bleeder.entity,
      trackType: result.trackType,
    })
  ), [result.bleeders, result.trackType]);

  const getDecisionOptions = () => {
    if (result.trackType === 'ACOS100') return ['Pause', 'Cut Bid', 'Keep'];
    if (result.trackType === 'SP') return ['Negative', 'Pause', 'Keep'];
    return ['Negative', 'Pause', 'Cut Bid', 'Keep'];
  };

  const decisionsMade = useMemo(() => {
    return Object.values(decisions).filter(d => d && d !== '').length;
  }, [decisions]);

  const avgAcos = useMemo(() => {
    if (!hasBleeders) return 0;
    return result.bleeders.reduce((s, b) => s + b.acos, 0) / result.bleeders.length;
  }, [result.bleeders, hasBleeders]);

  const topAcos = useMemo(() => {
    return [...result.bleeders].sort((a, b) => b.acos - a.acos).slice(0, 3);
  }, [result.bleeders]);

  const showAdGroup = result.trackType === 'SBSD' || result.trackType === 'SP_KEYWORDS';
  const RANK_COLORS = ['hsl(45 90% 50%)', 'hsl(220 8% 60%)', 'hsl(28 60% 45%)'];

  const handleSetAllPause = () => {
    const all: Record<number, string> = {};
    result.bleeders.forEach((_, idx) => { all[idx] = 'Pause'; });
    setDecisions(all);
  };

  const handleSetAllNegative = () => {
    const all: Record<number, string> = {};
    result.bleeders.forEach((_, idx) => { all[idx] = 'Negative'; });
    setDecisions(all);
  };

  const handleClearAll = () => {
    setDecisions({});
    setCutBidPcts({});
  };

  const handleGenerateInline = async () => {
    setIsGenerating(true);
    setGenerateDone(false);
    try {
      const ExcelJS = (await import('exceljs')).default;
      const wb = new ExcelJS.Workbook();

      type BleederRow = (typeof result.bleeders)[number];

      const getSheetName = (bleeder: BleederRow): string => {
        if (result.trackType === 'ACOS100') return 'Campaign • High ACOS';
        if (result.trackType === 'SP') return 'Sponsored Products • Search Term';
        if (result.trackType === 'SP_KEYWORDS') return 'Sponsored Products • Targeting';
        if (result.trackType === 'SBSD') {
          return (bleeder as any).source === 'SD'
            ? 'Sponsored Display • Targeting'
            : 'Sponsored Brands • Keywords';
        }
        return 'Sponsored Products • Targeting';
      };

      const sheetRows: Record<string, Array<{ bleeder: BleederRow; decision: string; cutPct: number }>> = {};
      result.bleeders.forEach((bleeder, idx) => {
        const decision = decisions[idx];
        if (!decision) return;
        const sheetName = getSheetName(bleeder);
        if (!sheetRows[sheetName]) sheetRows[sheetName] = [];
        sheetRows[sheetName].push({
          bleeder,
          decision,
          cutPct: cutBidPcts[idx] ?? 25,
        });
      });

      for (const [sheetName, rows] of Object.entries(sheetRows)) {
        const ws = wb.addWorksheet(sheetName);
        ws.addRow([
          'Campaign Name', 'Ad Group Name', 'Keyword Text',
          'Product Targeting Expression', 'Match Type', 'Bid',
          'Decision', 'Source',
          'Campaign Id', 'Ad Group Id', 'Keyword Id',
          'Product Targeting Id', 'Targeting Id',
        ]);
        rows.forEach(({ bleeder, decision, cutPct }) => {
          const isProductTargeting =
            bleeder.entity?.toLowerCase().includes('asin=') ||
            bleeder.entity?.toLowerCase().includes('category=');
          ws.addRow([
            bleeder.campaignName ?? '',
            bleeder.adGroupName ?? '',
            isProductTargeting ? '' : (bleeder.entity ?? ''),
            isProductTargeting ? (bleeder.entity ?? '') : '',
            bleeder.matchType ?? '',
            decision === 'Cut Bid' ? (bleeder.spend ?? 0) : 0,
            decision,
            (bleeder as any).source ?? '',
            bleeder.campaignId ?? '',
            bleeder.adGroupId ?? '',
            bleeder.keywordId ?? '',
            bleeder.productTargetingId ?? '',
            bleeder.targetingId ?? '',
          ]);
        });
      }

      const buffer = await wb.xlsx.writeBuffer();
      const file = new File(
        [buffer],
        'inline_decisions.xlsx',
        { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
      );
      onUploadDecision(result.trackType, file);
      setGenerateDone(true);
    } catch (err) {
      console.error('[Generate] Failed:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  if (!hasBleeders) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="flex items-center gap-2 text-success mb-2">
          <CheckCircle2 className="h-5 w-5" />
          <span className="text-[13px] font-medium font-display">No action needed — 0 bleeders found</span>
        </div>
        <p className="text-[13px] text-muted-foreground mb-4">
          {TRACK_LABELS[result.trackType]} returned no actionable rows under current thresholds.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onAdjustThresholds} className="text-[12px] btn-press">
            Adjust Thresholds
          </Button>
          <Button variant="outline" size="sm" onClick={() => onUploadNewFile(result.trackType)} className="text-[12px] btn-press">
            Upload New File
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Stats row — standardized 3-up like Bleeders 1.0 */}
      <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
        <div className="grid grid-cols-3 divide-x divide-border">
          <StatCellV2
            icon={<AlertTriangle className="w-3.5 h-3.5" strokeWidth={1.8} />}
            value={result.bleeders.length.toLocaleString()}
            label="Bleeders found"
          />
          <StatCellV2
            icon={<DollarSign className="w-3.5 h-3.5" strokeWidth={1.8} />}
            value={`$${result.totalSpend.toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
            label="At-risk spend"
          />
          <StatCellV2
            icon={<Percent className="w-3.5 h-3.5" strokeWidth={1.8} />}
            value={`${avgAcos.toFixed(1)}%`}
            label="Average ACoS"
            danger={avgAcos > 100}
          />
        </div>
      </div>

      {/* Workflow stepper (shared) */}
      <WorkflowSteps
        steps={[
          { label: 'File analyzed', status: 'complete' },
          { label: 'Make decisions', status: (generateDone || amazonFile) ? 'complete' : 'active' },
          { label: 'Generate Amazon file', status: (generateDone || amazonFile) ? 'complete' : 'pending' },
        ]}
      />

      {/* Workflow complete banner */}
      {amazonFile && (
        <CompletionBanner
          fileName={amazonFile.fileName}
          onDownload={onDownloadAmazon}
        />
      )}

      {/* Insights — Highest ACoS */}
      {topAcos.length > 0 && (
        <details className="group rounded-xl border border-border bg-card shadow-card overflow-hidden">
          <summary className="flex items-center justify-between px-5 py-3 cursor-pointer list-none select-none hover:bg-secondary/40 transition-colors">
            <div className="flex items-center gap-2">
              <ChevronDown className="w-3.5 h-3.5 text-[hsl(var(--text-tertiary))] transition-transform duration-200 group-open:rotate-180" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[hsl(var(--text-secondary))]">
                Insights · Highest ACoS
              </span>
            </div>
            <span className="text-[11px] text-[hsl(var(--text-tertiary))]">
              Top {topAcos.length} ranked by ACoS
            </span>
          </summary>
          <div className="px-5 py-3 border-t border-border bg-secondary/30 flex items-center gap-5 flex-wrap">
            {topAcos.map((b, i) => (
              <div key={i} className="flex items-center gap-2">
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold text-white"
                  style={{ backgroundColor: RANK_COLORS[i] ?? 'hsl(var(--text-tertiary))' }}
                >
                  {i + 1}
                </span>
                <span className="text-[12.5px] text-foreground max-w-[200px] truncate" title={b.entity}>
                  {b.entity || b.campaignName}
                </span>
                <span className="text-[12px] font-mono-nums text-destructive font-medium">
                  {b.acos.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Decision table */}
      <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
        {/* Card header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h3 className="text-[14px] font-medium text-foreground font-display">
              Bleeders — {TRACK_LABELS[result.trackType]}
            </h3>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              Select a decision per row then generate
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onDownload} className="text-[11px] h-7 btn-press">
              <Download className="w-3 h-3 mr-1" />
              Download XLSX
            </Button>
          </div>
        </div>

        {/* Bulk action buttons */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/60 bg-muted/20">
          <span className="text-[11px] text-muted-foreground mr-1">Bulk:</span>
          <Button variant="outline" size="sm" onClick={() => {
            const allSuggested: Record<number, string> = {};
            suggestions.forEach((s, idx) => { allSuggested[idx] = s.decision; });
            setDecisions(allSuggested);
          }} className="text-[11px] h-6 px-2.5 btn-press">
            Apply all suggestions
          </Button>
          <Button variant="outline" size="sm" onClick={handleSetAllPause} className="text-[11px] h-6 px-2.5 btn-press">
            Select all → Pause
          </Button>
          <Button variant="ghost" size="sm" onClick={handleClearAll} className="text-[11px] h-6 px-2.5 btn-press text-muted-foreground">
            <XCircle className="w-3 h-3 mr-1" />
            Clear all
          </Button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b border-border">
                <TableHead style={{ letterSpacing: '0.08em' }}>Campaign</TableHead>
                {showAdGroup && (
                  <TableHead style={{ letterSpacing: '0.08em' }}>Ad Group</TableHead>
                )}
                <TableHead style={{ letterSpacing: '0.08em' }}>
                  {result.trackType === 'SP' ? 'Search Term' : 'Entity'}
                </TableHead>
                <TableHead style={{ letterSpacing: '0.08em' }}>Match</TableHead>
                <TableHead className="text-right" style={{ letterSpacing: '0.08em' }}>Spend</TableHead>
                {result.trackType !== 'ACOS100' && (
                  <TableHead className="text-right" style={{ letterSpacing: '0.08em' }}>Orders</TableHead>
                )}
                <TableHead className="text-right" style={{ letterSpacing: '0.08em' }}>ACoS</TableHead>
                <TableHead style={{ letterSpacing: '0.08em' }}>Suggestion</TableHead>
                <TableHead className="w-[200px]" style={{ letterSpacing: '0.08em' }}>Decision</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.bleeders.map((bleeder, idx) => {
                const suggestion = suggestions[idx];
                const confStyle = getConfidenceStyle(suggestion.confidence);
                const decision = decisions[idx];
                const indicatorClass = decisionRowClass(decision);
                return (
                  <TableRow key={idx} className={`hover:bg-secondary/50 transition-colors ${indicatorClass}`}>
                    <TableCell className="text-[13px] max-w-[180px] truncate" title={bleeder.campaignName}>
                      {bleeder.campaignName}
                    </TableCell>
                    {result.trackType === 'SBSD' && (
                      <TableCell className="text-[13px] max-w-[120px] truncate" title={bleeder.adGroupName}>
                        {bleeder.adGroupName || '—'}
                      </TableCell>
                    )}
                    <TableCell className="text-[13px] max-w-[180px] truncate" title={bleeder.entity}>
                      {bleeder.entity}
                    </TableCell>
                    <TableCell className="text-[13px] text-muted-foreground">
                      {bleeder.matchType || '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-[13px] font-mono-nums text-foreground">
                        ${bleeder.spend.toFixed(2)}
                      </span>
                    </TableCell>
                    {result.trackType !== 'ACOS100' && (
                      <TableCell className="text-right">
                        <span className="text-[13px] font-mono-nums">
                          {bleeder.orders}
                        </span>
                      </TableCell>
                    )}
                    <TableCell className="text-right">
                      <span className="inline-block text-[11px] font-mono-nums px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive font-medium">
                        {bleeder.acos.toFixed(1)}%
                      </span>
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => setDecisions(prev => ({ ...prev, [idx]: suggestion.decision }))}
                        title={suggestion.reason}
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium cursor-pointer transition-all hover:opacity-80"
                        style={{
                          background: confStyle.background,
                          color: confStyle.color,
                          border: `1px solid ${confStyle.border}`,
                        }}
                      >
                        {suggestion.shortLabel}
                      </button>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <DecisionSelect
                          value={decision}
                          onChange={(val) => setDecisions(prev => ({ ...prev, [idx]: val }))}
                          options={getDecisionOptions()}
                          width="128px"
                        />
                        {decisions[idx] === 'Cut Bid' && (
                          <div className="flex items-center gap-0.5">
                            <Input
                              type="number"
                              min={1}
                              max={99}
                              className="h-7 w-14 text-[12px] font-mono-nums"
                              value={cutBidPcts[idx] ?? 25}
                              onChange={(e) => setCutBidPcts(prev => ({ ...prev, [idx]: parseInt(e.target.value) || 25 }))}
                            />
                            <span className="text-[11px] text-muted-foreground">%</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Table footer */}
        <div className="p-4 border-t border-border bg-muted/30 space-y-2">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span className="text-[14px] font-semibold text-foreground font-mono-nums">
                  {decisionsMade}<span className="text-[hsl(var(--text-tertiary))]">/{result.bleeders.length}</span>
                </span>
                <span className="text-[12px] text-[hsl(var(--text-secondary))]">decisions made</span>
              </div>
              <div className="mt-2 h-1 w-full max-w-[280px] rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{ width: `${(decisionsMade / Math.max(result.bleeders.length, 1)) * 100}%` }}
                />
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button variant="outline" size="sm" onClick={onDownload} className="text-[11px] h-9 btn-press">
                <Download className="w-3 h-3 mr-1" />
                Download XLSX
              </Button>
              <Button
                onClick={async () => {
                  await handleGenerateInline();
                  toast.success('Amazon file ready', {
                    description: `${decisionsMade} decisions exported`,
                    duration: 3000,
                  });
                  setTimeout(() => setGenerateDone(false), 3000);
                }}
                disabled={decisionsMade === 0 || isGenerating}
                className="text-[14px] font-semibold h-11 rounded-[10px] btn-press"
                style={{ maxWidth: 240, minWidth: 200 }}
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : generateDone ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-1.5" />
                    File ready
                  </>
                ) : (
                  'Generate Amazon file →'
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced — collapsed manual upload */}
      <details className="group">
        <summary className="list-none select-none cursor-pointer inline-flex items-center gap-1.5 text-[12px] text-[hsl(var(--text-secondary))] hover:text-foreground transition-colors">
          <ChevronDown className="w-3 h-3 transition-transform duration-200 group-open:rotate-180" />
          Or upload a decision file manually
        </summary>
        <div className="mt-3 max-w-[480px]">
          <DecisionFileDropzone
            onFileUpload={(file) => onUploadDecision(result.trackType, file)}
            disabled={!!amazonFile}
            label={decisionFile ? 'Reupload Decision File' : 'Upload Decision File'}
            variant="compact"
          />
        </div>
      </details>
    </div>
  );
};

function StatCellV2({ icon, value, label, danger }: { icon: React.ReactNode; value: string; label: string; danger?: boolean }) {
  return (
    <div className="px-5 py-4">
      <div className="flex items-center gap-1.5 text-[hsl(var(--text-tertiary))] mb-1.5">
        {icon}
        <span className="text-[11px] font-semibold uppercase" style={{ letterSpacing: '0.08em' }}>{label}</span>
      </div>
      <div className={`text-[28px] font-semibold leading-none font-mono-nums tracking-tight ${danger ? 'text-destructive' : 'text-foreground'}`}>
        {value}
      </div>
    </div>
  );
}

interface StepperStep { label: string; status: 'complete' | 'active' | 'pending'; }

function HorizontalStepper({ steps }: { steps: StepperStep[] }) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-card px-6 py-4">
      <div className="flex items-center">
        {steps.map((step, i) => {
          const isLast = i === steps.length - 1;
          const dotEl = step.status === 'complete' ? (
            <div className="w-5 h-5 rounded-full bg-success flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-3 h-3 text-white" />
            </div>
          ) : step.status === 'active' ? (
            <div className="w-5 h-5 rounded-full bg-primary flex-shrink-0 step-pulse" />
          ) : (
            <div className="w-5 h-5 rounded-full border-2 border-border bg-card flex-shrink-0" />
          );
          return (
            <React.Fragment key={i}>
              <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                {dotEl}
                <span className={`text-[11px] font-medium whitespace-nowrap ${
                  step.status === 'complete' ? 'text-success'
                    : step.status === 'active' ? 'text-primary'
                    : 'text-[hsl(var(--text-tertiary))]'
                }`}>
                  {step.label}
                </span>
              </div>
              {!isLast && (
                <div className={`flex-1 h-px mx-3 mb-5 ${
                  step.status === 'complete' ? 'bg-success' : 'bg-border'
                }`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
