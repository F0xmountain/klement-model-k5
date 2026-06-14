import { describe, it, expect } from 'vitest'
import {
  topScores,
  bivariatePoisson,
  topScoresFromMatrix,
  overUnder,
  btts,
  winDrawLoss,
} from '../lib/score-distribution'

describe('topScores (bivariate Poisson)', () => {
  it('favours a home win when team A is stronger — top score is not 0-0', () => {
    const top = topScores(0.6, 0.2)[0]!
    expect(top.homeGoals === 0 && top.awayGoals === 0).toBe(false)
    // de sterkere ploeg scoort minstens zoveel als de tegenstander in de top-uitslag
    expect(top.homeGoals).toBeGreaterThanOrEqual(top.awayGoals)
  })

  it('equal teams → most likely score is a draw', () => {
    // Bij λ ≈ 1.18 (BASE_GOALS) is de modale exacte uitslag 1-1, niet 0-0.
    const top = topScores(1 / 3, 1 / 3)[0]!
    expect(top.homeGoals).toBe(top.awayGoals)
  })

  it('the 0..5 × 0..5 grid covers ≥ 95% of the probability mass', () => {
    const all = topScores(0.33, 0.33, 36)
    const sum = all.reduce((s, x) => s + x.probability, 0)
    expect(sum).toBeGreaterThanOrEqual(0.95)
  })
})

describe('bivariatePoisson', () => {
  it('the full matrix sums to ≈ 1.00', () => {
    const m = bivariatePoisson(1.2, 1.0, 0.11)
    const sum = m.reduce((s, row) => s + row.reduce((r, p) => r + p, 0), 0)
    expect(sum).toBeCloseTo(1.0, 3)
  })

  it('positive λ3 yields positive covariance between the marginals', () => {
    // Cov(X,Y) = λ3 > 0 ⇒ E[XY] > E[X]·E[Y]. Verifieer numeriek op de matrix.
    const m = bivariatePoisson(1.5, 1.3, 0.13)
    let exy = 0
    let ex = 0
    let ey = 0
    for (let i = 0; i < m.length; i++) {
      for (let j = 0; j < m[i]!.length; j++) {
        const p = m[i]![j]!
        exy += i * j * p
        ex += i * p
        ey += j * p
      }
    }
    expect(exy).toBeGreaterThan(ex * ey)
  })

  it('clamps λ1/λ2 so a large λ3 never produces negative rates', () => {
    // lambdaA < lambda3 zou λ1 negatief maken zonder clamp; matrix moet geldig blijven.
    const m = bivariatePoisson(0.05, 1.0, 0.2)
    const sum = m.reduce((s, row) => s + row.reduce((r, p) => r + p, 0), 0)
    expect(sum).toBeGreaterThan(0)
    for (const row of m) for (const p of row) expect(p).toBeGreaterThanOrEqual(0)
  })
})

describe('winDrawLoss', () => {
  it('W/D/L marginals sum to 1.00', () => {
    const { pWin, pDraw, pLoss } = winDrawLoss(bivariatePoisson(1.4, 1.1, 0.11))
    expect(pWin + pDraw + pLoss).toBeCloseTo(1.0, 6)
  })
})

describe('btts', () => {
  it('two strong teams score both more often than two weak teams', () => {
    const strong = btts(bivariatePoisson(2.2, 2.0, 0.11))
    const weak = btts(bivariatePoisson(0.6, 0.5, 0.11))
    expect(strong).toBeGreaterThan(weak)
  })
})

describe('topScoresFromMatrix', () => {
  it('most likely score for equal teams is 0-0 or 1-1', () => {
    const top = topScoresFromMatrix(bivariatePoisson(1.18, 1.18, 0.11), 5)[0]!
    expect(top.homeGoals).toBe(top.awayGoals)
    expect(top.homeGoals).toBeLessThanOrEqual(1)
  })
})

describe('overUnder', () => {
  it('over 2.5 and under 2.5 sum to 1.00', () => {
    const { over, under } = overUnder(bivariatePoisson(1.4, 1.1, 0.11), 2.5)
    expect(over + under).toBeCloseTo(1.0, 6)
  })
})
