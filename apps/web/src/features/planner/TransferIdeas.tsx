import { formatPrice } from '@fplq/shared';
import type { BootstrapIndex } from '../../lib/bootstrap-index';
import type { recommendTransfers } from './transfer-recommendations';

export default function TransferIdeas({
  result,
  horizon,
  onHorizon,
  loading,
  error,
  onRetry,
  throughEvent,
  index,
  onPlanTransfer,
}: {
  result: ReturnType<typeof recommendTransfers> | null;
  horizon: number;
  onHorizon: (n: number) => void;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  throughEvent: number | null;
  index: BootstrapIndex;
  onPlanTransfer: (out: number, incoming: number) => void;
}) {
  return (
    <div className="space-y-3 py-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-semibold">Evaluate over</span>
        <div className="flex gap-1 rounded-lg bg-bg p-1">
          {[3, 5].map((n) => (
            <button
              key={n}
              aria-pressed={horizon === n}
              onClick={() => onHorizon(n)}
              className={`min-h-10 rounded-md px-3 text-xs ${horizon === n ? 'bg-brand text-black' : 'text-muted'}`}
            >
              {n} GWs
            </button>
          ))}
        </div>
      </div>
      {loading ? (
        <p className="py-6 text-xs text-muted">
          Checking minutes and defensive returns from completed matches…
        </p>
      ) : error ? (
        <div className="text-xs text-muted">
          Match evidence could not be loaded. Advice is paused.
          <button onClick={onRetry} className="ml-2 min-h-11 text-brand">
            Retry
          </button>
        </div>
      ) : (
        result && (
          <>
            <p className="text-[11px] text-muted">
              {result.events.length > 0
                ? `GW${result.events[0]}–${result.events.at(-1)}`
                : 'No planning window'}{' '}
              · Completed matches through GW{throughEvent ?? '—'}
            </p>
            {result.reason && (
              <div className="rounded-xl border border-line bg-bg p-4 text-sm text-muted">
                {result.reason}
              </div>
            )}
            {result.ideas.map((idea) => (
              <article
                key={`${idea.out.id}-${idea.incoming.id}`}
                className="space-y-3 rounded-xl border border-line bg-bg p-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs text-muted">{idea.out.webName} →</p>
                    <h3 className="font-bold">
                      {idea.incoming.webName}{' '}
                      <span className="text-xs font-normal text-muted">
                        £{formatPrice(idea.incoming.nowCost)}
                      </span>
                    </h3>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-accent">+{idea.gain.toFixed(1)}</p>
                    <p className="text-[10px] text-muted">estimated team gain</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <p className="text-faint">Expected minutes / match</p>
                    <p>
                      {Math.round(idea.outgoingEvidence.minutes)} →{' '}
                      <strong>{Math.round(idea.evidence.minutes)}</strong>
                    </p>
                  </div>
                  <div>
                    <p className="text-faint">Underlying xGI / 90*</p>
                    <p>
                      {(idea.outgoingEvidence.xg90 + idea.outgoingEvidence.xa90).toFixed(2)} →{' '}
                      <strong>{(idea.evidence.xg90 + idea.evidence.xa90).toFixed(2)}</strong>
                    </p>
                  </div>
                  <div>
                    <p className="text-faint">DC returns / recent club games</p>
                    <p>
                      {idea.outgoingEvidence.dcHits}/{idea.outgoingEvidence.games} →{' '}
                      <strong>
                        {idea.evidence.dcHits}/{idea.evidence.games}
                      </strong>
                    </p>
                  </div>
                  <div>
                    <p className="text-faint">Additional hits · bank after</p>
                    <p>
                      {idea.hit ? `−${idea.hit} pts` : 'No hit'} · £{formatPrice(idea.bank)}
                    </p>
                  </div>
                </div>
                <p className="text-[11px] text-muted">
                  Recent minutes: {idea.evidence.recentMinutes.join(' · ')} (oldest first)
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[10px]">
                    <thead>
                      <tr>
                        <th className="py-1 font-normal text-faint">Fixtures</th>
                        {idea.fixtures.map((f) => (
                          <th className="text-center font-normal text-faint" key={f.event}>
                            GW{f.event}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(['outgoing', 'incoming'] as const).map((key) => (
                        <tr key={key}>
                          <th className="max-w-24 truncate py-1 pr-2 font-normal">
                            {key === 'incoming' ? idea.incoming.webName : idea.out.webName}
                          </th>
                          {idea.fixtures.map((f) => (
                            <td key={f.event} className="px-1 py-1 text-center">
                              {f[key]
                                .map(
                                  (m) =>
                                    `${index.teamShort(m.opponent)} ${m.isHome ? '(H)' : '(A)'}`
                                )
                                .join(' / ') || 'Blank'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {(idea.out.penaltiesOrder === 1 || idea.incoming.penaltiesOrder === 1) && (
                  <p className="text-[11px] text-muted">
                    Penalty role:{' '}
                    {idea.out.penaltiesOrder === 1 ? idea.out.webName : idea.incoming.webName}
                    {idea.out.penaltiesOrder === 1 && idea.incoming.penaltiesOrder === 1
                      ? ` and ${idea.incoming.webName}`
                      : ''}{' '}
                    listed first. Already reflected in xG; no extra bonus added.
                  </p>
                )}
                <button
                  onClick={() => onPlanTransfer(idea.out.id, idea.incoming.id)}
                  className="min-h-11 w-full rounded-lg border border-brand/30 bg-brand/10 px-3 text-xs font-semibold text-brand sm:w-auto"
                >
                  Add to plan
                </button>
              </article>
            ))}
          </>
        )
      )}
      <details className="text-[11px] text-muted">
        <summary className="cursor-pointer py-2">How these ideas are evaluated</summary>
        <div className="space-y-2 pb-2 leading-relaxed">
          <p>
            We compare the best legal starting XI and captain with and without one transfer across
            the displayed weeks. Blanks, doubles, availability, clean sheets, defensive returns,
            price, club limits and existing plans are included. Extra hits anywhere in the saved
            plan are deducted.
          </p>
          <p>
            New picks need 270 season minutes and at least two 60-minute appearances in their last
            three club games. A move must clear a 3-point minimum and a 15% sensitivity margin.
            Otherwise, saving a transfer is preferred.
          </p>
          <p>
            *xGI rates are adjusted toward the position average to reduce small-sample noise.
            Minutes include missed club games. Injury flags affect the first week; later recovery is
            uncertain. Transfers between clubs and new signings need manual review.
          </p>
          <p>
            This is an uncalibrated estimate, not a forecast service. Opponent difficulty is a
            coarse input; confirmed lineups and live betting odds are not included. Figures differ
            from the planner's simpler xPts estimate.
          </p>
          <p>
            <a
              className="text-brand underline"
              href="https://www.premierleague.com/en/news/2176606"
              target="_blank"
              rel="noreferrer"
            >
              FPL statistics guide
            </a>{' '}
            ·{' '}
            <a
              className="text-brand underline"
              href="https://www.premierleague.com/en/news/4361991"
              target="_blank"
              rel="noreferrer"
            >
              Defensive contribution rules
            </a>
          </p>
        </div>
      </details>
    </div>
  );
}
