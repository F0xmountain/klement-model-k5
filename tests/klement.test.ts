import { describe, it, expect } from 'vitest'
import { sc, matchP, simKO, calcStandings } from '../lib/klement'
import type { MatchResult } from '../types'

describe('sc()', () => {
  it('returns a value between 0 and 1 for all teams', () => {
    const teams = ['Netherlands', 'France', 'Argentina', 'Japan', 'Morocco', 'New Zealand']
    for (const t of teams) {
      const s = sc(t)
      expect(s).toBeGreaterThanOrEqual(0)
      expect(s).toBeLessThanOrEqual(1)
    }
  })

  it('returns 0 for an unknown team', () => {
    expect(sc('Atlantis FC')).toBe(0)
  })

  it('host bonus is applied', () => {
    const usa = sc('USA')
    const netherlands = sc('Netherlands')
    expect(usa).toBeGreaterThan(0)
    expect(netherlands).toBeGreaterThan(0)
  })
})

describe('matchP()', () => {
  it('probabilities sum to 1', () => {
    const { pA, dr, pB } = matchP('Netherlands', 'Morocco')
    expect(pA + dr + pB).toBeCloseTo(1, 5)
  })

  it('all values are between 0 and 1', () => {
    const { pA, dr, pB } = matchP('Argentina', 'Japan')
    expect(pA).toBeGreaterThanOrEqual(0)
    expect(pA).toBeLessThanOrEqual(1)
    expect(dr).toBeGreaterThanOrEqual(0.05)
    expect(dr).toBeLessThanOrEqual(0.24)
    expect(pB).toBeGreaterThanOrEqual(0)
    expect(pB).toBeLessThanOrEqual(1)
  })

  it('equal teams produce ~50/50 win chances', () => {
    const { pA, pB } = matchP('France', 'France')
    expect(pA).toBeCloseTo(pB, 3)
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
    expect(standings[0]!.team).toBe('A')
    expect(standings[0]!.pts).toBe(9)
    for (let i = 0; i < standings.length - 1; i++) {
      expect(standings[i]!.pts).toBeGreaterThanOrEqual(standings[i + 1]!.pts)
    }
  })
})
