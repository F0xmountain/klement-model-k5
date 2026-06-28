# Optimal Weights Spec: generalization-optimal logistic weights

Synthesized from three independent methodology reviews. This is the single
authoritative spec. It is precise enough to implement without guessing.

## 0. Goal

Compute the weight vector over the ten explorer features (elo, form, gdp, pop,
confed, climateGap, host, continental, rest, goalsForm) that GENERALIZES best:
lowest out-of-sample log-loss on the held-out 2018-2026 World Cups, not the train
fit. The deliverable is the frozen config, the final weight vector, the
regularization path, a feature-importance report, the headline pooled holdout
estimate with a per-tournament (2018, 2022, 2026) breakdown, four baselines on
the same holdout, and the honest caveat that the hyperparameter is selected on
the block it reports.

## 1. Reuse mandate (do not duplicate the pipeline)

Reuse, do not reimplement:
- `lib/sensitivity/sources.ts`: `fetchResults`, `fetchWorldBank` (live fetch).
- `lib/sensitivity/features.ts`: `buildSamples` (point-in-time, single
  chronological pass).
- `lib/sensitivity/engine.ts`: `FEATURES`, `FEATURE_LABELS`, `standardizer`,
  `delta`, `calibrate`, `predict`, `logLoss`, `sigmoid`, `clamp`, `fitLogistic`
  (the latter only as the lightly-regularized incumbent baseline, see 8.4).
- `lib/sensitivity/types.ts`: `Sample`, `SampleDelta`, `SideFactors`,
  `Calibration`, `StandardizerStats`, `Label`, and the new types in section 11.

New code lives in exactly two files: `lib/sensitivity/regfit.ts` and
`lib/sensitivity/select.ts`. No npm dependency may be added. The numeric search
runs entirely in code.

## 2. Data and the single-pass invariant (most important leak rule)

`buildSamples` (features.ts:262) is a STATEFUL single chronological pass: Elo,
form, rest and goalsForm accumulate across every international result, and a
team's 2018 features depend on having processed 2014. Therefore:

- HARD RULE: call `buildSamples(matches, wb)` EXACTLY ONCE on the full match
  history. Partition the resulting `Sample[]` by `Sample.year` to form folds.
  Never call `buildSamples` on a per-fold subset of matches; that would change
  the feature values themselves and void every guarantee.
- The features are already point-in-time, so partitioning the one-shot output by
  year is both correct and leak-free.
- What gets refit per fold is the standardizer and the calibration, never the
  features.

Sample range: World Cups 1994-2026 (nine editions: 1994, 1998, 2002, 2006, 2010,
2014, 2018, 2022, 2026), ~372 decisive matches across 1994-2022, ~45-50 decisive
per edition.

## 3. Backward-only World Bank lookup (second leak rule)

`sources.ts` `nearestYear` (sources.ts:232) resolves the closest available year
in EITHER direction. For a fold predicting tournament T (and for 2026), a team's
gdp/pop can silently resolve to a World Bank value from a year >= T. That is
lookahead inside the feature, independent of the fit, and it contaminates every
OOS number including the headline.

The existing `WorldBankLookup` interface (sources.ts:12) exposes only
nearest-resolved scalars, so an adapter in `select.ts` cannot inspect the raw
series to clamp it backward. Therefore the fix lives in sources.ts itself (the
live-fetch module being reused, not duplicated):

- Add an exported `fetchWorldBankBackward(): Promise<WorldBankLookup>` that
  mirrors `fetchWorldBank` and `makeLookup` but resolves with a
  `nearestPriorYear` helper: exact query year wins, else the maximal series year
  <= query year, else null. This is `closestByDistance` restricted to the
  backward direction.
- `select.ts` calls `fetchWorldBankBackward()` (not `fetchWorldBank`) and passes
  the result to `buildSamples`. The nation-default fallbacks in features.ts:192-193
  still apply when the backward lookup returns null.
- Decisive: do this in sources.ts rather than a re-fetched raw series in
  select.ts, to avoid a second network fetch.

## 4. Train / holdout partition (corrected protocol)

- Training data: World Cups with `year <= 2014` (1994-2014). The betas, the
  standardizer, and the calibration are fit on this band ONLY.
- Out-of-sample holdout: `year in {2018, 2022, 2026}`. This block is both the
  hyperparameter-selection objective AND the reported number (see the caveat in
  section 9). It is reported pooled and per-tournament (2018, 2022, 2026
  individually).
- At the top of `selectOptimal`, build one split: train deltas under the year <=
  2014 standardizer, and the three holdout folds. The standardizer and
  calibration never touch a holdout row.
- Throw a typed `LeakageError` (defined in select.ts, extends `Error`) if a
  holdout tournament year falls inside the training band (the `assertDisjoint`
  check) or if a holdout-year row reaches the training set.

## 5. Selection objective: pooled 2018-2026 holdout log-loss

The deployment target (2026) is a strict forecast from the past, so the holdout
is the three most recent editions and training is everything before. The
hyperparameter search (family, lambda, feature subset) is scored on the POOLED
2018-2026 holdout log-loss, and the config minimizing it wins.

Procedure (the canonical, leak-free sequence; any deviation leaks):
1. `train = samples.filter(s => s.year <= 2014)`,
   `holdout = samples.filter(s => [2018,2022,2026].includes(s.year))`, grouped by
   year so each tournament can be scored individually.
2. Fit the standardizer on the train rows only:
   `standardizer(train.flatMap(s => [s.homeRaw, s.awayRaw]))`. Floor each std at
   1e-6 (extends the existing `|| 1` guard) so a near-constant delta (host,
   continental) cannot blow up.
3. Compute `trainDeltas` and the per-tournament holdout deltas via
   `delta(homeRaw, awayRaw, trainStats)` using the train-only standardizer for
   both.
4. For each config, fit weights with `fitRegLogistic(trainDeltas, opts)`
   (decisive-only inside).
5. Calibrate on the train portion only with the config's own fitted weights:
   `calibrate(trainDeltas, weights)` -> frozen `{scale, dmax, ddecay}`.
6. Score each holdout tournament over its FULL fold (draws included) with the
   frozen weights and frozen calibration. Record per-tournament log-loss and
   count, then pool: `pooledHoldoutLogLoss` = total NLL across every holdout match
   divided by the total holdout count. A live 2026 fold with zero played matches
   drops out of both sums by zero weight.

Selection statistic:
- For each config, `pooledHoldoutLogLoss` is the argmin objective.
- The per-tournament breakdown (2018, 2022, 2026) is recorded alongside it.
- On a numerical tie the more regularized config wins (larger lambda), a light
  bias toward the simpler model.

## 6. Regularization families and lambda grid

Primary family: L2 (ridge). With ten dense, individually-motivated, somewhat
correlated features and ~372 rows, the bias-variance win comes from shrinkage,
not sparsity. L2 is the headline.

L1 and elastic-net: run their paths but treat them as a feature-attribution
cross-check (which features L1 zeros), NOT as co-equal competitors for the
lowest number. They enter the `regPath` for reporting; the section-5 argmin ranks
across all families on the pooled holdout, but with L2 primary the expected and
intended winner is an L2 config. The tie-break toward the larger lambda keeps a
sub-0.001-nat elastic-net edge from changing the headline.

Lambda grid: 20 log-spaced points from 1e-4 to 1e1 (the task default range).
`lambda_i = 1e-4 * (1e1 / 1e-4) ** (i / 19)` for `i in 0..19`.

Elastic-net alpha mixes: `alpha in {0.25, 0.5, 0.75}` (alpha is the L1 fraction;
`l1 = alpha * lambda`, `l2 = (1 - alpha) * lambda`). L2-only is `alpha = 0`,
L1-only is `alpha = 1`. The full grid is: L2 path (20), L1 path (20), three
elastic-net alphas x 20 = 60. Total 100 `RegPathPoint`s.

Penalty conventions (must match `fitRegLogistic`):
- Apply the penalty in standardized-feature space (deltas are already unit-scaled
  by the train standardizer), so lambda is comparable across features.
- Do NOT inherit the engine constant `FIT_L2 = 1e-3`. `fitRegLogistic` drives the
  penalty entirely from `opts`. The lambda=0 point must be a true unregularized
  fit, not a hidden 1e-3.
- L2 gradient penalty is divided by n (the decisive count), mirroring how
  `applyGradientStep` divides the data gradient by `decisive.length`, so lambda's
  meaning is stable as the train size changes.
- L1 is a proximal soft-threshold applied after each gradient step. The
  soft-threshold magnitude is `FIT_LR * l1` (standard proximal form, not divided
  by n). Document this convention in `lib/sensitivity/Documentation.md`.
- No intercept term exists (deltas are antisymmetric and `dot(beta, delta)` has
  no bias); if one is ever added it must be unpenalized.

## 7. Feature selection

Forward-then-backward feature search is a cross-check on which features earn
weight, NOT a third headline competitor.

- Run the forward-then-backward search on the `year <= 2014` training deltas,
  scored on the pooled 2018-2026 holdout (the same objective as section 5), with
  the train standardizer and train calibration. It yields one chosen subset.
- Report `FeatureSelectionStep[]`: per feature `selectionFrequency` (1 if the
  feature is in the chosen subset, 0 otherwise), `meanStdCoef` (its standardized
  coefficient at the chosen lambda, 0 if dropped), and `signConsistency` (1 if
  kept, 0 if dropped).
- The SHIPPED model keeps all ten features with the chosen shrinkage; by default
  `OptimalConfig.featureSubset` is all ten `FEATURES`. The search informs the
  narrative on which features the holdout actually rewards.

## 8. Final refit, holdout reporting, baselines

### 8.1 Refit
After the config is frozen by the section-5 argmin, refit on ALL training samples
(`year <= 2014`): the standardizer is the train-only fit, compute deltas,
`fitRegLogistic` with the chosen `{l1, l2}`, then `calibrate` on the training set.
These are the final weights and final calibration.

### 8.2 Holdout evaluation (the headline, with the honest caveat)
Score the final weights and calibration on the 2018-2026 holdout, using the
standardizer fit on `year <= 2014` (no holdout rows ever enter the standardizer).
Report `HoldoutMetrics { pooledLogLoss, perTournament }` where `perTournament` is
the 2018, 2022 and 2026 breakdown, each a `TournamentLogLoss { year, logLoss, n }`.
As of 2026-06-28 the 2026 edition is partial and live, so its fold is a single
high-variance point estimate (and may be empty, in which case it drops out of the
pooled number by zero weight).

HONEST CAVEAT (surfaced in `OptimalResult.caveat` and the UI): the hyperparameter
is selected on the same 2018-2026 block that is then reported, so the headline
out-of-sample number is mildly optimistic. This matches the train<=2014 /
evaluate>2014 design the owner specified.

### 8.3 Headline metric
The headline generalization number is the pooled 2018-2026 holdout log-loss of
the chosen config, with the per-tournament breakdown. This is what the UI
features.

### 8.4 Baselines (all four, on the same holdout)
Report each baseline under the SAME train<=2014 fit and the SAME 2018-2026 holdout
evaluation, so they are directly comparable:
- `mle`: the unregularized MLE = the engine `fitLogistic` (which carries
  `FIT_L2 = 1e-3`) fit on `year <= 2014`. Labelled "unregularized MLE (<=2014)".
  It is the null hypothesis: if the chosen config does not beat it on the holdout,
  the incumbent weights are already adequate.
- `equal`: equal weights (beta = 1 for every feature, let `calibrate` find scale).
- `eloOnly`: beta = 1 on elo, 0 elsewhere; `calibrate` finds scale.
- `uniform`: constant prediction P(A)=P(D)=P(B)=1/3, log-loss = ln 3 = 1.0986...
  (no calibration; a fixed reference).

## 9. Honesty invariants (enforced in code)

1. The holdout never enters any FIT decision: betas, standardizer and calibration
   are fit on `year <= 2014` only. The holdout IS the hyperparameter-selection
   objective and the reported number; this is the owner-specified design and is
   disclosed via the `caveat` string.
2. Training uses strictly `year <= 2014`; the holdout is exactly {2018, 2022, 2026}.
3. The standardizer and calibration are fit on `year <= 2014` only, never on a
   holdout row (section 5 and section 8.1).
4. `buildSamples` is called once on full history; the split is a year-partition of
   its output (section 2).
5. World Bank lookups are backward-only relative to the match year (section 3).
6. Weights are fit on decisive samples only; calibration and log-loss score the
   full fold including draws (mirrors the engine split exactly).

## 10. Exported signatures

### 10.1 regfit.ts

```ts
import type { SampleDelta } from './types'

export function fitRegLogistic(
  samples: SampleDelta[],
  opts: { l2: number; l1: number; iters?: number },
): number[]
```

Behaviour: mirror engine `fitLogistic` exactly except for the penalty. Filter to
decisive (`s.label !== 'D'`). Same `FIT_LR = 0.3`, default `iters = 3000`. Per
iteration: accumulate the data gradient, then for each k apply
`beta[k] -= FIT_LR * (grad[k] / decisive.length + opts.l2 * beta[k])` (L2 ridge,
penalty divided by n, do NOT add the engine 1e-3). After the gradient step, if
`opts.l1 > 0`, apply proximal soft-threshold:
`beta[k] = sign(beta[k]) * max(0, |beta[k]| - FIT_LR * opts.l1)`. Elastic-net is
both penalties active (`l2 > 0 && l1 > 0`). No intercept. Keep each function
under 20 lines by extracting the step and the soft-threshold into helpers, max 3
nesting levels.

### 10.2 select.ts

```ts
import type { Sample, OptimalResult } from './types'

export function selectOptimal(samples: Sample[]): OptimalResult
```

Behaviour: runs the entire protocol (sections 4-8) and returns `OptimalResult`.
`samples` is the one-shot `buildSamples` output (caller fetches via sources.ts and
the backward-only World Bank lookup, then calls `buildSamples` once). `select.ts`
also defines and exports `LeakageError extends Error`, plus `guardSelection`,
`assertDisjoint`, `buildSplit` and `buildHoldoutFold` for leak-audit tests.
Decompose into small named helpers (guardSelection, buildSplit, scoreConfig,
bestConfig, runFeatureSearch, finalRefit, computeBaselines), each under 20 lines,
file under 500 lines. A thin orchestrator (the live fetch + buildSamples +
selectOptimal wiring) lives in `optimize-run.ts`, but selectOptimal itself takes
`Sample[]` so it is pure over its input and testable.

## 11. New types added to types.ts

Added (no result type imports engine.ts; typecheck passes):
- `FeatureKey` (string union mirroring engine `FEATURES`; placed in types.ts so
  the result types do not import engine.ts and create a cycle).
- `RegFamily = 'l2' | 'l1' | 'elasticNet'`.
- `RegPathPoint`: `{ family, lambda, alpha, pooledHoldoutLogLoss,
  perTournamentLogLoss }`.
- `TournamentLogLoss`: `{ year, logLoss, n }`.
- `FeatureSelectionStep`: `{ feature, selectionFrequency, meanStdCoef,
  signConsistency }`.
- `OptimalConfig`: `{ family, lambda, alpha, featureSubset }`.
- `HoldoutMetrics`: `{ pooledLogLoss, perTournament }`.
- `BaselineMetrics`: `{ key, label, holdout }`.
- `OptimalResult`: `{ config, weights, calibration, regPath, featureSelection,
  headline, baselines, trainYears, holdoutYears, caveat, dataSource, fetchedAt }`.

## 12. Tests (stubs alongside the new functions)

Per the test-stub rule, `lib/sensitivity/regfit.test.ts` and
`lib/sensitivity/select.test.ts` cover at least:
- regfit: `fitRegLogistic` with `l2=0, l1=0` reproduces an unregularized fit;
  larger `l2` shrinks coefficients toward zero; `l1 > 0` drives at least one
  coefficient to exactly 0 on a separable toy set.
- select: training is strictly `year <= 2014` and the holdout is exactly {2018,
  2022, 2026}; `assertDisjoint` throws when a holdout year falls inside the
  training band; the chosen config's pooled holdout log-loss is finite and below
  `uniform` (ln 3); the headline breaks down per tournament for 2018, 2022 and
  2026; every baseline is scored on the same holdout; lasso still zeroes some
  betas at high l1 on the training deltas while elo survives; the result carries
  the honest caveat string.

## 13. Documentation obligation

Update `lib/sensitivity/Documentation.md` (create if absent) Public Interface
section with `fitRegLogistic` and `selectOptimal` signatures and the penalty
conventions from section 6. If `sources.ts` gains `fetchWorldBankBackward`, add it
there too. Counts and identifiers must match code verbatim.
