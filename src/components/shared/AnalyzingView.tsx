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
    <div
      className="flex flex-col items-center justify-center px-4"
      style={{ minHeight: 'calc(100vh - 180px)' }}
    >
      <div className="w-full max-w-[520px]">
        {/* Top progress bar — 4px */}
        <div className="w-full overflow-hidden" style={{ height: 4, borderRadius: 2, background: '#E5E5EA' }}>
          <div
            style={{
              height: '100%',
              borderRadius: 2,
              width: `${progress}%`,
              background: '#0071E3',
              transition: 'width 200ms linear',
            }}
          />
        </div>

        <div className="text-center" style={{ marginTop: 16 }}>
          <Loader2 className="w-6 h-6 animate-spin mx-auto" style={{ color: '#0071E3' }} strokeWidth={2} />

          <h2 className="mt-3" style={{ fontSize: 20, fontWeight: 600, color: '#1D1D1F', letterSpacing: '-0.3px' }}>
            Analyzing your file
          </h2>
          <p className="mt-1" style={{ fontSize: 13, color: '#86868B' }}>
            This usually takes just a few seconds.
          </p>

          <div className="space-y-1.5 inline-block text-left min-w-[280px]" style={{ marginTop: 16 }}>
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
                  <span className="inline-flex items-center" style={{ fontSize: 14, color: '#6E6E73' }}>
                    {s}
                    {isCurrent && <ActivityDots />}
                  </span>
                </div>
              );
            })}
            {showFinal && finalMessage && (
              <div className="flex items-center gap-2.5 animate-fade-in pt-1">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#34C759' }} />
                <span style={{ fontSize: 14, fontWeight: 600, color: '#1D1D1F' }}>
                  {finalMessage}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
