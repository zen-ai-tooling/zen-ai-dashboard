import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Loader2, CheckCircle2, MoreHorizontal, AlertTriangle, FileSpreadsheet, Layers, ChevronDown, Percent, DollarSign, Info, XCircle, Upload } from "lucide-react";
import { useState, useMemo, useRef } from "react";
import { toast } from "sonner";
import { DecisionSelect, decisionRowClass } from "@/components/shared/DecisionSelect";
import { CompactStatsBar } from "@/components/shared/CompactStatsBar";
import { SortHeader, useSortable } from "@/components/shared/SortHeader";
import { CompletionView } from "@/components/shared/CompletionView";
import { DecisionProgressBar } from "@/components/shared/DecisionProgressBar";
import { suggestB1Row } from "@/lib/ui/bleeder1Suggestion";

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
  const [showFullResults, setShowFullResults] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [generatedFileName, setGeneratedFileName] = useState<string>('');
  const [flashKey, setFlashKey] = useState<{ key: string; cls: string; ts: number } | null>(null);
  const lastDownloadRef = useRef<(() => void) | null>(null);

  const setDecisionWithFlash = (key: string, val: string) => {
    setDecisions(prev => ({ ...prev, [key]: val }));
    let cls = '';
    if (val === 'Pause') cls = 'row-flash-pause';
    else if (val === 'Keep') cls = 'row-flash-keep';
    else if (val.startsWith('Cut')) cls = 'row-flash-cut';
    else if (val.startsWith('Negat')) cls = 'row-flash-negate';
    if (cls) setFlashKey({ key, cls, ts: Date.now() });
  };

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

  type SortKey = 'campaign' | 'ad_group' | 'entity' | 'clicks' | 'spend' | 'sales' | 'acos';
  const { sortKey, sortDir, toggle: toggleSort } = useSortable<SortKey>('spend', 'desc');

  const parseAcosNum = (s: string): number => {
    if (!s) return -1;
    const n = parseFloat(String(s).replace('%', ''));
    return Number.isFinite(n) ? n : -1;
  };

  const sortedIndices = useMemo(() => {
    const idx = currentRows.map((_, i) => i);
    idx.sort((a, b) => {
      const ra = currentRows[a]; const rb = currentRows[b];
      let va: any; let vb: any;
      if (sortKey === 'acos') { va = parseAcosNum(ra.acos); vb = parseAcosNum(rb.acos); }
      else if (sortKey === 'clicks' || sortKey === 'spend' || sortKey === 'sales') {
        va = ra[sortKey] ?? 0; vb = rb[sortKey] ?? 0;
      } else {
        va = String(ra[sortKey] ?? '').toLowerCase();
        vb = String(rb[sortKey] ?? '').toLowerCase();
      }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return idx;
  }, [currentRows, sortKey, sortDir]);

  // Urgency quartiles based on Spend within the current sheet
  const urgencyBands = useMemo(() => {
    const spends = currentRows.map(r => r.spend || 0).slice().sort((a, b) => a - b);
    if (spends.length === 0) return { high: Infinity, low: -Infinity };
    const q = (p: number) => spends[Math.min(spends.length - 1, Math.floor(spends.length * p))];
    return { high: q(0.75), low: q(0.25) };
  }, [currentRows]);


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
      const fileName = `Bleeders_1_Decisions_${date}_PT.xlsx`;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setGeneratedFileName(fileName);
      setGenerateDone(true);
      // Persistent re-download handler for the completion banner
      lastDownloadRef.current = () => {
        const blob2 = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const u2 = URL.createObjectURL(blob2);
        const a2 = document.createElement('a');
        a2.href = u2;
        a2.download = fileName;
        document.body.appendChild(a2);
        a2.click();
        document.body.removeChild(a2);
        URL.revokeObjectURL(u2);
      };
      toast.success('Decision file downloaded', {
        description: `${decisionsMade} decisions exported`,
        duration: 3000,
      });
    } catch (err) {
      console.error('[Generate Decision File] Failed:', err);
      toast.error('Failed to generate decision file');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStartNew = () => {
    setDecisions({});
    setGenerateDone(false);
    setGeneratedFileName('');
    lastDownloadRef.current = null;
  };

  const handleManualDecisionUpload = (file: File) => {
    toast.success(`Decision file received: ${file.name}`);
  };

  const sheetsCount = [...new Set(allRows.map(r => r.sheet))].length;
  const decisionThresholdSpend = totalSpend / Math.max(allRows.length, 1) * 1.5; // highlight only above 1.5x mean

  // Decisions breakdown for completion view
  const breakdown = useMemo(() => {
    const counts: Record<string, number> = { Pause: 0, 'Cut Bid 50%': 0, Keep: 0, 'Negate (Exact)': 0, 'Negate (Phrase)': 0 };
    Object.values(decisions).forEach(d => { if (d) counts[d] = (counts[d] ?? 0) + 1; });
    const items = [
      { label: 'Paused', count: counts['Pause'] ?? 0, color: '#FF3B30' },
      { label: 'Cut Bid 50%', count: counts['Cut Bid 50%'] ?? 0, color: '#FF9500' },
      { label: 'Negative', count: (counts['Negate (Exact)'] ?? 0) + (counts['Negate (Phrase)'] ?? 0), color: '#0071E3' },
      { label: 'Keep', count: counts['Keep'] ?? 0, color: '#34C759' },
      { label: 'No decision', count: Math.max(0, allRows.length - decisionsMade), color: '#D2D2D7' },
    ];
    return items;
  }, [decisions, allRows.length, decisionsMade]);

  // ── Completion view (replaces full results page after generation) ──
  if (generateDone && generatedFileName && !showFullResults) {
    return (
      <CompletionView
        fileName={generatedFileName}
        title="Workflow complete"
        summary={[
          { label: 'Bleeders found', value: allRows.length.toLocaleString() },
          { label: 'At-risk spend', value: `$${totalSpend.toLocaleString('en-US', { maximumFractionDigits: 0 })}` },
          { label: 'Sheets processed', value: String(sheetsCount) },
          { label: 'Decisions made', value: `${decisionsMade}/${allRows.length}` },
        ]}
        breakdown={breakdown}
        onDownload={() => lastDownloadRef.current?.()}
        onStartNew={handleStartNew}
        onViewFullResults={() => setShowFullResults(true)}
        accentColor="#FF3B30"
      />
    );
  }

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

      {/* Back to summary */}
      {generateDone && showFullResults && (
        <button
          onClick={() => setShowFullResults(false)}
          className="text-[12.5px] text-[#0071E3] hover:underline btn-press"
        >
          ← Back to summary
        </button>
      )}

      {/* Compact stats + workflow steps — single unified container */}
      <CompactStatsBar
        accent={mode === 'lifetime' ? 'purple' : 'red'}
        stats={[
          { value: allRows.length.toLocaleString(), label: 'bleeders' },
          { value: `$${totalSpend.toLocaleString('en-US', { maximumFractionDigits: 0 })}`, label: 'at risk' },
          { value: String(sheetsCount), label: 'sheets' },
        ]}
        steps={[
          { label: 'File analyzed', status: 'complete' },
          { label: 'Make decisions', status: generateDone ? 'complete' : 'active' },
          { label: 'Generate Amazon file', status: generateDone ? 'complete' : 'pending' },
        ]}
      />

      {/* Completion banner removed — replaced by full CompletionView page */}

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

          {/* Bulk action bar */}
          <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-border bg-[#FAFAFA]">
            <div className="text-[12px] text-[hsl(var(--text-secondary))] truncate">
              <span className="font-medium text-foreground">{shortTabLabel(currentSheet)}</span>
              <span className="mx-1.5 text-[hsl(var(--text-tertiary))]">·</span>
              <span className="font-mono-nums">{currentRows.length}</span> bleeders
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {decisionOptions.includes('Pause') && (
                <button
                  onClick={() => {
                    const next = { ...decisions };
                    currentRows.forEach((_, idx) => { next[`${currentSheet}-ROWINDEX-${idx}`] = 'Pause'; });
                    setDecisions(next);
                  }}
                  className="bulk-btn btn-press"
                >
                  <span className="decision-dot" style={{ background: '#FF3B30' }} />
                  Select all → Pause
                </button>
              )}
              {decisionOptions.includes('Cut Bid 50%') && (
                <button
                  onClick={() => {
                    const next = { ...decisions };
                    currentRows.forEach((_, idx) => { next[`${currentSheet}-ROWINDEX-${idx}`] = 'Cut Bid 50%'; });
                    setDecisions(next);
                  }}
                  className="bulk-btn btn-press"
                >
                  <span className="decision-dot" style={{ background: '#FF9500' }} />
                  Select all → Cut Bid 50%
                </button>
              )}
              {decisionOptions.includes('Keep') && (
                <button
                  onClick={() => {
                    const next = { ...decisions };
                    currentRows.forEach((_, idx) => { next[`${currentSheet}-ROWINDEX-${idx}`] = 'Keep'; });
                    setDecisions(next);
                  }}
                  className="bulk-btn btn-press"
                >
                  <span className="decision-dot" style={{ background: '#34C759' }} />
                  Select all → Keep
                </button>
              )}
              <button
                onClick={() => {
                  const next = { ...decisions };
                  currentRows.forEach((_, idx) => { delete next[`${currentSheet}-ROWINDEX-${idx}`]; });
                  setDecisions(next);
                }}
                className="bulk-btn bulk-btn-ghost btn-press"
              >
                <XCircle className="w-3 h-3" />
                Clear
              </button>
            </div>
          </div>

          {/* Table — scrollable area with sticky thead, action bar pinned below */}
          <div className="w-full max-h-[58vh] overflow-auto table-sticky-header">
            <Table className="table-fixed w-full">
              <colgroup>
                <col style={{ width: '20%' }} />
                <col style={{ width: '16%' }} />
                <col style={{ width: '13%' }} />
                <col style={{ width: '7%' }} />
                <col style={{ width: '6%' }} />
                <col style={{ width: '8%' }} />
                <col style={{ width: '7%' }} />
                <col style={{ width: '7%' }} />
                <col style={{ width: '8%' }} />
                <col style={{ width: '8%' }} />
              </colgroup>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b border-border">
                  <TableHead style={{ letterSpacing: '0.08em' }}>
                    <SortHeader active={sortKey === 'campaign'} dir={sortDir} onClick={() => toggleSort('campaign')}>Campaign</SortHeader>
                  </TableHead>
                  <TableHead style={{ letterSpacing: '0.08em' }}>
                    <SortHeader active={sortKey === 'ad_group'} dir={sortDir} onClick={() => toggleSort('ad_group')}>Ad Group</SortHeader>
                  </TableHead>
                  <TableHead style={{ letterSpacing: '0.08em' }}>
                    <SortHeader active={sortKey === 'entity'} dir={sortDir} onClick={() => toggleSort('entity')}>Entity</SortHeader>
                  </TableHead>
                  <TableHead style={{ letterSpacing: '0.08em' }}>Match</TableHead>
                  <TableHead className="text-right" style={{ letterSpacing: '0.08em' }}>
                    <SortHeader active={sortKey === 'clicks'} dir={sortDir} onClick={() => toggleSort('clicks')} align="right">Clicks</SortHeader>
                  </TableHead>
                  <TableHead className="text-right" style={{ letterSpacing: '0.08em' }}>
                    <SortHeader active={sortKey === 'spend'} dir={sortDir} onClick={() => toggleSort('spend')} align="right">Spend</SortHeader>
                  </TableHead>
                  <TableHead className="text-right" style={{ letterSpacing: '0.08em' }}>
                    <SortHeader active={sortKey === 'sales'} dir={sortDir} onClick={() => toggleSort('sales')} align="right">Sales</SortHeader>
                  </TableHead>
                  <TableHead className="text-right" style={{ letterSpacing: '0.08em' }}>
                    <SortHeader active={sortKey === 'acos'} dir={sortDir} onClick={() => toggleSort('acos')} align="right">ACoS</SortHeader>
                  </TableHead>
                  <TableHead style={{ letterSpacing: '0.08em' }}>Suggestion</TableHead>
                  <TableHead style={{ letterSpacing: '0.08em' }}>Decision</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedIndices.map((rowIdx, displayIdx) => {
                  const row = currentRows[rowIdx];
                  const key = `${currentSheet}-ROWINDEX-${rowIdx}`;
                  const entityDisplay = row.customer_search_term || row.keyword_text || row.product_targeting || row.entity || '—';
                  const decision = decisions[key];
                  const indicatorClass = decisionRowClass(decision);
                  const isHighSpend = row.spend > decisionThresholdSpend;
                  const acosNum = parseAcosNum(row.acos);
                  const hasAcos = acosNum >= 0 && row.acos && row.acos !== '0' && row.acos !== '0%';

                  // Urgency: high (top 25% spend) or low (bottom 25%) — only when no decision yet
                  const isHighUrgency = !decision && row.spend >= urgencyBands.high && row.spend > 0;
                  const isLowUrgency = !decision && row.spend <= urgencyBands.low;
                  const urgencyClass = decision
                    ? ''
                    : isHighUrgency
                      ? 'row-urgency-high'
                      : isLowUrgency
                        ? 'row-urgency-low'
                        : '';

                  // Row flash on decision change (one-shot)
                  const flashClass =
                    flashKey && flashKey.key === key && Date.now() - flashKey.ts < 400
                      ? flashKey.cls
                      : '';

                  return (
                    <TableRow
                      key={`${rowIdx}-${flashKey?.key === key ? flashKey.ts : 'r'}`}
                      className={`row-enter cursor-pointer hover:bg-[#F9F9FB] transition-colors ${displayIdx % 2 === 1 && !decision ? 'bg-secondary/30' : ''} ${urgencyClass} ${indicatorClass} ${flashClass}`}
                      style={{ animationDelay: `${Math.min(displayIdx * 12, 240)}ms` }}
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
                        {hasAcos ? (
                          <span
                            className="inline-block text-[11px] font-mono-nums px-2 py-0.5 rounded-full font-medium text-white"
                            style={{ background: acosNum >= 100 ? '#FF3B30' : '#FF9500' }}
                          >
                            {row.acos}
                          </span>
                        ) : (
                          <span className="text-[13px] text-[#D2D2D7]">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const sug = suggestB1Row({ clicks: row.clicks ?? 0, spend: row.spend ?? 0, sales: row.sales ?? 0, orders: row.orders ?? 0 });
                          return (
                            <span
                              className="inline-block text-[11px] font-medium px-2 py-0.5 rounded-full transition-opacity"
                              style={{
                                background: sug.bg,
                                color: sug.color,
                                border: `1px solid ${sug.border}`,
                                opacity: decision ? 0.45 : 1,
                              }}
                            >
                              {sug.label}
                            </span>
                          );
                        })()}
                      </TableCell>
                      <TableCell className="px-2">
                        <div className="flex items-center gap-1.5">
                          {decision && (
                            <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#34C759' }} />
                          )}
                          <DecisionSelect
                            value={decision}
                            onChange={(val) => setDecisionWithFlash(key, val)}
                            options={decisionOptions}
                            width="100%"
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Pinned action bar — sticky at the bottom of the table card */}
          <div className="sticky bottom-0 z-10 border-t border-border bg-card/95 backdrop-blur-sm p-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="min-w-0 flex-1">
                {decisionsMade >= allRows.length && allRows.length > 0 ? (
                  <div className="flex items-baseline gap-2">
                    <span className="text-[14px] font-semibold font-mono-nums" style={{ color: '#34C759' }}>
                      All {allRows.length} decisions complete
                    </span>
                    <CheckCircle2 className="w-4 h-4" style={{ color: '#34C759' }} />
                  </div>
                ) : (
                  <div className="flex items-baseline gap-2">
                    <span className="text-[14px] font-semibold text-foreground font-mono-nums">
                      {decisionsMade}<span className="text-[hsl(var(--text-tertiary))]">/{allRows.length}</span>
                    </span>
                    <span className="text-[12px] text-[hsl(var(--text-secondary))]">decisions</span>
                  </div>
                )}
                <div className="mt-1.5">
                  <DecisionProgressBar
                    total={allRows.length}
                    segments={[
                      { key: 'Pause', count: breakdown.find(b => b.label === 'Paused')?.count ?? 0, color: '#FF3B30' },
                      { key: 'Cut', count: breakdown.find(b => b.label === 'Cut Bid 50%')?.count ?? 0, color: '#FF9500' },
                      { key: 'Negative', count: breakdown.find(b => b.label === 'Negative')?.count ?? 0, color: '#0071E3' },
                      { key: 'Keep', count: breakdown.find(b => b.label === 'Keep')?.count ?? 0, color: '#34C759' },
                    ]}
                  />
                </div>
                <p className="text-[12px] text-[#6E6E73] mt-1.5 inline-flex items-center gap-1.5">
                  <Info className="w-3 h-3" />
                  Pause on search terms auto-converts to Negate (Exact)
                </p>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0 relative">
                <button
                  onClick={() => setMoreOpen(o => !o)}
                  className="h-9 w-9 rounded-md border border-border bg-card text-[hsl(var(--text-secondary))] hover:text-foreground hover:bg-secondary btn-press flex items-center justify-center"
                  aria-label="More actions"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
                {moreOpen && (
                  <div className="absolute right-0 bottom-11 min-w-[240px] rounded-lg border border-border bg-popover shadow-pop p-1 z-20 animate-scale-in">
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
                  className={`btn-primary-action btn-press ${generateDone ? 'is-done' : ''}`}
                >
                  {isGenerating ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Generating…</>
                  ) : generateDone ? (
                    <><CheckCircle2 className="w-4 h-4" /> Downloaded ✓</>
                  ) : (
                    <>Generate Amazon file →</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manual decision upload — collapsed */}
      {allRows.length > 0 && (
        <details className="group">
          <summary className="list-none select-none cursor-pointer inline-flex items-center gap-1.5 text-[12px] text-[hsl(var(--text-secondary))] hover:text-foreground transition-colors">
            <ChevronDown className="w-3 h-3 transition-transform duration-200 group-open:rotate-180" />
            Or upload a decision file manually
          </summary>
          <div className="mt-3 max-w-[480px]">
            <label
              htmlFor="manual-decision-upload-b1"
              className="flex items-center gap-3 rounded-lg border border-dashed border-border bg-card px-4 py-3 cursor-pointer hover:border-primary/60 btn-press"
            >
              <Upload className="w-4 h-4 text-[hsl(var(--text-tertiary))]" />
              <span className="text-[12.5px] text-[hsl(var(--text-secondary))]">
                Drop or click to upload a pre-made decision file (.xlsx)
              </span>
              <input
                id="manual-decision-upload-b1"
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleManualDecisionUpload(f);
                }}
              />
            </label>
          </div>
        </details>
      )}
    </div>
  );
};
