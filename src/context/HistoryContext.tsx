import React, { createContext, useContext, useState, useEffect } from 'react';

export interface SessionEntry {
  id: string;
  clientId: string;
  clientName: string;
  module: 'bleeders_1' | 'bleeders_2' | 'lifetime';
  track?: string;
  fileName: string;
  bleedersFound: number;
  atRiskSpend: number;
  decisionsMode: 'inline' | 'excel';
  pausedCount: number;
  negativesCreated: number;
  bidsCutCount: number;
  completedAt: string;
}

interface HistoryContextValue {
  entries: SessionEntry[];
  addEntry: (entry: Omit<SessionEntry, 'id' | 'completedAt'>) => void;
  clearHistory: () => void;
}

const HistoryContext = createContext<HistoryContextValue | null>(null);

export const HistoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [entries, setEntries] = useState<SessionEntry[]>(() => {
    try {
      const saved = localStorage.getItem('gno-adops-history');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem('gno-adops-history', JSON.stringify(entries));
  }, [entries]);

  const addEntry = (data: Omit<SessionEntry, 'id' | 'completedAt'>) => {
    const entry: SessionEntry = {
      ...data,
      id: `session-${Date.now()}`,
      completedAt: new Date().toISOString(),
    };
    setEntries(prev => [entry, ...prev].slice(0, 100));
  };

  const clearHistory = () => setEntries([]);

  return (
    <HistoryContext.Provider value={{ entries, addEntry, clearHistory }}>
      {children}
    </HistoryContext.Provider>
  );
};

export const useHistory = (): HistoryContextValue => {
  const ctx = useContext(HistoryContext);
  if (!ctx) throw new Error('useHistory must be used within HistoryProvider');
  return ctx;
};
