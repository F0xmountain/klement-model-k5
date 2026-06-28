# Plan: Live weight-sensitivity explorer + expanded feature set

Status: APPROVED, ready to build with ultracode. Build not started (except the
verified prerequisites in section 7). Scope: explorer-only (the production model
in `lib/klement.ts` / `lib/model/weights.json` is NOT changed by this work).

Graph note (plan_discipline P-11): the global graphify graph at
`C:\Users\Pim Vossenberg\graphify-out\graph.json` indexes other Clarion projects,
not KlementWC2026. File/impact reasoning here comes from direct reading of
`scripts/backtest.js`, `scripts/model/*.js`, `lib/klement.ts`, `app/about/page.tsx`,
`app/api/revalidate/route.ts`, and `components/ui/Nav.tsx`.

## 1. Goal

An interactive page where a Start button triggers a live, point-in-time
out-of-sample experiment: fetch the real sources, build features, fit weights on
World Cups up to 2014, then sweep each feature's coefficient one at a time and
show how training and out-of-sample (2018/2022/2026) log-loss respond. The
result proves which datapoints carry signal, so they can later be promoted into
the production model.

## 2. Feature set (10)

Model: `eta = sum_k beta_k * standardized(featureA_k - featureB_k)`, then
`P(A) = sigmoid(scale*eta) * (1 - draw)`. All features are point-in-time with no
lookahead.

| # | key | Definition | Transform | Source |
|---|---|---|---|---|
| 1 | `elo` | Pre-match home-grown Elo (existing chronological pass) | standardized | results.csv |
| 2 | `form` | Elo change over trailing 365 days | standardized | results.csv (Elo history) |
| 3 | `gdp` | GDP per capita, nearest year | inverted-U peak ~$35k (fG) | World Bank |
| 4 | `pop` | Population, log talent-pool; LatAm multiplier REMOVED | log/log(200), clamp 0..1 | World Bank |
| 5 | `confed` | Mean pre-match Elo of the team's confederation at match date | standardized | results.csv + conf map |
| 6 | `climateGap` | `1 - clamp(|homeTemp - venueTemp|/22, 0, 1)` (adaptation). SWAPS absolute temp | clamp 0..1 | nations temp + venue temp |
| 7 | `host` | Host nation flag | 0/1 | HOSTS map |
| 8 | `continental` | Team continent == venue continent | 0/1 | conf->continent + venue->continent |
| 9 | `rest` | Days since each side's previous match, capped and normalized | normalized | results.csv dates |
| 10 | `goalsForm` | Recent (scored - conceded)/match, trailing ~10 matches | standardized | results.csv scores |

Swaps vs the current 5-feature backtest: `temp` -> `climateGap`; the LatAm
weighting inside `pop` -> a standalone `confed` feature. Added: `form`,
`continental`, `rest`, `goalsForm`. Kept: `elo`, `gdp`, `host`, `pop` (cleaned).

Known collinearity (surface it, do not hide it): `host` is a subset of
`continental`; `confed` correlates with `elo`. The L2 term in the fit plus the
one-at-a-time sweep handle it; the explorer reports it.

### 2a. Point-in-time computation (no lookahead) - single chronological pass

`features.ts` runs ONE chronological pass over EVERY international match in
results.csv (not only World Cup matches - Elo and form accumulate from all
games). It maintains per-team running state, computes each feature from the state
BEFORE the match, records the sample only for World Cup matches (1994-2026, both
teams in the `wc-nations.json` pool), then updates state with the result. State
per team:

- `elo`: running Elo (existing update: tournament-weight x goal-diff x (S - E)).
  Feature = pre-match Elo.
- `form`: a list of (date, eloAfter) snapshots. Feature = currentElo minus the
  team's eloAfter at the latest snapshot on or before (matchDate - 365 days); 0
  if no snapshot in the window.
- `rest`: last-match date. Feature factor = `clamp(daysSinceLast / 14, 0, 1)`
  (>= 14 days counts as fully rested; both teams' opening WC match -> ~equal ->
  near-zero difference).
- `goalsForm`: rolling last-10 (scored, conceded). Feature = mean(scored -
  conceded) over up to 10 prior matches; 0 if none.
- `confed`: feature = mean running Elo over all pool nations sharing the team's
  `conf`, evaluated at the match's position (uses the running Elo table; unseen
  nations default 1500).

Team-static / venue features (no history): `gdp`, `pop` from World Bank by
`(iso3, year)` nearest-year; `host` from HOSTS; `climateGap` and `continental`
from the match VENUE (the results.csv `country` column, NOT "the host" - this is
correct for co-hosted 2002 Korea/Japan and 2026 USA/Canada/Mexico).

Every feature is computed per side (A and B); the logistic model uses the
standardized difference `featureA_k - featureB_k`. Standardizer mean/std are fit
on TRAIN only and reused for validate.

## 3. Reference-data additions (static config, allowed)

Extend `lib/model/wc-nations.json` with two fields per nation and one venue map.

`conf` (current confederation) and `continent` (geography) are DIFFERENT fields
because they diverge: Australia is `conf: AFC` but `continent: Oceania`. Default
continent by confederation, then override the divergences:

- UEFA -> Europe, CONMEBOL -> South America, CONCACAF -> North America,
  CAF -> Africa, AFC -> Asia, OFC -> Oceania
- Overrides in the pool: Australia conf AFC / continent Oceania. (Turkey, Russia
  stay UEFA / Europe.)

Venue-country -> continent (host countries only); venue temp = `nations[country].temp`:
- United States / Canada / Mexico -> North America
- France / Germany / Russia -> Europe
- South Korea / Japan / Qatar -> Asia
- South Africa -> Africa
- Brazil -> South America

## 4. Architecture: server route, live fetch, NDJSON stream

```
GET /api/sensitivity   (runtime='nodejs', maxDuration=60, Cache-Control: no-store)
  stage results   -> fetch martj42 results.csv (GitHub raw, ~3.7MB)
  stage worldbank -> fetch World Bank GDP + population (country/all)
  stage features  -> build point-in-time Elo + all 10 features (single pass)
                     split train (year<=2014) / validate (2018/2022/2026)
  stage baseline  -> fit baseline weights on train; calibrate once; FREEZE
  sweep events    -> per feature: 5-probe wide pass -> band ->
                     26 fine points (step=(end-begin)/25), score train + OOS
  final           -> SensitivityResult
client /sensitivity: Start -> fetch() stream -> staged progress trace ->
                     10 per-feature curves + summary table
```

Transport is NDJSON over a streamed fetch Response, NOT SSE/EventSource. Each
progress object is one `JSON.stringify(event) + "\n"` line; the route returns a
`ReadableStream` with `Content-Type: application/x-ndjson`. The client reads
`response.body` with a reader, buffers, splits on `\n`, and `JSON.parse`s each
line. Rationale: `EventSource` is GET-only and auto-reconnects on stream end,
which would silently re-run the entire ~4MB fetch + fit; a one-shot fetch stream
has neither problem. The route catches errors and emits a final
`{type:'error'}` line, then closes.

Source-fetch precision (both confirmed `Access-Control-Allow-Origin: *`, but the
fetch is server-side so CORS is moot):
- World Bank: `GET /v2/country/all/indicator/{NY.GDP.PCAP.CD|SP.POP.TOTL}?date=1990:2025&format=json&per_page=25000`. Must set `per_page` high (~9.6k rows/indicator) or follow the `pages` field in element [0], else data truncates silently. Build `wb[iso3][year]`; lookup is nearest-year, `/1000` for gdpK, `/1e6` for popM (mirror `scripts/model/worldbank.js`). North Korea has no World Bank series; use the `gdp`/`pop` fallbacks already in `wc-nations.json`.
- martj42 CSV: quote-aware parse (city/country fields can contain commas). Columns: `date,home_team,away_team,home_score,away_score,tournament,city,country,neutral`. Skip rows with empty/non-numeric scores (unplayed fixtures). Team names are the dataset names and key directly into `NATIONS` (the existing backtest relies on this; no extra name mapping).
- Optional: cache the parsed dataset + WB lookups in module scope with a short TTL (e.g. 1 hour) so repeat clicks on a warm function skip the re-fetch. Acceptable staleness since results.csv only grows when matches are added.

## 5. Methodology (locked)

- Train = WC year <= 2014. Validate = 2018 / 2022 / 2026. Range-finding and all
  fitting use train only, so the validation set is never used to choose anything:
  no leakage.
- Baseline: fit the 10 betas by logistic regression on train (gradient descent,
  3000 iters, lr 0.3, L2 1e-3, decisive matches only - port of the validated
  `fitLogistic`). Then calibrate `(scale, dmax, ddecay)` ONCE on train at the
  baseline betas via the existing grid (scale 0.1..4 step .1, dmax .16..34 step
  .02, ddecay .2..3 step .2). These three calibration values are FROZEN for every
  sweep evaluation, so a swept coefficient cannot be masked by re-scaling.
- One feature at a time: set `beta[i]` to the swept value, hold the other nine at
  baseline, evaluate (never re-fit, never re-calibrate during a sweep).
- Wide pass per feature `i`: `center = baselineBeta[i]`,
  `span = max(5, 3*|center|)`, `lo = center - span`, `hi = center + span`; 5
  evenly spaced probes; compute TRAIN log-loss at each.
- Band: walk inward from each end accumulating `|Δloss|` between adjacent probes
  until 2.5% of the total piecewise variation is dropped on that side; the
  surviving `[begin, end]` is the 95% sensitivity band (trims flat saturated
  tails). With 5 probes the band is probe-resolution-limited; the 26-point fine
  sweep is what gets plotted.
- Fine pass: 26 points `begin + (end-begin)*i/25`, scoring BOTH train and OOS
  (validate) log-loss at each. Report per feature: baseline beta, band, the
  train-optimal and OOS-optimal beta+loss, and the full curve.
- The 456-match walk-forward backtest stays as the About-page headline number.
  The explorer is the interactive per-feature view on the single split.

## 6. Files

### Create
| Path | Purpose |
|---|---|
| `lib/sensitivity/types.ts` | NDJSON progress-event + result types (shared route/page) |
| `lib/sensitivity/sources.ts` | Live fetch + parse: results.csv, World Bank GDP/pop |
| `lib/sensitivity/features.ts` | Point-in-time assembly of all 10 features -> samples |
| `lib/sensitivity/engine.ts` | Pure math: standardize, delta, fitLogistic, predict, logLoss, calibrate, sensitivityBand, sweepFactor |
| `lib/sensitivity/run.ts` | Async-generator orchestrator: yields progress, returns the result |
| `lib/sensitivity/engine.test.ts` | Unit tests for engine math (S-1.4) |
| `lib/sensitivity/Documentation.md` | Module docs (D-1.4) |
| `app/api/sensitivity/route.ts` | Thin NDJSON streaming endpoint delegating to run.ts; logs per E-1.1 |
| `app/sensitivity/page.tsx` | Client UI: Start, progress trace, results |
| `components/sensitivity/SensitivityChart.tsx` | Inline-SVG train-vs-OOS curve per feature |
| `components/sensitivity/ProgressTrace.tsx` | Staged + per-feature progress UI |

### Change
| Path | Change |
|---|---|
| `lib/model/wc-nations.json` | Add `conf` + `continent`; venue lookup |
| `components/ui/Nav.tsx` | Add `/sensitivity` link (label `SWEEP`); verify the 9-link nav still wraps/fits on mobile |
| `app/about/page.tsx` | Link to the explorer; keep the 456-match headline |
| `Architecture.md` | Add the route + page to Entry Points / Modules |
| `context/decisions.md` | ADR: live server-route explorer, expanded features, climate/confed swaps, explorer-only scope |
| `context/architecture.md` | Data flow for the live fetch + sweep |
| `README.md` | Add the explorer to What it does + structure |
| `lib/Documentation.md` | Add the sensitivity module |
| `scripts/Documentation.md` | Note the wc-features extraction + wc-nations.json source |

## 7. Already done (verified prerequisites, keep)

- `lib/model/wc-nations.json` created (still needs `conf` + `continent` added)
- `scripts/model/wc-nations.js` re-exports from the JSON (one source of truth)
- `scripts/model/wc-features.js` holds the shared feature/Elo logic
- `scripts/backtest.js` refactored to import it; output IDENTICAL
  (eloOnly 0.9818, fitted 0.9851, equal 0.9974, 456 pooled OOS matches)
- removed the offline misstep: `lib/model/wc-samples.json`, `scripts/build-samples.js`

## 8. Build phases (for the ultracode Workflow)

- A. Reference + sources: extend nations JSON; `sources.ts`; verify live endpoints.
- B. Features + engine: `features.ts`, `engine.ts`; unit-test engine
  (`engine.test.ts`): predict() probs sum to 1 and are in [0,1]; logLoss > 0;
  fitLogistic lowers train loss vs zero betas; calibrate returns values inside
  the grid; sensitivityBand returns begin < end within [lo, hi]. Regression gate
  before adding the 5 new features: rebuild with ONLY the old 5 features
  (gdp,pop-with-latam,temp,elo,host) and reproduce, on this split, train n=372,
  valid n=200, baseline train logLoss 0.9676 / OOS 0.9889, equal OOS 0.9996,
  elo-only OOS 0.9891. Then switch to the 10-feature set.
- C. Orchestrator + route: `run.ts` generator + NDJSON route; curl smoke-test stream.
- D. UI: page + chart + progress + nav/about links; Playwright (0 console errors).
- E. Docs + ADR.
- F. Validation gate: `npm run build`, `npm run lint`, `npm test`, dev smoke, Playwright.

## 9. Trade-offs flagged (S-1.7)

1. Vercel function time: ~3.7MB CSV + 2 WB calls + Elo over ~49k matches + 10
   sweeps, a few seconds; the NDJSON stream keeps the connection alive. Route
   `runtime='nodejs'`, `maxDuration=60`, raise if needed.
2. Math mirror: compute is server-side TS (`lib/sensitivity`); the Node backtest
   (`scripts`, old 5 features) keeps its own copy. One documented mirror.
3. Endpoint logging: a Next serverless route uses console logging (Vercel
   captures it); FastAPI-specific E-2 file logging does not apply. Documented.

## 10. Acceptance criteria

- Engine unit tests pass.
- Route streams 10 feature sweeps + a final result.
- Page renders 10 curves + a summary (baseline train/OOS log-loss, plus equal and
  elo-only OOS for context); progress trace visible during the run.
- `npm run build` + `npm run lint` + `npm test` green.
- Playwright: page loads, Start runs to completion, 0 console errors.
- About still shows the 456-match walk-forward headline.
