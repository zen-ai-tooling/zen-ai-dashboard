import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, ChevronDown, ChevronUp, Medal, Loader2, CheckCircle2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useState, useMemo } from "react";
import { ValidationDisplay } from "./ValidationDisplay";
import { WorkflowStepper } from "./WorkflowStepper";

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
  csvData: {
    combined: string;
  };
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
  summary, 
  tables, 
  csvData, 
  brandName, 
  validation, 
  topSpenders, 
  allRows,
  onProceedToProcessor,
  formattedWorkbook,
  diagnostics,
  mode = 'standard'
}: AnalysisResultsProps) => {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    summary: true,
    tables: false,
    downloads: true,
  });
  const [visualHighlights, setVisualHighlights] = useState(true);
  const [tableSections, setTableSections] = useState<Record<string, boolean>>({});
  const [decisions, setDecisions] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateDone, setGenerateDone] = useState(false);

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const toggleTableSection = (tableName: string) => {
    setTableSections(prev => ({ ...prev, [tableName]: !prev[tableName] }));
  };

  const topSpenderTerms = useMemo(() => {
    return topSpenders.map((s, idx) => ({
      term: s.term.toLowerCase().trim(),
      rank: idx + 1
    }));
  }, [topSpenders]);

  const enhancedTables = useMemo(() => {
    if (!visualHighlights) return tables;
    const enhanced: Record<string, string> = {};
    for (const [name, table] of Object.entries(tables)) {
      if (!table.includes('|')) { enhanced[name] = table; continue; }
      const lines = table.split('\n');
      const enhancedLines = lines.map((line, idx) => {
        if (idx < 2 || !line.trim()) return line;
        const topSpenderMatch = topSpenderTerms.find(ts => line.toLowerCase().includes(ts.term));
        if (topSpenderMatch) {
          const medal = topSpenderMatch.rank === 1 ? '🥇' : topSpenderMatch.rank === 2 ? '🥈' : '🥉';
          return line.replace('|', `| ${medal}`);
        }
        return line;
      });
      enhanced[name] = enhancedLines.join('\n');
    }
    return enhanced;
  }, [tables, visualHighlights, topSpenderTerms]);

  // Group allRows by sheet for interactive tables
  const rowsBySheet = useMemo(() => {
    const grouped: Record<string, NormalizedRow[]> = {};
    allRows.forEach(row => {
      if (!grouped[row.sheet]) grouped[row.sheet] = [];
      grouped[row.sheet].push(row);
    });
    return grouped;
  }, [allRows]);

  const decisionsMade = useMemo(() => {
    return Object.values(decisions).filter(d => d && d !== '').length;
  }, [decisions]);

  const handleDownload = () => {
    if (formattedWorkbook) {
      formattedWorkbook.xlsx.writeBuffer().then((buffer: ArrayBuffer) => {
        const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        const date = new Date().toLocaleDateString("en-US", {
          timeZone: "America/Los_Angeles", month: "2-digit", day: "2-digit", year: "numeric",
        }).replace(/\//g, "-");
        const filePrefix = mode === 'lifetime' ? 'B1_LIFETIME_Decisions' : 'Bleeders_1_Report';
        const filename = `${filePrefix}_${brandName || "Account"}_${date}_PT.xlsx`;
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
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
      const date = new Date().toLocaleDateString("en-US", {
        timeZone: "America/Los_Angeles", month: "2-digit", day: "2-digit", year: "numeric",
      }).replace(/\//g, "-");
      const filename = `Bleeders_1_Report_${brandName || "Account"}_${date}_PT.csv`;
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
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
        ws.addRow([
          'Campaign Name', 'Ad Group Name', 'Entity', 'Keyword Text',
          'Product Targeting Expression', 'Match Type', 'Customer Search Term',
          'Decision',
          'Campaign Id', 'Ad Group Id', 'Keyword Id',
          'Product Targeting Id', 'Targeting Id'
        ]);
        rows.forEach((row: any) => {
          ws.addRow([
            row.campaign ?? '',
            row.ad_group ?? '',
            row.entityType ?? row.entity ?? '',
            row.keyword_text ?? '',
            row.product_targeting ?? '',
            row.match_type ?? '',
            row.customer_search_term ?? '',
            row._decision,
            row.campaignId ?? '',
            row.adGroupId ?? '',
            row.keywordId ?? '',
            row.productTargetingId ?? '',
            row.targetingId ?? '',
          ]);
        });
      }

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const date = new Date().toLocaleDateString('en-US', {
        timeZone: 'America/Los_Angeles',
        month: '2-digit', day: '2-digit', year: 'numeric'
      }).replace(/\//g, '-');
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
    <div className="space-y-5 animate-fade-in">
      {/* Lifetime Mode Notice */}
      {mode === 'lifetime' && (
        <Card className="border-blue-500 bg-blue-50 dark:bg-blue-950/30">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🕰️</span>
              <div>
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                  Lifetime Filter Detected
                </h3>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  ✅ Report validated (lifetime view assumed — no date range checks applied).
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">
                  📍 <strong>Recommended cadence:</strong> Monthly audit
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Validation Results */}
      {validation && <ValidationDisplay validation={validation} />}
      
      {/* Diagnostics Panel */}
      {diagnostics && diagnostics.length > 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              🔍 Diagnostics Report
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {diagnostics.filter(d => d.rowsLoaded > 0).map((diag, idx) => (
              <div key={idx} className="border-l-2 border-primary pl-4 space-y-2">
                <h4 className="font-semibold text-foreground">{diag.sheetName}</h4>
                <div className="text-sm space-y-1 text-muted-foreground">
                  <p>• Rows loaded: <strong>{diag.rowsLoaded}</strong></p>
                  <p>• After header normalization: <strong>{diag.afterNormalization}</strong></p>
                  <p>• Actionable entity (keyword/target): <strong>{diag.actionableEntity}</strong></p>
                  <p>• Enabled rows (row+campaign state): <strong>{diag.enabledRows}</strong></p>
                  <p>• Clicks &gt; threshold: <strong>{diag.clicksAboveThreshold}</strong></p>
                  <p>• Sales = $0: <strong>{diag.salesZero}</strong></p>
                  <p className="text-foreground font-semibold">✅ Bleeders in this sheet: <strong className="text-primary">{diag.finalBleeders}</strong></p>
                </div>
                {diag.columnsNormalized.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-muted-foreground">
                      <strong>Columns normalized:</strong> {diag.columnsNormalized.join(' ✓  ')} ✓
                    </p>
                  </div>
                )}
                {diag.coercionsApplied.length > 0 && (
                  <div className="mt-1">
                    <p className="text-xs text-muted-foreground">
                      <strong>Coercions applied:</strong> {diag.coercionsApplied.join(' ✓  ')} ✓
                    </p>
                  </div>
                )}
                {diag.missingColumns.length > 0 && (
                  <div className="mt-2 p-2 bg-destructive/10 border border-destructive/20 rounded">
                    <p className="text-xs text-destructive font-medium">
                      ⚠️ Missing columns: {diag.missingColumns.join(', ')}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
      
      {/* Decision Column Formatting Notice */}
      {formattedWorkbook && allRows.length > 0 && (
        <Card className="border-blue-500 bg-blue-50/50 dark:bg-blue-950/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
                <span className="text-white font-bold">✓</span>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  Your bleeder report has been formatted with industry-standard styling.
                </p>
                <div className="text-xs text-muted-foreground mt-1 space-y-1">
                  <p>
                    The blue <strong>Decision</strong> column is where operators should enter: <code className="bg-muted px-1 rounded">Negate (Exact)</code>, <code className="bg-muted px-1 rounded">Negate (Phrase)</code>, <code className="bg-muted px-1 rounded">Pause</code>, or <code className="bg-muted px-1 rounded">Keep</code>
                  </p>
                  <p className="text-amber-600 dark:text-amber-400">
                    ⚠️ <strong>Note:</strong> 'Pause' on Search Terms auto-converts to 'Negate (Exact)' since Search Terms cannot be paused directly.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Visual Highlights Toggle */}
      <Card className="border shadow-sm">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="visual-highlights" className="text-base font-medium">
                Enable Visual Highlights
              </Label>
              <p className="text-sm text-muted-foreground">
                Show color-coded medals and spend heatmaps for top spenders
              </p>
            </div>
            <Switch
              id="visual-highlights"
              checked={visualHighlights}
              onCheckedChange={setVisualHighlights}
            />
          </div>
        </CardContent>
      </Card>

      {/* Summary Section */}
      <Collapsible open={openSections.summary} onOpenChange={() => toggleSection("summary")}>
        <Card className="border-l-4 border-l-primary shadow-md">
          <CardHeader className="pb-3">
            <CollapsibleTrigger className="flex items-center justify-between w-full hover:opacity-80 transition-opacity">
              <CardTitle className="text-lg flex items-center gap-2">
                🧾 Performance Summary
              </CardTitle>
              {openSections.summary ? (
                <ChevronUp className="w-5 h-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-5 h-5 text-muted-foreground" />
              )}
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{summary}</ReactMarkdown>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Tables Section — Interactive HTML tables when allRows available */}
      <Collapsible open={openSections.tables} onOpenChange={() => toggleSection("tables")}>
        <Card className="border-l-4 border-l-[#FB923C] shadow-md bg-muted/30">
          <CardHeader className="pb-3">
            <CollapsibleTrigger className="flex items-center justify-between w-full hover:opacity-80 transition-opacity">
              <CardTitle className="text-lg flex items-center gap-2">
                Bleeders Tables
              </CardTitle>
              {openSections.tables ? (
                <ChevronUp className="w-5 h-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-5 h-5 text-muted-foreground" />
              )}
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="space-y-6 pt-0">
              {Object.entries(enhancedTables).map(([name, table]) => {
                const isEmpty = !table.includes("|") || table.includes("No bleeders") || table.includes("Tab not found");
                const isOpen = tableSections[name] ?? !isEmpty;
                const sheetRows = rowsBySheet[name] || [];
                const hasInteractiveData = sheetRows.length > 0;
                const decisionOptions = getDecisionOptions(name);
                
                return (
                  <Collapsible key={name} open={isOpen} onOpenChange={() => toggleTableSection(name)}>
                    <div className="space-y-2">
                      <CollapsibleTrigger className="flex items-center justify-between w-full group">
                        <h3 className="font-medium text-base text-foreground flex items-center gap-2">
                          {isOpen ? '▼' : '►'} {name}
                          <span className="text-[11px] text-muted-foreground font-normal font-mono-nums">
                            ({sheetRows.length} rows)
                          </span>
                        </h3>
                      </CollapsibleTrigger>
                      
                      <CollapsibleContent>
                        {hasInteractiveData ? (
                          <div className="overflow-x-auto rounded-lg border border-border bg-card">
                            <Table>
                              <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                  <TableHead className="text-[11px] font-medium uppercase tracking-[0.04em] text-muted-foreground">Campaign</TableHead>
                                  <TableHead className="text-[11px] font-medium uppercase tracking-[0.04em] text-muted-foreground">Ad Group</TableHead>
                                  <TableHead className="text-[11px] font-medium uppercase tracking-[0.04em] text-muted-foreground">Entity</TableHead>
                                  <TableHead className="text-[11px] font-medium uppercase tracking-[0.04em] text-muted-foreground">Match Type</TableHead>
                                  <TableHead className="text-[11px] font-medium uppercase tracking-[0.04em] text-muted-foreground text-right">Clicks</TableHead>
                                  <TableHead className="text-[11px] font-medium uppercase tracking-[0.04em] text-muted-foreground text-right">Spend</TableHead>
                                  <TableHead className="text-[11px] font-medium uppercase tracking-[0.04em] text-muted-foreground text-right">Sales</TableHead>
                                  <TableHead className="text-[11px] font-medium uppercase tracking-[0.04em] text-muted-foreground text-right">ACoS</TableHead>
                                  <TableHead className="text-[11px] font-medium uppercase tracking-[0.04em] text-muted-foreground w-[160px]">Decision</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {sheetRows.map((row, rowIdx) => {
                                  const key = `${name}-ROWINDEX-${rowIdx}`;
                                  const entityDisplay = row.customer_search_term || row.keyword_text || row.product_targeting || row.entity || '—';
                                  return (
                                    <TableRow key={rowIdx} className="hover:bg-secondary/50 transition-colors">
                                      <TableCell className="text-[13px] max-w-[160px] truncate" title={row.campaign}>{row.campaign || '—'}</TableCell>
                                      <TableCell className="text-[13px] max-w-[120px] truncate" title={row.ad_group}>{row.ad_group || '—'}</TableCell>
                                      <TableCell className="text-[13px] max-w-[160px] truncate" title={entityDisplay}>{entityDisplay}</TableCell>
                                      <TableCell className="text-[13px] text-muted-foreground">{row.match_type || '—'}</TableCell>
                                      <TableCell className="text-right text-[13px] font-mono-nums">{row.clicks}</TableCell>
                                      <TableCell className="text-right">
                                        <span className="text-[13px] font-mono-nums text-destructive">${row.spend.toFixed(2)}</span>
                                      </TableCell>
                                      <TableCell className="text-right text-[13px] font-mono-nums">${row.sales.toFixed(2)}</TableCell>
                                      <TableCell className="text-right">
                                        {row.acos && row.acos !== '0' && row.acos !== '0%' ? (
                                          <span className="inline-block text-[11px] font-mono-nums px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive font-medium">
                                            {row.acos}
                                          </span>
                                        ) : (
                                          <span className="text-[13px] text-muted-foreground">—</span>
                                        )}
                                      </TableCell>
                                      <TableCell>
                                        <Select
                                          value={decisions[key] || ''}
                                          onValueChange={(val) => setDecisions(prev => ({ ...prev, [key]: val }))}
                                        >
                                          <SelectTrigger className="h-7 text-[12px] w-[140px]">
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
                        ) : typeof table === "string" && table.includes("|") ? (
                          <div className="overflow-x-auto rounded-lg border border-border bg-background max-h-[520px] overflow-y-auto">
                            <div className="prose prose-sm max-w-none [&_table]:w-full [&_table]:border-separate [&_table]:border-spacing-0 [&_th]:bg-background [&_th]:p-2 [&_th]:text-left [&_th]:font-bold [&_th]:text-xs [&_th]:uppercase [&_th]:tracking-wider [&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:border-b [&_th]:border-border [&_td]:p-2 [&_td]:border-t [&_td]:border-border [&_td]:text-sm [&_tr:nth-child(even)]:bg-muted/20 [&_tr]:hover:bg-muted/40 [&_tr]:transition-colors">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>{table}</ReactMarkdown>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground italic">{table}</p>
                        )}
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                );
              })}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Downloads Section */}
      <Collapsible open={openSections.downloads} onOpenChange={() => toggleSection("downloads")}>
        <Card className="border-l-4 border-l-secondary shadow-md">
          <CardHeader className="pb-3">
            <CollapsibleTrigger className="flex items-center justify-between w-full hover:opacity-80 transition-opacity">
              <CardTitle className="text-lg flex items-center gap-2">
                Downloads
              </CardTitle>
              {openSections.downloads ? (
                <ChevronUp className="w-5 h-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-5 h-5 text-muted-foreground" />
              )}
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="pt-0 space-y-3">
              {/* Generate Decision File */}
              {allRows.length > 0 && (
                <div className="space-y-2">
                  <Button
                    onClick={handleGenerateDecisionFile}
                    disabled={decisionsMade === 0 || isGenerating}
                    className="w-full sm:w-auto gap-2 font-display btn-press min-w-[220px]"
                    size="lg"
                  >
                    {isGenerating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : generateDone ? (
                      <>
                        <CheckCircle2 className="w-5 h-5" />
                        Decision File Downloaded
                      </>
                    ) : (
                      <>
                        <Download className="w-5 h-5" />
                        Generate Decision File
                      </>
                    )}
                  </Button>
                  <p className="text-[12px] text-muted-foreground font-mono-nums">
                    {decisionsMade} decisions made across {allRows.length} rows
                  </p>
                </div>
              )}

              <div className="border-t border-border/60 pt-3">
                <p className="text-sm text-blue-600 dark:text-blue-400 font-medium mb-2">
                  Or download the raw report to enter decisions manually.
                </p>
                <Button
                  onClick={handleDownload}
                  variant="outline"
                  className="w-full sm:w-auto gap-2"
                  size="lg"
                >
                  <Download className="w-5 h-5" />
                  {formattedWorkbook ? 'Download Formatted Excel' : 'Download Combined CSV'}
                </Button>
                <p className="text-sm text-muted-foreground mt-2">
                  Filename: Bleeders_1_Report_{brandName || "Account"}_{new Date().toLocaleDateString("en-US", { timeZone: "America/Los_Angeles", month: "2-digit", day: "2-digit", year: "numeric" }).replace(/\//g, "-")}_PT.{formattedWorkbook ? 'xlsx' : 'csv'}
                </p>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Workflow Stepper */}
      <WorkflowStepper 
        hasBleederData={allRows.length > 0}
        onProceedToProcessor={onProceedToProcessor}
      />

      {/* Footer */}
      <div className="mt-8 pt-4 border-t text-center text-xs text-muted-foreground">
        Built with validated VA SOP logic · Pacific Time · Version 1.1 (Robust Parsing Build)
      </div>
    </div>
  );
};
