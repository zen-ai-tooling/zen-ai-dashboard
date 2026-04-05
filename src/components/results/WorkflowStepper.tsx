import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, Copy, ArrowRight, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface WorkflowStepperProps {
  hasBleederData: boolean;
  onProceedToProcessor?: () => void;
}

export const WorkflowStepper = ({ hasBleederData, onProceedToProcessor }: WorkflowStepperProps) => {
  const [openStages, setOpenStages] = useState<Record<string, boolean>>({
    stage1: true,
    stage2: hasBleederData,
    stage3: false,
  });
  const { toast } = useToast();

  const toggleStage = (stage: string) => {
    setOpenStages(prev => ({ ...prev, [stage]: !prev[stage] }));
  };

  const copyWorkflowSummary = () => {
    const workflowText = `Bleeders 1.0 Workflow Summary

Stage 1: Report Review
✅ Your Bulk Operations file has been analyzed successfully.
- View the Bleeders tables above to confirm flagged campaigns and terms.
- Use "Performance Summary" to quickly understand where your ad spend is leaking.
- Toggle "Enable Visual Highlights" to see high-spend keywords with medals.

Stage 2: Operator Action
⬇️ Download your Bleeders_1_Report_[date]_PT.csv
- Fill in the Decision column for each bleeder row:
  🔴 Negate (Exact or Phrase) → Creates Negative Keyword to stop spend (Recommended)
  🟡 Pause → Stops underperforming Keywords or Targets (NOT for Search Terms!)
  🟢 Keep → No action taken, row skipped
  ⚠️ DO NOT use Pause on Search Terms - will fail on Amazon upload. Use Negate.
  📣 Leave Blank = same as 'Keep'
- Save and close the file before re-uploading it.

Stage 3: Continue Workflow
- Upload your edited CSV/XLSX to the Decision Processor module.
- It will automatically prepare your file for Amazon bulk upload.
- Use the Validator Module to confirm compliance before submission.

Built with VA SOP logic · Pacific Time`;

    navigator.clipboard.writeText(workflowText);
    toast({
      title: "Copied to clipboard",
      description: "Workflow summary copied successfully",
    });
  };

  // No bleeders case
  if (!hasBleederData) {
    return (
      <Card className="border-l-4 border-l-green-500 shadow-md bg-green-50/50 dark:bg-green-950/20">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2 text-green-700 dark:text-green-400">
            <CheckCircle2 className="w-5 h-5" />
            No Bleeders Found!
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            ✅ Great news! No campaigns or keywords are currently bleeding ad spend with zero sales.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            You can skip directly to the next scheduled report cycle.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stage 1: Report Review */}
      <Collapsible open={openStages.stage1} onOpenChange={() => toggleStage("stage1")}>
        <Card className="border-l-4 border-l-blue-500 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <CollapsibleTrigger className="flex items-center justify-between w-full hover:opacity-80 transition-opacity group">
              <CardTitle className="text-base flex items-center gap-2">
                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-500 text-white text-sm font-bold">
                  1
                </span>
                <span className="text-blue-700 dark:text-blue-400">Report Review</span>
              </CardTitle>
              {openStages.stage1 ? (
                <ChevronUp className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
              ) : (
                <ChevronDown className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
              )}
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="pt-0 space-y-3">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Your Bulk Operations file has been analyzed successfully.
                  </p>
                </div>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground ml-7">
                <li className="flex items-start gap-2">
                  <span className="text-foreground">•</span>
                  <span>View the <strong className="text-foreground">Bleeders tables</strong> above to confirm flagged campaigns and terms.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-foreground">•</span>
                  <span>Use <strong className="text-foreground">Performance Summary</strong> to quickly understand where your ad spend is leaking.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-foreground">•</span>
                  <span>Toggle <strong className="text-foreground">Enable Visual Highlights</strong> to see high-spend keywords with medals (🥇🥈🥉).</span>
                </li>
              </ul>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Stage 2: Operator Action */}
      <Collapsible open={openStages.stage2} onOpenChange={() => toggleStage("stage2")}>
        <Card className="border-l-4 border-l-orange-500 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <CollapsibleTrigger className="flex items-center justify-between w-full hover:opacity-80 transition-opacity group">
              <CardTitle className="text-base flex items-center gap-2">
                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-orange-500 text-white text-sm font-bold">
                  2
                </span>
                <span className="text-orange-700 dark:text-orange-400">Operator Action</span>
              </CardTitle>
              {openStages.stage2 ? (
                <ChevronUp className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
              ) : (
                <ChevronDown className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
              )}
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="pt-0 space-y-3">
              <div className="flex items-start gap-2">
                <span className="text-xl">⬇️</span>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Download your Bleeders_1_Report_[date]_PT.csv
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Use the Downloads section above to get your report file.
                  </p>
                </div>
              </div>
              
              <div className="ml-7 space-y-3">
                <p className="text-sm font-medium text-foreground">
                  Fill in the <span className="px-2 py-0.5 bg-muted rounded font-mono text-xs">Decision</span> column for each bleeder row:
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-lg">🔴</span>
                    <span>
                      <strong className="text-foreground">Negate (Exact or Phrase)</strong>
                      <span className="text-muted-foreground"> — Creates a Negative Keyword to stop spend on this Search Term or Target. </span>
                      <span className="text-primary font-medium">(Recommended for high ACoS bleeders)</span>
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-lg">🟡</span>
                    <span>
                      <strong className="text-foreground">Pause</strong>
                      <span className="text-muted-foreground"> — Stops underperforming Keywords or Product Targets by setting their State to 'Paused'.</span>
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-lg">🟢</span>
                    <span>
                      <strong className="text-foreground">Keep</strong>
                      <span className="text-muted-foreground"> — No action is taken. The row will be skipped.</span>
                    </span>
                  </li>
                </ul>
                
                <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 mt-3">
                  <p className="text-xs text-destructive font-medium">
                    ⚠️ <strong>IMPORTANT WARNING — PAUSE FOR SEARCH TERMS:</strong> Do <strong>NOT</strong> use 'Pause' if the row is from a <strong>Search Term Report</strong> (Search Term, or Customer Search Term). Search Terms cannot be paused directly. Using 'Pause' on a Search Term will likely cause the row to <strong>fail on Amazon upload.</strong> You must use <strong>Negate</strong> to take action on a Search Term.
                  </p>
                </div>
                
                <div className="bg-muted/50 border border-border rounded-lg p-3">
                  <p className="text-xs text-muted-foreground font-medium">
                    📣 <strong>IMPORTANT NOTE ON SKIPPING ROWS:</strong> Leaving a cell in the <strong>Decision</strong> column <strong>blank</strong> results in the row being skipped (same as 'Keep').
                  </p>
                </div>
                
                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                  <p className="text-xs text-blue-800 dark:text-blue-200 font-medium">
                    💡 Important: Save and close the file before re-uploading it.
                  </p>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Stage 3: Continue Workflow */}
      <Collapsible open={openStages.stage3} onOpenChange={() => toggleStage("stage3")}>
        <Card className="border-l-4 border-l-purple-500 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <CollapsibleTrigger className="flex items-center justify-between w-full hover:opacity-80 transition-opacity group">
              <CardTitle className="text-base flex items-center gap-2">
                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-purple-500 text-white text-sm font-bold">
                  3
                </span>
                <span className="text-purple-700 dark:text-purple-400">Continue Workflow</span>
              </CardTitle>
              {openStages.stage3 ? (
                <ChevronUp className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
              ) : (
                <ChevronDown className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
              )}
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="pt-0 space-y-3">
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <ArrowRight className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                  <span>
                    When ready, upload your edited CSV or XLSX to the <strong className="text-foreground">Decision Processor module</strong>.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <ArrowRight className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                  <span>
                    It will automatically prepare your file for Amazon bulk upload.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <ArrowRight className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                  <span>
                    After that, use the <strong className="text-foreground">Validator Module</strong> to confirm compliance before submission.
                  </span>
                </li>
              </ul>

              {onProceedToProcessor && (
                <div className="mt-4 pt-4 border-t border-border">
                  <Button
                    onClick={onProceedToProcessor}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white gap-2 animate-pulse hover:animate-none"
                    size="lg"
                  >
                    Proceed to Decision Processor
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                  <p className="text-xs text-center text-muted-foreground mt-2">
                    Upload your edited file with decisions filled in
                  </p>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 pt-2">
        <Button
          onClick={copyWorkflowSummary}
          variant="outline"
          className="gap-2 hover:bg-muted"
        >
          <Copy className="w-4 h-4" />
          Copy Workflow Summary
        </Button>
      </div>

      {/* Footer Note */}
      <p className="text-xs text-center text-muted-foreground pt-2">
        💡 Use the toolbar buttons above for Status, Reupload, and Reset.
      </p>
    </div>
  );
};
