import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Loader2, CheckCircle2 } from "lucide-react";
import { useState, useMemo } from "react";

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

  const currentSheet = activeSheet || sheetNames[0] || '';
  const currentRows = rowsBySheet[currentSheet] || [];
  const decisionOptions = getDecisionOptions(currentSheet);

  const decisionsMade = useMemo(() => {
    return Object.values(decisions).filter(d => d && d !== '').length;
  }, [decisions]);

  const totalSpend = useMemo(() => {
    return allRows.reduce((s, r) => s + (r.spend || 0), 0);
  }, [allRows]);

  const enhancedTables = useMemo(() => {
    return Object.fromEntries(
      Object.entries(tables).map(([key, value]) => [key, value])
    );
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
      {/* Lifetime Mode Notice */}
      {mode === 'lifetime' && (
        <div className="rounded-xl border border-[hsl(var(--amber-border))] bg-[hsl(var(--amber-light))] p-4">
          <p className="text-[13px] font-medium text-[hsl(var(--amber))]">Lifetime Mode</p>
          <p className="text-[12px] text-[hsl(var(--text-secondary))] mt-1">
            Analysis uses lifetime performance data for deeper trend detection.
          </p>
        </div>
      )}

      {/* Section A — Summary stat cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="font-mono-nums text-[32px] font-medium leading-none text-destructive">
            {allRows.length}
          </div>
          <div className="text-[12px] text-muted-foreground mt-1.5 font-medium">bleeders found</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="font-mono-nums text-[32px] font-medium leading-none text-destructive">
            ${totalSpend.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </div>
          <div className="text-[12px] text-muted-foreground mt-1.5 font-medium">at-risk spend</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="text-[32px] font-semibold leading-none text-foreground">
            {[...new Set(allRows.map(r => r.sheet))].length}
          </div>
          <div className="text-[12px] text-muted-foreground mt-1.5 font-medium">sheets processed</div>
        </div>
      </div>

      {/* Section B — Top spenders strip */}
      {topSpenders.length > 0 && (
        <div className="bg-card border border-border rounded-xl py-3.5 px-6 flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.06em] mr-2">Top spenders</span>
          {topSpenders.slice(0, 3).map((s, i) => (
            <span key={i} className="text-[13px] text-muted-foreground">
              {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}
              {' '}{s.term}{' '}
              <span className="font-mono-nums text-destructive font-medium">${s.spend.toFixed(2)}</span>
              {i < Math.min(topSpenders.length, 3) - 1 && <span className="mx-2 text-border">·</span>}
            </span>
          ))}
        </div>
      )}

      {/* Section C — Inline decision table */}
      {sheetNames.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
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
                    className={`text-[12px] px-3 py-2 rounded-md whitespace-nowrap flex items-center gap-1.5 transition-colors ${
                      isActive
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-muted-foreground hover:bg-secondary'
                    }`}
                  >
                    {name}
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono-nums ${
                      isActive ? 'bg-primary/15 text-primary' : 'bg-secondary text-muted-foreground'
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
                  <TableHead className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground px-4 py-2.5">Campaign</TableHead>
                  <TableHead className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground px-4 py-2.5">Ad Group</TableHead>
                  <TableHead className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground px-4 py-2.5">Entity</TableHead>
                  <TableHead className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground px-4 py-2.5">Match</TableHead>
                  <TableHead className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground px-4 py-2.5 text-right">Clicks</TableHead>
                  <TableHead className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground px-4 py-2.5 text-right">Spend</TableHead>
                  <TableHead className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground px-4 py-2.5 text-right">Sales</TableHead>
                  <TableHead className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground px-4 py-2.5 text-right">ACoS</TableHead>
                  <TableHead className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground px-4 py-2.5 w-[140px]">Decision</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentRows.map((row, rowIdx) => {
                  const key = `${currentSheet}-ROWINDEX-${rowIdx}`;
                  const entityDisplay = row.customer_search_term || row.keyword_text || row.product_targeting || row.entity || '—';
                  return (
                    <TableRow key={rowIdx} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="text-[13px] max-w-[160px] truncate px-4 py-2.5" title={row.campaign}>{row.campaign || '—'}</TableCell>
                      <TableCell className="text-[13px] max-w-[120px] truncate px-4 py-2.5" title={row.ad_group}>{row.ad_group || '—'}</TableCell>
                      <TableCell className="text-[13px] max-w-[160px] truncate px-4 py-2.5" title={entityDisplay}>{entityDisplay}</TableCell>
                      <TableCell className="text-[13px] text-muted-foreground px-4 py-2.5">{row.match_type || '—'}</TableCell>
                      <TableCell className="text-right text-[13px] font-mono-nums px-4 py-2.5">{row.clicks}</TableCell>
                      <TableCell className="text-right px-4 py-2.5">
                        <span className="text-[13px] font-mono-nums text-destructive">${row.spend.toFixed(2)}</span>
                      </TableCell>
                      <TableCell className="text-right text-[13px] font-mono-nums px-4 py-2.5">${row.sales.toFixed(2)}</TableCell>
                      <TableCell className="text-right px-4 py-2.5">
                        {row.acos && row.acos !== '0' && row.acos !== '0%' ? (
                          <span className="inline-block text-[11px] font-mono-nums px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/20 font-medium">
                            {row.acos}
                          </span>
                        ) : (
                          <span className="text-[13px] text-muted-foreground">—</span>
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

      {/* Section D — Actions bar */}
      <div className="bg-card border border-border rounded-xl p-5">
        {allRows.length > 0 && (
          <>
            <button
              onClick={handleGenerateDecisionFile}
              disabled={decisionsMade === 0 || isGenerating}
              className="w-full h-11 rounded-lg bg-primary text-primary-foreground text-[14px] font-semibold flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : generateDone ? (
                <><CheckCircle2 className="w-4 h-4" /> Decision File Downloaded</>
              ) : (
                <><Download className="w-4 h-4" /> Generate Decision File</>
              )}
            </button>

            <p className="text-[12px] text-muted-foreground text-center mt-2 font-mono-nums">
              {decisionsMade} decisions made across {allRows.length} rows
            </p>

            <div className="border-t border-border my-4" />
          </>
        )}

        <button
          onClick={handleDownload}
          className="w-full h-10 rounded-lg bg-transparent text-muted-foreground border border-border text-[13px] font-medium transition-colors hover:bg-secondary"
        >
          {formattedWorkbook ? 'Download Formatted Excel (legacy workflow)' : 'Download Combined CSV'}
        </button>

        <p className="text-[11px] text-muted-foreground font-mono-nums mt-1.5">
          Pause on search terms auto-converts to Negate (Exact)
        </p>

        {onProceedToProcessor && (
          <button
            onClick={onProceedToProcessor}
            className="w-full text-[13px] text-primary font-medium hover:underline py-2 mt-2 transition-colors"
          >
            Proceed to Decision Processor →
          </button>
        )}
      </div>
    </div>
  );
};
