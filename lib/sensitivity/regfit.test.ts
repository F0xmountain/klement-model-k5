import { describe, expect, it } from 'vitest'
import { FEATURES, fitLogistic } from './engine'
import { fitRegLogistic } from './regfit'
import type { SampleDelta } from './types'

// Feature 0 separates the outcome strongly; features 1 and 2 carry a weak but
// genuine correlation (a small share aligned with the label, the rest noise) so an
// unpenalized fit gives them modest nonzero betas. Ridge shrinks those toward but
// never to zero; a large L1 soft-thresholds them to exactly zero while feature 0
// survives. The remaining seven features are pure zeros, untouched by either.
function noisySamples(): SampleDelta[] {
  const samples: SampleDelta[] = []
  for (let i = 0; i < 80; i++) {
    const aWin = i % 2 === 0
    const sign = aWin ? 1 : -1
    const vector = FEATURES.map(() => 0)
    vector[0] = sign * 3
    vector[1] = i % 3 === 0 ? sign * 0.6 : sign * -0.2
    vector[2] = i % 4 === 0 ? sign * 0.5 : sign * -0.15
    samples.push({ delta: vector, label: aWin ? 'A' : 'B' })
  }
  return samples
}

function l2Norm(beta: number[]): number {
  return Math.sqrt(beta.reduce((sum, b) => sum + b * b, 0))
}

describe('fitRegLogistic penalty conventions', () => {
  it('reproduces an unpenalized fit at l2=0, l1=0 (no hidden engine 1e-3)', () => {
    const samples = noisySamples()
    const reg = fitRegLogistic(samples, { l2: 0, l1: 0 })

    // The engine baseline carries FIT_L2 = 1e-3, so the true unregularized fit is
    // strictly larger in magnitude on the separating feature.
    const engine = fitLogistic(samples)
    expect(reg[0]).toBeGreaterThan(engine[0])
  })

  it('ridge shrinks coefficients toward zero but keeps every feature nonzero', () => {
    const samples = noisySamples()
    const light = fitRegLogistic(samples, { l2: 1e-3, l1: 0 })
    const heavy = fitRegLogistic(samples, { l2: 5, l1: 0 })

    expect(l2Norm(heavy)).toBeLessThan(l2Norm(light))
    for (const k of [0, 1, 2]) {
      expect(Math.abs(heavy[k])).toBeLessThan(Math.abs(light[k]))
      expect(heavy[k]).not.toBe(0)
    }
  })

  it('lasso with a large l1 drives at least one coefficient to exactly 0', () => {
    const samples = noisySamples()
    const lasso = fitRegLogistic(samples, { l2: 0, l1: 1 })

    const zeroed = lasso.filter((b) => b === 0)
    expect(zeroed.length).toBeGreaterThan(0)
    // The strongly-separating feature 0 must survive the same penalty.
    expect(lasso[0]).not.toBe(0)
  })

  it('elastic-net activates both penalties: zeros weak features and shrinks the rest', () => {
    const samples = noisySamples()
    const elastic = fitRegLogistic(samples, { l2: 0.5, l1: 0.5 })
    const ridge = fitRegLogistic(samples, { l2: 0.5, l1: 0 })

    expect(elastic.some((b) => b === 0)).toBe(true)
    expect(Math.abs(elastic[0])).toBeLessThan(Math.abs(ridge[0]))
  })
})
