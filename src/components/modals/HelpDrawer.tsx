import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HelpCircle, FileText, Settings, Clock } from "lucide-react";

interface HelpDrawerProps {
  open: boolean;
  onClose: () => void;
}

export const HelpDrawer = ({ open, onClose }: HelpDrawerProps) => {
  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5" />
            Help & SOP Reference
          </SheetTitle>
          <SheetDescription>
            Quick reference for all available modules and their standard operating procedures
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="overview" className="mt-6">
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="b1">Bleeders 1.0</TabsTrigger>
            <TabsTrigger value="b2">Bleeders 2.0</TabsTrigger>
            <TabsTrigger value="lifetime">Lifetime</TabsTrigger>
            <TabsTrigger value="acos100">ACoS ≥100%</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            <div className="rounded-lg border p-4 bg-muted/30">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Available Modules
              </h3>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="font-medium">🩸 Bleeders 1.0 (60-day, Zero-Sale)</p>
                  <p className="text-muted-foreground">Finds wasted spend on targets with clicks ≥ 10 and 0 sales in the last 60 days.</p>
                </div>
                <div>
                  <p className="font-medium">🧠 Bleeders 2.0 (Low-Sales High-ACoS)</p>
                  <p className="text-muted-foreground">Optimizer for targets with low sales and high ACoS based on configurable thresholds.</p>
                </div>
                <div>
                  <p className="font-medium">🕰️ Bleeding Lifetime Targets</p>
                  <p className="text-muted-foreground">Monthly audit for targets with 10+ lifetime clicks and 0 sales.</p>
                </div>
                <div>
                  <p className="font-medium">📊 Campaigns ≥100% ACoS</p>
                  <p className="text-muted-foreground">Finds campaigns spending more than they earn (ACoS ≥ 100%).</p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border p-4 bg-blue-50 dark:bg-blue-950/30">
              <h3 className="font-semibold mb-2">Quick Commands</h3>
              <ul className="space-y-1 text-sm">
                <li>• Type <code className="bg-muted px-1 rounded">bleeders 1.0</code> to start Bleeders 1.0</li>
                <li>• Type <code className="bg-muted px-1 rounded">bleeders 2.0</code> to start Bleeders 2.0</li>
                <li>• Type <code className="bg-muted px-1 rounded">bleeding lifetime targets</code> for lifetime audit</li>
                <li>• Type <code className="bg-muted px-1 rounded">acos 100</code> for high ACoS campaigns</li>
                <li>• Type <code className="bg-muted px-1 rounded">help</code> to open this drawer</li>
              </ul>
            </div>
          </TabsContent>

          <TabsContent value="b1" className="space-y-4 mt-4">
            <div className="rounded-lg border p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                🩸 Bleeders 1.0 (60-day, Zero-Sale)
              </h3>
              
              <div className="space-y-3 text-sm">
                <div>
                  <p className="font-medium mb-1">📥 Input File</p>
                  <p className="text-muted-foreground">Sponsored Products Search Term or Targeting export (last 60 days)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    📍 Amazon Ads → Campaign Manager → Bulk Operations → Create Spreadsheet (60-day range)
                  </p>
                </div>

                <div>
                  <p className="font-medium mb-1">🎯 Logic</p>
                  <ul className="text-muted-foreground space-y-1">
                    <li>• Clicks ≥ 10</li>
                    <li>• Orders = 0</li>
                    <li>• Date range: Last 60 days</li>
                  </ul>
                </div>

                <div>
                  <p className="font-medium mb-1">⚡ Actions</p>
                  <p className="text-muted-foreground">Negative Exact, or Pause</p>
                </div>

                <div>
                  <p className="font-medium mb-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Cadence
                  </p>
                  <p className="text-muted-foreground">Weekly</p>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="b2" className="space-y-4 mt-4">
            <div className="rounded-lg border p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                🧠 Bleeders 2.0 (Low-Sales High-ACoS)
              </h3>
              
              <div className="space-y-3 text-sm">
                <div>
                  <p className="font-medium mb-1">📥 Input Files</p>
                  <ul className="text-muted-foreground space-y-1">
                    <li>• SB Keywords report</li>
                    <li>• SD Targeting report</li>
                    <li>• SP Search Terms report</li>
                    <li>• SP Targeting/Keywords report</li>
                  </ul>
                  <p className="text-xs text-muted-foreground mt-1">(30-day range recommended)</p>
                </div>

                <div>
                  <p className="font-medium mb-1 flex items-center gap-1">
                    <Settings className="w-3 h-3" />
                    Thresholds
                  </p>
                  <ul className="text-muted-foreground space-y-1">
                    <li>• <strong>SB/SD:</strong> ACoS ≥ target + 10%; Orders &lt; 5</li>
                    <li>• <strong>SP:</strong> ACoS ≥ target + 20%; Orders &lt; 5</li>
                  </ul>
                </div>

                <div>
                  <p className="font-medium mb-1">⚡ Actions</p>
                  <ul className="text-muted-foreground space-y-1">
                    <li>• <strong>SB/SD:</strong> Negative, Exact, Give it another week</li>
                    <li>• <strong>SP Search Terms:</strong> Pause, Reduce Bids, Keep</li>
                    <li>• <strong>SP Keywords:</strong> Pause, Reduce Bids, Keep</li>
                  </ul>
                </div>

                <div>
                  <p className="font-medium mb-1">📝 Notes</p>
                  <p className="text-muted-foreground text-xs">ACoS values are normalized to percentage format for comparison.</p>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="lifetime" className="space-y-4 mt-4">
            <div className="rounded-lg border p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                🕰️ Bleeding Lifetime Targets
              </h3>
              
              <div className="space-y-3 text-sm">
                <div>
                  <p className="font-medium mb-1">📥 Input File</p>
                  <p className="text-muted-foreground">Campaign Manager → Targeting tab → <strong>Lifetime filter</strong> → Export</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    📍 Make sure to select "Lifetime" time period before exporting
                  </p>
                </div>

                <div>
                  <p className="font-medium mb-1">🎯 Logic</p>
                  <ul className="text-muted-foreground space-y-1">
                    <li>• Clicks ≥ 10 (lifetime)</li>
                    <li>• Orders = 0 (lifetime)</li>
                    <li>• No date range constraint</li>
                  </ul>
                </div>

                <div>
                  <p className="font-medium mb-1">⚡ Actions</p>
                  <p className="text-muted-foreground">Pause marked targets</p>
                </div>

                <div>
                  <p className="font-medium mb-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Cadence
                  </p>
                  <p className="text-muted-foreground">Monthly audit</p>
                </div>

                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-3 rounded">
                  <p className="text-xs font-medium text-amber-900 dark:text-amber-100">
                    💡 This catches long-term bleeders that slip past the 60-day window
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="acos100" className="space-y-4 mt-4">
            <div className="rounded-lg border p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                📊 Campaigns ≥100% ACoS
              </h3>
              
              <div className="space-y-3 text-sm">
                <div>
                  <p className="font-medium mb-1">📥 Input File</p>
                  <p className="text-muted-foreground">Campaign Performance export</p>
                </div>

                <div>
                  <p className="font-medium mb-1">🎯 Logic</p>
                  <ul className="text-muted-foreground space-y-1">
                    <li>• Spend &gt; 0</li>
                    <li>• ACoS ≥ 100%</li>
                  </ul>
                </div>

                <div>
                  <p className="font-medium mb-1">⚡ Actions</p>
                  <ul className="text-muted-foreground space-y-1">
                    <li>• Turn Off campaign</li>
                    <li>• Cut bids 50% (Down-only; no placement multipliers)</li>
                    <li>• Keep</li>
                  </ul>
                </div>

                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 p-3 rounded">
                  <p className="text-xs font-medium text-blue-900 dark:text-blue-100">
                    💡 No Configure Thresholds screen for this track — thresholds are fixed at 100% ACoS
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-6 pt-4 border-t">
          <Button onClick={onClose} className="w-full">
            Close Help
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
