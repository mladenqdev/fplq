import { useBootstrap } from '../lib/queries';
import { formatCountdown, useNow } from '../lib/time';

export default function TopBar() {
  const { data: bootstrap } = useBootstrap();
  const now = useNow(30_000);

  const currentEvent = bootstrap?.currentEvent ?? bootstrap?.nextEvent ?? null;
  const nextEvent =
    bootstrap?.events.find((e) => e.isNext) ??
    bootstrap?.events.find((e) => e.id === (bootstrap?.nextEvent ?? -1));
  const countdown = nextEvent ? formatCountdown(nextEvent.deadlineTime, now) : '';

  return (
    <header className="fixed inset-x-0 top-0 z-30 border-b border-line bg-bg/85 backdrop-blur-md pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-lg bg-gradient-to-br from-accent to-brand text-sm font-black text-black">
            Q
          </span>
          <span className="text-lg font-bold tracking-tight">fplq</span>
          {currentEvent != null && (
            <span className="ml-1 rounded-full bg-surface2 px-2 py-0.5 text-xs font-medium text-muted">
              GW{currentEvent}
            </span>
          )}
        </div>
        {nextEvent && countdown && (
          <div className="flex flex-col items-end leading-tight">
            <span className="text-[10px] uppercase tracking-wide text-faint">
              GW{nextEvent.id} deadline
            </span>
            <span className="num text-sm font-semibold text-fg">{countdown}</span>
          </div>
        )}
      </div>
    </header>
  );
}
