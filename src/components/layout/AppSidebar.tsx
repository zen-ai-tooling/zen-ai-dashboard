import React from 'react';
import { ArrowLeft } from 'lucide-react';
import type { Bleeder2Track } from '@/components/bleeders2/TrackSelector';

type ActiveModule = 'bleeders_1' | 'bleeders_2' | 'lifetime_bleeders' | null;

interface AppSidebarProps {
  activeModule: ActiveModule;
  onSelectModule: (module: ActiveModule) => void;
  bleeder2ActiveTrack: Bleeder2Track | null;
  onSelectTrack: (track: Bleeder2Track) => void;
  showTracks: boolean;
  onBackToTrackPicker?: () => void;
  trackStatus?: Record<Bleeder2Track, 'idle' | 'active' | 'done'>;
}

const TRACKS: { id: Bleeder2Track; label: string }[] = [
  { id: 'SBSD', label: 'SB/SD Targets' },
  { id: 'SP', label: 'SP Search Terms' },
  { id: 'SP_KEYWORDS', label: 'SP Targets' },
  { id: 'ACOS100', label: '>100% ACoS' },
];

const MODULE_COLORS: Record<string, string> = {
  bleeders_1: 'bg-red-500',
  bleeders_2: 'bg-amber-500',
  lifetime_bleeders: 'bg-purple-500',
};

const MODULE_BORDER_COLORS: Record<string, string> = {
  bleeders_1: 'border-l-red-500',
  bleeders_2: 'border-l-amber-500',
  lifetime_bleeders: 'border-l-purple-500',
};

export const AppSidebar: React.FC<AppSidebarProps> = ({
  activeModule,
  onSelectModule,
  bleeder2ActiveTrack,
  onSelectTrack,
  showTracks,
  onBackToTrackPicker,
  trackStatus = { SBSD: 'idle', SP: 'idle', SP_KEYWORDS: 'idle', ACOS100: 'idle' },
}) => {
  return (
    <aside className="w-[220px] flex-shrink-0 h-screen sticky top-0 flex flex-col border-r border-border bg-[hsl(var(--sidebar-background))]">
      {/* Logo */}
      <div className="px-4 pt-5 pb-3">
        <div className="text-[14px] font-medium text-foreground font-display">GNO Ad Ops</div>
        <div className="text-[11px] text-[hsl(var(--text-tertiary))] mt-0.5">Amazon Ads Workflow</div>
      </div>
      <div className="border-b border-border mx-3" />

      {/* Modules */}
      <div className="flex-1 overflow-y-auto px-2 pt-3">
        <div className="text-[10px] uppercase tracking-wider text-[hsl(var(--text-tertiary))] px-2 mb-2 font-medium">
          Modules
        </div>

        {(['bleeders_1', 'bleeders_2', 'lifetime_bleeders'] as const).map((mod) => {
          const labels: Record<string, string> = {
            bleeders_1: 'Bleeders 1.0',
            bleeders_2: 'Bleeders 2.0',
            lifetime_bleeders: 'Lifetime Audit',
          };
          const isActive = activeModule === mod;
          return (
            <button
              key={mod}
              onClick={() => onSelectModule(isActive ? null : mod)}
              className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-md text-[13px] mb-0.5 btn-press ${
                isActive
                  ? `bg-[hsl(var(--sidebar-active-bg))] border-l-[3px] ${MODULE_BORDER_COLORS[mod]} text-foreground font-medium pl-[5px]`
                  : 'text-muted-foreground hover:text-foreground hover:bg-card/50 border-l-[3px] border-l-transparent pl-[5px]'
              }`}
              style={{ transition: 'background-color 150ms ease, border-color 150ms ease' }}
            >
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${MODULE_COLORS[mod]}`} />
              <span className="font-display">{labels[mod]}</span>
            </button>
          );
        })}

        {/* Tracks sub-nav for Bleeders 2.0 */}
        {showTracks && activeModule === 'bleeders_2' && (
          <div className="ml-3 mt-1 mb-2">
            <div className="flex items-center justify-between px-2 mb-1.5">
              <span className="text-[10px] uppercase tracking-wider text-[hsl(var(--text-tertiary))] font-medium">
                Tracks
              </span>
              {bleeder2ActiveTrack && onBackToTrackPicker && (
                <button
                  onClick={onBackToTrackPicker}
                  className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground btn-press"
                  style={{ transition: 'color 150ms ease' }}
                >
                  <ArrowLeft className="w-3 h-3" />
                  Back
                </button>
              )}
            </div>
            {TRACKS.map((t) => {
              const status = trackStatus[t.id];
              const isTrackActive = bleeder2ActiveTrack === t.id;
              const dotColor = isTrackActive
                ? 'bg-red-500'
                : status === 'done'
                ? 'bg-success'
                : 'bg-muted-foreground/40';
              return (
                <button
                  key={t.id}
                  onClick={() => onSelectTrack(t.id)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[12px] btn-press ${
                    isTrackActive
                      ? 'bg-[hsl(var(--sidebar-active-bg))] border border-border text-foreground font-medium'
                      : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
                  }`}
                  style={{ transition: 'background-color 150ms ease' }}
                >
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColor}`} />
                  {t.label}
                  {status === 'done' && !isTrackActive && (
                    <span className="ml-auto text-[10px] text-success font-medium">✓</span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Client pill */}
      <div className="p-3 border-t border-border">
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-card border border-border">
          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-[10px] font-medium text-primary-foreground font-display">
            GN
          </div>
          <span className="text-[12px] text-foreground font-medium">GNO Partners</span>
        </div>
      </div>
    </aside>
  );
};
