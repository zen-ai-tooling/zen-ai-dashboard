import * as React from 'react';
import { Info, ChevronRight } from 'lucide-react';

export const BulkBreadcrumb: React.FC = () => (
  <div className="flex items-start gap-2.5 rounded-lg border border-border bg-secondary/60 px-3.5 py-2.5">
    <Info className="w-3.5 h-3.5 text-[hsl(var(--text-tertiary))] flex-shrink-0 mt-[2px]" />
    <div className="flex items-center gap-1.5 text-[12px] text-[hsl(var(--text-secondary))] flex-wrap leading-relaxed">
      <span>Amazon Ads</span>
      <ChevronRight className="w-3 h-3 opacity-50" />
      <span>Campaign Manager</span>
      <ChevronRight className="w-3 h-3 opacity-50" />
      <span>Bulk Operations</span>
      <ChevronRight className="w-3 h-3 opacity-50" />
      <span className="text-foreground font-medium">Create Spreadsheet</span>
      <span className="text-[hsl(var(--text-tertiary))]">· 60-day range</span>
    </div>
  </div>
);
