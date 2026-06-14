import { describe, it, expect } from 'vitest'
import {
  calcLogLoss,
  calcBrierScore,
  evaluateAll,
  type MatchPrediction,
} from '../lib/model-accuracy'

function pred(over: Partial<MatchPrediction>): MatchPrediction {
  return {
    matchId: 'M',
    homeTeam: 'A',
    awayTeam: 'B',
    matchDate: '2026-06-11',
    predictedHome: 1 / 3,
    predictedDraw: 1 / 3,
    predictedAway: 1 / 3,
    actualHome: 1,
    actualAway: 0,
    ...over,
  }
}

describe('calcLogLoss', () => {
  it('perfect prediction (p=1.0) → 0', () => {
    expect(calcLogLoss(pred({ predictedHome: 1, predictedDraw: 0, predictedAway: 0 }))).toBe(0)
  })

  it('baseline (p=0.333) ≈ 1.099', () => {
    expect(calcLogLoss(pred({}))).toBeCloseTo(1.099, 2)
  })
})

describe('calcBrierScore', () => {
  it('perfect prediction → 0', () => {
    expect(calcBrierScore(pred({ predictedHome: 1, predictedDraw: 0, predictedAway: 0 }))).toBe(0)
  })

  it('baseline (1/3 each) ≈ 0.667', () => {
    expect(calcBrierScore(pred({}))).toBeCloseTo(0.667, 2)
  })
})

describe('evaluateAll', () => {
  it('empty array → n=0, no crash', () => {
    const r = evaluateAll([])
    expect(r.n).toBe(0)
    expect(r.results).toEqual([])
    expect(r.meanLogLoss).toBe(0)
    expect(r.meanBrierScore).toBe(0)
    expect(r.accuracy).toBe(0)
  })

  it('flags a correct call and a draw outcome', () => {
    const r = evaluateAll([
      pred({ matchId: '1', predictedHome: 0.7, predictedDraw: 0.2, predictedAway: 0.1, actualHome: 2, actualAway: 0 }),
      pred({ matchId: '2', predictedHome: 0.2, predictedDraw: 0.5, predictedAway: 0.3, actualHome: 1, actualAway: 1 }),
    ])
    expect(r.n).toBe(2)
    expect(r.accuracy).toBe(1)
    expect(r.results[0]!.actualOutcome).toBe('home')
    expect(r.results[1]!.actualOutcome).toBe('draw')
  })
})
