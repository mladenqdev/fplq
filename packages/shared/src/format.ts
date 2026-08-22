// Display formatting helpers.

// Price tenths of a million -> "12.0".
export function formatPrice(tenths: number): string {
  return (tenths / 10).toFixed(1);
}

// 794510 -> "794,510".
export function formatRank(rank: number): string {
  const sign = rank < 0 ? '-' : '';
  return (
    sign +
    Math.abs(rank)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  );
}

// Compact rank for tight layouts: 794510 -> "795k", 1250000 -> "1.3m".
export function formatRankCompact(rank: number): string {
  const abs = Math.abs(rank);
  const sign = rank < 0 ? '-' : '';
  if (abs < 1000) return sign + abs.toString();
  if (abs < 1_000_000) return sign + Math.round(abs / 1000).toString() + 'k';
  return sign + (abs / 1_000_000).toFixed(1) + 'm';
}
