import * as React from 'react';
import { Loader2 } from 'lucide-react';

interface AnalyzingViewProps {
  /** Step labels shown in sequence */
  steps?: string[];
  /** Final message before transition (optional) */
  finalMessage?: string;
  /** Called when the entire animation completes (≥2s) */
  onComplete?: () => void;
  /** Whether the underlying work is done. When true and steps finished, onComplete fires. */
  workDone?: boolean;
}

const DEFAULT_STEPS = [
  'Reading bulk file…',
  'Parsing Sponsored Products Campaigns…',
  'Parsing Sponsored Brands Campaigns…',
  'Scanning for bleeders…',
];

export const AnalyzingView: React.FC<AnalyzingViewProps> = ({
  steps = DEFAULT_STEPS,
  finalMessage,
  onComplete,
  workDone = true,
}) => {
  const [stepIdx, setStepIdx] = React.useState(0);
  const [showFinal, setShowFinal] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const totalSteps = steps.length;
  const stepDuration = Math.max(500, Math.floor(2000 / totalSteps)); // distribute over ≥2s

  React.useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const totalMs = totalSteps * stepDuration;
    const tick = (now: number) => {
      const elapsed = now - start;
      const pct = Math.min(100, (elapsed / totalMs) * 100);
      setProgress(pct);
      const idx = Math.min(totalSteps - 1, Math.floor(elapsed / stepDuration));
      setStepIdx(idx);
      if (elapsed < totalMs) raf = requestAnimationFrame(tick);
      else {
        setProgress(100);
        if (finalMessage) {
          setShowFinal(true);
          setTimeout(() => { if (workDone) onComplete?.(); }, 1000);
        } else {
          if (workDone) onComplete?.();
        }
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-fire complete if workDone flips to true after animation
  React.useEffect(() => {
    if (workDone && progress >= 100 && (!finalMessage || showFinal)) {
      const t = setTimeout(() => onComplete?.(), 200);
      return () => clearTimeout(t);
    }
  }, [workDone, progress, showFinal, finalMessage, onComplete]);

  return (
    <div className="max-w-[640px] mx-auto py-16">
      {/* Thin top progress bar */}
      <div className="h-[3px] w-full bg-[#F0F0F2] rounded-full overflow-hidden mb-12">
        <div
          className="h-full rounded-full"
          style={{
            width: `${progress}%`,
            background: '#0071E3',
            transition: 'width 200ms linear',
          }}
        />
      </div>

      <div className="text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 mb-5">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#0071E3' }} strokeWidth={2} />
        </div>

        <h2 className="text-[22px] font-semibold text-[#1D1D1F] tracking-tight">
          Analyzing your file
        </h2>
        <p className="text-[13px] text-[#86868B] mt-1.5">
          This usually takes just a few seconds.
        </p>

        <div className="mt-8 space-y-2 inline-block text-left min-w-[280px]">
          {steps.slice(0, stepIdx + 1).map((s, i) => (
            <div
              key={i}
              className="flex items-center gap-2.5 animate-fade-in"
              style={{
                opacity: i === stepIdx ? 1 : 0.5,
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  background: i < stepIdx ? '#34C759' : '#0071E3',
                }}
              />
              <span className="text-[13px] font-mono-nums text-[#6E6E73]">{s}</span>
            </div>
          ))}
          {showFinal && finalMessage && (
            <div className="flex items-center gap-2.5 animate-fade-in pt-1">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#34C759' }} />
              <span className="text-[13px] font-mono-nums font-semibold" style={{ color: '#1D1D1F' }}>
                {finalMessage}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
