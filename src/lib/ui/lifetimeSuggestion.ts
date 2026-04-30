// UI-only helper — does NOT affect business logic.
// Suggestion pills shown on Lifetime Audit results table.

export type LifetimeSuggestionKind = 'pause' | 'review' | 'monitor' | 'keep';

export interface LifetimeSuggestion {
  kind: LifetimeSuggestionKind;
  label: string;
  decision: string; // mapped decision dropdown value
  bg: string;
  color: string;
  border: string;
  reason: string;
}

interface LifetimeSuggestionInput {
  clicks: number;
  sales: number;
  orders?: number;
}

/**
 * Lifetime Audit suggestion logic:
 * - 20+ lifetime clicks and 0 sales → "Pause" (red)
 * - 10-19 lifetime clicks and 0 sales → "Review" (amber)
 * - otherwise → "Keep?" (green)
 */
export function suggestLifetimeRow(row: LifetimeSuggestionInput): LifetimeSuggestion {
  const clicks = row.clicks ?? 0;
  const sales = row.sales ?? 0;
  const orders = row.orders ?? 0;
  const isZeroSale = sales <= 0 && orders <= 0;

  if (isZeroSale && clicks >= 20) {
    return {
      kind: 'pause',
      label: 'Pause',
      decision: 'Pause',
      bg: 'rgba(255, 59, 48, 0.10)',
      color: '#B71C1C',
      border: 'rgba(255, 59, 48, 0.25)',
      reason: '20+ lifetime clicks with 0 sales',
    };
  }

  if (isZeroSale && clicks >= 10) {
    return {
      kind: 'review',
      label: 'Review',
      decision: 'Cut Bid 50%',
      bg: 'rgba(255, 149, 0, 0.10)',
      color: '#A35A00',
      border: 'rgba(255, 149, 0, 0.25)',
      reason: '10-19 lifetime clicks with 0 sales',
    };
  }

  return {
    kind: 'keep',
    label: 'Keep?',
    decision: 'Keep',
    bg: 'rgba(52, 199, 89, 0.10)',
    color: '#1A7F3E',
    border: 'rgba(52, 199, 89, 0.25)',
    reason: 'Below review threshold',
  };
}
