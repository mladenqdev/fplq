# Transfer ideas methodology

Local implementation, 2026-09-14. This replaces single-GW `max(epNext, epThis, pointsPerGame, form)` comparisons in the Ideas tab. It is a conservative, uncalibrated decision aid, not a trained prediction model. The pitch and candidate xPts display still use the older projection model.

## Research basis

- [Premier League statistics guide](https://www.premierleague.com/en/news/2176606): form measures recent output; xG and xA describe underlying attacking opportunities. They are different inputs, not interchangeable estimates of next week's points.
- [StatsBomb on expected goals](https://blogarchive.statsbomb.com/articles/soccer/upgrading-expected-goals/): underlying chance quality is more useful for anticipating performance than treating realized goals as a stable scoring rate.
- [Official defensive contribution rules](https://www.premierleague.com/en/news/4361991): the award is two points per qualifying match, capped at two. Use observed awards, not average actions divided by a threshold.
- [Official scoring guide](https://www.premierleague.com/en/news/2174909): position-specific goal/clean-sheet values and appearance points.
- [Official long-view analysis](https://www.premierleague.com/en/news/4455414/fpl-long-view-plan-to-invest-in-liverpool-and-man-utd-from-gw12): assess runs of fixtures and underlying attacking/defending performance rather than chasing the last return.

These sources support the factors. The weights, prior strengths and decision margins below are our explicit assumptions, not coefficients supplied or endorsed by those sources.

## Data

`GET /api/players/recent` returns `RecentPlayersDto`: `throughEvent` and `players[id]`, each with up to six `{fixture, event, minutes, defconPoints}` observations. It uses the last six fully finished, data-checked GWs and completed fixtures for the player's current club. A double has two observations; a blank has none. An absent appearance for an existing live element counts as zero minutes. A missing live element is excluded rather than inferred as a DNP. Current-club history can understate minutes after an intra-league move, so new signings are conservatively screened and need manual review.

Event live payloads are cached for 24 hours after finalization. Failed fetches propagate to the UI's paused/retry state when no cache exists. The usual cache stale-on-error policy applies to previously finalized events. Web data refreshes every five minutes. Season attacking totals come from the latest bootstrap, so can include a more recent, not yet data-checked GW than the minutes sample; the UI explicitly states the completed-match cutoff.

## Estimate and selection

1. Expected minutes and appearance/60-minute rates use up to six club matches including DNPs, with linear weights `1..n` favoring recent matches.
2. Season xG/xA per 90 are regressed toward the same-position pool (players with 180+ minutes), with 450 prior minutes. No extra penalty bonus is added because penalty attempts already affect xG. First-choice penalty roles are shown as context.
3. FDR changes attacking rates by 12% per difficulty step around 3, bounded to 0.76–1.24. On-pitch xGC/90 is regressed toward 1.4 with 450 prior minutes; the inverse FDR multiplier adjusts conceded goals. Poisson zero-goal probability estimates clean sheets, weighted by the observed 60-minute rate. This is a coarse defence proxy, not a bookmaker clean-sheet probability.
4. DC points use actual recent match awards with two zero-return prior matches. Add conservative season bonus, save and yellow-card rates and a Poisson approximation of conceded-goal deductions. Rare events such as red cards and penalty saves/misses are not modeled.
5. The first evaluated GW uses the current availability flag/chance. Later weeks assume recovery for injury/doubt/suspension; unavailable/left-league statuses remain zero. Long-term injuries therefore require manual review and can be under-prioritized for sale.
6. Incoming candidates must be available, have at least 270 season minutes, at least three observed club matches, two 60-minute appearances in the latest three and a weighted average of at least 60 minutes. This intentionally excludes unproven cameos and some promising new starters.
7. Simulate each affordable same-position transfer through the actual saved plan. Reject any current/future budget, club-limit, duplicate or outgoing conflict. Do not replace a transfer already chosen in the active GW. Evaluate the strongest legal XI and automatic captain independently in both scenarios, including Bench Boost/Triple Captain. This assumes optimal lineup choices; it does not change the visible pitch layout.
8. Compare team totals over the next three or five GWs, capped to the remaining plan. All incremental hit costs in the remaining saved plan are deducted, even beyond the points window. Require three or more evaluation weeks. Single-transfer advice is paused during Wildcard/Free Hit.
9. Require a net gain of at least `max(3, 0.15 * (incoming player total + outgoing player total))`. Also rerun both optimal XIs with incoming estimates 15% lower and outgoing estimates 15% higher; the net gain must stay positive. This sensitivity check is not a statistical confidence interval.
10. Return up to three distinct alternatives, not a combined package. If none pass, recommend keeping the transfer. Price-change progress does not earn projected points or trigger a transfer on its own.

## Validation and limits

Regression scenarios cover cameo noise, DNPs, actual DC awards in doubles, injury flags, opponent difficulty, hit deductions, budget/future conflicts, bench-only improvements, blanks/doubles, chip advice and holding marginal moves. Current official API payloads were checked for the explanation fields.

No out-of-sample backtest or forecast calibration has been completed. This model does not use historical seasons, bookmaker odds, predicted lineups, tactical role changes, European/cup congestion, press conferences, projected prices or a multi-transfer optimizer. The hold margin approximates the opportunity cost of a free transfer; it does not solve its future value. A future upgrade should store deadline-time feature snapshots, evaluate against subsequent realized minutes/points without lookahead, compare to hold/PPG baselines and calibrate error by position and sample size before describing the model as reliably predictive.
