import React from 'react';
import type { Bleeder2Track } from '@/components/bleeders2/TrackSelector';

type ActiveModule = 'bleeders_1' | 'bleeders_2' | 'lifetime_bleeders' | null;

interface AppSidebarProps {
  activeModule: ActiveModule;
  onSelectModule: (module: ActiveModule) => void;
  bleeder2ActiveTrack: Bleeder2Track | null;
  onSelectTrack: (track: Bleeder2Track) => void;
  showTracks: boolean;
}

const TRACKS: { id: Bleeder2Track; label: string }[] = [
  { id: 'SBSD', label: 'SB/SD Targets' },
  { id: 'SP', label: 'SP Search Terms' },
  { id: 'SP_KEYWORDS', label: 'SP Targets' },
  { id: 'ACOS100', label: '>100% ACoS' },
];

const MODULE_DOTS: Record<string, string> = {
  bleeders_1: 'bg-red-500',
  bleeders_2: 'bg-amber-500',
  lifetime_bleeders: 'bg-purple-500',
};

export const AppSidebar: React.FC<AppSidebarProps> = ({
  activeModule,
  onSelectModule,
  bleeder2ActiveTrack,
  onSelectTrack,
  showTracks,
}) => {
  return (
    <aside className="w-[220px] flex-shrink-0 h-screen sticky top-0 flex flex-col border-r border-border bg-muted/40">
      {/* Logo */}
      <div className="px-4 pt-5 pb-3">
        <div className="text-[14px] font-medium text-foreground">GNO Ad Ops</div>
        <div className="text-[11px] text-muted-foreground mt-0.5">Amazon Ads Workflow</div>
      </div>
      <div className="border-b border-border mx-3" />

      {/* Modules */}
      <div className="flex-1 overflow-y-auto px-2 pt-3">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 mb-2 font-medium">
          Modules
        </div>

        <NavItem
          label="Bleeders 1.0"
          dotColor={MODULE_DOTS.bleeders_1}
          active={activeModule === 'bleeders_1'}
          onClick={() => onSelectModule('bleeders_1')}
        />
        <NavItem
          label="Bleeders 2.0"
          dotColor={MODULE_DOTS.bleeders_2}
          active={activeModule === 'bleeders_2'}
          onClick={() => onSelectModule('bleeders_2')}
        />
        <NavItem
          label="Lifetime Audit"
          dotColor={MODULE_DOTS.lifetime_bleeders}
          active={activeModule === 'lifetime_bleeders'}
          onClick={() => onSelectModule('lifetime_bleeders')}
        />

        {/* Tracks sub-nav for Bleeders 2.0 */}
        {showTracks && activeModule === 'bleeders_2' && (
          <div className="ml-3 mt-1 mb-2">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 mb-1.5 font-medium">
              Tracks
            </div>
            {TRACKS.map((t) => (
              <button
                key={t.id}
                onClick={() => onSelectTrack(t.id)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[12px] transition-colors ${
                  bleeder2ActiveTrack === t.id
                    ? 'bg-card border border-border text-foreground font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                    bleeder2ActiveTrack === t.id ? 'bg-red-500' : 'bg-muted-foreground/40'
                  }`}
                />
                {t.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Client pill */}
      <div className="p-3 border-t border-border">
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-card border border-border">
          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-[10px] font-medium text-primary-foreground">
            GN
          </div>
          <span className="text-[12px] text-foreground font-medium">GNO Partners</span>
        </div>
      </div>
    </aside>
  );
};

function NavItem({
  label,
  dotColor,
  active,
  onClick,
}: {
  label: string;
  dotColor: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-md text-[13px] transition-colors mb-0.5 ${
        active
          ? 'bg-card border border-border text-foreground font-medium shadow-sm'
          : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColor}`} />
      {label}
    </button>
  );
}
