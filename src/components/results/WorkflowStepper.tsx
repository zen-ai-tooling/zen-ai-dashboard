import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, Copy, ArrowRight, CheckCircle2, AlertTriangle, Info } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface WorkflowStepperProps {
  hasBleederData: boolean;
  onProceedToProcessor?: () => void;
}

const STAGES = [
  { id: 'stage1', num: 1, title: 'Report review' },
  { id: 'stage2', num: 2, title: 'Operator action' },
  { id: 'stage3', num: 3, title: 'Continue workflow' },
];

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

Stage 1 — Report Review
Your Bulk Operations file has been analyzed. Review the Bleeders tables.

Stage 2 — Operator Action
Download the report, fill the Decision column for each row.
  Negate (Exact/Phrase) — creates Negative Keyword
  Pause — for Keywords/Targets only (NOT Search Terms)
  Keep — no action

Stage 3 — Continue Workflow
Upload edited file to Decision Processor → Validator.

Built with VA SOP logic · Pacific Time`;

    navigator.clipboard.writeText(workflowText);
    toast({ title: "Copied to clipboard", description: "Workflow summary copied" });
  };

  if (!hasBleederData) {
    return (
      <div className="rounded-xl border border-success/30 bg-success/5 p-5 flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-success/15 flex items-center justify-center flex-shrink-0">
          <CheckCircle2 className="w-4 h-4 text-success" strokeWidth={1.8} />
        </div>
        <div>
          <p className="text-[14px] font-semibold text-foreground">No bleeders found</p>
          <p className="text-[12.5px] text-[hsl(var(--text-secondary))] mt-1">
            No campaigns or keywords are bleeding ad spend with zero sales. You can skip to the next scheduled report.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Stage 1 */}
      <Collapsible open={openStages.stage1} onOpenChange={() => toggleStage("stage1")}>
        <Card className="overflow-hidden">
          <CardHeader className="py-3 px-5">
            <CollapsibleTrigger className="flex items-center justify-between w-full btn-press group">
              <div className="flex items-center gap-2.5">
                <StageBadge num={1} />
                <span className="text-[13.5px] font-semibold text-foreground">Report review</span>
              </div>
              {openStages.stage1
                ? <ChevronUp className="w-4 h-4 text-[hsl(var(--text-tertiary))] group-hover:text-foreground" />
                : <ChevronDown className="w-4 h-4 text-[hsl(var(--text-tertiary))] group-hover:text-foreground" />
              }
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="pt-0 px-5 pb-5 space-y-2.5">
              <div className="flex items-start gap-2 text-[13px]">
                <CheckCircle2 className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                <p className="text-foreground font-medium">Your Bulk Operations file has been analyzed.</p>
              </div>
              <ul className="space-y-1.5 text-[12.5px] text-[hsl(var(--text-secondary))] ml-6 list-disc list-outside marker:text-[hsl(var(--text-tertiary))]">
                <li>View the <span className="text-foreground font-medium">Bleeders tables</span> to confirm flagged campaigns.</li>
                <li>Use <span className="text-foreground font-medium">Performance Summary</span> to spot ad-spend leaks fast.</li>
                <li>Top spenders are highlighted in the stats bar.</li>
              </ul>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Stage 2 */}
      <Collapsible open={openStages.stage2} onOpenChange={() => toggleStage("stage2")}>
        <Card className="overflow-hidden">
          <CardHeader className="py-3 px-5">
            <CollapsibleTrigger className="flex items-center justify-between w-full btn-press group">
              <div className="flex items-center gap-2.5">
                <StageBadge num={2} />
                <span className="text-[13.5px] font-semibold text-foreground">Operator action</span>
              </div>
              {openStages.stage2
                ? <ChevronUp className="w-4 h-4 text-[hsl(var(--text-tertiary))] group-hover:text-foreground" />
                : <ChevronDown className="w-4 h-4 text-[hsl(var(--text-tertiary))] group-hover:text-foreground" />
              }
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="pt-0 px-5 pb-5 space-y-3">
              <p className="text-[13px] text-foreground font-medium">Download Bleeders_1_Report_[date]_PT.xlsx and fill the <span className="font-mono-nums px-1.5 py-0.5 bg-secondary rounded text-[12px]">Decision</span> column.</p>
              <div className="space-y-1.5 text-[12.5px] ml-1">
                <DecisionRow color="hsl(var(--destructive))" label="Negate (Exact/Phrase)" desc="Creates a Negative Keyword to stop spend on this Search Term or Target." recommended />
                <DecisionRow color="hsl(var(--amber))" label="Pause" desc="Stops underperforming Keywords or Product Targets (sets State to Paused)." />
                <DecisionRow color="hsl(var(--success))" label="Keep" desc="No action taken, row is skipped." />
              </div>

              <div className="rounded-lg border border-destructive/25 bg-destructive/5 px-3.5 py-2.5 flex items-start gap-2 mt-3">
                <AlertTriangle className="w-3.5 h-3.5 text-destructive mt-0.5 flex-shrink-0" />
                <p className="text-[12px] text-foreground leading-relaxed">
                  <span className="font-semibold">Don't use Pause on Search Terms.</span> They can't be paused — Amazon will reject the upload. Use <span className="font-medium">Negate</span> instead.
                </p>
              </div>

              <div className="rounded-lg border border-border bg-secondary/60 px-3.5 py-2.5 flex items-start gap-2">
                <Info className="w-3.5 h-3.5 text-[hsl(var(--text-tertiary))] mt-0.5 flex-shrink-0" />
                <p className="text-[12px] text-[hsl(var(--text-secondary))]">
                  Leaving a Decision blank skips the row (same as Keep). Save and close the file before re-uploading.
                </p>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Stage 3 */}
      <Collapsible open={openStages.stage3} onOpenChange={() => toggleStage("stage3")}>
        <Card className="overflow-hidden">
          <CardHeader className="py-3 px-5">
            <CollapsibleTrigger className="flex items-center justify-between w-full btn-press group">
              <div className="flex items-center gap-2.5">
                <StageBadge num={3} />
                <span className="text-[13.5px] font-semibold text-foreground">Continue workflow</span>
              </div>
              {openStages.stage3
                ? <ChevronUp className="w-4 h-4 text-[hsl(var(--text-tertiary))] group-hover:text-foreground" />
                : <ChevronDown className="w-4 h-4 text-[hsl(var(--text-tertiary))] group-hover:text-foreground" />
              }
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="pt-0 px-5 pb-5 space-y-3">
              <ul className="space-y-2 text-[12.5px] text-[hsl(var(--text-secondary))]">
                <li className="flex items-start gap-2">
                  <ArrowRight className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                  <span>Upload your edited file to the <span className="text-foreground font-medium">Decision Processor</span>.</span>
                </li>
                <li className="flex items-start gap-2">
                  <ArrowRight className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                  <span>It prepares your file for Amazon bulk upload.</span>
                </li>
                <li className="flex items-start gap-2">
                  <ArrowRight className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                  <span>Use the <span className="text-foreground font-medium">Validator</span> to confirm compliance before submission.</span>
                </li>
              </ul>

              {onProceedToProcessor && (
                <div className="pt-3 border-t border-border flex justify-end">
                  <Button onClick={onProceedToProcessor} className="gap-1.5">
                    Proceed to Decision Processor
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <div className="flex justify-end pt-2">
        <Button onClick={copyWorkflowSummary} variant="outline" size="sm" className="gap-1.5">
          <Copy className="w-3.5 h-3.5" />
          Copy summary
        </Button>
      </div>
    </div>
  );
};

const StageBadge: React.FC<{ num: number }> = ({ num }) => (
  <span className="w-6 h-6 rounded-md bg-secondary text-foreground font-semibold text-[12px] flex items-center justify-center font-mono-nums">
    {num}
  </span>
);

const DecisionRow: React.FC<{ color: string; label: string; desc: string; recommended?: boolean }> = ({ color, label, desc, recommended }) => (
  <div className="flex items-start gap-2 py-1">
    <span className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: color }} />
    <div className="flex-1 min-w-0">
      <span className="text-foreground font-medium">{label}</span>
      <span className="text-[hsl(var(--text-secondary))]"> — {desc}</span>
      {recommended && <span className="ml-1.5 text-[10px] uppercase tracking-wider text-primary font-semibold">Recommended</span>}
    </div>
  </div>
);
