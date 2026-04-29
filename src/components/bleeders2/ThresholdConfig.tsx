import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowRight, CheckCircle2, Info } from "lucide-react";
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
  clientName: string;
}

export const ThresholdConfig: React.FC<ThresholdConfigProps> = ({
  thresholds, onChange, onContinue, clientName
}) => {
  const { toast } = useToast();
  const [local, setLocal] = useState(thresholds);
  const [targetACOSRaw, setTargetACOSRaw] = useState<string>(String(thresholds.targetACOS ?? 35));
  const [fewerThanOrdersRaw, setFewerThanOrdersRaw] = useState<string>(String(thresholds.fewerThanOrders ?? 5));
  const [showSaved, setShowSaved] = useState(false);

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
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 2000);
    const targetNum = parsePercentOrUndefined(targetACOSRaw);
    if (targetNum === undefined) {
      toast({ title: "Target ACoS Required", description: "Please enter a Target ACoS (e.g., 35)", variant: "destructive" });
      setShowSaved(false);
      return;
    }
    const finalThresholds = { ...local, targetACOS: targetNum };
    onChange(finalThresholds);
    onContinue();
  };

  return (
    <div className="min-h-[calc(100vh-220px)] flex items-center justify-center py-8">
      <div className="w-full max-w-[920px] space-y-5">
        <div className="text-center">
          <h2 className="text-[22px] font-semibold text-foreground tracking-tight">Configure Thresholds</h2>
          <p className="text-[13px] text-[hsl(var(--text-secondary))] mt-1">Set your campaign performance parameters.</p>
        </div>

        <div className="grid grid-cols-5 gap-4">
          {/* Left — Form (60%) */}
          <div className="col-span-3 space-y-4">
            <div className="rounded-xl border border-border bg-card p-6 space-y-5 shadow-card">
              <div className="space-y-1.5">
                <Label htmlFor="targetACOS" className="text-[12px] font-medium text-foreground">
                  Target ACoS / Break-even ACoS (%)
                </Label>
                <Input
                  id="targetACOS"
                  type="text"
                  inputMode="decimal"
                  placeholder="e.g., 35"
                  value={targetACOSRaw}
                  onChange={(e) => setTargetACOSRaw(e.target.value.replace(/[^\d.]/g, ""))}
                  onBlur={() => {
                    const n = parsePercentOrUndefined(targetACOSRaw);
                    if (n === undefined && targetACOSRaw.trim() !== "") { setTargetACOSRaw("35"); handleUpdate('targetACOS', 35); }
                    else if (n !== undefined) { const c = Math.max(0, Math.min(300, n)); setTargetACOSRaw(String(c)); handleUpdate('targetACOS', c); }
                  }}
                  className="w-full h-10 rounded-lg border-border"
                />
                <p className="text-[12px] text-[hsl(var(--text-tertiary))]">
                  Your break-even ACoS (e.g., 35% means your profit margin is 35%)
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="fewerThanOrders" className="text-[12px] font-medium text-foreground">
                  N or fewer orders
                </Label>
                <Input
                  id="fewerThanOrders"
                  type="number"
                  inputMode="numeric"
                  min="1" max="999"
                  value={fewerThanOrdersRaw}
                  onChange={(e) => setFewerThanOrdersRaw(normalizeIntInput(e.target.value))}
                  onBlur={() => {
                    if (fewerThanOrdersRaw === "") setFewerThanOrdersRaw("5");
                    const n = parseInt(fewerThanOrdersRaw || "5", 10);
                    handleUpdate('fewerThanOrders', isNaN(n) ? 5 : n);
                  }}
                  className="w-full h-10 rounded-lg border-border"
                />
                <p className="text-[12px] text-[hsl(var(--text-tertiary))]">Flag items with orders ≤ {local.fewerThanOrders}</p>
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <Checkbox
                  id="excludeRanking"
                  checked={local.excludeRanking}
                  onCheckedChange={(checked) => handleUpdate('excludeRanking', checked as boolean)}
                />
                <Label htmlFor="excludeRanking" className="text-[13px] font-normal cursor-pointer">
                  Exclude campaigns with "rank" in name
                </Label>
              </div>
            </div>

            {/* How this works helper */}
            <p className="flex items-center gap-1.5 text-[12px] text-[#86868B] px-1">
              <Info className="w-3 h-3" strokeWidth={1.8} />
              SB/SD campaigns use Target ACoS + 10%. SP campaigns use Target ACoS + 20%.
            </p>
          </div>

          {/* Right — Live preview (40%) */}
          <div className="col-span-2">
            <div className="rounded-xl border border-border bg-card p-5 shadow-card sticky top-20">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[hsl(var(--text-secondary))] mb-5">
                Computed Thresholds
              </h3>

              <div className="space-y-4">
                <div>
                  <div className="text-[11px] text-[hsl(var(--text-tertiary))] mb-0.5">SB/SD Threshold</div>
                  <div
                    key={`sbsd-${sbsdThreshold}`}
                    className="text-[28px] font-medium font-mono-nums text-[hsl(var(--accent-blue))] num-transition animate-fade-in"
                  >
                    {sbsdThreshold}%
                  </div>
                  <div className="text-[11px] text-[hsl(var(--text-tertiary))]">ACoS · {targetACOSNum}% + 10%</div>
                </div>

                <div className="border-t border-border pt-4">
                  <div className="text-[11px] text-[hsl(var(--text-tertiary))] mb-0.5">SP Threshold</div>
                  <div
                    key={`sp-${spThreshold}`}
                    className="text-[28px] font-medium font-mono-nums text-[hsl(var(--accent-blue))] num-transition animate-fade-in"
                  >
                    {spThreshold}%
                  </div>
                  <div className="text-[11px] text-[hsl(var(--text-tertiary))]">ACoS · {targetACOSNum}% + 20%</div>
                </div>

                <div className="border-t border-border pt-3 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[12px] text-[#86868B]">
                    <CheckCircle2 className="w-3 h-3 text-[#86868B]" strokeWidth={2} />
                    <span>Orders filter: ≤ {local.fewerThanOrders}</span>
                  </div>
                  {local.excludeRanking && (
                    <div className="flex items-center gap-1.5 text-[12px] text-[#86868B]">
                      <CheckCircle2 className="w-3 h-3 text-[#86868B]" strokeWidth={2} />
                      <span>Ranking campaigns excluded</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Externalized CTA — sits below both panels, right-aligned */}
        <div className="flex flex-col items-end gap-1.5 pt-2">
          <button
            onClick={handleContinue}
            className="btn-primary-action btn-press"
          >
            Save & Continue <ArrowRight className="w-4 h-4" />
          </button>
          {showSaved && (
            <div className="flex items-center gap-1.5 text-[12px] text-[hsl(var(--green))] font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Thresholds saved to {clientName} profile
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
