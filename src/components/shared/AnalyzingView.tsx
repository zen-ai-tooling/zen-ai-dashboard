import * as React from 'react';
import { Loader2, FileSpreadsheet } from 'lucide-react';

interface AnalyzingViewProps {
  steps?: string[];
  finalMessage?: string;
  onComplete?: () => void;
  workDone?: boolean;
}

const DEFAULT_STEPS = [
  'Reading bulk file…',
  'Parsing Sponsored Products Campaigns…',
  'Parsing Sponsored Brands Campaigns…',
  'Scanning for bleeders…',
];

const ActivityDots: React.FC = () => {
  const [phase, setPhase] = React.useState(0);
  React.useEffect(() => {
    const i = setInterval(() => setPhase((p) => (p + 1) % 3), 320);
    return () => clearInterval(i);
  }, []);
  return (
    <span className="inline-flex items-center gap-[3px] ml-1">
      {[0, 1, 2].map((d) => (
        <span
          key={d}
          className="w-[3px] h-[3px] rounded-full"
          style={{
            background: d === phase ? '#0071E3' : '#D2D2D7',
            transition: 'background-color 150ms ease',
          }}
        />
      ))}
    </span>
  );
};

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
  const stepDuration = Math.max(500, Math.floor(2000 / totalSteps));

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
        } else if (workDone) onComplete?.();
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    if (workDone && progress >= 100 && (!finalMessage || showFinal)) {
      const t = setTimeout(() => onComplete?.(), 200);
      return () => clearTimeout(t);
    }
  }, [workDone, progress, showFinal, finalMessage, onComplete]);

  return (
    <div className="max-w-[640px] mx-auto py-16">
      {/* Top progress bar — 4px in light track */}
      <div className="h-1 w-full rounded-[2px] overflow-hidden mb-12" style={{ background: '#E5E5EA' }}>
        <div
          className="h-full rounded-[2px]"
          style={{
            width: `${progress}%`,
            background: '#0071E3',
            transition: 'width 200ms linear',
          }}
        />
      </div>

      <div className="text-center">
        {/* File icon for visual identity */}
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-3"
          style={{ background: '#F5F5F7' }}>
          <FileSpreadsheet className="w-6 h-6" style={{ color: '#86868B' }} strokeWidth={1.6} />
        </div>
        <div className="inline-flex items-center justify-center w-10 h-10 mb-4">
          <Loader2 className="w-7 h-7 animate-spin" style={{ color: '#0071E3' }} strokeWidth={2} />
        </div>

        <h2 className="text-[22px] font-semibold text-[#1D1D1F] tracking-tight">
          Analyzing your file
        </h2>
        <p className="text-[13px] text-[#86868B] mt-1.5">
          This usually takes just a few seconds.
        </p>

        <div className="mt-8 space-y-2 inline-block text-left min-w-[300px]">
          {steps.slice(0, stepIdx + 1).map((s, i) => {
            const isCurrent = i === stepIdx && !showFinal;
            const isDone = i < stepIdx || showFinal;
            return (
              <div
                key={i}
                className="flex items-center gap-2.5 animate-fade-in"
                style={{ opacity: isCurrent || isDone ? 1 : 0.5 }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: isDone ? '#34C759' : '#0071E3' }}
                />
                <span className="text-[14px] text-[#6E6E73] inline-flex items-center">
                  {s}
                  {isCurrent && <ActivityDots />}
                </span>
              </div>
            );
          })}
          {showFinal && finalMessage && (
            <div className="flex items-center gap-2.5 animate-fade-in pt-1">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#34C759' }} />
              <span className="text-[14px] font-semibold" style={{ color: '#1D1D1F' }}>
                {finalMessage}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
