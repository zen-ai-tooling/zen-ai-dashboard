import { Info, RefreshCw, Trash2, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModulesDrawer } from "@/components/modals/ModulesDrawer";

interface HeaderToolbarProps {
  onStatus: () => void;
  onReupload: () => void;
  onReset: () => void;
  onHelp: () => void;
  onStartBleeder?: () => void;
  onStartBleeder2?: () => void;
  onStartLifetimeBleeders?: () => void;
}

export const HeaderToolbar = ({ onStatus, onReupload, onReset, onHelp, onStartBleeder, onStartBleeder2, onStartLifetimeBleeders }: HeaderToolbarProps) => {
  return (
    <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 py-3 px-6 shadow-sm">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-2.5 w-2.5 rounded-sm bg-primary" />
            <h1 className="text-lg font-semibold tracking-tight text-foreground">
              AdOps Assistant — Amazon Performance Workflow Hub
            </h1>
          </div>
          
          <div className="flex items-center gap-2">
            <ModulesDrawer 
              onStartBleeder={onStartBleeder} 
              onStartBleeder2={onStartBleeder2}
              onStartLifetimeBleeders={onStartLifetimeBleeders}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={onHelp}
              className="gap-2 rounded-xl border-border/80 hover:bg-accent/50"
            >
              <HelpCircle className="w-4 h-4" />
              Help
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onStatus}
              className="gap-2 rounded-xl border-border/80 hover:bg-accent/50"
            >
              <Info className="w-4 h-4" />
              Status
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onReupload}
              className="gap-2 rounded-xl border border-primary/30 text-primary hover:bg-primary/10"
            >
              <RefreshCw className="w-4 h-4" />
              Reupload
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onReset}
              className="gap-2 rounded-xl border border-destructive/30 text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="w-4 h-4" />
              Reset
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};
