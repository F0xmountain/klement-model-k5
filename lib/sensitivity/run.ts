import { fetchResults, fetchWorldBank } from './sources'
import { buildSamples } from './features'
import {
  calibrate,
  delta,
  FEATURES,
  FEATURE_LABELS,
  fitLogistic,
  logLoss,
  sensitivityBand,
  standardizer,
  sweepFactor,
} from './engine'
import type {
  BaselineResult,
  Calibration,
  FactorSweep,
  ProgressEvent,
  Sample,
  SampleDelta,
  SensitivityResult,
  StandardizerStats,
} from './types'

const TRAIN_CUTOFF = 2014
const TEST_YEARS = [2018, 2022, 2026]
const WIDE_PROBE_COUNT = 5
const MIN_SPAN = 5
const DATA_SOURCE = 'martj42/international_results + World Bank (live)'

interface SplitDeltas {
  trainDeltas: SampleDelta[]
  validDeltas: SampleDelta[]
  stats: StandardizerStats
}

interface BaselineState {
  betas: number[]
  calibration: Calibration
  result: BaselineResult
}

export async function* runSensitivity(): AsyncGenerator<ProgressEvent> {
  try {
    yield* runStages()
  } catch (error) {
    yield { type: 'error', message: messageOf(error) }
  }
}

async function* runStages(): AsyncGenerator<ProgressEvent> {
  yield { type: 'stage', stage: 'results', detail: 'fetching international results' }
  const matches = await fetchResults()

  yield { type: 'stage', stage: 'worldbank', detail: 'fetching GDP and population' }
  const wb = await fetchWorldBank()

  yield { type: 'stage', stage: 'features', detail: 'building point-in-time features' }
  const samples = buildSamples(matches, wb)
  const split = buildSplit(samples)

  yield { type: 'stage', stage: 'baseline', detail: 'fitting and calibrating baseline' }
  const baseline = fitBaseline(split)

  const factors = yield* sweepAllFactors(baseline, split)
  yield { type: 'result', result: assembleResult(baseline, factors, samples, split) }
}

function buildSplit(samples: Sample[]): SplitDeltas {
  const train = samples.filter((s) => s.year <= TRAIN_CUTOFF)
  const validate = samples.filter((s) => TEST_YEARS.includes(s.year))
  const stats = standardizer(train.flatMap((s) => [s.homeRaw, s.awayRaw]))
  return {
    trainDeltas: toDeltas(train, stats),
    validDeltas: toDeltas(validate, stats),
    stats,
  }
}

function toDeltas(samples: Sample[], stats: StandardizerStats): SampleDelta[] {
  return samples.map((s) => ({ delta: delta(s.homeRaw, s.awayRaw, stats), label: s.label }))
}

function fitBaseline(split: SplitDeltas): BaselineState {
  const betas = fitLogistic(split.trainDeltas)
  const calibration = calibrate(split.trainDeltas, betas)
  const result = baselineResult(betas, calibration, split)
  return { betas, calibration, result }
}

function baselineResult(betas: number[], cal: Calibration, split: SplitDeltas): BaselineResult {
  return {
    betas: importanceRows(betas),
    calibration: cal,
    trainLogLoss: lossAt(betas, cal, split.trainDeltas),
    validLogLoss: lossAt(betas, cal, split.validDeltas),
    equalValidLogLoss: lossAt(equalWeights(), cal, split.validDeltas),
    eloOnlyValidLogLoss: lossAt(eloOnlyWeights(), cal, split.validDeltas),
  }
}

function lossAt(weights: number[], cal: Calibration, samples: SampleDelta[]): number {
  return logLoss(samples, weights, cal.scale, cal.dmax, cal.ddecay)
}

function equalWeights(): number[] {
  return FEATURES.map(() => 1)
}

function eloOnlyWeights(): number[] {
  return FEATURES.map((key) => (key === 'elo' ? 1 : 0))
}

function importanceRows(betas: number[]): BaselineResult['betas'] {
  const total = betas.reduce((sum, b) => sum + Math.abs(b), 0) || 1
  return FEATURES.map((key, i) => ({
    key,
    label: FEATURE_LABELS[key],
    beta: betas[i],
    importancePct: (Math.abs(betas[i]) / total) * 100,
  }))
}

async function* sweepAllFactors(
  baseline: BaselineState,
  split: SplitDeltas,
): AsyncGenerator<ProgressEvent, FactorSweep[]> {
  const total = FEATURES.length
  const factors: FactorSweep[] = []
  for (let i = 0; i < total; i++) {
    yield { type: 'sweep', factor: FEATURES[i], done: i, total }
    factors.push(sweepOneFactor(i, baseline, split))
  }
  yield { type: 'sweep', factor: 'done', done: total, total }
  return factors
}

function sweepOneFactor(index: number, baseline: BaselineState, split: SplitDeltas): FactorSweep {
  const center = baseline.betas[index]
  const band = bandFor(index, center, baseline, split.trainDeltas)
  const points = sweepFactor(index, baseline.betas, band, split.trainDeltas, split.validDeltas, baseline.calibration)
  const key = FEATURES[index]
  return {
    key,
    label: FEATURE_LABELS[key],
    baselineBeta: center,
    bandBegin: band.begin,
    bandEnd: band.end,
    points,
    trainOptimal: optimalOf(points, 'train'),
    validOptimal: optimalOf(points, 'valid'),
  }
}

function bandFor(
  index: number,
  center: number,
  baseline: BaselineState,
  trainDeltas: SampleDelta[],
): { begin: number; end: number } {
  const span = Math.max(MIN_SPAN, 3 * Math.abs(center))
  const probes = wideProbes(index, center, span, baseline, trainDeltas)
  return sensitivityBand(probes)
}

function wideProbes(
  index: number,
  center: number,
  span: number,
  baseline: BaselineState,
  trainDeltas: SampleDelta[],
): { beta: number; loss: number }[] {
  const lo = center - span
  const step = (2 * span) / (WIDE_PROBE_COUNT - 1)
  return Array.from({ length: WIDE_PROBE_COUNT }, (_unused, i) =>
    probeLoss(index, lo + step * i, baseline, trainDeltas),
  )
}

function probeLoss(
  index: number,
  beta: number,
  baseline: BaselineState,
  trainDeltas: SampleDelta[],
): { beta: number; loss: number } {
  const weights = baseline.betas.slice()
  weights[index] = beta
  return { beta, loss: lossAt(weights, baseline.calibration, trainDeltas) }
}

function optimalOf(points: FactorSweep['points'], field: 'train' | 'valid'): { beta: number; loss: number } {
  let best = { beta: points[0].beta, loss: points[0][field] }
  for (const point of points) {
    if (point[field] < best.loss) best = { beta: point.beta, loss: point[field] }
  }
  return best
}

function assembleResult(
  baseline: BaselineState,
  factors: FactorSweep[],
  samples: Sample[],
  split: SplitDeltas,
): SensitivityResult {
  return {
    baseline: baseline.result,
    factors,
    trainCutoff: TRAIN_CUTOFF,
    trainYears: trainYearsOf(samples),
    testYears: TEST_YEARS,
    trainN: split.trainDeltas.length,
    validN: split.validDeltas.length,
    totalMatches: samples.length,
    dataSource: DATA_SOURCE,
    fetchedAt: new Date().toISOString(),
  }
}

function trainYearsOf(samples: Sample[]): number[] {
  const years = new Set(samples.filter((s) => s.year <= TRAIN_CUTOFF).map((s) => s.year))
  return [...years].sort((a, b) => a - b)
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
