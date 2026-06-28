export type Label = 'A' | 'D' | 'B'

// Mirror of the FEATURES tuple in engine.ts. Kept here so the optimal-weights
// result types stay in types.ts without importing engine.ts (which imports this
// file). engine.ts re-exports its own FeatureKey derived from FEATURES; the two
// must list the same ten keys.
export type FeatureKey =
  | 'elo'
  | 'form'
  | 'gdp'
  | 'pop'
  | 'confed'
  | 'climateGap'
  | 'host'
  | 'continental'
  | 'rest'
  | 'goalsForm'

export interface SideFactors {
  elo: number
  form: number
  gdp: number
  pop: number
  confed: number
  climateGap: number
  host: number
  continental: number
  rest: number
  goalsForm: number
}

export interface Sample {
  year: number
  home: string
  away: string
  homeRaw: SideFactors
  awayRaw: SideFactors
  label: Label
}

export interface SampleDelta {
  delta: number[]
  label: Label
}

export interface Moment {
  mean: number
  std: number
}

export type StandardizerStats = Record<keyof SideFactors, Moment>

export interface Calibration {
  scale: number
  dmax: number
  ddecay: number
}

export interface SweepPoint {
  beta: number
  train: number
  valid: number
}

export interface FactorSweep {
  key: string
  label: string
  baselineBeta: number
  bandBegin: number
  bandEnd: number
  points: SweepPoint[]
  trainOptimal: { beta: number; loss: number }
  validOptimal: { beta: number; loss: number }
}

export interface BaselineResult {
  betas: { key: string; label: string; beta: number; importancePct: number }[]
  calibration: Calibration
  trainLogLoss: number
  validLogLoss: number
  equalValidLogLoss: number
  eloOnlyValidLogLoss: number
}

export interface SensitivityResult {
  baseline: BaselineResult
  factors: FactorSweep[]
  trainCutoff: number
  trainYears: number[]
  testYears: number[]
  trainN: number
  validN: number
  totalMatches: number
  dataSource: string
  fetchedAt: string
}

export type ProgressEvent =
  | { type: 'stage'; stage: string; detail?: string; pct?: number }
  | { type: 'sweep'; factor: string; done: number; total: number }
  | { type: 'result'; result: SensitivityResult }
  | { type: 'error'; message: string }

export type RegFamily = 'l2' | 'l1' | 'elasticNet'

// One point on the regularization path: a single (family, lambda, alpha) config
// scored by the corrected objective. pooledHoldoutLogLoss is the selection
// statistic (pooled over every 2018-2026 holdout match); the per-tournament
// breakdown is reported alongside it.
export interface RegPathPoint {
  family: RegFamily
  lambda: number
  alpha: number
  pooledHoldoutLogLoss: number
  perTournamentLogLoss: TournamentLogLoss[]
}

// One held-out tournament's out-of-sample log-loss and the count it was scored
// over. n distinguishes a complete edition from the partial live 2026 fold.
export interface TournamentLogLoss {
  year: number
  logLoss: number
  n: number
}

// One step of forward-then-backward feature search on the <=2014 training set,
// scored on the pooled 2018-2026 holdout. selectionFrequency is 1 when the
// feature is in the single chosen subset and 0 otherwise; meanStdCoef and
// signConsistency report its standardized coefficient at the chosen lambda.
export interface FeatureSelectionStep {
  feature: FeatureKey
  selectionFrequency: number
  meanStdCoef: number
  signConsistency: number
}

// The frozen winning configuration after the pooled-holdout argmin.
export interface OptimalConfig {
  family: RegFamily
  lambda: number
  alpha: number
  featureSubset: FeatureKey[]
}

// Out-of-sample generalization estimate on the 2018-2026 holdout: the headline.
// pooledLogLoss is over every holdout match; perTournament gives the 2018, 2022
// and 2026 breakdown the owner asked for.
export interface HoldoutMetrics {
  pooledLogLoss: number
  perTournament: TournamentLogLoss[]
}

// Each baseline reported on the same 2018-2026 holdout as the chosen config.
export interface BaselineMetrics {
  key: string
  label: string
  holdout: HoldoutMetrics
}

export interface OptimalResult {
  config: OptimalConfig
  weights: { key: FeatureKey; label: string; beta: number; importancePct: number }[]
  calibration: Calibration
  regPath: RegPathPoint[]
  featureSelection: FeatureSelectionStep[]
  headline: HoldoutMetrics
  baselines: BaselineMetrics[]
  trainYears: number[]
  holdoutYears: number[]
  caveat: string
  dataSource: string
  fetchedAt: string
}
