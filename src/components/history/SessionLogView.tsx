import { useHistory } from '@/context/HistoryContext';
import { useState } from 'react';

export const SessionLogView = () => {
  const { entries, clearHistory } = useHistory();
  const [confirmClear, setConfirmClear] = useState(false);

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true,
      timeZone: 'America/Los_Angeles'
    });
  };

  const formatTrack = (module: string, track?: string) => {
    if (module === 'bleeders_1') return 'Bleeders 1.0';
    if (module === 'lifetime') return 'Lifetime Audit';
    const trackLabels: Record<string, string> = {
      SBSD: 'SB/SD Targets',
      SP: 'SP Search Terms',
      SP_KEYWORDS: 'SP Targets',
      ACOS100: '>100% ACoS',
    };
    return `Bleeders 2.0 / ${trackLabels[track ?? ''] ?? track ?? ''}`;
  };

  const truncate = (str: string, n: number) =>
    str.length > n ? str.slice(0, n) + '…' : str;

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: '600', color: 'hsl(var(--foreground))', margin: 0 }}>
            Session log
          </h2>
          <p style={{ fontSize: '13px', color: 'hsl(var(--text-secondary))', marginTop: '4px' }}>
            {entries.length} session{entries.length !== 1 ? 's' : ''} recorded
          </p>
        </div>

        {entries.length > 0 && (
          <button
            onClick={() => {
              if (confirmClear) {
                clearHistory();
                setConfirmClear(false);
              } else {
                setConfirmClear(true);
                setTimeout(() => setConfirmClear(false), 3000);
              }
            }}
            style={{
              fontSize: '13px',
              padding: '6px 14px',
              border: confirmClear ? '1px solid #FECACA' : '1px solid hsl(var(--border))',
              borderRadius: '8px',
              background: confirmClear ? '#FEF2F2' : 'transparent',
              color: confirmClear ? '#EF4444' : 'hsl(var(--text-tertiary))',
              cursor: 'pointer',
              fontFamily: 'DM Sans, sans-serif',
              transition: 'all 150ms ease',
            }}
          >
            {confirmClear ? 'Click again to confirm' : 'Clear all'}
          </button>
        )}
      </div>

      {/* Empty state */}
      {entries.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '64px 24px',
          background: 'hsl(var(--card))',
          border: '1px solid hsl(var(--border))',
          borderRadius: '12px',
        }}>
          <div style={{ fontSize: '32px', marginBottom: '12px', opacity: 0.4 }}>📋</div>
          <p style={{ fontSize: '14px', fontWeight: '500', color: 'hsl(var(--foreground))', margin: '0 0 4px' }}>
            No sessions recorded yet
          </p>
          <p style={{ fontSize: '13px', color: 'hsl(var(--text-secondary))', margin: 0 }}>
            Run a module to completion and it will appear here
          </p>
        </div>
      )}

      {/* Table */}
      {entries.length > 0 && (
        <div style={{
          background: 'hsl(var(--card))',
          border: '1px solid hsl(var(--border))',
          borderRadius: '12px',
          overflow: 'hidden',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                {['Date', 'Client', 'Module / Track', 'File', 'Bleeders', 'At-risk spend', 'Actions taken', 'Mode'].map(col => (
                  <th
                    key={col}
                    style={{
                      textAlign: 'left',
                      padding: '10px 14px',
                      fontSize: '11px',
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      color: 'hsl(var(--text-tertiary))',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, idx) => (
                <tr
                  key={entry.id}
                  style={{
                    borderBottom: idx < entries.length - 1 ? '1px solid hsl(var(--border))' : 'none',
                    transition: 'background 150ms ease',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'hsl(var(--background))')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '10px 14px', whiteSpace: 'nowrap', color: 'hsl(var(--text-secondary))' }}>
                    {formatDate(entry.completedAt)}
                  </td>
                  <td style={{ padding: '10px 14px', fontWeight: '500', color: 'hsl(var(--foreground))' }}>
                    {entry.clientName}
                  </td>
                  <td style={{ padding: '10px 14px', color: 'hsl(var(--text-secondary))' }}>
                    {formatTrack(entry.module, entry.track)}
                  </td>
                  <td style={{ padding: '10px 14px', color: 'hsl(var(--text-secondary))', fontFamily: 'DM Mono, monospace', fontSize: '12px' }}>
                    {truncate(entry.fileName, 28)}
                  </td>
                  <td style={{ padding: '10px 14px', fontFamily: 'DM Mono, monospace', color: entry.bleedersFound > 0 ? '#EF4444' : '#10B981', fontWeight: '500' }}>
                    {entry.bleedersFound}
                  </td>
                  <td style={{ padding: '10px 14px', fontFamily: 'DM Mono, monospace', color: entry.atRiskSpend > 0 ? '#EF4444' : 'hsl(var(--text-tertiary))', fontWeight: '500' }}>
                    ${entry.atRiskSpend.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {entry.pausedCount > 0 && (
                        <span style={{ fontSize: '11px', background: '#FEF2F2', color: '#EF4444', padding: '2px 6px', borderRadius: '4px' }}>
                          {entry.pausedCount} paused
                        </span>
                      )}
                      {entry.negativesCreated > 0 && (
                        <span style={{ fontSize: '11px', background: '#FFF7ED', color: '#D97706', padding: '2px 6px', borderRadius: '4px' }}>
                          {entry.negativesCreated} negated
                        </span>
                      )}
                      {entry.bidsCutCount > 0 && (
                        <span style={{ fontSize: '11px', background: '#EFF6FF', color: '#4F6EF7', padding: '2px 6px', borderRadius: '4px' }}>
                          {entry.bidsCutCount} bids cut
                        </span>
                      )}
                      {entry.pausedCount === 0 && entry.negativesCreated === 0 && entry.bidsCutCount === 0 && (
                        <span style={{ color: 'hsl(var(--text-tertiary))' }}>—</span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{
                      fontSize: '11px',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: entry.decisionsMode === 'inline' ? '#F0FDF4' : '#EFF6FF',
                      color: entry.decisionsMode === 'inline' ? '#10B981' : '#4F6EF7',
                      fontWeight: '500',
                    }}>
                      {entry.decisionsMode === 'inline' ? 'inline' : 'excel'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
