import * as React from 'react';

interface OnboardingBannerProps {
  /** Module name suffix used for the localStorage key (bleeders1, bleeders2, lifetime) */
  moduleName: string;
}

export const OnboardingBanner: React.FC<OnboardingBannerProps> = ({ moduleName }) => {
  const storageKey = `adprune_onboarding_dismissed_${moduleName}`;
  const [showOnboarding, setShowOnboarding] = React.useState(() => {
    if (typeof window === 'undefined') return false;
    return !localStorage.getItem(storageKey);
  });

  if (!showOnboarding) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(storageKey, 'true');
    } catch {}
    setShowOnboarding(false);
  };

  return (
    <div
      className="rounded-lg p-4 mb-4"
      style={{
        background: 'rgba(13,148,136,0.06)',
        border: '1px solid rgba(13,148,136,0.15)',
      }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[12px] font-semibold" style={{ color: '#0D9488' }}>
            First time? Here's how it works.
          </p>
          <ol className="mt-2 space-y-1 text-[12px]" style={{ color: '#374151' }}>
            <li>1. Export a Bulk Operations file from Amazon Campaign Manager (60-day range)</li>
            <li>2. Upload it here — analysis takes under 30 seconds</li>
            <li>3. Review bleeders and generate your Amazon-ready upload file</li>
          </ol>
        </div>
        <button
          onClick={dismiss}
          aria-label="Dismiss onboarding"
          style={{
            color: '#9CA3AF',
            fontSize: 18,
            lineHeight: 1,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
};
