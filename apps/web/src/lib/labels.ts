export const CHIP_LABELS: Record<string, string> = {
  wildcard: 'Wildcard',
  freehit: 'Free Hit',
  bboost: 'Bench Boost',
  '3xc': 'Triple Captain',
};

export function chipLabel(name: string | null): string | null {
  if (!name) return null;
  return CHIP_LABELS[name] ?? name;
}

export const POSITION_ORDER = [1, 2, 3, 4];
