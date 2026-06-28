import { describe, it, expect } from 'vitest'
import {
  sc,
  matchP,
  simKO,
  calcStandings,
  predictScore,
  expectedGoals,
  teamElo,
  modelComponents,
} from '../lib/klement'
import type { MatchResult } from '../types'

describe('sc()', () => {
  it('returns a finite number for all teams', () => {
    const teams = ['Netherlands', 'France', 'Argentina', 'Japan', 'Morocco', 'New Zealand']
    for (const t of teams) {
      expect(Number.isFinite(sc(t))).toBe(true)
    }
  })

  it('returns 0 for an unknown team', () => {
    expect(sc('Atlantis FC')).toBe(0)
  })

  it('ranks a strong side above a weak side', () => {
    expect(sc('Argentina')).toBeGreaterThan(sc('New Zealand'))
  })
})

describe('matchP()', () => {
  it('probabilities sum to 1', () => {
    const { pA, dr, pB } = matchP('Netherlands', 'Morocco')
    expect(pA + dr + pB).toBeCloseTo(1, 5)
  })

  it('all values are in range', () => {
    const { pA, dr, pB } = matchP('Argentina', 'Japan')
    expect(pA).toBeGreaterThanOrEqual(0)
    expect(pA).toBeLessThanOrEqual(1)
    expect(dr).toBeGreaterThanOrEqual(0.05)
    expect(dr).toBeLessThanOrEqual(0.34)
    expect(pB).toBeGreaterThanOrEqual(0)
    expect(pB).toBeLessThanOrEqual(1)
  })

  it('equal teams produce ~50/50 win chances', () => {
    const { pA, pB } = matchP('France', 'France')
    expect(pA).toBeCloseTo(pB, 3)
  })

  it('favours the stronger side', () => {
    const { pA, pB } = matchP('Argentina', 'New Zealand')
    expect(pA).toBeGreaterThan(pB)
  })
})

describe('predictScore()', () => {
  it('outcome probabilities cover ~100% of the grid', () => {
    const s = predictScore('Argentina', 'New Zealand')
    expect(s.pHome + s.pDraw + s.pAway).toBeGreaterThan(0.98)
    expect(s.pHome + s.pDraw + s.pAway).toBeLessThanOrEqual(1.0001)
  })

  it('returns positive expected goals and a most-likely scoreline', () => {
    const s = predictScore('Netherlands', 'Morocco')
    expect(s.lambdaA).toBeGreaterThan(0)
    expect(s.lambdaB).toBeGreaterThan(0)
    expect(s.likely.a).toBeGreaterThanOrEqual(0)
    expect(s.likely.b).toBeGreaterThanOrEqual(0)
    expect(s.topScorelines).toHaveLength(6)
  })

  it('btts and over2.5 are valid probabilities', () => {
    const s = predictScore('Brazil', 'Japan')
    for (const v of [s.btts, s.over25]) {
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(1)
    }
  })
})

describe('expectedGoals()', () => {
  it('gives the stronger side a higher xG', () => {
    const { lambdaA, lambdaB } = expectedGoals('Argentina', 'New Zealand')
    expect(lambdaA).toBeGreaterThan(lambdaB)
  })
})

describe('teamElo()', () => {
  it('returns a rating and ranks strong over weak', () => {
    expect(teamElo('Argentina')).toBeGreaterThan(1000)
    expect(teamElo('Argentina')).toBeGreaterThan(teamElo('New Zealand'))
  })
})

describe('modelComponents()', () => {
  it('exposes weights whose importance sums to ~100%', () => {
    const comps = modelComponents()
    expect(comps.length).toBeGreaterThanOrEqual(5)
    const total = comps.reduce((s, c) => s + c.importancePct, 0)
    expect(total).toBeCloseTo(100, 0)
  })
})

describe('simKO()', () => {
  it('always returns a known team as winner', () => {
    for (let i = 0; i < 20; i++) {
      const { winner, pen } = simKO('Netherlands', 'Portugal')
      expect(['Netherlands', 'Portugal']).toContain(winner)
      expect(typeof pen).toBe('boolean')
    }
  })
})

describe('calcStandings()', () => {
  it('returns one entry per team sorted by points desc', () => {
    const teams = ['A', 'B', 'C', 'D']
    const results: MatchResult[] = [
      { teamA: 'A', teamB: 'B', result: 'A' },
      { teamA: 'C', teamB: 'D', result: 'D' },
      { teamA: 'A', teamB: 'C', result: 'A' },
      { teamA: 'B', teamB: 'D', result: 'B' },
      { teamA: 'A', teamB: 'D', result: 'A' },
      { teamA: 'B', teamB: 'C', result: 'B' },
    ]
    const standings = calcStandings(teams, results)
    expect(standings).toHaveLength(4)
    expect(standings[0].team).toBe('A')
    expect(standings[0].pts).toBe(9)
    for (let i = 0; i < standings.length - 1; i++) {
      expect(standings[i].pts).toBeGreaterThanOrEqual(standings[i + 1].pts)
    }
  })
})
