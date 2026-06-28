# Decisions

This file records the architectural decisions behind WC26 Klement. Each entry is
an Architecture Decision Record. The decisions predate this log; they were
captured on 2026-06-28 from the existing hard rules in `../README.md` and
`../CLAUDE.md`.

## ADR-001: Win/draw/loss only, no score prediction

**Date:** 2026-06-28
**Status:** Reversed by ADR-009

**Context:**
The Klement model estimates relative team strength, not goals. An early
experiment added a Poisson scoreline model on top of the strength score, but its
scorelines were not defensible from the underlying econometrics and invited
false precision.

**Decision:**
The product surfaces win/draw/loss probabilities only. No scoreline prediction
exists anywhere in the model or UI. The Poisson experiment was removed.

**Consequences:**
- `matchP` returns exactly three probabilities that sum to 1; there is no goals
  output.
- Simulation resolves outcomes as W/D/L (and penalties for knockout draws), not
  as scores.
- Any future request for "predicted scores" must be refused at the model level.

## ADR-002: teams.json is the single source of truth for team data

**Date:** 2026-06-28
**Status:** Accepted

**Context:**
Team attributes (GDP, population, temperature, FIFA points, flags, confederation,
host and LatAm flags) are referenced by the model, the fixtures, and the UI. If
values were duplicated, the weekly rankings refresh would silently diverge from
the rest of the app.

**Decision:**
All team attribute values live only in `lib/teams.json`. The model reads them
through `teamData` / `teamNames`; nothing inlines team values elsewhere.

**Consequences:**
- The weekly FIFA refresh patches one file and the whole app updates.
- New teams or attribute changes are a single-file edit.
- Code review must reject any inline team constant.

## ADR-003: Klement's picks stay hand-authored in fixtures.ts

**Date:** 2026-06-28
**Status:** Reversed by ADR-010

**Context:**
Klement published a specific bracket and headline call (Netherlands champions,
Japan over Brazil in the R32). The model's own highest-probability bracket would
differ in places. The product promises to show Klement's published prediction,
not a re-derivation.

**Decision:**
The bracket `ROUNDS` and the per-match pick field `k` are hand-authored
constants in `lib/fixtures.ts`. They are never generated from model scores.

**Consequences:**
- Knockout pages display the published pick even where it disagrees with
  `matchP`.
- Updating the bracket is a deliberate manual edit.
- The bracket and the model can be inspected side by side without one
  overwriting the other.

## ADR-004: The model is pure and simulation is client-side

**Date:** 2026-06-28
**Status:** Accepted

**Context:**
Forecasts must be reproducible and testable, and the site must run without a
backend. Mixing I/O or randomness into the scoring functions would make them
hard to test and would force server execution.

**Decision:**
All functions in `lib/klement.ts` are pure (no I/O, no side effects). Randomness
(`simResult`, `simKO`) is sampled only in the browser; any component that calls
them is a client component. Group standings come from simulated results via
`calcStandings`, never from sorting on model score.

**Consequences:**
- The model is unit-tested with simple, deterministic assertions.
- Monte Carlo and the match predictor run entirely client-side, sending no data
  to any server.
- Pages that need randomness must declare `'use client'`.

## ADR-005: Static-first hosting with an ISR revalidation webhook, no backend

**Date:** 2026-06-28
**Status:** Accepted

**Context:**
The only data that changes over time is FIFA ranking points, refreshed weekly.
Standing up a database or API server for that would be disproportionate.

**Decision:**
Ship static and statically generated pages on Vercel. The only server route is
`POST /api/revalidate`, guarded by a `REVALIDATE_TOKEN` shared secret. A weekly
GitHub Actions cron patches `teams.json`, commits it, and calls the webhook to
trigger `revalidatePath('/', 'layout')`.

**Consequences:**
- No database, no app-owned backend to operate or secure.
- Content freshness depends on the cron and the webhook secret being configured.
- The endpoint-logging standard's per-router log files do not apply; there is
  one stateless webhook.

## ADR-006: Implement the normal CDF locally instead of adding a math library

**Date:** 2026-06-28
**Status:** Superseded by ADR-008

**Context:**
The match-probability model needs a standard normal CDF. Pulling in a statistics
library for one function would add a dependency and bundle weight for the
client.

**Decision:**
Implement `erf` with an Abramowitz-Stegun approximation and derive `phi` from it
inside `lib/klement.ts`. Keep the model free of external math dependencies.

**Consequences:**
- The model has zero runtime npm dependencies.
- The approximation is accurate enough for probabilities reported to whole
  percentage points.
- Any change to the CDF is a local, unit-testable edit.

## ADR-007: Pixel/retro design supersedes the original Trionda Light concept

**Date:** 2026-06-28
**Status:** Accepted

**Context:**
The README describes a "Trionda Light glass" aesthetic with Plus Jakarta Sans
and Framer Motion. The shipped UI is a pixel/retro design and there is no Framer
Motion dependency. The README was not updated when the design changed.

**Decision:**
The site uses the pixel/retro design: `Press_Start_2P` as `--font-pixel`,
`px-border` / `px-shadow` utilities, `PixelParticles`, and plain CSS `.fade-in`
transitions in `PageTransition`. Color tokens live in the `@theme` block of
`app/globals.css`. Code is authoritative over the README on stack and styling.

**Consequences:**
- No Framer Motion dependency; page transitions are CSS only.
- The README's tech-stack and structure sections are known-stale and should be
  read with that caveat until rewritten.
- New UI follows the pixel utilities and theme tokens, not the documented glass
  system.

## ADR-008: Data-driven self-fitting weights with an Elo results rating

**Date:** 2026-06-28
**Status:** Accepted

**Context:**
The original weights were hand-picked (`fifa 0.45, gdp 0.20, temp 0.15, pop 0.15,
host 0.05`) and frozen at Klement's April-2026 values. The product owner asked
for weights that determine themselves from data on a rolling basis and that take
past match results into account.

**Decision:**
`scripts/fit-model.js` fits the factor weights by logistic regression over real
international results (martj42 open dataset), adds an Elo rating built
point-in-time from every result, and writes the coefficients, standardiser,
draw and Poisson parameters to `lib/model/weights.json`. `lib/klement.ts` reads
those artifacts; `sc` uses `sigmoid` of standardized factor differences. This
supersedes the local normal-CDF approach (ADR-006).

**Consequences:**
- Weights are reproducible from the dataset and visible/proven on the About page
  (accuracy, log-loss, Brier, McFadden pseudo-R2, calibration).
- `sc` is now an unbounded latent score; UI shows a 0-100 strength index and the
  Elo rating instead of the raw value.
- Socio-economic factors are no longer assumed dominant; the data decides.

## ADR-009: Reinstate score prediction with a Poisson goals model

**Date:** 2026-06-28
**Status:** Accepted (reverses ADR-001)

**Context:**
ADR-001 removed score prediction. The product owner asked to bring it back.

**Decision:**
Fit a Poisson goals model (`log(lambda) = mu +/- gamma * strengthDiff`) and add
`predictScore` / `scoreMatrix` to `lib/klement.ts`, surfaced on `/score` as a
most-likely scoreline, full scoreline heatmap, expected goals, BTTS and
over/under 2.5.

**Consequences:**
- `matchP` remains the canonical W/D/L; the Poisson view is a consistent
  second lens.
- The goals parameters are fit and committed alongside the weights.

## ADR-010: Generate the knockout bracket from the model

**Date:** 2026-06-28
**Status:** Accepted (reverses ADR-003)

**Context:**
The hand-authored bracket referenced teams not in the group draw (Indonesia,
Denmark, Serbia, Nigeria) and could not stay consistent as weights change.

**Decision:**
`scripts/fit-model.js` computes expected group standings, picks qualifiers (top 2
plus 8 best thirds), seeds a bracket by model score, advances by win probability,
and writes `lib/model/bracket.json`. `lib/fixtures.ts` exposes it as `ROUNDS`.

**Consequences:**
- The bracket is always consistent with the real group draw and the current
  weights; no phantom teams.
- Per-match picks are labelled "model pick", not "Klement pick".

## ADR-011: Topscorer projection from real per-player international goals

**Date:** 2026-06-28
**Status:** Accepted

**Context:**
The product owner asked to fetch player data to predict topscorers.

**Decision:**
`scripts/model/scorers.js` builds per-player recent international scoring rates
from the goalscorers dataset and projects tournament goals as rate times the
team's expected matches played, written to `lib/model/scorers.json` and shown on
`/topscorers`. Live Golden Boot standings come from API-Football when a key
is set.

**Consequences:**
- The candidate pool is players who have scored for a qualified nation recently;
  no fabricated rosters.
- Live leaders refine the view during the tournament.

## ADR-012: Event-driven refit pipeline

**Date:** 2026-06-28
**Status:** Accepted (extends ADR-005; supersedes its weekly FIFA cron)

**Context:**
The dead FIFA endpoint and weekly cron were replaced. Weights must refresh after
each finished match.

**Decision:**
`scripts/update-live.js` pulls finished WC matches from API-Football, appends
them to `lib/model/live-results.csv`, refits, and the `Refit Model` GitHub Action
commits the artifacts and triggers revalidation. `POST /api/recompute` lets an
external webhook dispatch that Action. `scripts/fetch-rankings.js` and the old
workflow were removed.

**Consequences:**
- Without an API key the model still fits fully from the historical dataset.
- The Vercel filesystem is read-only, so the heavy refit runs in CI, not in the
  API route.

## ADR-013: Deterministic expected group standings for server rendering

**Date:** 2026-06-28
**Status:** Accepted (refines ADR-004)

**Context:**
`GroupCard` ran `simResult` (Math.random) during render, so server and client
diverged and React threw a hydration mismatch on `/groups`.

**Decision:**
`GroupCard` renders deterministic expected standings (from `matchP`) by default,
which match on server and client; a button runs a real random simulation on
demand, client-side only.

**Consequences:**
- No hydration mismatch; the default table is stable and informative.
- ADR-004's "standings from simulated results" is relaxed: the default is the
  expected table, with simulation one click away.

## ADR-014: Live server-route sensitivity explorer with no committed snapshot

**Date:** 2026-06-28
**Status:** Accepted

**Context:**
The product owner wanted an interactive page that proves which datapoints carry
signal, so a candidate feature can later be promoted into the production model.
Doing this honestly requires a point-in-time out-of-sample experiment: fit on
World Cups up to 2014, then sweep each feature's coefficient and watch training
and out-of-sample (2018/2022/2026) log-loss respond. An offline pre-built
training snapshot was attempted first and rejected; it froze the data and hid the
real fetch-fit cost, so it was removed (`lib/model/wc-samples.json`,
`scripts/build-samples.js`).

**Decision:**
Build an explorer at `GET /api/sensitivity` (Next route, `runtime='nodejs'`,
`maxDuration=60`, `Cache-Control: no-store`) backed by `lib/sensitivity/*` and a
client page at `/sensitivity`. The route fetches the martj42 results.csv and the
World Bank GDP + population series at run time and builds all features and weights
live; there is NO committed training snapshot. The explorer evaluates a 10-feature
candidate set: `elo`, `form`, `gdp`, `pop` (LatAm multiplier removed),
`confed` (mean pre-match Elo of the team's confederation, replacing the LatAm
hack), `climateGap` (`1 - clamp(|homeTemp - venueTemp|/22, 0, 1)`, replacing
absolute temperature), `host`, `continental`, `rest`, `goalsForm`. Progress and
results stream as NDJSON (`application/x-ndjson`, one `JSON.stringify(event)` per
line) over a one-shot streamed fetch Response, read with a `ReadableStream`
reader on the client, NOT SSE/EventSource.

**Consequences:**
- The explorer reflects whatever the live sources currently hold; no snapshot can
  drift from the real datasets. Repeat clicks may re-fetch unless a short module
  TTL cache is warm.
- NDJSON over fetch is chosen because `EventSource` is GET-only and auto-reconnects
  on stream end, which would silently re-run the whole ~4MB fetch + fit; a one-shot
  fetch stream has neither problem and lets the route emit a terminal
  `{type:'error'}` line then close.
- The climate-adaptation-gap and confederation-strength swaps mean the explorer's
  feature set deliberately diverges from the production model's 5 factors; the
  one-at-a-time sweep plus the L2 fit surface known collinearity (`host` subset of
  `continental`, `confed` correlated with `elo`) rather than hiding it.
- Scope is explorer-only: the production model in `lib/klement.ts` and
  `lib/model/weights.json` is unchanged by this work. Promoting any candidate
  feature into production is a separate, later decision.
- Vercel serverless logging applies (console captured by the platform); the
  FastAPI per-router file-logging standard does not, mirroring ADR-005's webhook
  note.

## ADR-015: Optimal-weight selection on a fixed train<=2014 / holdout 2018-2026 split

**Date:** 2026-06-28
**Status:** Accepted

**Context:**
The sensitivity explorer (ADR-014) shows which features carry signal but does not
pick a single generalization-best weight vector. The product owner asked for the
weights that generalize best to the upcoming World Cup. An earlier framing scored
candidates with a 2002-2022 expanding-window walk-forward as the headline; the
owner corrected this to a fixed forward design: train on everything up to and
including 2014, evaluate strictly on the later editions, and report the recent
tournaments individually. The deployment target (2026) is a strict forecast from
the past, so the holdout must be the most recent editions and training everything
before them.

**Decision:**
`lib/sensitivity/select.ts` `selectOptimal` (orchestrated live by
`optimize-run.ts` `runOptimize`) trains on World Cups with `year <= 2014`
(1994-2014) and holds out `year in {2018, 2022, 2026}`, reported both pooled and
per-tournament. The betas, the standardizer and the calibration are fit on the
`<= 2014` band only; no holdout row enters any fitted quantity, and World Bank
gdp/pop is resolved backward-only so a feature never reads a post-match year. The
hyperparameter search runs an L2 ridge path, an L1 lasso path, a few elastic-net
alpha mixes (20 lambdas each, alpha in {0.25, 0.5, 0.75}, 100 path points total)
and a forward-then-backward feature selection, and picks the `(family, lambda,
feature subset)` that minimizes the pooled 2018-2026 out-of-sample log-loss. The
chosen config is refit on `<= 2014`; the reported headline is that refit's pooled
2018-2026 loss with the per-tournament breakdown, against four baselines on the
same holdout (unregularized MLE on `<= 2014`, equal weights, elo only, uniform
1/3). The 2002-2022 walk-forward is NOT the headline for this selector; that
expanding-window backtest stays a separate About-page artifact
(`scripts/backtest.js`). The snapshot result lives at
`.planning/optimal-weights-result.json`: chosen config `elasticNet`,
`lambda 0.003792690190732249`, `alpha 0.5`, subset `[elo, form, gdp, rest,
goalsForm]`, pooled holdout log-loss `0.9707804564985498`.

**Consequences:**
- The selection objective and the reported number are the same 2018-2026 block,
  so the headline is mildly optimistic. This is an accepted tradeoff of the
  owner-specified train `<= 2014` / evaluate `> 2014` design, disclosed in
  `OptimalResult.caveat` and surfaced in the UI; it is not hidden.
- The 2026 fold is the live partial edition; its match count moves as games
  finish and an empty fold drops out of the pooled number by zero weight, so the
  per-tournament 2026 number is a high-variance point estimate.
- This is explorer-scope only: the production model in `lib/klement.ts` and
  `lib/model/weights.json` is unchanged. Promoting the selected subset or weights
  into production is a separate, later decision.
- Revisit if the holdout objective should be replaced by a nested inner split
  (train `<= 2014`, tune on a 2014-internal fold, report 2018-2026 untouched) to
  remove the selection optimism; that would lower the reported number's bias at
  the cost of a smaller tuning set.
