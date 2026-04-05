import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2, AlertCircle, RefreshCw, Pause, Ban, Scissors, ChevronDown, Copy, FileText } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import type { Decision2ProcessorResult } from '@/lib/decision2Processor';
import { Badge } from '@/components/ui/badge';

interface Decision2ProcessorResultsProps {
  result: Decision2ProcessorResult;
  onReupload: () => void;
}

export const Decision2ProcessorResults: React.FC<Decision2ProcessorResultsProps> = ({
  result,
  onReupload
}) => {
  const [showAutoRepairs, setShowAutoRepairs] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  
  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };
  
  if (result.validation.errors.length > 0) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            Processing Failed
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Cannot Process</AlertTitle>
            <AlertDescription className="space-y-2 whitespace-pre-line">
              {result.validation.errors.map((error, idx) => (
                <p key={idx}>{error}</p>
              ))}
            </AlertDescription>
          </Alert>
          
          <div className="text-sm text-muted-foreground">
            <p className="font-medium mb-2">Common fixes:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Ensure the Decision column contains valid values: Pause, Negative, Cut Bid, or Keep</li>
              <li>Check that you uploaded the Bleeders 2.0 operator sheet</li>
              <li>Verify the sheet exists and has data rows</li>
              <li>Close the file in Excel/Sheets before uploading</li>
            </ul>
          </div>
          
          <Button onClick={onReupload} className="w-full" variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Reupload Decision File
          </Button>
        </CardContent>
      </Card>
    );
  }
  
  if (result.validation.warnings.some(w => w.includes('No actionable rows'))) {
    return (
      <Card className="border-blue-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-600">
            <AlertCircle className="h-5 w-5" />
            Nothing to Do
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="bg-blue-50 dark:bg-blue-950/30 border-blue-200">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription>
              All rows marked <strong>Keep</strong>. If expected, you're done. Otherwise, adjust thresholds or re-review.
            </AlertDescription>
          </Alert>
          
          <Button onClick={onReupload} variant="outline" className="w-full">
            <RefreshCw className="mr-2 h-4 w-4" />
            Reupload Decision File
          </Button>
        </CardContent>
      </Card>
    );
  }
  
  const totalActions = result.summary.pausedCount + result.summary.negativesCreated + result.summary.bidsCutCount;
  
  return (
    <div className="space-y-4">
      {/* Auto-Validation */}
      <Card className="border-blue-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-600">
            <CheckCircle2 className="h-5 w-5" />
            Auto-Validation Checklist
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span>✅ File structure verified</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span>✅ Decision logic validated</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span>✅ Actions processed successfully</span>
            </div>
            
            {result.autoRepairs.length > 0 && (
              <div className="mt-3">
                <button
                  onClick={() => setShowAutoRepairs(!showAutoRepairs)}
                  className="flex items-center gap-2 text-yellow-600 hover:text-yellow-700 font-medium"
                >
                  <AlertCircle className="h-4 w-4" />
                  <span>⚠️ Auto-repairs applied: {result.autoRepairs.reduce((sum, r) => sum + r.count, 0)}</span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${showAutoRepairs ? 'rotate-180' : ''}`} />
                </button>
                
                {showAutoRepairs && (
                  <div className="mt-2 ml-6 space-y-1 text-muted-foreground">
                    {result.autoRepairs.map((repair, idx) => (
                      <div key={idx}>• {repair.details}</div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Action Plan Complete */}
      <Card className="border-green-500 bg-green-50/50 dark:bg-green-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-600">
            <CheckCircle2 className="h-6 w-6" />
            🎯 Action Plan Ready!
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded-lg p-3">
            <p className="text-sm font-medium text-green-800 dark:text-green-200">
              Your Bleeders 2.0 Action Plan is ready with {totalActions} action(s) to implement in Amazon console.
            </p>
          </div>
          
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30">
              <Pause className="h-5 w-5 text-blue-600" />
              <div>
                <div className="text-2xl font-bold text-blue-600">{result.summary.pausedCount}</div>
                <div className="text-xs text-muted-foreground">Pause</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-950/30">
              <Ban className="h-5 w-5 text-red-600" />
              <div>
                <div className="text-2xl font-bold text-red-600">{result.summary.negativesCreated}</div>
                <div className="text-xs text-muted-foreground">Negatives</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 rounded-lg bg-orange-50 dark:bg-orange-950/30">
              <Scissors className="h-5 w-5 text-orange-600" />
              <div>
                <div className="text-2xl font-bold text-orange-600">{result.summary.bidsCutCount}</div>
                <div className="text-xs text-muted-foreground">Bids Cut</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-950/30">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <div>
                <div className="text-2xl font-bold text-green-600">{result.summary.keptCount}</div>
                <div className="text-xs text-muted-foreground">Kept</div>
              </div>
            </div>
          </div>
          
          {/* Console Action Steps */}
          <Accordion type="single" collapsible className="w-full">
            {result.summary.pausedCount > 0 && (
              <AccordionItem value="pause">
                <AccordionTrigger>
                  <div className="flex items-center gap-2">
                    <Pause className="h-4 w-4 text-blue-600" />
                    <span>1) Pause Actions ({result.summary.pausedCount})</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3 text-sm">
                    <Alert>
                      <FileText className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Console Steps:</strong>
                        <ol className="list-decimal list-inside mt-2 ml-2 space-y-1">
                          <li>Open Campaign Manager</li>
                          <li>Locate Campaign (use search)</li>
                          <li>Go to Ad Group → Targeting tab</li>
                          <li>Search for the keyword/target and set <strong>State = Paused</strong></li>
                        </ol>
                      </AlertDescription>
                    </Alert>
                    <Badge variant="secondary" className="w-full justify-center">
                      Review your decision file for campaign & target details
                    </Badge>
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}
            
            {result.summary.bidsCutCount > 0 && (
              <AccordionItem value="bids">
                <AccordionTrigger>
                  <div className="flex items-center gap-2">
                    <Scissors className="h-4 w-4 text-orange-600" />
                    <span>2) Bid Cut Actions ({result.summary.bidsCutCount})</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3 text-sm">
                    <Alert>
                      <FileText className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Console Steps:</strong>
                        <ol className="list-decimal list-inside mt-2 ml-2 space-y-1">
                          <li>Open Campaign Manager → locate Campaign</li>
                          <li>Go to Ad Group → Targeting tab</li>
                          <li>Find the keyword/target</li>
                          <li>Reduce current bid by <strong>50%</strong> (or your custom %)</li>
                        </ol>
                      </AlertDescription>
                    </Alert>
                    <Badge variant="secondary" className="w-full justify-center">
                      If bid not in file, manually reduce current bid by 50%
                    </Badge>
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}
            
            {result.summary.negativesCreated > 0 && (
              <AccordionItem value="negatives">
                <AccordionTrigger>
                  <div className="flex items-center gap-2">
                    <Ban className="h-4 w-4 text-red-600" />
                    <span>3) Negative Exact Actions ({result.summary.negativesCreated})</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3 text-sm">
                    <Alert>
                      <FileText className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Console Steps (SP Search Terms):</strong>
                        <ol className="list-decimal list-inside mt-2 ml-2 space-y-1">
                          <li>Open Campaign Manager → Campaign → Ad Group</li>
                          <li>Go to <strong>Negative keywords</strong> tab</li>
                          <li>Choose <strong>Negative Exact</strong></li>
                          <li>Paste <strong>Customer Search Term</strong></li>
                          <li>Save</li>
                        </ol>
                      </AlertDescription>
                    </Alert>
                    <Badge variant="secondary" className="w-full justify-center">
                      For SP Targeting keywords: same flow but use keyword text
                    </Badge>
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}
          </Accordion>
          
          <Alert>
            <AlertDescription className="text-xs">
              💡 <strong>Tip:</strong> Keep this Action Plan for your records. Archive in <code className="bg-muted px-1 rounded">/Bleeders/Archive/[date]</code>.
            </AlertDescription>
          </Alert>
          
          <Button onClick={onReupload} variant="outline" className="w-full">
            <RefreshCw className="mr-2 h-4 w-4" />
            Reupload Decision File
          </Button>
        </CardContent>
      </Card>
      
      {/* Continue Section */}
      <Card className="border-blue-400">
        <CardHeader>
          <CardTitle className="text-base">⚙️ Continue or Start a New Task</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button variant="outline" onClick={() => window.location.reload()} className="justify-start">
              <RefreshCw className="mr-2 h-4 w-4" />
              Run Bleeders 2.0 Again
            </Button>
            <Button variant="outline" onClick={() => window.location.reload()} className="justify-start">
              <RefreshCw className="mr-2 h-4 w-4" />
              Start Bleeders 1.0
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Use the toolbar or type commands to proceed.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};