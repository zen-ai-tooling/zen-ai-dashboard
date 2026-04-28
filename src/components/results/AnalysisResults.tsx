import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Loader2, CheckCircle2, MoreHorizontal, AlertTriangle, FileSpreadsheet, Layers, ChevronDown, Percent, DollarSign, Info, XCircle, Upload } from "lucide-react";
import { useState, useMemo, useRef } from "react";
import { toast } from "sonner";
import { DecisionSelect, decisionRowClass } from "@/components/shared/DecisionSelect";
import { WorkflowSteps } from "@/components/shared/WorkflowSteps";
import { CompletionBanner } from "@/components/shared/CompletionBanner";

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

function shortTabLabel(name: string): string {
  return name
    .replace(/Sponsored Products/i, 'SP')
    .replace(/Sponsored Brands/i, 'SB')
    .replace(/Sponsored Display/i, 'SD')
    .replace(/Search Term Report/i, 'Search Terms')
    .replace(/Campaigns$/i, 'Campaigns');
}

const RANK_COLORS = ['hsl(45 90% 50%)', 'hsl(220 8% 60%)', 'hsl(28 60% 45%)']; // gold/silver/bronze

export const AnalysisResults = ({
  summary, tables, csvData, brandName, validation, topSpenders, allRows,
  onProceedToProcessor, formattedWorkbook, diagnostics, mode = 'standard'
}: AnalysisResultsProps) => {
  const [decisions, setDecisions] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateDone, setGenerateDone] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

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

  const decisionsMade = useMemo(
    () => Object.values(decisions).filter(d => d && d !== '').length,
    [decisions]
  );

  const totalSpend = useMemo(
    () => allRows.reduce((s, r) => s + (r.spend || 0), 0),
    [allRows]
  );

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
      toast.success('Decision file downloaded', {
        description: `${decisionsMade} decisions exported`,
        duration: 3000,
      });
      // Auto-revert button label after the toast lifetime
      setTimeout(() => setGenerateDone(false), 3000);
    } catch (err) {
      console.error('[Generate Decision File] Failed:', err);
      toast.error('Failed to generate decision file');
    } finally {
      setIsGenerating(false);
    }
  };

  const sheetsCount = [...new Set(allRows.map(r => r.sheet))].length;
  const decisionThresholdSpend = totalSpend / Math.max(allRows.length, 1) * 1.5; // highlight only above 1.5x mean

  return (
    <div className="space-y-5">
      {/* Lifetime mode notice */}
      {mode === 'lifetime' && (
        <div className="rounded-lg border border-[hsl(var(--amber-border))] bg-[hsl(var(--amber-light))] px-4 py-3 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-[hsl(var(--amber))] flex-shrink-0 mt-px" strokeWidth={1.8} />
          <div>
            <p className="text-[12.5px] font-semibold text-foreground">Lifetime Mode</p>
            <p className="text-[12px] text-[hsl(var(--text-secondary))] mt-0.5">
              Analysis uses lifetime performance data for deeper trend detection.
            </p>
          </div>
        </div>
      )}

      {/* Stats bar — single horizontal row */}
      <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
        <div className="grid grid-cols-3 divide-x divide-border">
          <StatCell
            icon={<AlertTriangle className="w-3.5 h-3.5" strokeWidth={1.8} />}
            value={allRows.length.toLocaleString()}
            label="Bleeders found"
          />
          <StatCell
            icon={<DollarSign className="w-3.5 h-3.5" strokeWidth={1.8} />}
            value={`$${totalSpend.toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
            label="At-risk spend"
          />
          <StatCell
            icon={<Layers className="w-3.5 h-3.5" strokeWidth={1.8} />}
            value={String(sheetsCount)}
            label="Sheets processed"
          />
        </div>
      </div>

      {/* Insights — collapsible top spenders */}
      {topSpenders.length > 0 && (
        <details className="group rounded-xl border border-border bg-card shadow-card overflow-hidden">
          <summary className="flex items-center justify-between px-5 py-3 cursor-pointer list-none select-none hover:bg-secondary/40 transition-colors">
            <div className="flex items-center gap-2">
              <ChevronDown className="w-3.5 h-3.5 text-[hsl(var(--text-tertiary))] transition-transform duration-200 group-open:rotate-180" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[hsl(var(--text-secondary))]">
                Insights · Top spenders
              </span>
            </div>
            <span className="text-[11px] text-[hsl(var(--text-tertiary))]">
              {topSpenders.length} terms ranked by spend
            </span>
          </summary>
          <div className="px-5 py-3 border-t border-border bg-secondary/30 flex items-center gap-5 flex-wrap">
            {topSpenders.slice(0, 5).map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold text-white"
                  style={{ backgroundColor: RANK_COLORS[i] ?? 'hsl(var(--text-tertiary))' }}
                >
                  {i + 1}
                </span>
                <span className="text-[12.5px] text-foreground max-w-[200px] truncate" title={s.term}>
                  {s.term}
                </span>
                <span className="text-[12px] font-mono-nums text-[hsl(var(--text-secondary))]">
                  ${s.spend.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Decision table */}
      {sheetNames.length > 0 && (
        <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
          {/* Tab segmented control */}
          <div className="border-b border-border px-3 pt-3">
            <div className="flex items-end gap-0.5 overflow-x-auto -mb-px tab-scroll-fade text-[14px]">
              {sheetNames.map((name) => {
                const count = rowsBySheet[name]?.length || 0;
                const isActive = name === currentSheet;
                return (
                  <button
                    key={name}
                    onClick={() => setActiveSheet(name)}
                    className={`group relative flex items-center gap-1.5 px-3 pb-2.5 pt-1 text-[14px] whitespace-nowrap btn-press transition-colors ${
                      isActive
                        ? 'text-foreground font-medium'
                        : 'text-[hsl(var(--text-secondary))] font-normal hover:text-foreground'
                    }`}
                  >
                    {shortTabLabel(name)}
                    <span
                      className={`text-[10.5px] font-mono-nums px-1.5 py-px rounded ${
                        isActive ? 'bg-primary/10 text-primary' : 'bg-secondary text-[hsl(var(--text-tertiary))]'
                      }`}
                    >
                      {count}
                    </span>
                    {isActive && (
                      <span className="absolute left-2 right-2 -bottom-px h-[2px] rounded-full bg-primary" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Table — fixed layout, no horizontal scroll on standard widths */}
          <div className="w-full">
            <Table className="table-fixed w-full">
              <colgroup>
                <col style={{ width: '22%' }} />
                <col style={{ width: '18%' }} />
                <col style={{ width: '14%' }} />
                <col style={{ width: '8%' }} />
                <col style={{ width: '7%' }} />
                <col style={{ width: '9%' }} />
                <col style={{ width: '8%' }} />
                <col style={{ width: '7%' }} />
                <col style={{ width: '13%' }} />
              </colgroup>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b border-border">
                  <TableHead style={{ letterSpacing: '0.08em' }}>Campaign</TableHead>
                  <TableHead style={{ letterSpacing: '0.08em' }}>Ad Group</TableHead>
                  <TableHead style={{ letterSpacing: '0.08em' }}>Entity</TableHead>
                  <TableHead style={{ letterSpacing: '0.08em' }}>Match</TableHead>
                  <TableHead className="text-right" style={{ letterSpacing: '0.08em' }}>Clicks</TableHead>
                  <TableHead className="text-right" style={{ letterSpacing: '0.08em' }}>Spend</TableHead>
                  <TableHead className="text-right" style={{ letterSpacing: '0.08em' }}>Sales</TableHead>
                  <TableHead className="text-right" style={{ letterSpacing: '0.08em' }}>ACoS</TableHead>
                  <TableHead style={{ letterSpacing: '0.08em' }}>Decision</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentRows.map((row, rowIdx) => {
                  const key = `${currentSheet}-ROWINDEX-${rowIdx}`;
                  const entityDisplay = row.customer_search_term || row.keyword_text || row.product_targeting || row.entity || '—';
                  const decision = decisions[key];
                  const indicatorClass = decisionRowClass(decision);
                  const isHighSpend = row.spend > decisionThresholdSpend;
                  return (
                    <TableRow
                      key={rowIdx}
                      className={`row-enter cursor-pointer ${rowIdx % 2 === 1 ? 'bg-secondary/30' : ''} ${indicatorClass}`}
                      style={{ animationDelay: `${Math.min(rowIdx * 12, 240)}ms` }}
                    >
                      <TableCell className="truncate font-medium" title={row.campaign}>
                        {row.campaign || '—'}
                      </TableCell>
                      <TableCell className="truncate text-[hsl(var(--text-secondary))]" title={row.ad_group}>
                        {row.ad_group || '—'}
                      </TableCell>
                      <TableCell className="truncate" title={entityDisplay}>
                        {entityDisplay}
                      </TableCell>
                      <TableCell className="text-[hsl(var(--text-tertiary))] text-[12px] truncate">
                        {row.match_type || '—'}
                      </TableCell>
                      <TableCell className="text-right font-mono-nums text-[12.5px]">{row.clicks}</TableCell>
                      <TableCell className="text-right font-mono-nums text-[12.5px]">
                        <span className={isHighSpend ? 'text-destructive font-medium' : 'text-foreground'}>
                          ${row.spend.toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono-nums text-[12.5px] text-[hsl(var(--text-secondary))]">
                        ${row.sales.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        {row.acos && row.acos !== '0' && row.acos !== '0%' ? (
                          <span className="inline-block text-[11px] font-mono-nums px-1.5 py-px rounded-md bg-destructive/10 text-destructive font-medium">
                            {row.acos}
                          </span>
                        ) : (
                          <span className="text-[13px] text-[hsl(var(--border-strong))]">—</span>
                        )}
                      </TableCell>
                      <TableCell className="px-2">
                        <DecisionSelect
                          value={decision}
                          onChange={(val) => setDecisions(prev => ({ ...prev, [key]: val }))}
                          options={decisionOptions}
                          width="100%"
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Action bar */}
      {allRows.length > 0 && (
        <div className="rounded-xl border border-border bg-card shadow-card p-5">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            {/* Progress indicator */}
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span className="text-[14px] font-semibold text-foreground font-mono-nums">
                  {decisionsMade}<span className="text-[hsl(var(--text-tertiary))]">/{allRows.length}</span>
                </span>
                <span className="text-[12px] text-[hsl(var(--text-secondary))]">decisions made</span>
              </div>
              <div className="mt-2 h-1 w-full max-w-[280px] rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{ width: `${(decisionsMade / Math.max(allRows.length, 1)) * 100}%` }}
                />
              </div>
              <p className="text-[11px] text-[hsl(var(--text-tertiary))] mt-1.5">
                Pause on search terms auto-converts to Negate (Exact)
              </p>
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-2 flex-shrink-0 relative">
              <button
                onClick={() => setMoreOpen(o => !o)}
                className="h-9 w-9 rounded-md border border-border bg-card text-[hsl(var(--text-secondary))] hover:text-foreground hover:bg-secondary btn-press flex items-center justify-center"
                aria-label="More actions"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
              {moreOpen && (
                <div className="absolute right-0 top-11 min-w-[240px] rounded-lg border border-border bg-popover shadow-pop p-1 z-20 animate-scale-in">
                  <button
                    onClick={() => { handleDownload(); setMoreOpen(false); }}
                    className="w-full flex items-center gap-2 px-2.5 py-2 text-[12.5px] text-foreground hover:bg-secondary rounded-md text-left"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-[hsl(var(--text-tertiary))]" />
                    {formattedWorkbook ? 'Download formatted Excel' : 'Download combined CSV'}
                    <span className="ml-auto text-[10px] text-[hsl(var(--text-tertiary))]">legacy</span>
                  </button>
                  {onProceedToProcessor && (
                    <button
                      onClick={() => { onProceedToProcessor(); setMoreOpen(false); }}
                      className="w-full flex items-center gap-2 px-2.5 py-2 text-[12.5px] text-foreground hover:bg-secondary rounded-md text-left"
                    >
                      Proceed to Decision Processor →
                    </button>
                  )}
                </div>
              )}
              <button
                onClick={handleGenerateDecisionFile}
                disabled={decisionsMade === 0 || isGenerating}
                className="h-9 px-5 rounded-md bg-primary text-primary-foreground text-[13px] font-semibold flex items-center gap-2 btn-press hover:bg-primary/92 disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
                style={{ minWidth: 200 }}
              >
                {isGenerating ? (
                  <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Generating…</>
                ) : generateDone ? (
                  <><CheckCircle2 className="w-3.5 h-3.5" /> File downloaded</>
                ) : (
                  <><Download className="w-3.5 h-3.5" /> Generate decision file</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCell: React.FC<{ icon: React.ReactNode; value: string; label: string }> = ({ icon, value, label }) => (
  <div className="px-5 py-4">
    <div className="flex items-center gap-1.5 text-[hsl(var(--text-tertiary))] mb-1.5">
      {icon}
      <span className="text-[11px] font-semibold uppercase" style={{ letterSpacing: '0.08em' }}>{label}</span>
    </div>
    <div className="text-[28px] font-semibold leading-none text-foreground font-mono-nums tracking-tight">
      {value}
    </div>
  </div>
);
