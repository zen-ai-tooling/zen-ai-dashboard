import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export interface Bleeder2Thresholds {
  targetACOS: number;
  clickThreshold?: number;
  fewerThanOrders: number;
  excludeRanking: boolean;
}

interface ThresholdConfigProps {
  thresholds: Bleeder2Thresholds;
  onChange: (thresholds: Bleeder2Thresholds) => void;
  onContinue: () => void;
}

export const ThresholdConfig: React.FC<ThresholdConfigProps> = ({
  thresholds,
  onChange,
  onContinue
}) => {
  const { toast } = useToast();
  const [local, setLocal] = useState(thresholds);
  const [targetACOSRaw, setTargetACOSRaw] = useState<string>(
    String(thresholds.targetACOS ?? 35)
  );
  const [fewerThanOrdersRaw, setFewerThanOrdersRaw] = useState<string>(
    String(thresholds.fewerThanOrders ?? 5)
  );

  const parsePercentOrUndefined = (s: string): number | undefined => {
    if (s.trim() === "") return undefined;
    const n = Number(s.replace(/[%\s]/g, ""));
    return Number.isFinite(n) ? n : undefined;
  };

  const targetACOSNum = parsePercentOrUndefined(targetACOSRaw) ?? local.targetACOS;
  const sbsdThreshold = targetACOSNum + 10;
  const spThreshold = targetACOSNum + 20;

  const normalizeIntInput = (s: string): string => {
    if (s === "") return "";
    s = s.replace(/\D+/g, "");
    s = s.replace(/^0+/, "");
    return s;
  };

  const handleUpdate = (field: keyof Bleeder2Thresholds, value: number | boolean) => {
    const updated = { ...local, [field]: value };
    setLocal(updated);
    onChange(updated);
  };

  const handleContinue = () => {
    const targetNum = parsePercentOrUndefined(targetACOSRaw);
    if (targetNum === undefined) {
      toast({
        title: "Target ACoS Required",
        description: "Please enter a Target ACoS (e.g., 35)",
        variant: "destructive",
      });
      return;
    }
    const finalThresholds = { ...local, targetACOS: targetNum };
    onChange(finalThresholds);
    onContinue();
  };

  return (
    <div className="grid grid-cols-5 gap-8">
      {/* Left column - Form (60%) */}
      <div className="col-span-3 space-y-6">
        <div>
          <h2 className="text-[13px] font-medium text-foreground font-display mb-1">Configure Thresholds</h2>
          <p className="text-[12px] text-muted-foreground">Set your campaign performance parameters.</p>
        </div>

        <div className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="targetACOS" className="text-[13px] font-medium">
              Target ACoS / Break-even ACoS (%)
            </Label>
            <Input
              id="targetACOS"
              type="text"
              inputMode="decimal"
              placeholder="e.g., 35"
              value={targetACOSRaw}
              onChange={(e) => {
                const cleaned = e.target.value.replace(/[^\d.]/g, "");
                setTargetACOSRaw(cleaned);
              }}
              onBlur={() => {
                const n = parsePercentOrUndefined(targetACOSRaw);
                if (n === undefined && targetACOSRaw.trim() !== "") {
                  setTargetACOSRaw("35");
                  handleUpdate('targetACOS', 35);
                } else if (n !== undefined) {
                  const clamped = Math.max(0, Math.min(300, n));
                  setTargetACOSRaw(String(clamped));
                  handleUpdate('targetACOS', clamped);
                }
              }}
              className="max-w-[200px]"
            />
            <p className="text-[11px] text-muted-foreground">
              Your break-even ACoS (e.g., 35% means your profit margin is 35%)
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fewerThanOrders" className="text-[13px] font-medium">
              N or fewer orders
            </Label>
            <Input
              id="fewerThanOrders"
              type="number"
              inputMode="numeric"
              min="1"
              max="999"
              value={fewerThanOrdersRaw}
              onChange={(e) => {
                const v = normalizeIntInput(e.target.value);
                setFewerThanOrdersRaw(v);
              }}
              onBlur={() => {
                if (fewerThanOrdersRaw === "") setFewerThanOrdersRaw("5");
                const n = parseInt(fewerThanOrdersRaw || "5", 10);
                handleUpdate('fewerThanOrders', isNaN(n) ? 5 : n);
              }}
              className="max-w-[200px]"
            />
            <p className="text-[11px] text-muted-foreground">
              Flag items with orders ≤ {local.fewerThanOrders}
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="excludeRanking"
              checked={local.excludeRanking}
              onCheckedChange={(checked) => handleUpdate('excludeRanking', checked as boolean)}
            />
            <Label
              htmlFor="excludeRanking"
              className="text-[13px] font-normal cursor-pointer"
            >
              Exclude campaigns with "rank" in name
            </Label>
          </div>
        </div>

        <Button onClick={handleContinue} className="w-full btn-press">
          Save & Continue
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>

      {/* Right column - Live preview (40%) */}
      <div className="col-span-2">
        <div className="rounded-lg border border-border bg-muted/30 p-5 sticky top-20">
          <h3 className="text-[11px] uppercase tracking-[0.04em] text-muted-foreground font-medium mb-4">
            Computed Thresholds
          </h3>

          <div className="space-y-4">
            <div>
              <div className="text-[11px] text-muted-foreground mb-0.5">SB/SD Threshold</div>
              <div className="text-[22px] font-medium font-mono-nums text-foreground">
                {sbsdThreshold}% <span className="text-[13px] text-muted-foreground font-normal">ACoS</span>
              </div>
              <div className="text-[11px] text-muted-foreground">{targetACOSNum}% + 10%</div>
            </div>

            <div className="border-t border-border pt-4">
              <div className="text-[11px] text-muted-foreground mb-0.5">SP Threshold</div>
              <div className="text-[22px] font-medium font-mono-nums text-foreground">
                {spThreshold}% <span className="text-[13px] text-muted-foreground font-normal">ACoS</span>
              </div>
              <div className="text-[11px] text-muted-foreground">{targetACOSNum}% + 20%</div>
            </div>

            <div className="border-t border-border pt-4">
              <div className="text-[11px] text-muted-foreground mb-0.5">Orders Filter</div>
              <div className="text-[16px] font-medium font-mono-nums text-foreground">
                ≤ {local.fewerThanOrders}
              </div>
            </div>

            {local.excludeRanking && (
              <div className="border-t border-border pt-4 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                <span className="text-[12px] text-muted-foreground">Ranking campaigns excluded</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
