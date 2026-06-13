import { describe, it, expect } from 'vitest'
import { topScores } from '../lib/score-distribution'

describe('topScores (Poisson)', () => {
  it('favours a home win when team A is stronger — top score is not 0-0', () => {
    const top = topScores(0.6, 0.2)[0]!
    expect(top.homeGoals === 0 && top.awayGoals === 0).toBe(false)
    // de sterkere ploeg scoort minstens zoveel als de tegenstander in de top-uitslag
    expect(top.homeGoals).toBeGreaterThanOrEqual(top.awayGoals)
  })

  it('equal teams → most likely score is a draw', () => {
    // Bij λ ≈ 1.18 (BASE_GOALS) is de modale exacte uitslag 1-1, niet 0-0:
    // poisson(1,1.18) > poisson(0,1.18). De top-uitslag is dus een gelijkspel.
    const top = topScores(1 / 3, 1 / 3)[0]!
    expect(top.homeGoals).toBe(top.awayGoals)
  })

  it('the 0..5 × 0..5 grid covers ≥ 95% of the probability mass', () => {
    const all = topScores(0.33, 0.33, 36)
    const sum = all.reduce((s, x) => s + x.probability, 0)
    expect(sum).toBeGreaterThanOrEqual(0.95)
  })
})
