import { describe, it, expect } from 'vitest'
import { getOpponentAdjustedStrength, type MatchStat } from '../lib/klement-custom'

// Hulpfunctie: n wedstrijden voor `team`, telkens dezelfde tegenstander en uitslag.
function games(team: string, opponent: string, goalsFor: number, goalsAgainst: number, n: number): MatchStat[] {
  return Array.from({ length: n }, () => ({ team, opponent, goalsFor, goalsAgainst }))
}

describe('getOpponentAdjustedStrength', () => {
  it('returns null with fewer than 3 matches', () => {
    expect(getOpponentAdjustedStrength('Spain', games('Spain', 'New Zealand', 2, 0, 2))).toBeNull()
  })

  it('returns stats at 3+ matches', () => {
    const s = getOpponentAdjustedStrength('Spain', games('Spain', 'New Zealand', 2, 0, 3))
    expect(s).not.toBeNull()
    expect(s!.sampleSize).toBe(3)
  })

  it('beating strong opponents yields higher adjustedAttack than beating weak ones', () => {
    // Zelfde doelpunten (2-0), maar verschillende tegenstanderkwaliteit:
    // Argentina (FIFA 1880 → tier 3.0) vs New Zealand (FIFA 1410 → tier 0.6).
    const vsStrong = getOpponentAdjustedStrength('TeamX', games('TeamX', 'Argentina', 2, 0, 5))!
    const vsWeak = getOpponentAdjustedStrength('TeamY', games('TeamY', 'New Zealand', 2, 0, 5))!
    expect(vsStrong.adjustedAttack).toBeGreaterThan(vsWeak.adjustedAttack)
  })

  it('confidence rises with more matches', () => {
    const few = getOpponentAdjustedStrength('Spain', games('Spain', 'Croatia', 1, 1, 3))!
    const many = getOpponentAdjustedStrength('Spain', games('Spain', 'Croatia', 1, 1, 8))!
    expect(many.confidence).toBeGreaterThan(few.confidence)
  })

  it('filters to the requested team only', () => {
    const mixed: MatchStat[] = [
      ...games('Spain', 'Argentina', 2, 0, 3),
      ...games('France', 'New Zealand', 1, 0, 4),
    ]
    expect(getOpponentAdjustedStrength('Spain', mixed)!.sampleSize).toBe(3)
    expect(getOpponentAdjustedStrength('France', mixed)!.sampleSize).toBe(4)
  })
})
