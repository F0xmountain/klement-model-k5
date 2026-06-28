# scripts

## Purpose

`scripts` holds the offline model-fitting pipeline. It downloads open historical
international results, fits the forecast model (factor weights, Elo ratings,
Poisson goals, topscorer rates, knockout bracket), and writes the committed
artifacts in `lib/model/` that the app reads. It also runs the event-driven live
update that folds finished WC2026 matches into the fit after each match.

## Public Interface

These are CLI entry points plus a couple of reusable Node modules.

| Invocation | Effect |
|---|---|
| `node scripts/fit-model.js` (`npm run fit`) | Download/parse the dataset, fit the model, write `lib/model/{weights,ratings,bracket,scorers,fit-summary}.json`. |
| `node scripts/update-live.js` (`npm run update:live`) | Sync newly finished WC matches from API-Football (when `API_FOOTBALL_KEY` is set) into `lib/model/live-results.csv`, then run the full refit. |
| `node scripts/backtest.js` (`npm run backtest`) | Walk-forward out-of-sample validation over World Cups 1994-2026: each tournament from 2002 on is predicted by weights fit only on prior WCs, then pooled (~456 matches). Compares fitted vs equal vs Elo-only with point-in-time Elo + World Bank GDP/population. Writes `lib/model/backtest.json`. |
| `node scripts/export-optimal-weights.js` (`npm run export:weights`) | GET `http://localhost:3000/api/optimize` (the dev server must be running) and write the `optimalModel` block, plus `schemaVersion`, `generatedAt`, and `regenerate`, to `lib/sensitivity/optimal-weights.json`. Explorer-only snapshot, separate from `lib/model/`. |

Reusable modules (CommonJS):

- `model/dataset.js` - `loadResults()`, `loadGoalscorers()`, `datasetName()`, `buildDatasetToKey()`; downloads/caches CSVs and merges `lib/model/live-results.csv`.
- `model/fit.js` - pure fitting math: `runElo()`, `standardizer()`, `fitWeights()`, `fitDraw()`, `fitPoisson()`, factor helpers.
- `model/tournament.js` - `expectedGroupStandings()`, `pickQualifiers()`, `seedBracket()`, `groupMonteCarlo()`, `expectedMatches()`, `knockoutWinProb()`.
- `model/scorers.js` - `buildScorerRates()`, `projectScorers()`.
- `model/live.js` - `fetchFinishedMatches()`, `fetchScorers()` (API-Football, key-gated).
- `model/wc-features.js` - shared point-in-time feature/Elo logic: `FEATURES`, `FIRST_WC`, `collectWorldCupRows()`, `buildSamples()`; imported by `backtest.js`.
- `model/wc-nations.js` - `NATIONS`; re-exports the nation reference data that lives in `lib/model/wc-nations.json` (one source of truth shared with the browser route).
- `fit-model.js` - exports `main()` for `update-live.js` to invoke.

## Internal Structure

| File | Responsibility |
|---|---|
| `fit-model.js` | Orchestrator: load data, fit, build model functions, run tournament, write artifacts. |
| `update-live.js` | Event-driven sync of finished matches + scorers, then refit. |
| `model/dataset.js` | Download, cache, parse, name-map the historical CSVs. |
| `model/fit.js` | Elo engine, logistic weight regression (point-in-time Elo), draw calibration, Poisson goals. |
| `model/tournament.js` | Group standings, qualifier selection, seeded bracket, expected matches. |
| `model/scorers.js` | Per-player recent goal rates and tournament projection. |
| `model/live.js` | API-Football client for the live loop. |
| `model/wc-features.js` | Shared point-in-time feature/Elo logic; imported by `backtest.js`. |
| `backtest.js` | Out-of-sample WC validation (fitted vs equal vs Elo-only); imports the feature/Elo logic from `model/wc-features.js`. |
| `export-optimal-weights.js` | Fetch `/api/optimize` from the running dev server and serialize the `optimalModel` block to `lib/sensitivity/optimal-weights.json`. No fit logic of its own; it reuses the explorer pipeline behind the route. |
| `model/wc-nations.js` | Re-exports nation reference data (ISO3 codes, latam flags, climate temps, hosts for WC 2010-2026 nations) from `lib/model/wc-nations.json`. |
| `model/worldbank.js` | Free World Bank API client for point-in-time GDP/population, cached. |

## Dependencies

- Node built-ins `fs`, `path` (CommonJS).
- Global `fetch` (Node 20).
- No npm dependencies. Historical data: `martj42/international_results` raw CSVs.

## Data Models

Inputs: `results.csv`, `goalscorers.csv`, `shootouts.csv` (martj42), plus the
nation reference data in `lib/model/wc-nations.json` (consumed by
`model/wc-nations.js`). Outputs in
`lib/model/`: `weights.json`, `ratings.json`, `bracket.json`, `scorers.json`,
`fit-summary.json`, plus `live-results.csv`, `processed-matches.json`,
`live-scorers.json` from the live loop. Shapes consumed by the app are typed in
[types/Documentation.md](../types/Documentation.md) and read in
[lib/Documentation.md](../lib/Documentation.md).

`export-optimal-weights.js` is the one exception: it writes outside `lib/model/`,
to `lib/sensitivity/optimal-weights.json`. It does not fit anything; it reads the
`optimalModel` block from the running dev server's `/api/optimize` response and
serializes it with `schemaVersion`, `generatedAt`, and `regenerate` added. The
file schema is documented in
[lib/sensitivity/Documentation.md](../lib/sensitivity/Documentation.md) Data
Models. The 2026 fold is partial and live, so the file should be regenerated as
results land.

## Error Handling

- Dataset download failure throws in `ensureFile` and aborts the fit (exit 1).
- `update-live.js` catches API-Football failures per call, logs them, and still
  refits from the historical dataset so the run never leaves stale artifacts.
- A missing `API_FOOTBALL_KEY` is not an error: the live sync is skipped.

## Configuration

| Name | Type | Default | Purpose |
|---|---|---|---|
| `API_FOOTBALL_KEY` | env | unset | Enables live match + scorer sync in `update-live.js`. |
| `TRAIN_CUTOFF` | const | `2014-01-01` | Earliest match used to fit weights (fit-model.js). |
| `SCORER_WINDOW` | const | `2022-01-01` | Window for player scoring rates. |

## Usage Examples

```bash
# From kalsh-main/
npm run fit          # fit from history, write lib/model/*.json
npm run update:live  # sync finished matches (needs key) then refit
```

```bash
# Export the optimal-weights snapshot (explorer-only).
# One shell:
npm run dev            # dev server on http://localhost:3000
# Second shell:
npm run export:weights # write lib/sensitivity/optimal-weights.json
```

In CI this runs inside `.github/workflows/update-model.yml`, which commits
`lib/model/` if it changed and triggers ISR revalidation.
