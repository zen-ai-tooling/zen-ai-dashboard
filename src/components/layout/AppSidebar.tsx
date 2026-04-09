import React from 'react';
import { ArrowLeft, BarChart3, Zap, Shield } from 'lucide-react';
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

const MODULE_META: Record<string, { label: string; dot: string; borderActive: string; icon: typeof BarChart3 }> = {
  bleeders_1: { label: 'Bleeders 1.0', dot: 'bg-red-500', borderActive: 'border-l-red-500', icon: BarChart3 },
  bleeders_2: { label: 'Bleeders 2.0', dot: 'bg-amber-500', borderActive: 'border-l-amber-500', icon: Zap },
  lifetime_bleeders: { label: 'Lifetime Audit', dot: 'bg-purple-500', borderActive: 'border-l-purple-500', icon: Shield },
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
    <aside className="w-[220px] flex-shrink-0 h-screen sticky top-0 flex flex-col border-r border-border bg-secondary/50">
      {/* Logo */}
      <div className="px-4 pt-5 pb-3">
        <div className="text-[14px] font-semibold text-foreground font-display tracking-tight">Zen AI</div>
        <div className="text-[11px] text-muted-foreground mt-0.5">Amazon Ads Workflow</div>
      </div>
      <div className="border-b border-border/60 mx-3" />

      {/* Modules */}
      <div className="flex-1 overflow-y-auto px-2 pt-3">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground/70 px-2 mb-2 font-medium">
          Modules
        </div>

        {(['bleeders_1', 'bleeders_2', 'lifetime_bleeders'] as const).map((mod) => {
          const meta = MODULE_META[mod];
          const isActive = activeModule === mod;
          return (
            <button
              key={mod}
              onClick={() => onSelectModule(isActive ? null : mod)}
              className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-[13px] mb-0.5 btn-press border-l-[3px] ${
                isActive
                  ? `bg-primary/[0.06] ${meta.borderActive} text-foreground font-medium pl-[5px]`
                  : 'text-muted-foreground hover:text-foreground hover:bg-card/60 border-l-transparent pl-[5px]'
              }`}
              style={{ transition: 'all 150ms ease' }}
            >
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${meta.dot}`} />
              <span className="font-display text-[13px]">{meta.label}</span>
            </button>
          );
        })}

        {/* Tracks sub-nav */}
        {showTracks && activeModule === 'bleeders_2' && (
          <div className="ml-3 mt-1.5 mb-2">
            <div className="flex items-center justify-between px-2 mb-1.5">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-medium">
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
                ? 'bg-primary'
                : status === 'done'
                ? 'bg-success'
                : 'bg-muted-foreground/30';
              return (
                <button
                  key={t.id}
                  onClick={() => onSelectTrack(t.id)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[12px] btn-press ${
                    isTrackActive
                      ? 'bg-primary/[0.06] text-foreground font-medium'
                      : 'text-muted-foreground hover:text-foreground hover:bg-card/40'
                  }`}
                  style={{ transition: 'all 150ms ease' }}
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
      <div className="p-3 border-t border-border/60">
        <div className="flex items-center gap-2 px-2 py-2 rounded-lg bg-card/60 border border-border/40">
          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-[10px] font-medium text-primary-foreground font-display">
            ZA
          </div>
          <span className="text-[12px] text-foreground font-medium">Zen AI</span>
        </div>
      </div>
    </aside>
  );
};
