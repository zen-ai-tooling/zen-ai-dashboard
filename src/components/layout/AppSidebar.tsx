import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
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
}

const TRACKS: { id: Bleeder2Track; label: string }[] = [
  { id: 'SBSD', label: 'SB/SD Targets' },
  { id: 'SP', label: 'SP Search Terms' },
  { id: 'SP_KEYWORDS', label: 'SP Targets' },
  { id: 'ACOS100', label: '>100% ACoS' },
];

const MODULES = [
  { id: 'bleeders_1' as const, label: 'Bleeders 1.0', dot: '#EF4444' },
  { id: 'bleeders_2' as const, label: 'Bleeders 2.0', dot: '#F59E0B' },
  { id: 'lifetime_bleeders' as const, label: 'Lifetime Audit', dot: '#8B5CF6' },
];

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
}) => {
  const { clients, activeClient, setActiveClient, addClient } = useClient();
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientAcos, setNewClientAcos] = useState(35);

  return (
    <aside className="w-[220px] flex-shrink-0 h-screen sticky top-0 flex flex-col border-r border-border bg-[hsl(var(--sidebar-background))]">
      {/* Logo */}
      <div className="px-4 pt-5 pb-4">
        <div className="text-[15px] font-semibold text-foreground">Zen AI</div>
        <div className="text-[11px] text-[hsl(var(--text-tertiary))] mt-0.5">Amazon Ads Workflow</div>
      </div>
      <div className="border-b border-border mx-3" />

      {/* Modules */}
      <div className="flex-1 overflow-y-auto">
        <div className="text-[10px] font-semibold tracking-[0.08em] uppercase text-[hsl(var(--text-tertiary))] px-4 pt-4 pb-1.5">
          Modules
        </div>

        <div className="px-2">
          {MODULES.map((mod) => {
            const isActive = activeModule === mod.id;
            return (
              <button
                key={mod.id}
                onClick={() => onSelectModule(isActive ? null : mod.id)}
                className={`w-full flex items-center gap-2.5 py-[7px] px-3 rounded-lg text-[13px] font-medium my-[1px] btn-press ${
                  isActive
                    ? 'bg-[hsl(var(--accent-blue-light))] text-[hsl(var(--accent-blue))] border-l-[3px] border-l-[hsl(var(--accent-blue))] pl-[9px]'
                    : 'text-[hsl(var(--text-secondary))] hover:bg-[hsl(var(--border))/0.5] border-l-[3px] border-l-transparent pl-[9px]'
                }`}
              >
                <span className="w-[7px] h-[7px] rounded-full flex-shrink-0" style={{ backgroundColor: mod.dot }} />
                {mod.label}
              </button>
            );
          })}
        </div>

        {/* Tracks sub-nav */}
        {showTracks && activeModule === 'bleeders_2' && (
          <div className="px-2 mt-1.5 mb-2">
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
              const dotColor = isTrackActive
                ? 'hsl(var(--accent-blue))'
                : status === 'done'
                ? 'hsl(var(--green))'
                : 'hsl(var(--text-tertiary))';
              return (
                <button
                  key={t.id}
                  onClick={() => onSelectTrack(t.id)}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] my-[1px] btn-press ${
                    isTrackActive
                      ? 'bg-[hsl(var(--accent-blue-light))] text-foreground font-medium'
                      : 'text-[hsl(var(--text-secondary))] hover:bg-[hsl(var(--border))/0.4]'
                  }`}
                >
                  <span className="w-[5px] h-[5px] rounded-full flex-shrink-0" style={{ backgroundColor: dotColor }} />
                  {t.label}
                  {status === 'done' && !isTrackActive && (
                    <span className="ml-auto text-[10px] text-[hsl(var(--green))] font-medium">✓</span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Client pill */}
      <div className="p-3 border-t border-border" style={{ position: 'relative' }}>
        <div
          onClick={() => setClientDropdownOpen(prev => !prev)}
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-[10px] bg-card border border-border cursor-pointer hover:border-[hsl(var(--accent-blue))] transition-all"
          style={{ transition: 'all 150ms ease' }}
        >
          <div className="w-7 h-7 rounded-full bg-[hsl(var(--accent-blue-light))] flex items-center justify-center text-[11px] font-semibold text-[hsl(var(--accent-blue))]">
            {activeClient.initials}
          </div>
          <span className="text-[12px] font-medium text-foreground">{activeClient.name}</span>
        </div>

        {clientDropdownOpen && (
          <div
            style={{
              position: 'absolute',
              bottom: '100%',
              left: '12px',
              right: '12px',
              background: '#FFFFFF',
              border: '1px solid #E4E6EA',
              borderRadius: '10px',
              overflow: 'hidden',
              zIndex: 50,
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            }}
          >
            {clients.map(client => (
              <div
                key={client.id}
                onClick={() => {
                  setActiveClient(client);
                  setClientDropdownOpen(false);
                  if (client.id !== activeClient.id && onReset) onReset();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 12px',
                  cursor: 'pointer',
                  background: client.id === activeClient.id ? '#EFF6FF' : 'transparent',
                  fontSize: '13px',
                  color: '#0F1115',
                  transition: 'background 150ms ease',
                }}
                onMouseEnter={e => {
                  if (client.id !== activeClient.id) (e.currentTarget as HTMLDivElement).style.background = '#F5F6F8';
                }}
                onMouseLeave={e => {
                  if (client.id !== activeClient.id) (e.currentTarget as HTMLDivElement).style.background = 'transparent';
                }}
              >
                <div
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: '#EFF6FF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10px',
                    fontWeight: '600',
                    color: '#2563EB',
                  }}
                >
                  {client.initials}
                </div>
                <span>{client.name}</span>
                {client.id === activeClient.id && (
                  <span style={{ marginLeft: 'auto', color: '#2563EB', fontSize: '14px' }}>✓</span>
                )}
              </div>
            ))}

            <div style={{ borderTop: '1px solid #E4E6EA' }} />

            {!showAddForm ? (
              <div
                onClick={() => setShowAddForm(true)}
                style={{
                  padding: '10px 12px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  color: '#2563EB',
                  fontWeight: '500',
                }}
              >
                + Add client
              </div>
            ) : (
              <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <input
                  placeholder="Client name"
                  value={newClientName}
                  onChange={e => setNewClientName(e.target.value)}
                  style={{
                    border: '1px solid #E4E6EA',
                    borderRadius: '6px',
                    padding: '6px 10px',
                    fontSize: '13px',
                    width: '100%',
                    outline: 'none',
                  }}
                  autoFocus
                />
                <input
                  type="number"
                  placeholder="ACoS target %"
                  value={newClientAcos}
                  onChange={e => setNewClientAcos(Number(e.target.value))}
                  style={{
                    border: '1px solid #E4E6EA',
                    borderRadius: '6px',
                    padding: '6px 10px',
                    fontSize: '13px',
                    width: '100%',
                    outline: 'none',
                  }}
                />
                <div style={{ display: 'flex', gap: '6px', marginTop: '2px' }}>
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
                    style={{
                      background: '#2563EB',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '7px 12px',
                      fontSize: '13px',
                      fontWeight: '500',
                      cursor: 'pointer',
                    }}
                  >
                    Add client
                  </button>
                  <button
                    onClick={() => { setShowAddForm(false); setNewClientName(''); }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#9BA3AF',
                      fontSize: '12px',
                      cursor: 'pointer',
                      padding: '2px',
                    }}
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
