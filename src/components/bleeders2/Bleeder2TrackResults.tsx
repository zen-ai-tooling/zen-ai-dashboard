import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  Upload,
  TrendingUp,
  Info,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import type { Bleeder2TrackResult, Bleeder2TrackType } from "@/lib/bleeder2TrackAnalyzer";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { DecisionFileDropzone } from "./DecisionFileDropzone";

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

export const Bleeder2TrackResults: React.FC<Bleeder2TrackResultsProps> = ({
  result,
  onDownload,
  onUploadDecision,
  onAdjustThresholds,
  onUploadNewFile,
  decisionFile,
  amazonFile,
  onDownloadAmazon
}) => {
  const [isSOPOpen, setIsSOPOpen] = useState(false);
  
  // Debug amazonFile prop with deep inspection
  React.useEffect(() => {
    console.log(`[DEBUG] amazonFile useEffect fired for track ${result.trackType}:`, {
      amazonFile: amazonFile,
      hasWorkbook: amazonFile ? !!amazonFile.workbook : false,
      fileName: amazonFile?.fileName,
      type: typeof amazonFile,
    });
  }, [amazonFile, result.trackType]);
  
  console.log(`[DEBUG] Bleeder2TrackResults render:`, {
    trackType: result.trackType,
    hasDecisionFile: !!decisionFile,
    hasAmazonFile: !!amazonFile,
    amazonFile: amazonFile,
    bleedersCount: result.bleeders.length,
  });
  
  const hasBleeders = result.bleeders.length > 0;
  const topSpenders = result.bleeders.slice(0, 3);
  
  // No Action Needed State
  if (!hasBleeders) {
    return (
      <Card className="border-green-500/50 bg-green-50/50 dark:bg-green-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
            <CheckCircle2 className="h-5 w-5" />
            ✅ No Action Needed This Cycle
          </CardTitle>
          <CardDescription>
            {TRACK_LABELS[result.trackType]} — 0 actionable rows detected | $0 at risk
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            No actionable rows were detected based on your thresholds. If that's expected, you can skip this track and proceed to another module.
          </p>
          
          <div className="border rounded-lg p-3 bg-card space-y-2">
            <div className="text-sm font-medium">Thresholds Applied:</div>
            <div className="flex flex-wrap gap-2">
              {result.trackType !== 'ACOS100' && (
                <>
                  <Badge variant="secondary">Margin: {result.marginPercent}%</Badge>
                  <Badge variant="secondary">Buffer: {result.bufferPercent}%</Badge>
                </>
              )}
              <Badge variant="secondary">ACoS ≥ {result.acosThreshold}%</Badge>
              {result.trackType !== 'ACOS100' && (
                <Badge variant="secondary">Orders ≤ {result.lowSalesThreshold}</Badge>
              )}
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              Sheets processed: {result.sheetsProcessed.join(', ')}
            </div>
          </div>
          
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <strong>💡 Tip:</strong> If you expected to find bleeders, verify your column headers (especially <strong>ACoS %</strong>) are correct and ACoS values are numeric. Otherwise, this is good news — your campaigns are performing well!
            </AlertDescription>
          </Alert>
          
          <div className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={onAdjustThresholds} className="flex-1">
              Adjust Thresholds
            </Button>
            <Button variant="outline" onClick={() => onUploadNewFile(result.trackType)} className="flex-1">
              <Upload className="h-4 w-4 mr-2" />
              Upload New File
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Results with Bleeders
  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <Card className="border-orange-500/30 bg-orange-50/30 dark:bg-orange-950/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            ✅ {TRACK_LABELS[result.trackType]} — File Validated Successfully
          </CardTitle>
          <CardDescription>
            {result.bleeders.length} bleeders found | ${result.totalSpend.toFixed(2)} at risk across {result.sheetsProcessed.length} sheet(s)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Thresholds */}
          <div className="border rounded-lg p-3 bg-card space-y-2">
            <div className="text-sm font-medium">Configuration Applied:</div>
            <div className="flex flex-wrap gap-2">
              {result.trackType !== 'ACOS100' && (
                <>
                  <Badge variant="secondary">Margin: {result.marginPercent}%</Badge>
                  <Badge variant="secondary">Buffer: {result.bufferPercent}%</Badge>
                </>
              )}
              <Badge variant="destructive">ACoS Threshold: {result.acosThreshold}%</Badge>
              {result.trackType !== 'ACOS100' && (
                <Badge variant="outline">Orders ≤ {result.lowSalesThreshold}</Badge>
              )}
            </div>
          </div>
          
          {/* Top Spenders */}
          {topSpenders.length > 0 && (
            <div className="border rounded-lg p-3 bg-muted/30">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Top Spenders Among Bleeders</span>
              </div>
              <div className="space-y-1">
                {topSpenders.map((bleeder, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span className="truncate max-w-[200px]">{bleeder.entity}</span>
                    <span className="font-mono text-destructive">${bleeder.spend.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Validation Checklist */}
          <Alert className="bg-green-50/50 dark:bg-green-950/20 border-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription>
              <div className="space-y-1">
                <div className="font-medium text-green-700 dark:text-green-400">✓ Validation Summary</div>
                <ul className="text-xs space-y-0.5 ml-4 text-muted-foreground">
                  <li>✓ Sheets processed: <strong>{result.sheetsProcessed.join(', ')}</strong></li>
                  <li>✓ Column headers normalized and validated</li>
                  <li>✓ ACoS values converted to numeric (% symbols stripped)</li>
                  <li>✓ Filters applied successfully (ACoS ≥ {result.acosThreshold}%{result.trackType !== 'ACOS100' ? `, Orders ≤ ${result.lowSalesThreshold}` : ''})</li>
                  <li>✓ Results sorted by spend (highest first)</li>
                </ul>
              </div>
            </AlertDescription>
          </Alert>
          
          {/* Download Section */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="font-semibold">Download Operator Sheet</h4>
                <p className="text-xs text-muted-foreground">
                  Fill in the "Decision" column and re-upload
                </p>
              </div>
              <Button onClick={onDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download XLSX
              </Button>
            </div>
            
            <Alert variant="default" className="bg-blue-50/50 dark:bg-blue-950/20 border-blue-200">
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Decision Column:</strong> Choose{' '}
                {result.trackType === 'ACOS100' ? (
                  <>
                    <Badge variant="outline" className="mx-1">Turn Off</Badge>
                    <Badge variant="outline" className="mx-1">Cut Bids 50%</Badge>
                    <Badge variant="outline" className="mx-1">Keep</Badge>
                  </>
                ) : result.trackType === 'SBSD' ? (
                  <>
                    <Badge variant="outline" className="mx-1">Negative</Badge>
                    <Badge variant="outline" className="mx-1">Exact</Badge>
                    <Badge variant="outline" className="mx-1">Give it another week</Badge>
                  </>
                ) : (
                  // SP or SP_KEYWORDS
                  <>
                    <Badge variant="outline" className="mx-1">Pause</Badge>
                    <Badge variant="outline" className="mx-1">Reduce Bids</Badge>
                    <Badge variant="outline" className="mx-1">Keep</Badge>
                  </>
                )}
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>
      
      {/* Preview Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Preview (First 10 Rows)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign</TableHead>
                  {result.trackType === 'SBSD' && <TableHead>Ad Group</TableHead>}
                  <TableHead>{result.trackType === 'SP' ? 'Search Term' : 'Entity'}</TableHead>
                  <TableHead className="text-right">Spend</TableHead>
                  {result.trackType !== 'ACOS100' && <TableHead className="text-right">Orders</TableHead>}
                  <TableHead className="text-right">ACoS</TableHead>
                  {result.trackType === 'ACOS100' && <TableHead>Ranking?</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.bleeders.slice(0, 10).map((bleeder, idx) => (
                  <TableRow key={idx} className={bleeder.isRankCampaign ? 'bg-yellow-50 dark:bg-yellow-950/10' : ''}>
                    <TableCell className="font-medium max-w-[200px] truncate">
                      {bleeder.campaignName}
                    </TableCell>
                    {result.trackType === 'SBSD' && (
                      <TableCell className="max-w-[150px] truncate">
                        {bleeder.adGroupName || '—'}
                      </TableCell>
                    )}
                    <TableCell className="max-w-[200px] truncate">
                      {bleeder.entity}
                    </TableCell>
                    <TableCell className="text-right font-mono text-destructive">
                      ${bleeder.spend.toFixed(2)}
                    </TableCell>
                    {result.trackType !== 'ACOS100' && (
                      <TableCell className="text-right">{bleeder.orders}</TableCell>
                    )}
                    <TableCell className="text-right font-mono">
                      {bleeder.acos.toFixed(1)}%
                    </TableCell>
                    {result.trackType === 'ACOS100' && (
                      <TableCell>
                        {bleeder.isRankCampaign ? (
                          <Badge variant="outline" className="bg-yellow-100 dark:bg-yellow-900/30">Yes</Badge>
                        ) : (
                          <span className="text-muted-foreground">No</span>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {result.bleeders.length > 10 && (
            <p className="text-xs text-muted-foreground mt-2">
              Showing 10 of {result.bleeders.length} rows. Download to see all.
            </p>
          )}
        </CardContent>
      </Card>
      
      {/* SOP Instructions */}
      <Card className="border-primary/50 bg-primary/5">
        <CardHeader>
          <Collapsible open={isSOPOpen} onOpenChange={setIsSOPOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                What to do next (SOP)
              </CardTitle>
              {isSOPOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-4 space-y-3">
                <ol className="space-y-2 text-sm list-decimal list-inside">
                  <li className="font-medium">Download the Operator Sheet above</li>
                  <li><strong className="text-primary">Open in Excel/Sheets and fill the Decision column:</strong>
                    <ul className="ml-6 mt-1 space-y-1 list-disc text-muted-foreground">
                      <li><strong>Negate (Exact or Phrase)</strong> — Creates a Negative Keyword (Exact or Phrase) to permanently stop spend on this Search Term or Target. <em>This is the recommended action for high ACoS bleeders.</em></li>
                      <li><strong>Pause</strong> — Stops underperforming Keywords or Product Targets by setting their State to 'Paused'.</li>
                      <li><strong>Keep</strong> — No action is taken. The row will be skipped and not included in the final Bulk Update file.</li>
                      <li><strong>Leave Blank</strong> — No action is taken. The row will be skipped (same as 'Keep').</li>
                    </ul>
                  </li>
                  <li>Save the file and re-upload it below</li>
                  <li>We'll generate an Amazon-ready bulk file (optional)</li>
                  <li>Or implement changes directly in Amazon Ads and archive the report</li>
                </ol>
                
                <Alert variant="default" className="bg-amber-50/50 dark:bg-amber-950/20 border-amber-200">
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    ⚠️ <strong>IMPORTANT NOTE ON PAUSE DECISIONS:</strong> If you enter 'Pause' for an entity that is a <strong>Search Term</strong> (found in the 'SP Search Term Report' track), the system will <strong>automatically convert</strong> this decision to a <strong>'Negate (Exact)'</strong> operation. This is because Search Terms are reporting data, not biddable entities, and cannot be paused directly.
                  </AlertDescription>
                </Alert>
                
                <div className="mt-4">
                  <DecisionFileDropzone
                    onFileUpload={(file) => onUploadDecision(result.trackType, file)}
                    disabled={!!amazonFile}
                    label={decisionFile ? 'Reupload Decision File' : 'Upload Decision File'}
                  />
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </CardHeader>
      </Card>
      
      {/* Amazon File Ready Section */}
      {amazonFile && (
        <Card className="border-green-500/50 bg-green-50/50 dark:bg-green-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400 text-lg">
              <CheckCircle2 className="h-6 w-6" />
              🎉 Workflow Complete — Amazon Bulk File Ready
            </CardTitle>
            <CardDescription className="text-base">
              All steps are complete! Your Amazon-ready bulk upload file has been generated successfully.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="text-sm">✓ Decisions Processed</Badge>
              <Badge variant="secondary" className="text-sm">✓ Amazon File Generated</Badge>
              <Badge variant="secondary" className="text-sm">✓ Ready for Upload</Badge>
            </div>
            
            <Alert className="bg-blue-50/50 dark:bg-blue-950/20 border-blue-300">
              <Info className="h-5 w-5 text-blue-600" />
              <AlertDescription>
                <div className="space-y-3">
                  <div className="font-semibold text-base text-blue-700 dark:text-blue-400">📋 Next Steps:</div>
                  <ol className="text-sm space-y-2 ml-1">
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-blue-600">1️⃣</span>
                      <span>Download the Amazon file using the button below</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-blue-600">2️⃣</span>
                      <span>Go to <strong>Amazon Console → Bulk Operations → Upload</strong></span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-blue-600">3️⃣</span>
                      <span>Upload the file and confirm changes in Amazon</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-blue-600">4️⃣</span>
                      <span>Archive this report for your records</span>
                    </li>
                  </ol>
                </div>
              </AlertDescription>
            </Alert>
            
            <div className="space-y-4 pt-2">
              <Button onClick={onDownloadAmazon} className="w-full" size="lg" variant="default">
                <Download className="h-5 w-5 mr-2" />
                Download Amazon Bulk File
              </Button>
              
              <div className="border-t pt-4">
                <DecisionFileDropzone
                  onFileUpload={(file) => onUploadDecision(result.trackType, file)}
                  variant="compact"
                  label="Reupload Decision File"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
