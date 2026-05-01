import { useMemo, useState, useRef, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, MoreHorizontal, Info, HelpCircle, Sparkles, Loader2, Download, RotateCcw, Upload as UploadIcon, X, ArrowRight } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { SortHeader, useSortable } from "@/components/shared/SortHeader";
import { suggestB1Row } from "@/lib/ui/bleeder1Suggestion";
import { DecisionSelect, decisionRowClass } from "@/components/shared/DecisionSelect";

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

interface ReviewAllModeProps {
  rowsBySheet: Record<string, NormalizedRow[]>;
  decisions: Record<string, string>;
  setDecision: (key: string, value: string) => void;
  setDecisions: (next: Record<string, string>) => void;
  onGenerate: () => void;
  onDownloadLegacy: () => void;
  onUploadDecisionFile: (file: File) => void;
  isGenerating: boolean;
  generateDone: boolean;
  decisionsMade: number;
  totalRows: number;
  shortTabLabel: (s: string) => string;
  getDecisionOptions: (sheet: string) => string[];
}

const SUGGESTION_PILL_CLASS = {
  pause: { bg: "#FEE2E2", color: "#B91C1C", label: "Pause" },
  review: { bg: "#FFEDD5", color: "#9A3412", label: "Review" },
  monitor: { bg: "#FEF3C7", color: "#92400E", label: "Monitor" },
  keep: { bg: "#F1F5F9", color: "#475569", label: "None" },
} as const;

const DECISION_PILL = (decision: string): { bg: string; color: string; label: string } | null => {
  if (!decision) return null;
  if (decision === "Pause") return { bg: "#DC2626", color: "#FFFFFF", label: "Pause" };
  if (decision.startsWith("Cut")) return { bg: "#EA580C", color: "#FFFFFF", label: "Cut Bid" };
  if (decision === "Keep") return { bg: "#16A34A", color: "#FFFFFF", label: "Keep" };
  if (decision.startsWith("Negat")) return { bg: "#2563EB", color: "#FFFFFF", label: decision.includes("Phrase") ? "Negative (P)" : "Negative" };
  return { bg: "#6B7280", color: "#FFFFFF", label: decision };
};

const parseAcosNum = (s: string): number => {
  if (!s) return -1;
  const n = parseFloat(String(s).replace("%", ""));
  return Number.isFinite(n) ? n : -1;
};

export const ReviewAllMode = ({
  rowsBySheet, decisions, setDecision, setDecisions,
  onGenerate, onDownloadLegacy, onUploadDecisionFile,
  isGenerating, generateDone, decisionsMade, totalRows,
  shortTabLabel, getDecisionOptions,
}: ReviewAllModeProps) => {
  // ── Tab metadata ── ordered by spend at risk DESC
  const sheetMeta = useMemo(() => {
    return Object.entries(rowsBySheet).map(([sheet, rows]) => {
      const spendAtRisk = rows.reduce((s, r) => s + (r.spend || 0), 0);
      let undecided = 0;
      rows.forEach((_, idx) => {
        if (!decisions[`${sheet}-ROWINDEX-${idx}`]) undecided++;
      });
      return { sheet, count: rows.length, spendAtRisk, undecided };
    }).sort((a, b) => b.spendAtRisk - a.spendAtRisk);
  }, [rowsBySheet, decisions]);

  const [activeSheet, setActiveSheet] = useState<string>(sheetMeta[0]?.sheet || "");
  useEffect(() => {
    if (!activeSheet && sheetMeta.length > 0) setActiveSheet(sheetMeta[0].sheet);
  }, [sheetMeta, activeSheet]);

  const currentSheet = activeSheet || sheetMeta[0]?.sheet || "";
  const currentRows = rowsBySheet[currentSheet] || [];
  const decisionOptions = getDecisionOptions(currentSheet);
  const isSearchTermSheet = /search term/i.test(currentSheet);

  // ── Sort ──
  type SortKey = "campaign" | "ad_group" | "entity" | "clicks" | "spend" | "sales" | "acos";
  const { sortKey, sortDir, toggle: toggleSort } = useSortable<SortKey>("spend", "desc");

  const sortedIndices = useMemo(() => {
    const idx = currentRows.map((_, i) => i);
    idx.sort((a, b) => {
      const ra = currentRows[a]; const rb = currentRows[b];
      let va: any; let vb: any;
      if (sortKey === "acos") { va = parseAcosNum(ra.acos); vb = parseAcosNum(rb.acos); }
      else if (sortKey === "clicks" || sortKey === "spend" || sortKey === "sales") {
        va = ra[sortKey] ?? 0; vb = rb[sortKey] ?? 0;
      } else {
        va = String(ra[sortKey] ?? "").toLowerCase();
        vb = String(rb[sortKey] ?? "").toLowerCase();
      }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return idx;
  }, [currentRows, sortKey, sortDir]);

  // ── Bulk action UI state ──
  const [pauseConfirm, setPauseConfirm] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
    };
    if (moreOpen) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [moreOpen]);

  // ── Apply all AI suggestions for current sheet ──
  const applyAISuggestions = () => {
    const next = { ...decisions };
    currentRows.forEach((r, idx) => {
      const sug = suggestB1Row({ clicks: r.clicks ?? 0, spend: r.spend ?? 0, sales: r.sales ?? 0, orders: r.orders ?? 0 });
      const key = `${currentSheet}-ROWINDEX-${idx}`;
      if (sug.kind === "pause") {
        next[key] = isSearchTermSheet ? "Negate (Exact)" : (decisionOptions.includes("Pause") ? "Pause" : decisionOptions[0]);
      } else if (sug.kind === "review") {
        if (decisionOptions.includes("Cut Bid 50%")) next[key] = "Cut Bid 50%";
      } else if (sug.kind === "monitor") {
        // leave undecided — monitor = watch
      } else if (sug.kind === "keep") {
        if (decisionOptions.includes("Keep")) next[key] = "Keep";
      }
    });
    setDecisions(next);
  };

  const setAllInSheet = (value: string) => {
    const next = { ...decisions };
    currentRows.forEach((_, idx) => { next[`${currentSheet}-ROWINDEX-${idx}`] = value; });
    setDecisions(next);
  };

  const confirmPauseAll = () => {
    setAllInSheet(decisionOptions.includes("Pause") ? "Pause" : "Negate (Exact)");
    setPauseConfirm(false);
  };

  const allDone = decisionsMade >= totalRows && totalRows > 0;
  const anyDecided = decisionsMade > 0;

  return (
    <div className="space-y-3">
      {/* ─── Top command bar (progress + Generate) ─── */}
      <div className="flex items-center justify-between gap-3 flex-wrap rounded-xl border border-border bg-card px-4 py-3 shadow-card">
        <div className="flex items-center gap-3 flex-wrap">
          <div
            className="inline-flex items-center gap-2 h-8 px-3 rounded-full font-mono-nums text-[12.5px] font-semibold"
            style={{
              background: allDone ? "#DCFCE7" : "#EFF6FF",
              color: allDone ? "#15803D" : "#1D4ED8",
            }}
          >
            {allDone && <CheckCircle2 className="w-3.5 h-3.5" />}
            {decisionsMade}/{totalRows} decisions
          </div>
          <div className="flex items-center gap-3 text-[11px] text-[hsl(var(--text-tertiary))]">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ background: "#DC2626" }} /> Pause suggested
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ background: "#EA580C" }} /> Review suggested
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ background: "#F59E0B" }} /> Monitor
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 relative" ref={moreRef}>
          <TooltipProvider delayDuration={120}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span tabIndex={0}>
                  <button
                    onClick={onGenerate}
                    disabled={!anyDecided || isGenerating}
                    className={`inline-flex items-center gap-2 h-9 px-4 rounded-lg text-[13px] font-semibold transition-all btn-press disabled:cursor-not-allowed ${
                      allDone && !generateDone ? "ready-pulse" : ""
                    }`}
                    style={{
                      background: !anyDecided ? "#E5E7EB" : "#2563EB",
                      color: !anyDecided ? "#9CA3AF" : "#FFFFFF",
                      boxShadow: allDone && !generateDone ? "0 0 0 0 rgba(37,99,235,0.5)" : undefined,
                    }}
                  >
                    {isGenerating ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</>
                    ) : generateDone ? (
                      <><CheckCircle2 className="w-4 h-4" /> Downloaded</>
                    ) : allDone ? (
                      <>Generate Amazon file <ArrowRight className="w-3.5 h-3.5" /></>
                    ) : anyDecided ? (
                      <>Generate file ({decisionsMade}/{totalRows})</>
                    ) : (
                      <>Generate Amazon file</>
                    )}
                  </button>
                </span>
              </TooltipTrigger>
              {!anyDecided && (
                <TooltipContent side="bottom">Make at least one decision to generate your file</TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>

          <button
            onClick={() => setMoreOpen(o => !o)}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border bg-card text-[12.5px] text-[hsl(var(--text-secondary))] hover:text-foreground hover:bg-secondary btn-press"
          >
            <MoreHorizontal className="w-4 h-4" />
            More options
          </button>
          {moreOpen && (
            <div className="absolute right-0 top-11 min-w-[260px] rounded-lg border border-border bg-popover shadow-pop p-1 z-30 animate-scale-in">
              <button
                onClick={() => { onDownloadLegacy(); setMoreOpen(false); }}
                className="w-full flex items-center gap-2 px-2.5 py-2 text-[12.5px] text-foreground hover:bg-secondary rounded-md text-left"
              >
                <Download className="w-3.5 h-3.5 text-[hsl(var(--text-tertiary))]" />
                Export decisions as CSV
              </button>
              <button
                onClick={() => {
                  if (confirm("Reset all decisions across every sheet?")) setDecisions({});
                  setMoreOpen(false);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-2 text-[12.5px] text-foreground hover:bg-secondary rounded-md text-left"
              >
                <RotateCcw className="w-3.5 h-3.5 text-[hsl(var(--text-tertiary))]" />
                Reset all decisions
              </button>
              <label className="w-full flex items-center gap-2 px-2.5 py-2 text-[12.5px] text-foreground hover:bg-secondary rounded-md text-left cursor-pointer">
                <UploadIcon className="w-3.5 h-3.5 text-[hsl(var(--text-tertiary))]" />
                Upload decision file manually
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onUploadDecisionFile(f);
                    setMoreOpen(false);
                  }}
                />
              </label>
            </div>
          )}
        </div>
      </div>

      {/* ─── Tab bar ─── */}
      <div className="flex items-end gap-2 overflow-x-auto pb-1">
        {sheetMeta.map(({ sheet, count, spendAtRisk, undecided }) => {
          const isActive = sheet === currentSheet;
          const hasUnresolved = undecided > 0;
          return (
            <button
              key={sheet}
              onClick={() => setActiveSheet(sheet)}
              className={`relative flex flex-col items-start gap-0.5 px-4 py-2.5 rounded-t-lg border transition-all min-w-[140px] btn-press ${
                isActive
                  ? "bg-card border-border border-b-card -mb-px"
                  : "bg-[#F9FAFB] border-transparent hover:bg-[#F3F4F6]"
              }`}
            >
              <div className="flex items-center gap-2 w-full">
                <span className={`text-[13px] ${isActive ? "font-semibold text-foreground" : "font-medium text-[hsl(var(--text-secondary))]"}`}>
                  {shortTabLabel(sheet)}
                </span>
                <span
                  className="ml-auto inline-flex items-center justify-center min-w-[20px] h-[18px] px-1.5 rounded-full text-[10.5px] font-mono-nums font-semibold text-white"
                  style={{ background: isActive ? "#2563EB" : "#9CA3AF" }}
                >
                  {count}
                </span>
                {hasUnresolved && (
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#EA580C" }} aria-label="Unresolved decisions" />
                )}
              </div>
              <span className="text-[11px] text-[hsl(var(--text-tertiary))] font-mono-nums">
                ${Math.round(spendAtRisk).toLocaleString()} at risk
              </span>
            </button>
          );
        })}
      </div>

      {/* ─── Bulk action bar ─── */}
      <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
        <div className="flex items-center justify-between gap-2 px-4 py-2.5 bg-[#F9FAFB] border-b border-border flex-wrap">
          {pauseConfirm ? (
            <div className="flex items-center gap-3 w-full">
              <span className="text-[13px] font-medium text-foreground">
                Pause all {currentRows.length} targets? This cannot be undone in this tool.
              </span>
              <div className="ml-auto flex items-center gap-2">
                <button
                  onClick={confirmPauseAll}
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-[12.5px] font-semibold text-white btn-press"
                  style={{ background: "#DC2626" }}
                >
                  Confirm Pause
                </button>
                <button
                  onClick={() => setPauseConfirm(false)}
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-[12.5px] font-medium border border-border bg-card hover:bg-secondary btn-press"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={applyAISuggestions}
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-[12.5px] font-semibold text-white btn-press"
                  style={{ background: "#2563EB" }}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Apply all AI suggestions
                </button>
                {decisionOptions.includes("Cut Bid 50%") && (
                  <button
                    onClick={() => setAllInSheet("Cut Bid 50%")}
                    className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-[12.5px] font-semibold text-white btn-press"
                    style={{ background: "#F59E0B" }}
                  >
                    Select all → Cut Bid
                  </button>
                )}
                {decisionOptions.includes("Pause") && (
                  <button
                    onClick={() => setPauseConfirm(true)}
                    className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-[12.5px] font-medium border border-border bg-card text-foreground hover:bg-secondary btn-press"
                  >
                    <span className="w-2 h-2 rounded-full" style={{ background: "#DC2626" }} />
                    Select all → Pause
                  </button>
                )}
                {decisionOptions.includes("Keep") && (
                  <button
                    onClick={() => setAllInSheet("Keep")}
                    className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-[12.5px] font-medium border border-border bg-card text-foreground hover:bg-secondary btn-press"
                  >
                    Select all → Keep
                  </button>
                )}
              </div>
              <button
                onClick={() => {
                  const next = { ...decisions };
                  currentRows.forEach((_, idx) => { delete next[`${currentSheet}-ROWINDEX-${idx}`]; });
                  setDecisions(next);
                }}
                className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-[12px] text-[hsl(var(--text-secondary))] hover:text-foreground hover:bg-secondary btn-press"
              >
                <X className="w-3 h-3" /> Clear sheet
              </button>
            </>
          )}
        </div>

        {/* ─── Contextual callout for Search Terms ─── */}
        {isSearchTermSheet && (
          <div className="px-4 py-2.5 bg-[#EFF6FF] border-b border-[#BFDBFE] flex items-start gap-2">
            <Info className="w-4 h-4 text-[#2563EB] mt-px flex-shrink-0" />
            <p className="text-[12.5px] text-[#1E3A8A]">
              <strong>Pause</strong> on search terms auto-converts to <strong>Negate (Exact)</strong> when generating the Amazon file.
            </p>
          </div>
        )}

        {/* ─── Table with frozen first two columns ─── */}
        <div className="review-table-scroll w-full max-h-[60vh] overflow-auto">
          <Table className="w-full review-table">
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b border-border">
                <TableHead className="freeze-col freeze-col-1" style={{ minWidth: 240, letterSpacing: "0.06em" }}>
                  <SortHeader active={sortKey === "campaign"} dir={sortDir} onClick={() => toggleSort("campaign")}>Campaign</SortHeader>
                </TableHead>
                <TableHead className="freeze-col freeze-col-2" style={{ minWidth: 200, letterSpacing: "0.06em" }}>
                  <SortHeader active={sortKey === "entity"} dir={sortDir} onClick={() => toggleSort("entity")}>Entity</SortHeader>
                </TableHead>
                <TableHead style={{ minWidth: 180, letterSpacing: "0.06em" }}>
                  <SortHeader active={sortKey === "ad_group"} dir={sortDir} onClick={() => toggleSort("ad_group")}>Ad Group</SortHeader>
                </TableHead>
                <TableHead style={{ minWidth: 90, letterSpacing: "0.06em" }}>Match</TableHead>
                <TableHead className="text-right" style={{ minWidth: 80, letterSpacing: "0.06em" }}>
                  <SortHeader active={sortKey === "clicks"} dir={sortDir} onClick={() => toggleSort("clicks")} align="right">Clicks</SortHeader>
                </TableHead>
                <TableHead className="text-right" style={{ minWidth: 90, letterSpacing: "0.06em" }}>
                  <SortHeader active={sortKey === "spend"} dir={sortDir} onClick={() => toggleSort("spend")} align="right">Spend</SortHeader>
                </TableHead>
                <TableHead className="text-right" style={{ minWidth: 90, letterSpacing: "0.06em" }}>
                  <SortHeader active={sortKey === "sales"} dir={sortDir} onClick={() => toggleSort("sales")} align="right">Sales</SortHeader>
                </TableHead>
                <TableHead className="text-right" style={{ minWidth: 80, letterSpacing: "0.06em" }}>
                  <SortHeader active={sortKey === "acos"} dir={sortDir} onClick={() => toggleSort("acos")} align="right">ACoS</SortHeader>
                </TableHead>
                <TableHead style={{ minWidth: 130, letterSpacing: "0.06em" }}>
                  <span className="inline-flex items-center gap-1">
                    Suggestion
                    <TooltipProvider delayDuration={150}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button type="button" className="text-[hsl(var(--text-tertiary))] hover:text-foreground" aria-label="Suggestion legend">
                            <HelpCircle className="w-3 h-3" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-[280px] text-[12px] leading-relaxed">
                          <div className="space-y-1.5">
                            <div><strong>Pause</strong>: Zero sales, high spend over threshold period</div>
                            <div><strong>Monitor</strong>: Low sales relative to spend, watch closely</div>
                            <div><strong>Review</strong>: Borderline metrics, human judgment needed</div>
                            <div><strong>None</strong>: Within acceptable performance range</div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </span>
                </TableHead>
                <TableHead style={{ minWidth: 160, letterSpacing: "0.06em" }}>Decision</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedIndices.map((rowIdx) => {
                const row = currentRows[rowIdx];
                const key = `${currentSheet}-ROWINDEX-${rowIdx}`;
                const decision = decisions[key];
                const indicatorClass = decisionRowClass(decision);
                const entityDisplay = row.customer_search_term || row.keyword_text || row.product_targeting || row.entity || "—";
                const sug = suggestB1Row({ clicks: row.clicks ?? 0, spend: row.spend ?? 0, sales: row.sales ?? 0, orders: row.orders ?? 0 });
                const sugStyle = SUGGESTION_PILL_CLASS[sug.kind];
                const acosNum = parseAcosNum(row.acos);
                const hasAcos = acosNum >= 0 && row.acos && row.acos !== "0" && row.acos !== "0%";
                const decisionPill = DECISION_PILL(decision);

                return (
                  <TableRow
                    key={rowIdx}
                    className={`${indicatorClass} transition-opacity`}
                    style={{ opacity: decision ? 0.55 : 1 }}
                  >
                    <TableCell className="freeze-col freeze-col-1 font-medium">
                      <TooltipProvider delayDuration={300}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="block truncate max-w-[230px]">{row.campaign || "—"}</span>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-[420px] break-words text-[12px]">
                            {row.campaign || "—"}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell className="freeze-col freeze-col-2">
                      <TooltipProvider delayDuration={300}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="block whitespace-normal break-words text-[12.5px]">{entityDisplay}</span>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-[420px] break-words text-[12px]">
                            {entityDisplay}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell className="text-[hsl(var(--text-secondary))]">
                      <TooltipProvider delayDuration={300}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="block truncate max-w-[180px]">{row.ad_group || "—"}</span>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-[420px] break-words text-[12px]">
                            {row.ad_group || "—"}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell className="text-[hsl(var(--text-tertiary))] text-[12px]">{row.match_type || "—"}</TableCell>
                    <TableCell className="text-right font-mono-nums text-[12.5px]">{row.clicks}</TableCell>
                    <TableCell className="text-right font-mono-nums text-[12.5px] font-medium">${row.spend.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono-nums text-[12.5px] text-[hsl(var(--text-secondary))]">${row.sales.toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      {hasAcos ? (
                        <span
                          className="inline-block text-[11px] font-mono-nums px-2 py-0.5 rounded-full font-medium text-white"
                          style={{ background: acosNum >= 100 ? "#DC2626" : "#EA580C" }}
                        >
                          {row.acos}
                        </span>
                      ) : (
                        <span className="text-[12px] text-[hsl(var(--text-tertiary))]">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span
                        className="inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: sugStyle.bg, color: sugStyle.color }}
                      >
                        {sugStyle.label}
                      </span>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      {decisionPill ? (
                        <DecisionSelect
                          value={decision}
                          onChange={(val) => setDecision(key, val)}
                          options={decisionOptions}
                          width="100%"
                          renderTrigger={() => (
                            <button
                              type="button"
                              className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[11.5px] font-semibold btn-press transition-transform hover:scale-[1.02]"
                              style={{ background: decisionPill.bg, color: decisionPill.color }}
                            >
                              {decisionPill.label}
                            </button>
                          )}
                        />
                      ) : (
                        <DecisionSelect
                          value={decision}
                          onChange={(val) => setDecision(key, val)}
                          options={decisionOptions}
                          width="100%"
                          placeholder="Decide…"
                        />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};
