import React, { useState } from 'react';
import { ArrowLeft, Clock, Plus, Check } from 'lucide-react';
import { useClient } from '@/context/ClientContext';
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
  trackCompletionStatus?: Record<string, 'idle' | 'complete'>;
  onReset?: () => void;
  showHistoryView?: boolean;
  setShowHistoryView?: (v: boolean) => void;
}

const TRACKS: { id: Bleeder2Track; label: string }[] = [
  { id: 'SBSD', label: 'SB/SD Targets' },
  { id: 'SP', label: 'SP Search Terms' },
  { id: 'SP_KEYWORDS', label: 'SP Targets' },
  { id: 'ACOS100', label: '>100% ACoS' },
];

const MODULES: { id: Exclude<ActiveModule, null>; label: string; dot: string }[] = [
  { id: 'bleeders_1', label: 'Bleeders 1.0', dot: 'hsl(var(--destructive))' },
  { id: 'bleeders_2', label: 'Bleeders 2.0', dot: 'hsl(var(--amber))' },
  { id: 'lifetime_bleeders', label: 'Lifetime Audit', dot: 'hsl(265 70% 60%)' },
];

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="px-4 pt-4 pb-1.5 text-[11px] font-semibold uppercase text-[#6E6E73]" style={{ letterSpacing: '0.08em' }}>
    {children}
  </div>
);

export const AppSidebar: React.FC<AppSidebarProps> = ({
  activeModule,
  onSelectModule,
  bleeder2ActiveTrack,
  onSelectTrack,
  showTracks,
  onBackToTrackPicker,
  trackStatus = { SBSD: 'idle', SP: 'idle', SP_KEYWORDS: 'idle', ACOS100: 'idle' },
  trackCompletionStatus = { SBSD: 'idle', SP: 'idle', SP_KEYWORDS: 'idle', ACOS100: 'idle' },
  onReset,
  showHistoryView = false,
  setShowHistoryView,
}) => {
  const { clients, activeClient, setActiveClient, addClient } = useClient();
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientAcos, setNewClientAcos] = useState(35);

  const onHome = !activeModule && !showHistoryView;

  return (
    <aside className="w-[224px] flex-shrink-0 h-screen sticky top-0 flex flex-col bg-sidebar text-sidebar-foreground relative z-10">
      {/* Brand */}
      <button
        onClick={() => { onSelectModule(null); setShowHistoryView?.(false); }}
        className="px-4 pt-5 pb-4 text-left btn-press"
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-white text-[#1D1D1F] flex items-center justify-center text-[11px] font-semibold">
            Z
          </div>
          <div>
            <div className="text-[16px] font-semibold leading-tight text-white">Zen AI</div>
            <div className="text-[11px] text-[#86868B] mt-px tracking-wide">Amazon Ads Workflow</div>
          </div>
        </div>
      </button>
      <div className="border-b border-white/10 mx-3" />

      {/* Modules */}
      <nav className="flex-1 overflow-y-auto pb-2">
        <SectionLabel>Modules</SectionLabel>

        <div className="px-2">
          {MODULES.map((mod) => {
            const isActive = activeModule === mod.id && !showHistoryView;
            return (
              <button
                key={mod.id}
                onClick={() => onSelectModule(isActive ? null : mod.id)}
                className={`group relative w-full flex items-center gap-2.5 py-[7px] pl-3 pr-3 rounded-md text-[14px] my-[1px] btn-press ${
                  isActive
                    ? 'bg-white/[0.08] text-white font-semibold'
                    : 'text-[#E5E5EA] font-normal hover:bg-white/[0.05] hover:text-white'
                }`}
              >
                {isActive && (
                  <span
                    className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-r"
                    style={{ backgroundColor: mod.dot }}
                  />
                )}
                <span
                  className="w-[7px] h-[7px] rounded-full flex-shrink-0"
                  style={{ backgroundColor: mod.dot }}
                />
                <span className="truncate">{mod.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tracks sub-nav */}
        {showTracks && activeModule === 'bleeders_2' && (
          <div className="px-2 mt-2">
            <div className="flex items-center justify-between px-3 mb-1">
              <span className="text-[10px] font-semibold tracking-[0.08em] uppercase text-[hsl(var(--text-tertiary))]">
                Tracks
              </span>
              {bleeder2ActiveTrack && onBackToTrackPicker && (
                <button
                  onClick={onBackToTrackPicker}
                  className="flex items-center gap-1 text-[10px] text-[hsl(var(--text-tertiary))] hover:text-foreground btn-press"
                >
                  <ArrowLeft className="w-3 h-3" /> Back
                </button>
              )}
            </div>
            {TRACKS.map((t) => {
              const status = trackStatus[t.id];
              const isTrackActive = bleeder2ActiveTrack === t.id;
              const isComplete = trackCompletionStatus[t.id] === 'complete';
              return (
                <button
                  key={t.id}
                  onClick={() => onSelectTrack(t.id)}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[12px] my-[1px] btn-press ${
                    isTrackActive
                      ? 'bg-card text-foreground font-medium shadow-xs'
                      : 'text-[hsl(var(--text-secondary))] hover:bg-card/60 hover:text-foreground'
                  }`}
                >
                  {isComplete ? (
                    <span className="w-3.5 h-3.5 rounded-full bg-success/15 text-success flex items-center justify-center flex-shrink-0">
                      <Check className="w-2.5 h-2.5" />
                    </span>
                  ) : (
                    <span
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{
                        backgroundColor:
                          isTrackActive ? 'hsl(var(--primary))' :
                          status === 'done' ? 'hsl(var(--success))' :
                          'hsl(var(--border-strong))',
                      }}
                    />
                  )}
                  <span className="truncate">{t.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* History */}
        <SectionLabel>History</SectionLabel>
        <div className="px-2">
          <button
            onClick={() => setShowHistoryView?.(true)}
            className={`w-full flex items-center gap-2.5 py-[7px] px-3 rounded-md text-[14px] my-[1px] btn-press ${
              showHistoryView
                ? 'bg-secondary text-foreground font-semibold'
                : 'text-[hsl(var(--text-secondary))] font-medium hover:bg-secondary/70 hover:text-foreground'
            }`}
          >
            <Clock className="w-3.5 h-3.5 opacity-70" />
            Session log
          </button>
        </div>
      </nav>

      {/* Client switcher */}
      <div className="p-3 border-t border-sidebar-border relative">
        <button
          onClick={() => setClientDropdownOpen(prev => !prev)}
          className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md bg-card border border-border hover:border-[hsl(var(--border-strong))] btn-press"
        >
          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-[11px] font-semibold text-primary">
            {activeClient.initials}
          </div>
          <div className="text-left min-w-0 flex-1">
            <div className="text-[12px] font-medium text-foreground truncate leading-tight">{activeClient.name}</div>
            <div className="text-[10px] text-[hsl(var(--text-tertiary))]">Active client</div>
          </div>
        </button>

        {clientDropdownOpen && (
          <div className="absolute bottom-[calc(100%-4px)] left-3 right-3 bg-popover border border-border rounded-lg overflow-hidden z-50 shadow-pop animate-scale-in">
            {clients.map(client => {
              const isActive = client.id === activeClient.id;
              return (
                <button
                  key={client.id}
                  onClick={() => {
                    setActiveClient(client);
                    setClientDropdownOpen(false);
                    if (client.id !== activeClient.id && onReset) onReset();
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-[13px] text-left transition-colors ${
                    isActive ? 'bg-primary/5 text-foreground' : 'text-foreground hover:bg-secondary'
                  }`}
                >
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-semibold text-primary">
                    {client.initials}
                  </div>
                  <span className="truncate flex-1">{client.name}</span>
                  {isActive && <Check className="w-3.5 h-3.5 text-primary" />}
                </button>
              );
            })}

            <div className="border-t border-border" />

            {!showAddForm ? (
              <button
                onClick={() => setShowAddForm(true)}
                className="w-full flex items-center gap-1.5 px-3 py-2 text-[13px] text-primary hover:bg-primary/5 font-medium transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add client
              </button>
            ) : (
              <div className="p-2.5 flex flex-col gap-1.5">
                <input
                  placeholder="Client name"
                  value={newClientName}
                  onChange={e => setNewClientName(e.target.value)}
                  className="h-8 px-2.5 text-[12px] rounded-md border border-border bg-card outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                  autoFocus
                />
                <input
                  type="number"
                  placeholder="ACoS target %"
                  value={newClientAcos}
                  onChange={e => setNewClientAcos(Number(e.target.value))}
                  className="h-8 px-2.5 text-[12px] rounded-md border border-border bg-card outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                />
                <div className="flex gap-1.5 mt-0.5">
                  <button
                    onClick={() => {
                      if (!newClientName.trim()) return;
                      addClient({
                        name: newClientName.trim(),
                        initials: newClientName.trim().slice(0, 2).toUpperCase(),
                        acosTarget: newClientAcos,
                        fewerThanOrders: 5,
                        excludeRanking: true,
                      });
                      setNewClientName('');
                      setNewClientAcos(35);
                      setShowAddForm(false);
                      setClientDropdownOpen(false);
                    }}
                    className="flex-1 h-7 rounded-md bg-primary text-primary-foreground text-[12px] font-medium btn-press hover:opacity-92"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => { setShowAddForm(false); setNewClientName(''); }}
                    className="h-7 px-2.5 rounded-md text-[12px] text-[hsl(var(--text-tertiary))] hover:text-foreground btn-press"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
