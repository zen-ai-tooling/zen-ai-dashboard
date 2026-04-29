// UI-only helper — does NOT affect business logic.
// Suggestion pills shown on Bleeders 1.0 results table to guide reviewers.

export type B1SuggestionKind = 'pause' | 'review' | 'monitor' | 'keep';

export interface B1Suggestion {
  kind: B1SuggestionKind;
  label: string;
  bg: string;
  color: string;
  border: string;
}

interface B1SuggestionInput {
  clicks: number;
  spend: number;
  sales: number;
  orders?: number;
}

export function suggestB1Row(row: B1SuggestionInput): B1Suggestion {
  const clicks = row.clicks ?? 0;
  const sales = row.sales ?? 0;
  const orders = row.orders ?? 0;
  const isZeroSale = sales <= 0 && orders <= 0;

  if (isZeroSale && clicks >= 15) {
    return {
      kind: 'pause',
      label: 'Pause',
      bg: 'rgba(255, 59, 48, 0.10)',
      color: '#B71C1C',
      border: 'rgba(255, 59, 48, 0.25)',
    };
  }

  if (isZeroSale && clicks >= 13) {
    return {
      kind: 'review',
      label: 'Review',
      bg: 'rgba(255, 149, 0, 0.10)',
      color: '#A35A00',
      border: 'rgba(255, 149, 0, 0.25)',
    };
  }

  if (isZeroSale && clicks >= 10) {
    return {
      kind: 'monitor',
      label: 'Monitor',
      bg: 'rgba(134, 134, 139, 0.10)',
      color: '#6E6E73',
      border: 'rgba(134, 134, 139, 0.25)',
    };
  }

  return {
    kind: 'keep',
    label: 'Keep?',
    bg: 'rgba(52, 199, 89, 0.10)',
    color: '#1A7F3E',
    border: 'rgba(52, 199, 89, 0.25)',
  };
}
