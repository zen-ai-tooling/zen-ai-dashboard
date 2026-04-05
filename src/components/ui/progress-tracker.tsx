import { CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProgressTrackerProps {
  currentStep: number; // 1, 2, or 3
  completedSteps: number[]; // array of completed step numbers
}

export const ProgressTracker = ({ currentStep, completedSteps }: ProgressTrackerProps) => {
  const steps = [
    { num: 1, label: "Report Creator" },
    { num: 2, label: "Decision Processor" },
    { num: 3, label: "Validator" }
  ];

  return (
    <div className="w-full bg-card border-b border-border py-4 px-6 shadow-sm">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between relative">
          {/* Progress Line */}
          <div className="absolute top-5 left-0 right-0 h-0.5 bg-border -z-10" />
          <div 
            className="absolute top-5 left-0 h-0.5 bg-green-500 transition-all duration-500 -z-10"
            style={{ 
              width: completedSteps.length >= 1 
                ? completedSteps.length >= 2 
                  ? '100%' 
                  : '50%' 
                : '0%' 
            }}
          />

          {steps.map((step) => {
            const isCompleted = completedSteps.includes(step.num);
            const isCurrent = currentStep === step.num;
            
            return (
              <div 
                key={step.num} 
                className={cn(
                  "flex flex-col items-center gap-2 relative bg-card px-4",
                  isCurrent && "scale-110 transition-transform"
                )}
              >
                <div 
                  className={cn(
                    "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all",
                    isCompleted && "bg-green-500 border-green-500 text-white",
                    !isCompleted && isCurrent && "bg-primary border-primary text-white animate-pulse",
                    !isCompleted && !isCurrent && "bg-muted border-border text-muted-foreground"
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <span className="text-sm font-bold">{step.num}</span>
                  )}
                </div>
                <span 
                  className={cn(
                    "text-xs font-medium whitespace-nowrap",
                    isCompleted && "text-green-600 dark:text-green-400",
                    isCurrent && "text-primary font-semibold",
                    !isCompleted && !isCurrent && "text-muted-foreground"
                  )}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
