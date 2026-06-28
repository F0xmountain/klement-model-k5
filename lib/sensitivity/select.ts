import { calibrate, delta, FEATURES, FEATURE_LABELS, fitLogistic, logLoss, standardizer } from './engine'
import { fitRegLogistic } from './regfit'
import type {
  BaselineMetrics,
  Calibration,
  FeatureKey,
  FeatureSelectionStep,
  OptimalConfig,
  OptimalModel,
  OptimalModelBaselines,
  OptimalModelFeature,
  OptimalModelOos,
  OptimalResult,
  RegFamily,
  RegPathPoint,
  Sample,
  SampleDelta,
  StandardizerStats,
  TournamentLogLoss,
} from './types'

const TRAIN_CUTOFF = 2014
const HOLDOUT_YEARS = [2018, 2022, 2026]
const STD_FLOOR = 1e-6
const LAMBDA_POINTS = 20
const LAMBDA_LO = 1e-4
const LAMBDA_HI = 1e1
const ALPHA_MIXES = [0.25, 0.5, 0.75]
const UNIFORM_LOSS = Math.log(3)
const DATA_SOURCE = 'martj42/international_results + World Bank backward (live)'
const CAVEAT =
  'The hyperparameter (family, lambda, feature subset) is selected on the same ' +
  '2018-2026 block that is then reported, so the headline out-of-sample number is ' +
  'mildly optimistic. This matches the train<=2014 / evaluate>2014 design the ' +
  'owner specified: betas, standardizer and calibration are fit on <=2014 only.'
const MODEL_NAME = 'klement-sensitivity-optimal'
const PROTOCOL =
  'train<=2014 / evaluate>2014: betas, standardizer and calibration fit on <=2014 ' +
  'rows only; forward-then-backward subset and regularization config chosen by ' +
  'pooled 2018-2026 holdout log-loss; final refit reported out-of-sample.'
const FORMULA =
  'eta = scale * sum_k beta_k * ((rawA_k - mean_k)/std_k - (rawB_k - mean_k)/std_k); ' +
  'P(Awin) = sigmoid(eta) * (1 - draw); draw = clip(dmax*exp(-ddecay*abs(eta)), 0.05, 0.34); ' +
  'P(Bwin) = (1 - sigmoid(eta)) * (1 - draw).'
const MODEL_CAVEATS =
  'Selection on the same 2018-2026 holdout makes the headline mildly optimistic. ' +
  'The 2026 fold is partial (live, few or zero played matches). The edge over the ' +
  'elo-only baseline is thin: treat the extra features as marginal refinements.'

export class LeakageError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'LeakageError'
  }
}

// A frozen split: deltas standardized on the <=2014 train set, plus the holdout
// rows grouped per tournament so 2018, 2022 and 2026 can be scored individually.
export interface Split {
  stats: StandardizerStats
  trainDeltas: SampleDelta[]
  trainYears: number[]
  holdout: HoldoutFold[]
}

export interface HoldoutFold {
  year: number
  deltas: SampleDelta[]
}

interface RegOpts {
  l2: number
  l1: number
}

interface Config {
  family: RegFamily
  lambda: number
  alpha: number
  opts: RegOpts
}

interface ScoredConfig {
  weights: number[]
  calibration: Calibration
  pooledHoldoutLogLoss: number
  perTournamentLogLoss: TournamentLogLoss[]
}

// The owner's corrected protocol picks (family, lambda, feature subset) jointly:
// forward-then-backward selection on the <=2014 train set yields the subset, the
// regularization path is then scored masked to that subset, and the chosen penalty
// is refit on the same masked train deltas. The reported headline is that refit's
// pooled and per-tournament 2018-2026 out-of-sample loss.
export function selectOptimal(samples: Sample[]): OptimalResult {
  guardSelection(samples)
  const split = buildSplit(samples)
  const subset = chooseSubset(split)
  const regPath = scoreRegPath(split, subset)
  const config = bestConfig(regPath, subset)
  const featureSelection = describeSelection(split, subset)
  const refit = finalRefit(split, config)
  return assemble(config, refit, regPath, featureSelection, split)
}

// The owner's design trains on <=2014 and evaluates on {2018,2022,2026}. A scored
// edition must never satisfy the training filter. assertDisjoint catches a
// misconfigured cutoff; the second branch catches a holdout-year row that the
// upstream pipeline mis-binned into the training band.
export function guardSelection(samples: Sample[]): void {
  assertDisjoint(TRAIN_CUTOFF, HOLDOUT_YEARS)
  const trainYears = new Set(samples.filter((s) => s.year <= TRAIN_CUTOFF).map((s) => s.year))
  const bled = HOLDOUT_YEARS.filter((year) => trainYears.has(year))
  if (bled.length > 0) {
    throw new LeakageError(`holdout tournament year(s) ${bled.join(', ')} reached the training set`)
  }
}

export function assertDisjoint(trainCutoff: number, holdoutYears: number[]): void {
  const overlap = holdoutYears.filter((year) => year <= trainCutoff)
  if (overlap.length > 0) {
    throw new LeakageError(`holdout year(s) ${overlap.join(', ')} fall inside the training band (cutoff ${trainCutoff})`)
  }
}

// The standardizer is fit on <=2014 rows only; the holdout never touches it. A
// holdout year with no rows (the partial live 2026 edition before any games) maps
// to an empty fold and drops out of the pooled objective by zero weight.
export function buildSplit(samples: Sample[]): Split {
  const train = samples.filter((s) => s.year <= TRAIN_CUTOFF)
  const stats = trainStandardizer(train)
  const holdout = HOLDOUT_YEARS.map((year) => buildHoldoutFold(samples, stats, year))
  const trainYears = [...new Set(train.map((s) => s.year))].sort((a, b) => a - b)
  return { stats, trainDeltas: toDeltas(train, stats), trainYears, holdout }
}

export function buildHoldoutFold(samples: Sample[], stats: StandardizerStats, year: number): HoldoutFold {
  if (year <= TRAIN_CUTOFF) {
    throw new LeakageError(`holdout year ${year} falls inside the training band`)
  }
  const rows = samples.filter((s) => s.year === year)
  return { year, deltas: toDeltas(rows, stats) }
}

// Floors each std at STD_FLOOR so near-constant deltas (host, continental) cannot
// divide by the engine's || 1 guard and blow up.
function trainStandardizer(train: Sample[]): StandardizerStats {
  const stats = standardizer(train.flatMap((s) => [s.homeRaw, s.awayRaw]))
  for (const key of FEATURES) {
    stats[key] = { mean: stats[key].mean, std: Math.max(stats[key].std, STD_FLOOR) }
  }
  return stats
}

function toDeltas(samples: Sample[], stats: StandardizerStats): SampleDelta[] {
  return samples.map((s) => ({ delta: delta(s.homeRaw, s.awayRaw, stats), label: s.label }))
}

function scoreRegPath(split: Split, subset: number[]): RegPathPoint[] {
  return buildConfigs().map((config) => scoreConfig(split, config, subset))
}

function buildConfigs(): Config[] {
  const lambdas = lambdaGrid()
  const l2 = lambdas.map((lambda) => makeConfig('l2', lambda, 0))
  const l1 = lambdas.map((lambda) => makeConfig('l1', lambda, 1))
  const elastic = ALPHA_MIXES.flatMap((alpha) => lambdas.map((lambda) => makeConfig('elasticNet', lambda, alpha)))
  return [...l2, ...l1, ...elastic]
}

function lambdaGrid(): number[] {
  const ratio = LAMBDA_HI / LAMBDA_LO
  return Array.from({ length: LAMBDA_POINTS }, (_unused, i) => LAMBDA_LO * ratio ** (i / (LAMBDA_POINTS - 1)))
}

function makeConfig(family: RegFamily, lambda: number, alpha: number): Config {
  return { family, lambda, alpha, opts: { l1: alpha * lambda, l2: (1 - alpha) * lambda } }
}

function scoreConfig(split: Split, config: Config, subset: number[]): RegPathPoint {
  const scored = scoreWeights(split, fitMasked(split.trainDeltas, subset, config.opts))
  return {
    family: config.family,
    lambda: config.lambda,
    alpha: config.alpha,
    pooledHoldoutLogLoss: scored.pooledHoldoutLogLoss,
    perTournamentLogLoss: scored.perTournamentLogLoss,
  }
}

// Weights and calibration come from the <=2014 train set; every holdout
// tournament is scored under that frozen calibration, then pooled by match count.
function scoreWeights(split: Split, weights: number[]): ScoredConfig {
  const calibration = calibrate(split.trainDeltas, weights)
  const perTournamentLogLoss = split.holdout.map((fold) => foldLoss(fold, weights, calibration))
  return { weights, calibration, pooledHoldoutLogLoss: pooled(perTournamentLogLoss), perTournamentLogLoss }
}

function foldLoss(fold: HoldoutFold, weights: number[], cal: Calibration): TournamentLogLoss {
  const loss = fold.deltas.length === 0 ? UNIFORM_LOSS : logLoss(fold.deltas, weights, cal.scale, cal.dmax, cal.ddecay)
  return { year: fold.year, logLoss: loss, n: fold.deltas.length }
}

// Argmin over the pooled 2018-2026 holdout log-loss. On a numerical tie the more
// regularized config (larger lambda) wins, biasing toward the simpler model.
function bestConfig(regPath: RegPathPoint[], subset: number[]): OptimalConfig {
  const chosen = regPath.reduce(betterOf)
  return {
    family: chosen.family,
    lambda: chosen.lambda,
    alpha: chosen.alpha,
    featureSubset: subset.map((k) => FEATURES[k]),
  }
}

function betterOf(a: RegPathPoint, b: RegPathPoint): RegPathPoint {
  if (b.pooledHoldoutLogLoss < a.pooledHoldoutLogLoss) return b
  if (b.pooledHoldoutLogLoss > a.pooledHoldoutLogLoss) return a
  return b.lambda > a.lambda ? b : a
}

// Forward-then-backward feature search on the <=2014 train set, scored on the
// pooled 2018-2026 holdout. Returns the chosen subset as sorted feature indices;
// the regularization path is then scored masked to exactly this subset.
function chooseSubset(split: Split): number[] {
  const forward = forwardSelect(split)
  const subset = backwardEliminate(split, forward)
  return subset.slice().sort((a, b) => a - b)
}

// selectionFrequency is 1 for a kept feature and 0 otherwise (a single train set,
// not per-fold folds); meanStdCoef is the unpenalized masked coefficient.
function describeSelection(split: Split, subset: number[]): FeatureSelectionStep[] {
  const weights = fitMasked(split.trainDeltas, subset, { l1: 0, l2: 0 })
  return FEATURES.map((feature, k) => describeFeature(feature, k, subset, weights))
}

function forwardSelect(split: Split): number[] {
  const subset: number[] = []
  let bestLoss = Infinity
  for (let step = 0; step < FEATURES.length; step++) {
    const candidate = bestAddition(split, subset, bestLoss)
    if (candidate === null) break
    subset.push(candidate.index)
    bestLoss = candidate.loss
  }
  return subset
}

function bestAddition(split: Split, subset: number[], bestLoss: number): { index: number; loss: number } | null {
  let best: { index: number; loss: number } | null = null
  for (let k = 0; k < FEATURES.length; k++) {
    if (subset.includes(k)) continue
    const loss = subsetLoss(split, [...subset, k])
    if (loss < bestLoss && (best === null || loss < best.loss)) best = { index: k, loss }
  }
  return best
}

function backwardEliminate(split: Split, subset: number[]): number[] {
  let current = subset.slice()
  let bestLoss = subsetLoss(split, current)
  for (let step = 0; step < subset.length; step++) {
    const dropped = bestRemoval(split, current, bestLoss)
    if (dropped === null) break
    current = current.filter((k) => k !== dropped.index)
    bestLoss = dropped.loss
  }
  return current.length === 0 ? subset : current
}

function bestRemoval(split: Split, subset: number[], bestLoss: number): { index: number; loss: number } | null {
  let best: { index: number; loss: number } | null = null
  for (const k of subset) {
    const loss = subsetLoss(split, subset.filter((j) => j !== k))
    if (loss < bestLoss && (best === null || loss < best.loss)) best = { index: k, loss }
  }
  return best
}

function subsetLoss(split: Split, subset: number[]): number {
  if (subset.length === 0) return Infinity
  const weights = fitMasked(split.trainDeltas, subset, { l1: 0, l2: 0 })
  return scoreWeights(split, weights).pooledHoldoutLogLoss
}

// Fits with every feature outside the subset forced to a zero delta, so its beta
// stays 0; the penalty is applied to the surviving subset only.
function fitMasked(trainDeltas: SampleDelta[], subset: number[], opts: RegOpts): number[] {
  const masked = trainDeltas.map((s) => ({ delta: maskVector(s.delta, subset), label: s.label }))
  return fitRegLogistic(masked, opts)
}

function maskVector(vector: number[], subset: number[]): number[] {
  return vector.map((value, k) => (subset.includes(k) ? value : 0))
}

function describeFeature(feature: FeatureKey, k: number, subset: number[], weights: number[]): FeatureSelectionStep {
  const kept = subset.includes(k)
  const coef = kept ? weights[k] : 0
  return {
    feature,
    selectionFrequency: kept ? 1 : 0,
    meanStdCoef: coef,
    signConsistency: kept ? 1 : 0,
  }
}

interface Refit {
  weights: number[]
  calibration: Calibration
  perTournamentLogLoss: TournamentLogLoss[]
  pooledHoldoutLogLoss: number
}

// Refit the chosen (family, lambda, feature subset) on the <=2014 train set, then
// report its pooled and per-tournament out-of-sample loss on the 2018-2026 holdout.
function finalRefit(split: Split, config: OptimalConfig): Refit {
  const subset = config.featureSubset.map((key) => FEATURES.indexOf(key))
  const weights = fitMasked(split.trainDeltas, subset, optsOf(config))
  const scored = scoreWeights(split, weights)
  return {
    weights,
    calibration: scored.calibration,
    perTournamentLogLoss: scored.perTournamentLogLoss,
    pooledHoldoutLogLoss: scored.pooledHoldoutLogLoss,
  }
}

function optsOf(config: OptimalConfig): RegOpts {
  return { l1: config.alpha * config.lambda, l2: (1 - config.alpha) * config.lambda }
}

function assemble(
  config: OptimalConfig,
  refit: Refit,
  regPath: RegPathPoint[],
  featureSelection: FeatureSelectionStep[],
  split: Split,
): OptimalResult {
  const baselines = computeBaselines(split)
  return {
    config,
    weights: importanceRows(refit.weights),
    calibration: refit.calibration,
    regPath,
    featureSelection,
    headline: { pooledLogLoss: refit.pooledHoldoutLogLoss, perTournament: refit.perTournamentLogLoss },
    baselines,
    optimalModel: buildOptimalModel(config, refit, split, baselines),
    trainYears: split.trainYears,
    holdoutYears: HOLDOUT_YEARS,
    caveat: CAVEAT,
    dataSource: DATA_SOURCE,
    fetchedAt: new Date().toISOString(),
  }
}

// The serializable inference artifact. Reuses the already-computed refit weights,
// calibration, holdout losses and the <=2014 standardizer (split.stats); nothing
// is recomputed differently from what the rest of the result reports.
function buildOptimalModel(
  config: OptimalConfig,
  refit: Refit,
  split: Split,
  baselines: BaselineMetrics[],
): OptimalModel {
  return {
    model: MODEL_NAME,
    protocol: PROTOCOL,
    trainYears: split.trainYears,
    holdoutYears: HOLDOUT_YEARS,
    dataSource: DATA_SOURCE,
    formula: FORMULA,
    config,
    features: modelFeatures(refit.weights, split.stats),
    calibration: refit.calibration,
    oos: modelOos(refit),
    baselines: modelBaselines(baselines),
    caveats: MODEL_CAVEATS,
  }
}

function modelFeatures(weights: number[], stats: StandardizerStats): OptimalModelFeature[] {
  return FEATURES.map((key, i) => ({
    key,
    label: FEATURE_LABELS[key],
    beta: weights[i],
    mean: stats[key].mean,
    std: stats[key].std,
  }))
}

function modelOos(refit: Refit): OptimalModelOos {
  const perTournament: OptimalModelOos['perTournament'] = {}
  for (const fold of refit.perTournamentLogLoss) {
    perTournament[String(fold.year)] = { logLoss: fold.logLoss, n: fold.n }
  }
  return { pooledLogLoss: refit.pooledHoldoutLogLoss, perTournament }
}

function modelBaselines(baselines: BaselineMetrics[]): OptimalModelBaselines {
  const byKey = new Map(baselines.map((b) => [b.key, b.holdout.pooledLogLoss]))
  return {
    eloOnly: pooledFor(byKey, 'eloOnly'),
    equal: pooledFor(byKey, 'equal'),
    mle: pooledFor(byKey, 'mle'),
    uniform: pooledFor(byKey, 'uniform'),
  }
}

function pooledFor(byKey: Map<string, number>, key: string): number {
  const value = byKey.get(key)
  if (value === undefined) {
    throw new LeakageError(`baseline ${key} missing from computed baselines`)
  }
  return value
}

function computeBaselines(split: Split): BaselineMetrics[] {
  return [
    baselineWith('mle', 'unregularized MLE (<=2014)', split, mleWeights),
    baselineWith('equal', 'equal weights', split, equalWeights),
    baselineWith('eloOnly', 'elo only', split, eloOnlyWeights),
    uniformBaseline(),
  ]
}

function baselineWith(
  key: string,
  label: string,
  split: Split,
  weightsFor: (train: SampleDelta[]) => number[],
): BaselineMetrics {
  const scored = scoreWeights(split, weightsFor(split.trainDeltas))
  return { key, label, holdout: { pooledLogLoss: scored.pooledHoldoutLogLoss, perTournament: scored.perTournamentLogLoss } }
}

function uniformBaseline(): BaselineMetrics {
  const perTournament = HOLDOUT_YEARS.map((year) => ({ year, logLoss: UNIFORM_LOSS, n: 0 }))
  return { key: 'uniform', label: 'uniform 1/3', holdout: { pooledLogLoss: UNIFORM_LOSS, perTournament } }
}

function mleWeights(train: SampleDelta[]): number[] {
  return fitLogistic(train)
}

function equalWeights(): number[] {
  return FEATURES.map(() => 1)
}

function eloOnlyWeights(): number[] {
  return FEATURES.map((key) => (key === 'elo' ? 1 : 0))
}

function importanceRows(betas: number[]): OptimalResult['weights'] {
  const total = betas.reduce((sum, b) => sum + Math.abs(b), 0) || 1
  return FEATURES.map((key, i) => ({
    key,
    label: FEATURE_LABELS[key],
    beta: betas[i],
    importancePct: (Math.abs(betas[i]) / total) * 100,
  }))
}

// Pooled out-of-sample loss: total NLL across every scored holdout match divided
// by the total match count. Empty live folds (n === 0) drop out of both sums.
function pooled(scores: TournamentLogLoss[]): number {
  const totalNll = scores.reduce((sum, s) => sum + s.logLoss * s.n, 0)
  const totalCount = scores.reduce((sum, s) => sum + s.n, 0)
  return totalCount === 0 ? UNIFORM_LOSS : totalNll / totalCount
}
