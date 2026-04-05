import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export interface Bleeder2Thresholds {
  targetACOS: number; // renamed from brandMargin for clarity
  clickThreshold?: number; // legacy, not used in UI anymore
  fewerThanOrders: number; // default 5 (was minOrders/maxOrders)
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
  
  // Parse percentage input or return undefined if empty
  const parsePercentOrUndefined = (s: string): number | undefined => {
    if (s.trim() === "") return undefined;
    const n = Number(s.replace(/[%\s]/g, ""));
    return Number.isFinite(n) ? n : undefined;
  };
  
  // SOP: SBSD uses targetACOS + 10%, SP uses targetACOS + 20%
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
    // Update with final parsed value
    const finalThresholds = { ...local, targetACOS: targetNum };
    onChange(finalThresholds);
    onContinue();
  };
  
  return (
    <div className="space-y-4">
      <Card className="border-primary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Configure Thresholds
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="targetACOS">Target ACoS / Break-even ACoS (%)</Label>
              <Input
                id="targetACOS"
                type="text"
                inputMode="decimal"
                placeholder="e.g., 35"
                value={targetACOSRaw}
                onChange={(e) => {
                  const raw = e.target.value;
                  const cleaned = raw.replace(/[^\d.]/g, "");
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
              />
              <p className="text-xs text-muted-foreground">
                Your break-even ACoS (e.g., 35% means your profit margin is 35%)
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="fewerThanOrders">N or fewer orders</Label>
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
              />
              <p className="text-xs text-muted-foreground">
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
                className="text-sm font-normal cursor-pointer"
              >
                Exclude campaigns with "rank" in name (for ACoS ≥100% track)
              </Label>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="gap-1">
                <Sparkles className="h-3 w-3" />
                SB/SD Threshold: {sbsdThreshold}% ACoS ({targetACOSNum}% + 10%)
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="gap-1">
                <Sparkles className="h-3 w-3" />
                SP Threshold: {spThreshold}% ACoS ({targetACOSNum}% + 20%)
              </Badge>
            </div>
          </div>
          
          <Button onClick={handleContinue} className="w-full">
            Save & Continue → Upload Reports
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
