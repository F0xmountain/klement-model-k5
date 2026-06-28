import type { Calibration, Label, SampleDelta, SideFactors, StandardizerStats, SweepPoint } from './types'

export const FEATURES = [
  'elo',
  'form',
  'gdp',
  'pop',
  'confed',
  'climateGap',
  'host',
  'continental',
  'rest',
  'goalsForm',
] as const

export type FeatureKey = (typeof FEATURES)[number]

export const FEATURE_LABELS: Record<FeatureKey, string> = {
  elo: 'Elo',
  form: 'Form (365d)',
  gdp: 'GDP peak',
  pop: 'Population pool',
  confed: 'Confederation Elo',
  climateGap: 'Climate adaptation',
  host: 'Host nation',
  continental: 'Continental home',
  rest: 'Rest days',
  goalsForm: 'Goals form',
}

const DRAW_FLOOR = 0.05
const DRAW_CEIL = 0.34
const PROB_FLOOR = 1e-9
const FIT_ITERATIONS = 3000
const FIT_LR = 0.3
const FIT_L2 = 1e-3
const BAND_TRIM_FRACTION = 0.025
const FINE_SWEEP_POINTS = 26

export function clamp(value: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, value))
}

export function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x))
}

export function standardizer(rawRows: SideFactors[]): StandardizerStats {
  const stats = {} as StandardizerStats
  for (const key of FEATURES) {
    stats[key] = momentsFor(rawRows, key)
  }
  return stats
}

function momentsFor(rawRows: SideFactors[], key: FeatureKey): { mean: number; std: number } {
  const values = rawRows.map((row) => row[key])
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length
  return { mean, std: Math.sqrt(variance) || 1 }
}

export function delta(homeRaw: SideFactors, awayRaw: SideFactors, stats: StandardizerStats): number[] {
  return FEATURES.map((key) => standardize(homeRaw[key], stats[key]) - standardize(awayRaw[key], stats[key]))
}

function standardize(raw: number, moment: { mean: number; std: number }): number {
  return (raw - moment.mean) / moment.std
}

export function fitLogistic(samples: SampleDelta[]): number[] {
  const beta = FEATURES.map(() => 0)
  const decisive = samples.filter((s) => s.label !== 'D')
  for (let iter = 0; iter < FIT_ITERATIONS; iter++) {
    applyGradientStep(beta, decisive)
  }
  return beta
}

function applyGradientStep(beta: number[], decisive: SampleDelta[]): void {
  const grad = beta.map(() => 0)
  for (const sample of decisive) {
    accumulateGradient(beta, grad, sample)
  }
  for (let k = 0; k < beta.length; k++) {
    beta[k] -= FIT_LR * (grad[k] / decisive.length + FIT_L2 * beta[k])
  }
}

function accumulateGradient(beta: number[], grad: number[], sample: SampleDelta): void {
  const err = sigmoid(dot(beta, sample.delta)) - (sample.label === 'A' ? 1 : 0)
  for (let k = 0; k < beta.length; k++) {
    grad[k] += err * sample.delta[k]
  }
}

function dot(weights: number[], features: number[]): number {
  let sum = 0
  for (let k = 0; k < weights.length; k++) {
    sum += weights[k] * features[k]
  }
  return sum
}

export function predict(eta: number, dmax: number, ddecay: number): Record<Label, number> {
  const draw = clamp(dmax * Math.exp(-ddecay * Math.abs(eta)), DRAW_FLOOR, DRAW_CEIL)
  const pHome = sigmoid(eta) * (1 - draw)
  return { A: pHome, D: draw, B: (1 - sigmoid(eta)) * (1 - draw) }
}

export function logLoss(
  samples: SampleDelta[],
  weights: number[],
  scale: number,
  dmax: number,
  ddecay: number,
): number {
  let sum = 0
  for (const sample of samples) {
    const probs = predict(scale * dot(weights, sample.delta), dmax, ddecay)
    sum += -Math.log(Math.max(probs[sample.label], PROB_FLOOR))
  }
  return sum / samples.length
}

export function calibrate(trainSamples: SampleDelta[], weights: number[]): Calibration & { loss: number } {
  let best = { scale: 1, dmax: 0.26, ddecay: 1, loss: Infinity }
  for (let scale = 0.1; scale <= 4; scale += 0.1) {
    for (let dmax = 0.16; dmax <= 0.34; dmax += 0.02) {
      best = improveCalibration(trainSamples, weights, scale, dmax, best)
    }
  }
  return best
}

function improveCalibration(
  trainSamples: SampleDelta[],
  weights: number[],
  scale: number,
  dmax: number,
  best: Calibration & { loss: number },
): Calibration & { loss: number } {
  let current = best
  for (let ddecay = 0.2; ddecay <= 3; ddecay += 0.2) {
    const loss = logLoss(trainSamples, weights, scale, dmax, ddecay)
    if (loss < current.loss) {
      current = { scale, dmax, ddecay, loss }
    }
  }
  return current
}

export function sensitivityBand(probes: { beta: number; loss: number }[]): { begin: number; end: number } {
  const deltas = adjacentLossDeltas(probes)
  const total = deltas.reduce((sum, d) => sum + d, 0)
  if (total === 0) {
    return { begin: probes[0].beta, end: probes[probes.length - 1].beta }
  }
  const beginIndex = trimFromStart(deltas, total)
  const endIndex = trimFromEnd(deltas, total, probes.length)
  return { begin: probes[beginIndex].beta, end: probes[endIndex].beta }
}

function adjacentLossDeltas(probes: { beta: number; loss: number }[]): number[] {
  const deltas: number[] = []
  for (let i = 1; i < probes.length; i++) {
    deltas.push(Math.abs(probes[i].loss - probes[i - 1].loss))
  }
  return deltas
}

function trimFromStart(deltas: number[], total: number): number {
  const budget = BAND_TRIM_FRACTION * total
  let dropped = 0
  let index = 0
  while (index < deltas.length && dropped + deltas[index] <= budget) {
    dropped += deltas[index]
    index++
  }
  return index
}

function trimFromEnd(deltas: number[], total: number, probeCount: number): number {
  const budget = BAND_TRIM_FRACTION * total
  let dropped = 0
  let index = probeCount - 1
  while (index > 0 && dropped + deltas[index - 1] <= budget) {
    dropped += deltas[index - 1]
    index--
  }
  return index
}

export function sweepFactor(
  featureIndex: number,
  baselineBetas: number[],
  band: { begin: number; end: number },
  trainSamples: SampleDelta[],
  validSamples: SampleDelta[],
  calibration: Calibration,
): SweepPoint[] {
  const points: SweepPoint[] = []
  const step = (band.end - band.begin) / (FINE_SWEEP_POINTS - 1)
  for (let i = 0; i < FINE_SWEEP_POINTS; i++) {
    const beta = band.begin + step * i
    points.push(scoreSweepPoint(featureIndex, beta, baselineBetas, trainSamples, validSamples, calibration))
  }
  return points
}

function scoreSweepPoint(
  featureIndex: number,
  beta: number,
  baselineBetas: number[],
  trainSamples: SampleDelta[],
  validSamples: SampleDelta[],
  calibration: Calibration,
): SweepPoint {
  const weights = baselineBetas.slice()
  weights[featureIndex] = beta
  const train = logLoss(trainSamples, weights, calibration.scale, calibration.dmax, calibration.ddecay)
  const valid = logLoss(validSamples, weights, calibration.scale, calibration.dmax, calibration.ddecay)
  return { beta, train, valid }
}
