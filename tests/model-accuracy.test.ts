import { describe, it, expect } from 'vitest'
import {
  calcLogLoss,
  calcBrierScore,
  evaluateAll,
  getModelAccuracy,
  type CompletedPrediction,
} from '../lib/model-accuracy'
import { matchP } from '../lib/klement-custom'

function pred(over: Partial<CompletedPrediction>): CompletedPrediction {
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

describe('getModelAccuracy — teamnaam-normalisatie (Canada vs Bosnia-Herz)', () => {
  // Buggy gedrag: "Bosnia and Herzegovina" werd niet herkend → sc()=0 → Canada
  // kreeg p≈0.92. Met canonTeam-normalisatie resolvet het naar "Bosnia-Herz".
  const draw = (pA: number, dr: number, pB: number): CompletedPrediction => ({
    matchId: 'CAN-BIH', homeTeam: 'Canada', awayTeam: 'Bosnia', matchDate: '2026-06-12',
    predictedHome: pA, predictedDraw: dr, predictedAway: pB, actualHome: 1, actualAway: 1,
  })

  it('matchP resolves the canonical name to a realistic Canada win probability (~0.71, not 0.92)', () => {
    const buggy = matchP('Canada', 'Bosnia and Herzegovina') // ruwe naam — historische bug
    const fixed = matchP('Canada', 'Bosnia-Herz')            // teams.json-spelling
    expect(buggy.pA).toBeGreaterThan(0.85)                   // bevestigt de buggy waarde
    expect(fixed.pA).toBeGreaterThan(0.65)
    expect(fixed.pA).toBeLessThan(0.75)
  })

  it('getModelAccuracy gives Canada ~0.65–0.75 confidence for the Bosnia match', () => {
    const row = getModelAccuracy().rows.find(r => /Canada/.test(r.teamA) && /Bosnia/.test(r.teamB))
    expect(row).toBeDefined()
    expect(row!.confidence).toBeGreaterThan(0.65)
    expect(row!.confidence).toBeLessThan(0.75)
  })

  it('log loss for the 1-1 draw drops vs the buggy value', () => {
    const buggy = matchP('Canada', 'Bosnia and Herzegovina')
    const fixed = matchP('Canada', 'Bosnia-Herz')
    const buggyLoss = calcLogLoss(draw(buggy.pA, buggy.dr, buggy.pB))
    const fixedLoss = calcLogLoss(draw(fixed.pA, fixed.dr, fixed.pB))
    expect(fixedLoss).toBeLessThan(buggyLoss)
  })
})
