import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Download, ChevronDown, ChevronUp, Medal } from "lucide-react";
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

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const toggleTableSection = (tableName: string) => {
    setTableSections(prev => ({ ...prev, [tableName]: !prev[tableName] }));
  };

  // Get top spender ranks for highlighting
  const topSpenderTerms = useMemo(() => {
    return topSpenders.map((s, idx) => ({
      term: s.term.toLowerCase().trim(),
      rank: idx + 1
    }));
  }, [topSpenders]);

  // Enhance tables with visual highlights
  const enhancedTables = useMemo(() => {
    if (!visualHighlights) return tables;

    const enhanced: Record<string, string> = {};
    
    for (const [name, table] of Object.entries(tables)) {
      if (!table.includes('|')) {
        enhanced[name] = table;
        continue;
      }

      const lines = table.split('\n');
      const enhancedLines = lines.map((line, idx) => {
        if (idx < 2 || !line.trim()) return line; // Skip headers

        // Check if this row contains a top spender
        const topSpenderMatch = topSpenderTerms.find(ts => 
          line.toLowerCase().includes(ts.term)
        );

        if (topSpenderMatch) {
          const medal = topSpenderMatch.rank === 1 ? '🥇' : 
                       topSpenderMatch.rank === 2 ? '🥈' : '🥉';
          return line.replace('|', `| ${medal}`);
        }

        return line;
      });

      enhanced[name] = enhancedLines.join('\n');
    }

    return enhanced;
  }, [tables, visualHighlights, topSpenderTerms]);

  const handleDownload = () => {
    if (formattedWorkbook) {
      // Download formatted Excel with styled Decision column
      formattedWorkbook.xlsx.writeBuffer().then((buffer) => {
        const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        const date = new Date().toLocaleDateString("en-US", {
          timeZone: "America/Los_Angeles",
          month: "2-digit",
          day: "2-digit",
          year: "numeric",
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
      // Fallback to CSV
      const blob = new Blob([csvData.combined], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      const date = new Date().toLocaleDateString("en-US", {
        timeZone: "America/Los_Angeles",
        month: "2-digit",
        day: "2-digit",
        year: "numeric",
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

      {/* Tables Section */}
      <Collapsible open={openSections.tables} onOpenChange={() => toggleSection("tables")}>
        <Card className="border-l-4 border-l-[#FB923C] shadow-md bg-muted/30">
          <CardHeader className="pb-3">
            <CollapsibleTrigger className="flex items-center justify-between w-full hover:opacity-80 transition-opacity">
              <CardTitle className="text-lg flex items-center gap-2">
                🧩 Bleeders Tables
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
                
                return (
                  <Collapsible key={name} open={isOpen} onOpenChange={() => toggleTableSection(name)}>
                    <div className="space-y-2">
                      <CollapsibleTrigger className="flex items-center justify-between w-full group">
                        <h3 className="font-medium text-base text-foreground flex items-center gap-2">
                          {isOpen ? '▼' : '►'} {name}
                        </h3>
                      </CollapsibleTrigger>
                      
                      <CollapsibleContent>
                        {typeof table === "string" && table.includes("|") ? (
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
                📥 Downloads
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
              <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                💡 Your report is ready — download it below to start entering decisions.
              </p>
              <Button
                onClick={handleDownload}
                className="w-full sm:w-auto gap-2 bg-primary hover:bg-primary/90"
                size="lg"
              >
                <Download className="w-5 h-5" />
                {formattedWorkbook ? 'Download Formatted Excel' : 'Download Combined CSV'}
              </Button>
              <p className="text-sm text-muted-foreground mt-4">
                Filename: Bleeders_1_Report_{brandName || "Account"}_{new Date().toLocaleDateString("en-US", { timeZone: "America/Los_Angeles", month: "2-digit", day: "2-digit", year: "numeric" }).replace(/\//g, "-")}_PT.{formattedWorkbook ? 'xlsx' : 'csv'}
              </p>
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
