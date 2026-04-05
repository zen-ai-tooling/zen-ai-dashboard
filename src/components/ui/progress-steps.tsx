import { cn } from "@/lib/utils";
import { CheckCircle2, Circle } from "lucide-react";

interface ProgressStepsProps {
  steps: {
    label: string;
    status: "complete" | "current" | "upcoming";
  }[];
}

export const ProgressSteps = ({ steps }: ProgressStepsProps) => {
  return (
    <div className="flex items-center justify-between w-full max-w-3xl mx-auto">
      {steps.map((step, index) => (
        <div key={index} className="flex items-center flex-1">
          <div className="flex flex-col items-center flex-1">
            <div
              className={cn(
                "flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors",
                step.status === "complete" &&
                  "bg-green-500 border-green-500 text-white",
                step.status === "current" &&
                  "bg-blue-500 border-blue-500 text-white",
                step.status === "upcoming" &&
                  "bg-background border-muted-foreground/30 text-muted-foreground"
              )}
            >
              {step.status === "complete" ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                <Circle className="w-4 h-4" />
              )}
            </div>
            <span
              className={cn(
                "text-xs mt-2 text-center font-medium",
                step.status === "complete" && "text-green-600",
                step.status === "current" && "text-blue-600",
                step.status === "upcoming" && "text-muted-foreground"
              )}
            >
              {step.label}
            </span>
          </div>
          {index < steps.length - 1 && (
            <div
              className={cn(
                "h-0.5 flex-1 mx-2 transition-colors",
                step.status === "complete" ? "bg-green-500" : "bg-muted"
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
};
