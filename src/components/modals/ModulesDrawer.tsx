import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Settings2, CheckCircle2, Clock } from "lucide-react";

interface Module {
  icon: string;
  name: string;
  description: string;
  status: "active" | "coming-soon";
  onStart?: () => void;
}

interface ModulesDrawerProps {
  onStartBleeder?: () => void;
  onStartBleeder2?: () => void;
  onStartLifetimeBleeders?: () => void;
}

export const ModulesDrawer = ({ onStartBleeder, onStartBleeder2, onStartLifetimeBleeders }: ModulesDrawerProps) => {
  const modules: Module[] = [
    {
      icon: "🩸",
      name: "Bleeder 1.0",
      description: "Finds wasted spend (Clicks > 10, Sales = 0).",
      status: "active",
      onStart: onStartBleeder,
    },
    {
      icon: "🧠",
      name: "Decision Processor",
      description: "Converts VA decisions to Amazon upload format.",
      status: "active",
    },
    {
      icon: "📊",
      name: "Bleeders 2.0",
      description: "Low orders & high ACoS cleanup with bid controls.",
      status: "active",
      onStart: onStartBleeder2,
    },
    {
      icon: "🕰️",
      name: "Bleeding Lifetime Targets",
      description: "Targets with 10+ clicks and 0 sales over lifetime. Run monthly.",
      status: "active",
      onStart: onStartLifetimeBleeders,
    },
    {
      icon: "🧾",
      name: "Audit Report",
      description: "Reviews active campaigns for compliance.",
      status: "coming-soon",
    },
    {
      icon: "🧮",
      name: "Cost Optimizer",
      description: "Calculates ACoS thresholds by SKU.",
      status: "coming-soon",
    },
    {
      icon: "🧱",
      name: "Creative Analyzer",
      description: "Detects missing assets in ad groups.",
      status: "coming-soon",
    },
    {
      icon: "🔁",
      name: "Bid Resetter",
      description: "Dynamically resets paused ad bids.",
      status: "coming-soon",
    },
    {
      icon: "📂",
      name: "Archive Manager",
      description: "Moves processed files to date-stamped folders.",
      status: "coming-soon",
    },
  ];

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings2 className="w-4 h-4" />
          Modules
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>⚙️ Command Palette</SheetTitle>
          <SheetDescription>
            Select a workflow module to start. More tools coming soon.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-3">
          {modules.map((module, idx) => (
            <div
              key={idx}
              className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  <span className="text-2xl flex-shrink-0">{module.icon}</span>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
                      {module.name}
                      {module.status === "active" ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                      ) : (
                        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                      )}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {module.description}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={module.status === "active" ? "default" : "outline"}
                  disabled={module.status === "coming-soon"}
                  onClick={module.onStart}
                  className="flex-shrink-0"
                >
                  {module.status === "active" ? "▶️ Start" : "🕓 Soon"}
                </Button>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-xs text-blue-700 dark:text-blue-300">
            <strong>Tip:</strong> Type "help" or "modules" in the chat anytime to see available tools.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
};
