import { formatRankCompact } from '@fplq/shared';

interface RankDeltaProps {
  current: number;
  previous: number | null;
  className?: string;
}

// Rank improved = number decreased = green up arrow. Worsened = red down arrow.
export default function RankDelta({ current, previous, className = '' }: RankDeltaProps) {
  if (previous == null) {
    return <span className={`text-xs text-faint ${className}`}>new</span>;
  }
  const delta = previous - current; // positive => moved up the table
  if (delta === 0) {
    return <span className={`text-xs text-faint ${className}`}>–</span>;
  }
  const improved = delta > 0;
  return (
    <span
      className={`num inline-flex items-center gap-0.5 text-xs font-semibold ${
        improved ? 'text-up' : 'text-down'
      } ${className}`}
    >
      <span aria-hidden>{improved ? '▲' : '▼'}</span>
      {formatRankCompact(Math.abs(delta))}
    </span>
  );
}
