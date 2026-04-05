import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, XCircle, AlertTriangle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface TimelineEntry {
  fileName: string;
  stage: "report" | "processor" | "validator" | "validator — warning (proceeding)";
  status: "success" | "warning" | "error";
  timestamp: string;
}

interface StatusTimelineProps {
  entries: TimelineEntry[];
}

export const StatusTimeline = ({ entries }: StatusTimelineProps) => {
  if (entries.length === 0) {
    return (
      <Card className="border-l-4 border-l-blue-500 shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">📊 Processing Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No files processed yet.</p>
        </CardContent>
      </Card>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case "warning":
        return <AlertTriangle className="w-4 h-4 text-orange-600" />;
      case "error":
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStageLabel = (stage: string) => {
    switch (stage) {
      case "report":
        return "Report Creator";
      case "processor":
        return "Decision Processor";
      case "validator":
        return "Validator";
      case "validator — warning (proceeding)":
        return "Validator — warning (proceeding)";
      default:
        return stage;
    }
  };

  return (
    <Card className="border-l-4 border-l-blue-500 shadow-md animate-fade-in">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">📊 Processing Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {entries.map((entry, idx) => (
            <div 
              key={idx} 
              className={cn(
                "flex items-start gap-3 p-3 rounded-lg border",
                entry.status === "success" && "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800",
                entry.status === "warning" && "bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-800",
                entry.status === "error" && "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800"
              )}
            >
              {getStatusIcon(entry.status)}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-foreground truncate">
                    {entry.fileName}
                  </span>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {entry.timestamp}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {getStageLabel(entry.stage)} • {entry.status}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
