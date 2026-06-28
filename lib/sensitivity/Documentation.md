# lib/sensitivity

## Purpose

This module runs two live, point-in-time experiments, both separate from the
production model in `lib/klement.ts`, and both built on one shared pipeline:
`sources` (network I/O) -> `features` (point-in-time assembly) -> `engine` (pure
math). Each fetches the raw sources at request time and rebuilds a 10-feature
logistic model with a single chronological pass (no lookahead).

1. Sensitivity explorer (`run.ts`). Answers "which datapoints carry signal"
   before any are promoted into the production weights: fits on World Cups up to
   2014, then sweeps each feature coefficient one at a time and measures how
   training and out-of-sample (2018/2022/2026) log-loss respond.

2. Optimal-weight selector (`select.ts` + `optimize-run.ts`). Picks the
   generalization-best `(family, lambda, feature subset)` under a fixed
   train/holdout protocol, not a walk-forward. Training is World Cups with
   `year <= 2014` (1994-2014); the out-of-sample holdout is `year in {2018,
   2022, 2026}`, reported both pooled and per-tournament (2018, 2022, 2026
   individually). The betas, the standardizer and the calibration are fit on the
   `<= 2014` band only; no holdout row touches any fitted quantity. The
   hyperparameter search (L2 ridge path, L1 lasso path, a few elastic-net alpha
   mixes, and forward-then-backward feature selection) is scored on the pooled
   2018-2026 holdout log-loss, and the chosen config is refit on `<= 2014` and
   reported on that same holdout.

Honest caveat (also surfaced in `OptimalResult.caveat` and the UI): the selector
picks the hyperparameter on the same 2018-2026 block it then reports, so that
headline number is mildly optimistic. This matches the train `<= 2014` /
evaluate `> 2014` design the owner specified.

The split keeps only `engine` math unit-tested in isolation, and the holdout
years never influence any fitted quantity, so the out-of-sample numbers stay
leakage-free. The 456-match expanding-window walk-forward backtest behind the
About-page headline (`scripts/backtest.js`) is a different artifact: it is not
the optimal-weight selector and is not touched here.

## Public Interface

### types.ts - shared route/page contracts

| Symbol | Signature | Behaviour |
|---|---|---|
| `Label` | `type Label = 'A' \| 'D' \| 'B'` | Match outcome: home win, draw, away win. |
| `SideFactors` | `interface SideFactors { elo; form; gdp; pop; confed; climateGap; host; continental; rest; goalsForm: number }` | Raw per-side feature values before standardization. |
| `Sample` | `interface Sample { year; home; away; homeRaw; awayRaw; label }` | One World Cup match with both sides' raw factors and the outcome. |
| `SampleDelta` | `interface SampleDelta { delta: number[]; label: Label }` | Standardized home-minus-away vector plus the outcome, the unit the engine fits on. |
| `Moment` | `interface Moment { mean: number; std: number }` | Standardizer mean and std for one feature. |
| `StandardizerStats` | `type StandardizerStats = Record<keyof SideFactors, Moment>` | Train-fit moments for all 10 features. |
| `Calibration` | `interface Calibration { scale; dmax; ddecay: number }` | The three frozen calibration values shared by every sweep evaluation. |
| `SweepPoint` | `interface SweepPoint { beta; train; valid: number }` | One fine-sweep point: the swept coefficient and its train/valid log-loss. |
| `FactorSweep` | `interface FactorSweep { key; label; baselineBeta; bandBegin; bandEnd; points; trainOptimal; validOptimal }` | One feature's full sweep curve, band, and optima. |
| `BaselineResult` | `interface BaselineResult { betas; calibration; trainLogLoss; validLogLoss; equalValidLogLoss; eloOnlyValidLogLoss }` | The fitted baseline plus equal-weight and elo-only OOS reference numbers. |
| `SensitivityResult` | `interface SensitivityResult { baseline; factors; trainCutoff; trainYears; testYears; trainN; validN; totalMatches; dataSource; fetchedAt }` | The final payload streamed to the client. |
| `ProgressEvent` | `type ProgressEvent = { type:'stage'; stage; detail?; pct? } \| { type:'sweep'; factor; done; total } \| { type:'result'; result } \| { type:'error'; message }` | One NDJSON line: a discriminated union the client switches on. |
| `FeatureKey` | `type FeatureKey = 'elo' \| ... \| 'goalsForm'` | The 10 feature keys as a union, mirroring engine `FEATURES` without importing engine.ts. |
| `RegFamily` | `type RegFamily = 'l2' \| 'l1' \| 'elasticNet'` | The regularization family of one path point. |
| `RegPathPoint` | `interface RegPathPoint { family; lambda; alpha; pooledHoldoutLogLoss; perTournamentLogLoss }` | One scored `(family, lambda, alpha)` config: its pooled 2018-2026 holdout log-loss and the per-tournament breakdown. |
| `TournamentLogLoss` | `interface TournamentLogLoss { year; logLoss; n }` | One held-out tournament's out-of-sample log-loss and the match count it was scored over. |
| `FeatureSelectionStep` | `interface FeatureSelectionStep { feature; selectionFrequency; meanStdCoef; signConsistency }` | Per-feature result of the forward-then-backward search on the <=2014 train set: `selectionFrequency` is 1 for a kept feature, 0 otherwise. |
| `OptimalConfig` | `interface OptimalConfig { family; lambda; alpha; featureSubset }` | The frozen winning config after the pooled-holdout argmin. |
| `HoldoutMetrics` | `interface HoldoutMetrics { pooledLogLoss; perTournament }` | The out-of-sample estimate on the 2018-2026 holdout: pooled plus the 2018/2022/2026 breakdown. |
| `BaselineMetrics` | `interface BaselineMetrics { key; label; holdout }` | One baseline reported on the same 2018-2026 holdout as the chosen config. |
| `OptimalResult` | `interface OptimalResult { config; weights; calibration; regPath; featureSelection; headline; baselines; trainYears; holdoutYears; caveat; dataSource; fetchedAt }` | The full payload returned by `selectOptimal`. `caveat` states that the hyperparameter is selected on the same block it reports. |

### sources.ts - live fetch and parse

| Symbol | Signature | Behaviour |
|---|---|---|
| `Match` | `type Match = { date; home; away; hs; as: number; tournament; neutral; country }` | One played international result keyed to dataset team names. |
| `WorldBankLookup` | `type WorldBankLookup = { gdpK(iso3, year): number \| null; popM(iso3, year): number \| null }` | Nearest-year GDP-per-capita (thousands) and population (millions) lookups. |
| `SourceFetchError` | `class SourceFetchError extends Error` | Thrown on any non-ok HTTP status or malformed source response. |
| `fetchResults` | `fetchResults(): Promise<Match[]>` | Fetches and quote-aware parses the martj42 results.csv, dropping unplayed fixtures. |
| `fetchWorldBank` | `fetchWorldBank(): Promise<WorldBankLookup>` | Fetches both World Bank indicators across all pages and returns the nearest-year lookups. |
| `fetchWorldBankBackward` | `fetchWorldBankBackward(): Promise<WorldBankLookup>` | Same fetch as `fetchWorldBank` but resolves backward-only: exact query year, else the maximal series year <= query year, else null. Used by `select.ts` so a tournament's gdp/pop can never resolve to a later year. |

### features.ts - point-in-time assembly

| Symbol | Signature | Behaviour |
|---|---|---|
| `buildSamples` | `buildSamples(matches: Match[], wb: WorldBankLookup): Sample[]` | One chronological pass over every match; emits a Sample per pool World Cup match read before state updates. |

### engine.ts - pure math

| Symbol | Signature | Behaviour |
|---|---|---|
| `FEATURES` | `const FEATURES = [...] as const` | The 10 feature keys in locked order, the index basis for every beta array. |
| `FeatureKey` | `type FeatureKey = (typeof FEATURES)[number]` | Union of the 10 keys. |
| `FEATURE_LABELS` | `const FEATURE_LABELS: Record<FeatureKey, string>` | Display label per feature key. |
| `clamp` | `clamp(value, lo, hi: number): number` | Bounds a value into `[lo, hi]`. |
| `sigmoid` | `sigmoid(x: number): number` | Logistic function. |
| `standardizer` | `standardizer(rawRows: SideFactors[]): StandardizerStats` | Per-feature mean/std from the train rows; std falls back to 1 on zero variance. |
| `delta` | `delta(homeRaw, awayRaw: SideFactors, stats: StandardizerStats): number[]` | Standardized home-minus-away vector for one match. |
| `fitLogistic` | `fitLogistic(samples: SampleDelta[]): number[]` | Gradient-descent logistic fit on decisive matches; returns the 10 betas. |
| `predict` | `predict(eta, dmax, ddecay: number): Record<Label, number>` | Home/draw/away probabilities from a pre-scaled `eta`; the three sum to 1. |
| `logLoss` | `logLoss(samples: SampleDelta[], weights: number[], scale, dmax, ddecay: number): number` | Mean negative log-likelihood over the samples. |
| `calibrate` | `calibrate(trainSamples: SampleDelta[], weights: number[]): Calibration & { loss: number }` | Grid search for the best `(scale, dmax, ddecay)` at fixed betas. |
| `sensitivityBand` | `sensitivityBand(probes: { beta; loss: number }[]): { begin; end: number }` | Trims flat saturated tails to the 95% piecewise-variation band. |
| `sweepFactor` | `sweepFactor(featureIndex: number, baselineBetas: number[], band: { begin; end: number }, trainSamples, validSamples: SampleDelta[], calibration: Calibration): SweepPoint[]` | 26 evenly spaced fine-sweep points scored on train and valid at frozen calibration. |

### regfit.ts - regularized logistic fit

| Symbol | Signature | Behaviour |
|---|---|---|
| `fitRegLogistic` | `fitRegLogistic(samples: SampleDelta[], opts: { l2: number; l1: number; iters?: number }): number[]` | Mirrors engine `fitLogistic` (decisive-only, `FIT_LR = 0.3`, default `iters = 3000`, no intercept) except the penalty: ridge plus an optional proximal L1 soft-threshold. Returns the 10 betas. |

Penalty conventions (the only deviation from `fitLogistic`):

- Standardized-feature space: deltas are already unit-scaled by the caller's fold
  standardizer, so a single lambda is comparable across features.
- No hidden engine penalty: `fitRegLogistic` does NOT inherit `FIT_L2 = 1e-3`. At
  `l2 = 0, l1 = 0` it is a true unregularized fit. The penalty comes entirely from
  `opts`.
- L2 gradient penalty divided by n: per feature k the step is
  `beta[k] -= FIT_LR * (grad[k] / n + l2 * beta[k])`, mirroring how the engine
  divides the data gradient by the decisive count, so lambda's meaning is stable
  as fold train sizes change.
- L1 proximal soft-threshold: applied after the gradient step when `l1 > 0`, with
  magnitude `FIT_LR * l1` (standard proximal form, not divided by n):
  `beta[k] = sign(beta[k]) * max(0, |beta[k]| - FIT_LR * l1)`.
- Elastic-net is both penalties active (`l2 > 0 && l1 > 0`).

### select.ts - train<=2014, holdout-2018-2026 optimal-weight selection

| Symbol | Signature | Behaviour |
|---|---|---|
| `selectOptimal` | `selectOptimal(samples: Sample[]): OptimalResult` | Runs the full leak-free protocol with joint (family, lambda, feature subset) selection: train on World Cups year <= 2014, run forward-then-backward feature selection to fix the subset, score the 100-point L2/L1/elastic-net path masked to that subset on the pooled 2018+2022+2026 holdout, pick the penalty minimizing pooled holdout log-loss, refit the winning (penalty, subset) on year <= 2014, and report its pooled and per-tournament (2018, 2022, 2026) out-of-sample loss with four baselines on the same holdout. The standardizer and calibration are fit on year <= 2014 only. `config.featureSubset` is the chosen subset. Returns `OptimalResult`, including the honest `caveat`. |
| `LeakageError` | `class LeakageError extends Error` | Thrown when a holdout tournament year falls inside the training band or reaches the training set. |
| `buildSplit` | `buildSplit(samples: Sample[]): Split` | Builds the frozen split: deltas standardized on year <= 2014, plus the {2018, 2022, 2026} holdout folds. Exported for leak-audit tests. |
| `buildHoldoutFold` | `buildHoldoutFold(samples: Sample[], stats: StandardizerStats, year: number): HoldoutFold` | One holdout tournament's deltas under the train standardizer; throws `LeakageError` for `year <= 2014`. Exported for leak-audit tests. |
| `guardSelection` | `guardSelection(samples: Sample[]): void` | Throws `LeakageError` if a holdout tournament year reaches the training band. Exported for leak-audit tests. |
| `assertDisjoint` | `assertDisjoint(trainCutoff: number, holdoutYears: number[]): void` | Throws `LeakageError` if any holdout year is <= the cutoff. Exported for leak-audit tests. |
| `Split` | `interface Split { stats; trainDeltas; trainYears; holdout }` | The frozen train/holdout split: train deltas under the year <= 2014 standardizer plus per-tournament holdout folds. |
| `HoldoutFold` | `interface HoldoutFold { year; deltas }` | One holdout tournament's standardized deltas. |

Selected configuration and headline (snapshot in
`.planning/optimal-weights-result.json:1`, live re-run via `runOptimize`):

- Chosen config: `family = elasticNet`, `lambda = 0.003792690190732249`,
  `alpha = 0.5`, `featureSubset = [elo, form, gdp, rest, goalsForm]`. The
  forward-then-backward search kept 5 of the 10 features; `pop`, `confed`,
  `climateGap`, `host` and `continental` were dropped, so their refit betas are 0.
- Headline pooled 2018-2026 out-of-sample log-loss: `0.9707804564985498`.
- Per-tournament: 2018 `0.9737757085163962` (n=64), 2022 `1.0759544238587369`
  (n=64), 2026 `0.8746300392736314` (n=72). The 2026 fold is the live partial
  edition; n moves as more matches finish, and an empty fold drops out of the
  pooled number by zero weight.
- Baselines on the same holdout (pooled): unregularized MLE `<= 2014`
  `1.0050066546102912`, equal weights `0.9916662421981036`, elo only
  `0.9890901052977543`, uniform 1/3 `1.0986122886681096` (ln 3). The chosen
  config beats all four pooled, the honest-caveat optimism notwithstanding.
- `trainYears = [1994, 1998, 2002, 2006, 2010, 2014]`,
  `holdoutYears = [2018, 2022, 2026]`.

These numbers are a point-in-time snapshot; `runOptimize` recomputes them from
the live sources, so the exact decimals move as the datasets update.

### run.ts - orchestrator

| Symbol | Signature | Behaviour |
|---|---|---|
| `runSensitivity` | `runSensitivity(): AsyncGenerator<ProgressEvent>` | Drives every stage, yields progress events, and yields a final `result` event; converts any thrown error into a single `error` event. |

### optimize-run.ts - optimal-weight orchestrator

| Symbol | Signature | Behaviour |
|---|---|---|
| `runOptimize` | `runOptimize(): Promise<OptimalResult>` | Live-fetches results.csv and the backward-only World Bank lookup, calls `buildSamples` once on full history, and returns `selectOptimal(samples)`. The backward lookup keeps gdp/pop point-in-time per spec section 3. |

## Internal Structure

| File | Responsibility |
|---|---|
| `types.ts` | Shared record and event types used by the route, the page, and the other lib files. No logic. |
| `sources.ts` | Network I/O only: results.csv quote-aware CSV parse and the paged World Bank fetch with nearest-year lookup. |
| `features.ts` | The single chronological pass: per-team Elo/form/rest/goals state, venue-derived features, and the pool-only World Cup sampling guard. |
| `engine.ts` | Pure model math: standardize, delta, fit, predict, log-loss, calibrate, band-finding, fine sweep. |
| `regfit.ts` | Regularized logistic fit: `fitLogistic` plus ridge and proximal-L1 penalties driven entirely from `opts`. |
| `select.ts` | The optimal-weight protocol: train<=2014 / holdout {2018,2022,2026} split, forward-backward feature subset, regularization path scored masked to that subset on the pooled holdout, pooled-holdout argmin, refit of the chosen (penalty, subset), per-tournament reporting, baselines. |
| `run.ts` | Stage sequencing, train/validate split, baseline fit-and-freeze, per-feature wide-then-fine sweep, result assembly. |
| `optimize-run.ts` | Optimal-weight orchestrator: live-fetch (backward-only World Bank), single `buildSamples`, `selectOptimal`. |
| `engine.test.ts` | Vitest unit tests for the engine math. |
| `regfit.test.ts` | Vitest unit tests for the ridge/lasso/elastic-net penalty behaviour. |
| `select.test.ts` | Vitest unit tests for the train/holdout split, leak guards, per-tournament reporting, feature attribution, baselines, and the lasso path on the training deltas. |

The `engine` betas are an index-aligned `number[]`: position `i` is the
coefficient for `FEATURES[i]`, which is why `sweepFactor` takes a numeric
`featureIndex` rather than a key. `run` fits the baseline betas, calibrates once,
then holds both betas and calibration constant for every sweep so a swept
coefficient cannot be masked by re-scaling.

## Dependencies

- `./types` - the shared record and event types. Internal, no version.
- `../model/wc-nations.json` - imported by `features.ts` for the `nations`,
  `hosts`, and `venues` reference maps. Internal, no version.
- No external npm packages. Source fetches use the global `fetch`; all math uses
  `Math` built-ins, keeping the module dependency-free.

## Data Models

Owned by this module (defined in `types.ts` unless noted):

- `SideFactors` - the 10 raw per-side feature values:
  `elo`, `form`, `gdp`, `pop`, `confed`, `climateGap`, `host`, `continental`,
  `rest`, `goalsForm`, all `number`.
- `Sample` - `year`, `home`, `away`, `homeRaw: SideFactors`,
  `awayRaw: SideFactors`, `label: Label`.
- `SampleDelta` - `delta: number[]` (length 10, index-aligned to `FEATURES`),
  `label: Label`.
- `Calibration` - `scale`, `dmax`, `ddecay`, all `number`.
- `FactorSweep` - `key: string`, `label: string`, `baselineBeta: number`,
  `bandBegin: number`, `bandEnd: number`, `points: SweepPoint[]`,
  `trainOptimal: { beta; loss: number }`, `validOptimal: { beta; loss: number }`.
- `BaselineResult` - `betas: { key; label; beta; importancePct: number }[]`,
  `calibration: Calibration`, and four `number` log-loss fields:
  `trainLogLoss`, `validLogLoss`, `equalValidLogLoss`, `eloOnlyValidLogLoss`.
- `SensitivityResult` - the streamed payload; see its signature above.
- `Match` (sources.ts) - one played result with `hs`/`as` integer scores and the
  venue `country`.

Consumed reference data (not owned here): `lib/model/wc-nations.json`, shape
`{ nations: Record<string, { iso3; latam; temp; conf; continent; gdp?; pop? }>,
hosts: Record<string, string[]>, venues: Record<string, { continent }> }`
(75 nation entries). The `conf` (confederation) and `continent` fields are
intentionally distinct because they diverge, for example Australia is `conf` AFC
but `continent` Oceania.

## Error Handling

Unlike `lib/klement.ts`, this module throws rather than returning sentinels,
because its single caller is a streaming route that catches and reports failures
to the client rather than rendering:

- `SourceFetchError` is thrown by `fetchResults` and `fetchWorldBank` on a
  non-ok HTTP status, a request timeout (a 20-second `AbortSignal.timeout`), or a
  malformed World Bank response body.
- `runSensitivity` wraps the whole pipeline in a try/catch and converts any
  thrown error into a single terminal `{ type: 'error', message }` event, so the
  generator always ends cleanly instead of rejecting.

The nearest-year `WorldBankLookup` methods return `null` for a missing series;
`features.ts` substitutes the per-nation `gdp`/`pop` fallbacks from
`wc-nations.json` (North Korea has no World Bank series), so a `null` lookup does
not propagate as an error.

## Configuration

There are no environment variables. The tunable constants are module-level and
not exposed as inputs:

| Name | File | Value | Purpose |
|---|---|---|---|
| `RESULTS_URL` | sources.ts | martj42 results.csv raw URL | International results source. |
| `WORLD_BANK_BASE` / `GDP_INDICATOR` / `POP_INDICATOR` | sources.ts | World Bank v2 API base, `NY.GDP.PCAP.CD`, `SP.POP.TOTL` | GDP and population sources. |
| `FETCH_TIMEOUT_MS` | sources.ts | `20000` | Per-request abort timeout. |
| `FIT_ITERATIONS` / `FIT_LR` / `FIT_L2` | engine.ts | `3000` / `0.3` / `1e-3` | Logistic gradient-descent iterations, learning rate, L2 penalty. |
| `FINE_SWEEP_POINTS` | engine.ts | `26` | Points per fine sweep. |
| `BAND_TRIM_FRACTION` | engine.ts | `0.025` | Tail fraction trimmed per side for the 95% band. |
| `TRAIN_CUTOFF` / `TEST_YEARS` | run.ts | `2014` / `[2018, 2022, 2026]` | Train/validate split. |
| `WIDE_PROBE_COUNT` / `MIN_SPAN` | run.ts | `5` / `5` | Wide-pass probe count and minimum sweep span. |
| `FIT_LR` / `FIT_ITERATIONS` | regfit.ts | `0.3` / `3000` | Regularized fit learning rate and default iteration count. |
| `TRAIN_CUTOFF` / `HOLDOUT_YEARS` | select.ts | `2014` / `[2018, 2022, 2026]` | Training upper bound and the out-of-sample holdout editions. |
| `STD_FLOOR` | select.ts | `1e-6` | Train std floor so near-constant deltas cannot blow up. |
| `LAMBDA_POINTS` / `LAMBDA_LO` / `LAMBDA_HI` | select.ts | `20` / `1e-4` / `1e1` | Log-spaced lambda grid endpoints and count. |
| `ALPHA_MIXES` | select.ts | `[0.25, 0.5, 0.75]` | Elastic-net L1 fractions; with L2-only and L1-only the path is 100 points. |

## Usage Examples

```ts
import { runSensitivity } from '@/lib/sensitivity/run'

// Drive the pipeline and forward each NDJSON event (as the route does).
for await (const event of runSensitivity()) {
  if (event.type === 'result') {
    const { trainLogLoss, validLogLoss } = event.result.baseline
    console.log(`baseline train ${trainLogLoss} / OOS ${validLogLoss}`)
  }
}
```

```ts
import { fetchResults, fetchWorldBank } from '@/lib/sensitivity/sources'
import { buildSamples } from '@/lib/sensitivity/features'
import { delta, fitLogistic, standardizer } from '@/lib/sensitivity/engine'

// Reproduce the baseline fit outside the streaming route.
const matches = await fetchResults()
const wb = await fetchWorldBank()
const samples = buildSamples(matches, wb)
const train = samples.filter((s) => s.year <= 2014)
const stats = standardizer(train.flatMap((s) => [s.homeRaw, s.awayRaw]))
const betas = fitLogistic(train.map((s) => ({ delta: delta(s.homeRaw, s.awayRaw, stats), label: s.label })))
```
