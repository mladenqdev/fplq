// Parse FPL numeric strings (form, selected_by_percent, expected_goals, ...) to numbers.

export function num(value: string | null | undefined): number {
  if (value === null || value === undefined || value === '') return 0;
  const parsed = Number.parseFloat(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}
