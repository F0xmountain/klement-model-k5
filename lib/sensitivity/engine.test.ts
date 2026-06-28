import { describe, expect, it } from 'vitest'
import {
  calibrate,
  clamp,
  delta,
  FEATURES,
  FEATURE_LABELS,
  fitLogistic,
  logLoss,
  predict,
  sensitivityBand,
  sigmoid,
  standardizer,
} from './engine'
import type { SampleDelta, SideFactors } from './types'

function zeroSide(overrides: Partial<SideFactors>): SideFactors {
  const base = {} as SideFactors
  for (const key of FEATURES) {
    base[key] = 0
  }
  return { ...base, ...overrides }
}

function separableSamples(): SampleDelta[] {
  const samples: SampleDelta[] = []
  for (let i = 0; i < 40; i++) {
    const aWin = i % 2 === 0
    const vector = FEATURES.map(() => 0)
    vector[0] = aWin ? 2 : -2
    samples.push({ delta: vector, label: aWin ? 'A' : 'B' })
  }
  return samples
}

describe('FEATURES and labels', () => {
  it('lists the 10 keys in the locked order', () => {
    expect([...FEATURES]).toEqual([
      'elo', 'form', 'gdp', 'pop', 'confed', 'climateGap', 'host', 'continental', 'rest', 'goalsForm',
    ])
  })

  it('has a display label for every feature', () => {
    for (const key of FEATURES) {
      expect(typeof FEATURE_LABELS[key]).toBe('string')
    }
  })
})

describe('clamp and sigmoid', () => {
  it('clamps below, within, and above the range', () => {
    expect(clamp(-5, 0, 1)).toBe(0)
    expect(clamp(0.5, 0, 1)).toBe(0.5)
    expect(clamp(5, 0, 1)).toBe(1)
  })

  it('maps sigmoid(0) to 0.5 and stays in (0,1)', () => {
    expect(sigmoid(0)).toBeCloseTo(0.5, 10)
    expect(sigmoid(8)).toBeGreaterThan(0)
    expect(sigmoid(8)).toBeLessThan(1)
    expect(sigmoid(-8)).toBeGreaterThan(0)
  })
})

describe('standardizer and delta', () => {
  it('falls back to std 1 when a feature has zero variance', () => {
    const rows: SideFactors[] = [zeroSide({ elo: 7 }), zeroSide({ elo: 7 })]
    const stats = standardizer(rows)
    expect(stats.elo.mean).toBe(7)
    expect(stats.elo.std).toBe(1)
  })

  it('returns a standardized difference per feature', () => {
    const rows: SideFactors[] = [zeroSide({ elo: 0 }), zeroSide({ elo: 4 })]
    const stats = standardizer(rows)
    const diff = delta(zeroSide({ elo: 4 }), zeroSide({ elo: 0 }), stats)
    expect(diff.length).toBe(FEATURES.length)
    expect(diff[0]).toBeGreaterThan(0)
  })
})

describe('predict', () => {
  it('returns probabilities in [0,1] that sum to ~1', () => {
    for (const eta of [-3, -1, 0, 1, 3]) {
      const probs = predict(eta, 0.26, 1)
      for (const label of ['A', 'D', 'B'] as const) {
        expect(probs[label]).toBeGreaterThanOrEqual(0)
        expect(probs[label]).toBeLessThanOrEqual(1)
      }
      expect(probs.A + probs.D + probs.B).toBeCloseTo(1, 10)
    }
  })
})

describe('logLoss', () => {
  it('is strictly positive on a real dataset', () => {
    const samples = separableSamples()
    const loss = logLoss(samples, FEATURES.map(() => 0.5), 1, 0.26, 1)
    expect(loss).toBeGreaterThan(0)
  })
})

describe('fitLogistic', () => {
  it('gives positive beta[0] and lower loss than all-zero betas when feature 0 separates A-wins', () => {
    const samples = separableSamples()
    const fitted = fitLogistic(samples)
    expect(fitted[0]).toBeGreaterThan(0)

    const zeroLoss = logLoss(samples, FEATURES.map(() => 0), 1, 0.26, 1)
    const fittedLoss = logLoss(samples, fitted, 1, 0.26, 1)
    expect(fittedLoss).toBeLessThan(zeroLoss)
  })
})

describe('calibrate', () => {
  it('returns scale, dmax, and ddecay inside the search grid', () => {
    const samples = separableSamples()
    const fitted = fitLogistic(samples)
    const cal = calibrate(samples, fitted)
    expect(cal.scale).toBeGreaterThanOrEqual(0.1)
    expect(cal.scale).toBeLessThanOrEqual(4)
    expect(cal.dmax).toBeGreaterThanOrEqual(0.16)
    expect(cal.dmax).toBeLessThanOrEqual(0.34)
    expect(cal.ddecay).toBeGreaterThanOrEqual(0.2)
    expect(cal.ddecay).toBeLessThanOrEqual(3)
    expect(cal.loss).toBeLessThan(Infinity)
  })
})

describe('sensitivityBand', () => {
  it('returns begin < end after trimming flat saturated tails', () => {
    const probes = [
      { beta: -10, loss: 1.0 },
      { beta: -5, loss: 1.0 },
      { beta: 0, loss: 0.6 },
      { beta: 5, loss: 1.0 },
      { beta: 10, loss: 1.0 },
    ]
    const band = sensitivityBand(probes)
    expect(band.begin).toBeLessThan(band.end)
    expect(band.begin).toBeGreaterThanOrEqual(-10)
    expect(band.end).toBeLessThanOrEqual(10)
  })
})
