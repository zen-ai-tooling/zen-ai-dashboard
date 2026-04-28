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

      {/* Horizontal stepper */}
      <HorizontalStepper
        steps={[
          { label: 'File analyzed', status: 'complete' },
          { label: 'Make decisions', status: (generateDone || amazonFile) ? 'complete' : 'active' },
          { label: 'Generate Amazon file', status: (generateDone || amazonFile) ? 'complete' : 'pending' },
        ]}
      />

      {/* Amazon file ready banner */}
      {amazonFile && (
        <div className="rounded-lg border border-success/30 bg-success/5 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-success" />
            <div>
              <div className="text-[13px] font-medium text-foreground font-display">Amazon Bulk File Ready</div>
              <div className="text-[11px] text-muted-foreground">{amazonFile.fileName}</div>
            </div>
          </div>
          <Button size="sm" onClick={onDownloadAmazon} className="text-[12px] btn-press">
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Download
          </Button>
        </div>
      )}

      {/* Decision table */}
      <div className="rounded-lg border border-border bg-card card-hover">
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
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-[11px] font-medium uppercase tracking-[0.04em] text-muted-foreground">Campaign</TableHead>
                {result.trackType === 'SBSD' && (
                  <TableHead className="text-[11px] font-medium uppercase tracking-[0.04em] text-muted-foreground">Ad Group</TableHead>
                )}
                <TableHead className="text-[11px] font-medium uppercase tracking-[0.04em] text-muted-foreground">
                  {result.trackType === 'SP' ? 'Search Term' : 'Entity'}
                </TableHead>
                <TableHead className="text-[11px] font-medium uppercase tracking-[0.04em] text-muted-foreground">Match</TableHead>
                <TableHead className="text-[11px] font-medium uppercase tracking-[0.04em] text-muted-foreground text-right">Spend</TableHead>
                {result.trackType !== 'ACOS100' && (
                  <TableHead className="text-[11px] font-medium uppercase tracking-[0.04em] text-muted-foreground text-right">Orders</TableHead>
                )}
                <TableHead className="text-[11px] font-medium uppercase tracking-[0.04em] text-muted-foreground text-right">ACoS</TableHead>
                <TableHead className="text-[11px] font-medium uppercase tracking-[0.04em] text-muted-foreground">Suggestion</TableHead>
                <TableHead className="text-[11px] font-medium uppercase tracking-[0.04em] text-muted-foreground w-[200px]">Decision</TableHead>
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
        <div className="flex items-center justify-between p-4 border-t border-border bg-muted/30">
          <span className="text-[12px] text-muted-foreground font-mono-nums">
            {decisionsMade} of {result.bleeders.length} decisions made
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onDownload} className="text-[11px] h-7 btn-press">
              <Download className="w-3 h-3 mr-1" />
              Download XLSX
            </Button>
            <Button
              onClick={handleGenerateInline}
              disabled={decisionsMade === 0 || isGenerating}
              size="sm"
              className="text-[13px] font-medium h-8 font-display btn-press min-w-[180px]"
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

      {/* Fallback dropzone */}
      <div className="rounded-lg border border-dashed border-border/60 p-4 bg-muted/10">
        <p className="text-[12px] text-muted-foreground mb-2">Or upload a decision file manually</p>
        <DecisionFileDropzone
          onFileUpload={(file) => onUploadDecision(result.trackType, file)}
          disabled={!!amazonFile}
          label={decisionFile ? 'Reupload Decision File' : 'Upload Decision File'}
          variant="compact"
        />
      </div>
    </div>
  );
};

function StatCard({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="rounded-lg bg-secondary p-4">
      <div className={`text-[22px] font-medium font-mono-nums ${danger ? 'text-destructive' : 'text-foreground'}`}>
        {value}
      </div>
      <div className="text-[11px] text-[hsl(var(--text-tertiary))] mt-0.5">{label}</div>
    </div>
  );
}

function StepDot({ status }: { status: 'complete' | 'active' | 'pending' }) {
  if (status === 'complete') {
    return <div className="w-4 h-4 rounded-full bg-success flex items-center justify-center">
      <CheckCircle2 className="w-3 h-3 text-white" />
    </div>;
  }
  if (status === 'active') {
    return <div className="w-4 h-4 rounded-full bg-primary border-2 border-primary" />;
  }
  return <div className="w-4 h-4 rounded-full border-2 border-border bg-background" />;
}
