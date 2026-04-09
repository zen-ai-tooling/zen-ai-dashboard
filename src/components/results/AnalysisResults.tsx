import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, ChevronDown, Loader2, CheckCircle2 } from "lucide-react";
import { useState, useMemo } from "react";
import { ValidationDisplay } from "./ValidationDisplay";
import { WorkflowStepper } from "./WorkflowStepper";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface TopSpender {
  term: string;
  spend: number;
  clicks: number;
  sheet: string;
  isCombined: boolean;
}

interface NormalizedRow {
  sheet: string;
  campaign: string;
  ad_group: string;
  entity: string;
  keyword_text: string;
  product_targeting: string;
  customer_search_term: string;
  match_type: string;
  impressions: number;
  clicks: number;
  spend: number;
  sales: number;
  orders: number;
  ctr: string;
  cvr: string;
  acos: string;
  roas: string;
  state: string;
  campaign_state: string;
  sku: string;
  asin: string;
  [key: string]: any;
}

interface SheetDiagnostics {
  sheetName: string;
  rowsLoaded: number;
  afterNormalization: number;
  actionableEntity: number;
  enabledRows: number;
  clicksAboveThreshold: number;
  salesZero: number;
  finalBleeders: number;
  columnsNormalized: string[];
  missingColumns: string[];
  coercionsApplied: string[];
}

interface AnalysisResultsProps {
  summary: string;
  tables: Record<string, string>;
  csvData: { combined: string };
  brandName?: string;
  validation: any;
  topSpenders: TopSpender[];
  allRows: NormalizedRow[];
  onProceedToProcessor?: () => void;
  formattedWorkbook?: any;
  diagnostics?: SheetDiagnostics[];
  mode?: 'standard' | 'lifetime';
}

const SEARCH_TERM_DECISIONS = ['Negate (Exact)', 'Negate (Phrase)', 'Keep'];
const CAMPAIGN_DECISIONS = ['Pause', 'Cut Bid 50%', 'Keep'];
const DEFAULT_DECISIONS = ['Negate (Exact)', 'Negate (Phrase)', 'Pause', 'Keep'];

function getDecisionOptions(sheetName: string): string[] {
  const lower = sheetName.toLowerCase();
  if (lower.includes('search term')) return SEARCH_TERM_DECISIONS;
  if (lower.includes('campaign')) return CAMPAIGN_DECISIONS;
  return DEFAULT_DECISIONS;
}

export const AnalysisResults = ({
  summary, tables, csvData, brandName, validation, topSpenders, allRows,
  onProceedToProcessor, formattedWorkbook, diagnostics, mode = 'standard'
}: AnalysisResultsProps) => {
  const [decisions, setDecisions] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateDone, setGenerateDone] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  // Group allRows by sheet
  const rowsBySheet = useMemo(() => {
    const grouped: Record<string, NormalizedRow[]> = {};
    allRows.forEach(row => {
      if (!grouped[row.sheet]) grouped[row.sheet] = [];
      grouped[row.sheet].push(row);
    });
    return grouped;
  }, [allRows]);

  const sheetNames = useMemo(() => Object.keys(rowsBySheet), [rowsBySheet]);
  const [activeSheet, setActiveSheet] = useState<string>('');

  // Set initial active sheet
  const currentSheet = activeSheet || sheetNames[0] || '';
  const currentRows = rowsBySheet[currentSheet] || [];
  const decisionOptions = getDecisionOptions(currentSheet);

  const decisionsMade = useMemo(() => {
    return Object.values(decisions).filter(d => d && d !== '').length;
  }, [decisions]);

  const totalSpend = useMemo(() => {
    return allRows.reduce((s, r) => s + (r.spend || 0), 0);
  }, [allRows]);

  const sheetsProcessed = useMemo(() => {
    return Object.keys(tables).length;
  }, [tables]);

  const handleDownload = () => {
    if (formattedWorkbook) {
      formattedWorkbook.xlsx.writeBuffer().then((buffer: ArrayBuffer) => {
        const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        const date = new Date().toLocaleDateString("en-US", { timeZone: "America/Los_Angeles", month: "2-digit", day: "2-digit", year: "numeric" }).replace(/\//g, "-");
        const filePrefix = mode === 'lifetime' ? 'B1_LIFETIME_Decisions' : 'Bleeders_1_Report';
        link.setAttribute("href", url);
        link.setAttribute("download", `${filePrefix}_${brandName || "Account"}_${date}_PT.xlsx`);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      });
    } else {
      const blob = new Blob([csvData.combined], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      const date = new Date().toLocaleDateString("en-US", { timeZone: "America/Los_Angeles", month: "2-digit", day: "2-digit", year: "numeric" }).replace(/\//g, "-");
      link.setAttribute("href", url);
      link.setAttribute("download", `Bleeders_1_Report_${brandName || "Account"}_${date}_PT.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const handleGenerateDecisionFile = async () => {
    setIsGenerating(true);
    setGenerateDone(false);
    try {
      const ExcelJS = (await import('exceljs')).default;
      const wb = new ExcelJS.Workbook();
      const sheetNameMap: Record<string, string> = {
        'SP Search Term Report': 'Sponsored Products • Search Term',
        'SB Search Term Report': 'Sponsored Brands • Search Term',
        'Sponsored Products Campaigns': 'Sponsored Products • Targeting',
        'Sponsored Brands Campaigns': 'Sponsored Brands • Keywords',
        'Sponsored Display Campaigns': 'Sponsored Display • Targeting',
      };
      const grouped: Record<string, any[]> = {};
      Object.entries(decisions).forEach(([key, decision]) => {
        if (!decision) return;
        const sepIdx = key.indexOf('-ROWINDEX-');
        if (sepIdx === -1) return;
        const sheetName = key.substring(0, sepIdx);
        const rowIdx = parseInt(key.substring(sepIdx + 10));
        const sheetRows = rowsBySheet[sheetName];
        if (!sheetRows || !sheetRows[rowIdx]) return;
        const row = sheetRows[rowIdx];
        const outputSheet = sheetNameMap[sheetName] ?? sheetName;
        if (!grouped[outputSheet]) grouped[outputSheet] = [];
        grouped[outputSheet].push({ ...row, _decision: decision });
      });
      for (const [tabName, rows] of Object.entries(grouped)) {
        const ws = wb.addWorksheet(tabName);
        ws.addRow(['Campaign Name', 'Ad Group Name', 'Entity', 'Keyword Text', 'Product Targeting Expression', 'Match Type', 'Customer Search Term', 'Decision', 'Campaign Id', 'Ad Group Id', 'Keyword Id', 'Product Targeting Id', 'Targeting Id']);
        rows.forEach((row: any) => {
          ws.addRow([row.campaign ?? '', row.ad_group ?? '', row.entityType ?? row.entity ?? '', row.keyword_text ?? '', row.product_targeting ?? '', row.match_type ?? '', row.customer_search_term ?? '', row._decision, row.campaignId ?? '', row.adGroupId ?? '', row.keywordId ?? '', row.productTargetingId ?? '', row.targetingId ?? '']);
        });
      }
      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const date = new Date().toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles', month: '2-digit', day: '2-digit', year: 'numeric' }).replace(/\//g, '-');
      link.download = `Bleeders_1_Decisions_${date}_PT.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setGenerateDone(true);
    } catch (err) {
      console.error('[Generate Decision File] Failed:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Validation — compact */}
      {validation && <ValidationDisplay validation={validation} />}

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="text-[28px] font-medium font-mono-nums text-destructive">{allRows.length}</div>
          <div className="text-[11px] text-[hsl(var(--text-tertiary))] mt-0.5">bleeders found</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="text-[28px] font-medium font-mono-nums text-destructive">${totalSpend.toFixed(0)}</div>
          <div className="text-[11px] text-[hsl(var(--text-tertiary))] mt-0.5">at-risk spend</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="text-[28px] font-medium text-foreground">{sheetsProcessed} sheets</div>
          <div className="text-[11px] text-[hsl(var(--text-tertiary))] mt-0.5">processed</div>
        </div>
      </div>

      {/* Top spenders */}
      {topSpenders.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4 flex items-center justify-between">
          <span className="text-[12px] font-medium text-[hsl(var(--text-secondary))]">Top spenders</span>
          <div className="flex items-center gap-4">
            {topSpenders.slice(0, 3).map((s, idx) => (
              <span key={idx} className="text-[13px] text-[hsl(var(--text-secondary))]">
                {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}{' '}
                <span className="text-foreground">{s.term}</span>{' '}
                <span className="font-mono-nums text-destructive">${s.spend.toFixed(2)}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Results table with sheet tabs */}
      {sheetNames.length > 0 && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {/* Tab bar */}
          <div className="flex items-center border-b border-border overflow-x-auto">
            <span className="text-[14px] font-semibold text-foreground px-5 py-3 flex-shrink-0">Bleeders</span>
            <div className="flex items-center gap-0.5 px-2">
              {sheetNames.map((name) => {
                const count = rowsBySheet[name]?.length || 0;
                const isActive = name === currentSheet;
                return (
                  <button
                    key={name}
                    onClick={() => setActiveSheet(name)}
                    className={`text-[12px] px-3 py-2 rounded-md btn-press whitespace-nowrap flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-[hsl(var(--accent-blue-light))] text-[hsl(var(--accent-blue))] font-medium'
                        : 'text-[hsl(var(--text-secondary))] hover:bg-secondary'
                    }`}
                  >
                    {name}
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono-nums ${
                      isActive ? 'bg-[hsl(var(--accent-blue))/0.15] text-[hsl(var(--accent-blue))]' : 'bg-secondary text-[hsl(var(--text-tertiary))]'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-[11px] font-medium uppercase tracking-[0.06em] text-[hsl(var(--text-tertiary))] px-4 py-2.5">Campaign</TableHead>
                  <TableHead className="text-[11px] font-medium uppercase tracking-[0.06em] text-[hsl(var(--text-tertiary))] px-4 py-2.5">Ad Group</TableHead>
                  <TableHead className="text-[11px] font-medium uppercase tracking-[0.06em] text-[hsl(var(--text-tertiary))] px-4 py-2.5">Entity</TableHead>
                  <TableHead className="text-[11px] font-medium uppercase tracking-[0.06em] text-[hsl(var(--text-tertiary))] px-4 py-2.5">Match</TableHead>
                  <TableHead className="text-[11px] font-medium uppercase tracking-[0.06em] text-[hsl(var(--text-tertiary))] px-4 py-2.5 text-right">Clicks</TableHead>
                  <TableHead className="text-[11px] font-medium uppercase tracking-[0.06em] text-[hsl(var(--text-tertiary))] px-4 py-2.5 text-right">Spend</TableHead>
                  <TableHead className="text-[11px] font-medium uppercase tracking-[0.06em] text-[hsl(var(--text-tertiary))] px-4 py-2.5 text-right">Sales</TableHead>
                  <TableHead className="text-[11px] font-medium uppercase tracking-[0.06em] text-[hsl(var(--text-tertiary))] px-4 py-2.5 text-right">ACoS</TableHead>
                  <TableHead className="text-[11px] font-medium uppercase tracking-[0.06em] text-[hsl(var(--text-tertiary))] px-4 py-2.5 w-[140px]">Decision</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentRows.map((row, rowIdx) => {
                  const key = `${currentSheet}-ROWINDEX-${rowIdx}`;
                  const entityDisplay = row.customer_search_term || row.keyword_text || row.product_targeting || row.entity || '—';
                  return (
                    <TableRow key={rowIdx} className="hover:bg-[hsl(var(--page-bg))/0.5]" style={{ transition: 'background-color 150ms ease' }}>
                      <TableCell className="text-[13px] max-w-[160px] truncate px-4 py-2.5" title={row.campaign}>{row.campaign || '—'}</TableCell>
                      <TableCell className="text-[13px] max-w-[120px] truncate px-4 py-2.5" title={row.ad_group}>{row.ad_group || '—'}</TableCell>
                      <TableCell className="text-[13px] max-w-[160px] truncate px-4 py-2.5" title={entityDisplay}>{entityDisplay}</TableCell>
                      <TableCell className="text-[13px] text-[hsl(var(--text-secondary))] px-4 py-2.5">{row.match_type || '—'}</TableCell>
                      <TableCell className="text-right text-[13px] font-mono-nums px-4 py-2.5">{row.clicks}</TableCell>
                      <TableCell className="text-right px-4 py-2.5">
                        <span className="text-[13px] font-mono-nums text-destructive">${row.spend.toFixed(2)}</span>
                      </TableCell>
                      <TableCell className="text-right text-[13px] font-mono-nums px-4 py-2.5">${row.sales.toFixed(2)}</TableCell>
                      <TableCell className="text-right px-4 py-2.5">
                        {row.acos && row.acos !== '0' && row.acos !== '0%' ? (
                          <span className="inline-block text-[11px] font-mono-nums px-1.5 py-0.5 rounded-full bg-[hsl(var(--red-light))] text-destructive border border-[hsl(var(--red-border))] font-medium">
                            {row.acos}
                          </span>
                        ) : (
                          <span className="text-[13px] text-[hsl(var(--text-tertiary))]">—</span>
                        )}
                      </TableCell>
                      <TableCell className="px-4 py-2.5">
                        <Select
                          value={decisions[key] || ''}
                          onValueChange={(val) => setDecisions(prev => ({ ...prev, [key]: val }))}
                        >
                          <SelectTrigger className="h-7 text-[12px] w-[130px] rounded-md border-border">
                            <SelectValue placeholder="— select —" />
                          </SelectTrigger>
                          <SelectContent>
                            {decisionOptions.map(opt => (
                              <SelectItem key={opt} value={opt} className="text-[12px]">{opt}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Downloads + actions */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        {allRows.length > 0 && (
          <>
            <button
              onClick={handleGenerateDecisionFile}
              disabled={decisionsMade === 0 || isGenerating}
              className="w-full h-10 rounded-lg bg-[hsl(var(--accent-blue))] text-white text-[14px] font-medium btn-press hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{ transition: 'opacity 150ms ease' }}
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : generateDone ? (
                <><CheckCircle2 className="w-4 h-4" /> Decision File Downloaded</>
              ) : (
                <><Download className="w-4 h-4" /> Generate Decision File</>
              )}
            </button>
            <p className="text-[12px] text-[hsl(var(--text-tertiary))] font-mono-nums">
              {decisionsMade} decisions made across {allRows.length} rows
            </p>
            <div className="border-t border-border pt-3 mt-1">
              <p className="text-[11px] text-[hsl(var(--text-tertiary))] mb-0.5">
                Decision column ready · Pause on search terms auto-converts to Negate (Exact)
              </p>
            </div>
          </>
        )}

        <Button onClick={handleDownload} variant="outline" className="w-full gap-2 rounded-lg btn-press" size="lg">
          <Download className="w-4 h-4" />
          {formattedWorkbook ? 'Download Formatted Excel' : 'Download Combined CSV'}
        </Button>

        {onProceedToProcessor && (
          <button
            onClick={onProceedToProcessor}
            className="w-full text-[13px] text-[hsl(var(--accent-blue))] font-medium hover:underline btn-press py-1"
          >
            Proceed to Decision Processor →
          </button>
        )}
      </div>

      {/* Workflow Stepper */}
      <WorkflowStepper
        hasBleederData={allRows.length > 0}
        onProceedToProcessor={onProceedToProcessor}
      />

      {/* Debug link */}
      {diagnostics && diagnostics.length > 0 && (
        <div className="pt-2">
          <Collapsible open={showDiagnostics} onOpenChange={setShowDiagnostics}>
            <CollapsibleTrigger className="text-[11px] text-[hsl(var(--text-tertiary))] hover:text-[hsl(var(--text-secondary))] flex items-center gap-1 btn-press">
              <ChevronDown className={`w-3 h-3 transition-transform ${showDiagnostics ? 'rotate-180' : ''}`} />
              Debug diagnostics
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 rounded-xl border border-border bg-card p-4 space-y-3">
                {diagnostics.filter(d => d.rowsLoaded > 0).map((diag, idx) => (
                  <div key={idx} className="border-l-2 border-[hsl(var(--accent-blue))] pl-3 space-y-1">
                    <h4 className="text-[13px] font-medium text-foreground">{diag.sheetName}</h4>
                    <div className="text-[12px] space-y-0.5 text-[hsl(var(--text-secondary))]">
                      <p>Rows: {diag.rowsLoaded} → Normalized: {diag.afterNormalization} → Actionable: {diag.actionableEntity} → Enabled: {diag.enabledRows} → Clicks OK: {diag.clicksAboveThreshold} → Bleeders: <span className="text-[hsl(var(--accent-blue))] font-medium">{diag.finalBleeders}</span></p>
                    </div>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      )}

      {/* Footer */}
      <div className="pt-4 border-t border-border/60 text-center text-[11px] text-[hsl(var(--text-tertiary))]">
        Built with validated VA SOP logic · Pacific Time
      </div>
    </div>
  );
};
