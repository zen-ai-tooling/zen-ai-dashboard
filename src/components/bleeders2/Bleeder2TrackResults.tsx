import React, { useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Download, CheckCircle2, Loader2 } from "lucide-react";
import type { Bleeder2TrackResult, Bleeder2TrackType } from "@/lib/bleeder2TrackAnalyzer";
import { DecisionFileDropzone } from "./DecisionFileDropzone";
import ExcelJS from 'exceljs';

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
  'SBSD': ['Pause', 'Reduce Bid', 'Keep'],
  'SP': ['Negative Exact', 'Give it another week', 'Keep'],
  'SP_KEYWORDS': ['Pause', 'Reduce Bid', 'Keep'],
  'ACOS100': ['Turn Off', 'Cut Bid', 'Keep'],
};

const SHEET_MAP: Record<Bleeder2TrackType, string> = {
  'SP': 'Sponsored Products • Search Term',
  'SP_KEYWORDS': 'Sponsored Products • Targeting',
  'SBSD': 'Sponsored Brands • Keywords',
  'ACOS100': 'Campaign • High ACOS',
};

export const Bleeder2TrackResults: React.FC<Bleeder2TrackResultsProps> = ({
  result, onDownload, onUploadDecision, onAdjustThresholds, onUploadNewFile,
  decisionFile, amazonFile, onDownloadAmazon
}) => {
  const [decisions, setDecisions] = useState<Record<number, string>>({});
  const [cutBidValues, setCutBidValues] = useState<Record<number, number>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateDone, setGenerateDone] = useState(false);

  const hasBleeders = result.bleeders.length > 0;

  const decisionsMade = useMemo(() => {
    return Object.values(decisions).filter(d => d && d !== '').length;
  }, [decisions]);

  const avgAcos = useMemo(() => {
    if (!hasBleeders) return 0;
    return result.bleeders.reduce((s, b) => s + b.acos, 0) / result.bleeders.length;
  }, [result.bleeders, hasBleeders]);

  const handleSetAllPause = () => {
    const allPause: Record<number, string> = {};
    result.bleeders.forEach((_, idx) => { allPause[idx] = 'Pause'; });
    setDecisions(allPause);
  };

  const handleGenerateAmazonFile = async () => {
    setIsGenerating(true);
    setGenerateDone(false);
    try {
      const wb = new ExcelJS.Workbook();
      const sheetName = SHEET_MAP[result.trackType] || 'Decisions';
      const ws = wb.addWorksheet(sheetName);

      const headers = [
        'Campaign Name', 'Ad Group Name',
        result.trackType === 'SP' ? 'Customer Search Term' : 'Keyword Text',
        'Match Type', 'Bid', 'Decision',
        'Campaign Id', 'Ad Group Id', 'Keyword Id',
        'Product Targeting Id', 'Targeting Id'
      ];
      ws.addRow(headers);

      result.bleeders.forEach((b, idx) => {
        const decision = decisions[idx];
        if (!decision || decision === '' || decision === 'Keep') return;
        let finalDecision = decision;
        if (decision === 'Cut Bid' || decision === 'Reduce Bid') {
          const pct = cutBidValues[idx] || 25;
          finalDecision = `Cut Bid ${pct}%`;
        }
        ws.addRow([
          b.campaignName, b.adGroupName || '', b.entity, b.matchType || '', 0, finalDecision,
          b.campaignId || '', b.adGroupId || '', b.keywordId || '',
          b.productTargetingId || '', b.targetingId || '',
        ]);
      });

      const buffer = await wb.xlsx.writeBuffer();
      const file = new File([buffer], 'decisions.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
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
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Bleeders Found" value={result.bleeders.length.toString()} />
        <StatCard label="Total At-Risk Spend" value={`$${result.totalSpend.toFixed(2)}`} danger />
        <StatCard label="Average ACoS" value={`${avgAcos.toFixed(1)}%`} danger />
      </div>

      {/* Step indicator */}
      <div className="flex items-start gap-3 py-3 px-1">
        <div className="flex flex-col items-center gap-0">
          <StepDot status="complete" />
          <div className="w-px h-5 bg-success" />
          <StepDot status="active" />
          <div className="w-px h-5 bg-border" />
          <StepDot status={generateDone || amazonFile ? 'complete' : 'pending'} />
        </div>
        <div className="flex flex-col gap-3 pt-0.5">
          <span className="text-[12px] text-success font-medium">File analyzed</span>
          <span className="text-[12px] text-primary font-medium">Make decisions</span>
          <span className={`text-[12px] font-medium ${generateDone || amazonFile ? 'text-success' : 'text-muted-foreground'}`}>
            Generate Amazon file
          </span>
        </div>
      </div>

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
            <Button variant="outline" size="sm" onClick={handleSetAllPause} className="text-[11px] h-7 btn-press">
              Select all → Pause
            </Button>
            <Button variant="outline" size="sm" onClick={onDownload} className="text-[11px] h-7 btn-press">
              <Download className="w-3 h-3 mr-1" />
              Download XLSX
            </Button>
          </div>
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
                <TableHead className="text-[11px] font-medium uppercase tracking-[0.04em] text-muted-foreground">Match Type</TableHead>
                <TableHead className="text-[11px] font-medium uppercase tracking-[0.04em] text-muted-foreground text-right">Spend</TableHead>
                <TableHead className="text-[11px] font-medium uppercase tracking-[0.04em] text-muted-foreground text-right">ACoS</TableHead>
                <TableHead className="text-[11px] font-medium uppercase tracking-[0.04em] text-muted-foreground w-[180px]">Decision</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.bleeders.map((bleeder, idx) => (
                <TableRow key={idx} className="hover:bg-secondary/50 transition-colors">
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
                    <span className="text-[13px] font-mono-nums text-destructive">
                      ${bleeder.spend.toFixed(2)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="inline-block text-[11px] font-mono-nums px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive font-medium">
                      {bleeder.acos.toFixed(1)}%
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Select
                        value={decisions[idx] || ''}
                        onValueChange={(val) => setDecisions(prev => ({ ...prev, [idx]: val }))}
                      >
                        <SelectTrigger className="h-7 text-[12px] w-[130px]">
                          <SelectValue placeholder="— select —" />
                        </SelectTrigger>
                        <SelectContent>
                          {TRACK_DECISIONS[result.trackType].map(opt => (
                            <SelectItem key={opt} value={opt} className="text-[12px]">{opt}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {(decisions[idx] === 'Cut Bid' || decisions[idx] === 'Reduce Bid') && (
                        <div className="flex items-center gap-0.5">
                          <Input
                            type="number"
                            className="h-7 w-14 text-[12px] font-mono-nums"
                            value={cutBidValues[idx] ?? 25}
                            onChange={(e) => setCutBidValues(prev => ({ ...prev, [idx]: parseInt(e.target.value) || 25 }))}
                          />
                          <span className="text-[11px] text-muted-foreground">%</span>
                        </div>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Table footer */}
        <div className="flex items-center justify-between p-4 border-t border-border bg-muted/30">
          <span className="text-[12px] text-muted-foreground font-mono-nums">
            {decisionsMade} of {result.bleeders.length} decisions made
          </span>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleGenerateAmazonFile}
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
