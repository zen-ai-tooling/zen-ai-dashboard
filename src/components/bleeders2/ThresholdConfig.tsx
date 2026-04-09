import React, { useState } from 'react';
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
    <div className="space-y-6">
      <div>
        <h2 className="text-[20px] font-semibold text-foreground">Configure Thresholds</h2>
        <p className="text-[13px] text-[hsl(var(--text-secondary))] mt-1">Set your campaign performance parameters.</p>
      </div>

      <div className="grid grid-cols-5 gap-6">
        {/* Left column - Form (55%) */}
        <div className="col-span-3 rounded-xl border border-border bg-card p-6 space-y-5">
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
              className="max-w-[200px] h-10 rounded-lg border-border"
            />
            <p className="text-[12px] text-[hsl(var(--text-tertiary))]">Your break-even ACoS (e.g., 35% means your profit margin is 35%)</p>
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
              className="max-w-[200px] h-10 rounded-lg border-border"
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

          <button
            onClick={handleContinue}
            className="w-full h-11 rounded-lg bg-[hsl(var(--accent-blue))] text-white text-[14px] font-medium btn-press hover:opacity-90 flex items-center justify-center gap-2 mt-4"
            style={{ transition: 'opacity 150ms ease' }}
          >
            Save & Continue <ArrowRight className="w-4 h-4" />
          </button>
          {showSaved && (
            <div className="flex items-center gap-1.5 mt-3 text-[12px] text-[hsl(var(--green))] font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Thresholds saved to {clientName} profile
            </div>
          )}
        </div>

        {/* Right column - Live preview (45%) */}
        <div className="col-span-2">
          <div className="rounded-xl border border-border bg-card p-5 sticky top-20">
            <h3 className="text-[12px] font-medium uppercase tracking-[0.06em] text-[hsl(var(--text-secondary))] mb-5">
              Computed Thresholds
            </h3>

            <div className="space-y-4">
              <div>
                <div className="text-[11px] text-[hsl(var(--text-tertiary))] mb-0.5">SB/SD Threshold</div>
                <div className="text-[28px] font-medium font-mono-nums text-[hsl(var(--accent-blue))]">
                  {sbsdThreshold}%
                </div>
                <div className="text-[11px] text-[hsl(var(--text-tertiary))]">ACoS · {targetACOSNum}% + 10%</div>
              </div>

              <div className="border-t border-border pt-4">
                <div className="text-[11px] text-[hsl(var(--text-tertiary))] mb-0.5">SP Threshold</div>
                <div className="text-[28px] font-medium font-mono-nums text-[hsl(var(--accent-blue))]">
                  {spThreshold}%
                </div>
                <div className="text-[11px] text-[hsl(var(--text-tertiary))]">ACoS · {targetACOSNum}% + 20%</div>
              </div>

              <div className="border-t border-border pt-4">
                <div className="text-[11px] text-[hsl(var(--text-tertiary))] mb-0.5">Orders Filter</div>
                <div className="text-[16px] font-medium font-mono-nums text-foreground">≤ {local.fewerThanOrders}</div>
              </div>

              {local.excludeRanking && (
                <div className="border-t border-border pt-4 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[hsl(var(--green))]" />
                  <span className="text-[12px] text-[hsl(var(--text-secondary))]">Ranking campaigns excluded</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
