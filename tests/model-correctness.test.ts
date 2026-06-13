import { describe, it, expect } from 'vitest'
import { teamNames } from '../lib/klement'
import {
  matchP,
  applyAltitudeFactor,
  applyTravelFactor,
  applyExperienceFactor,
  applyFormFactor,
  applyLeagueFactor,
  applyRestDaysFactor,
  applyPolymarketFactor,
} from '../lib/klement-custom'
import { applyStarPlayerModifier, toTeamNl } from '../lib/squad-modifier'
import { DEFAULT_WEIGHTS, baseFactorSum } from '../lib/model-config'

const sumsToOne = (p: { pA: number; dr: number; pB: number }) => p.pA + p.dr + p.pB
const allInRange = (p: { pA: number; dr: number; pB: number }) =>
  [p.pA, p.dr, p.pB].every(v => v >= 0 && v <= 1)

describe('Model correctheid', () => {
  it('basisgewichten tellen op tot 1.00', () => {
    expect(baseFactorSum(DEFAULT_WEIGHTS)).toBeCloseTo(1, 10)
  })

  it('matchP kansen tellen op tot 1.00 voor elk teamspaar', () => {
    const teams = teamNames()
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        const p = matchP(teams[i]!, teams[j]!)
        expect(sumsToOne(p)).toBeCloseTo(1, 6)
        expect(allInRange(p)).toBe(true)
      }
    }
  })

  it('extension factors bewaren de kansensom', () => {
    const base = matchP('Netherlands', 'Mexico')
    const cases: Array<{ name: string; out: { pA: number; dr: number; pB: number } }> = [
      { name: 'altitude', out: applyAltitudeFactor(base, 'Netherlands', 'Mexico', 2240) },
      { name: 'travel', out: applyTravelFactor(base, 'Netherlands', 'Mexico', 19.3, -99.15) },
      { name: 'experience', out: applyExperienceFactor(base, 'Netherlands', 'Mexico') },
      { name: 'form', out: applyFormFactor(base, 'Netherlands', 'Mexico') },
      { name: 'league', out: applyLeagueFactor(base, 'Netherlands', 'Mexico') },
      { name: 'rest', out: applyRestDaysFactor(base, 'Netherlands', 'Mexico', 1, 6) },
      { name: 'polymarket', out: applyPolymarketFactor(base, 'Netherlands', 'Mexico', { Netherlands: 0.2, Mexico: 0.08 }, 0.3) },
      { name: 'stars', out: applyStarPlayerModifier(base, toTeamNl('Netherlands') ?? '', toTeamNl('Mexico') ?? '') },
    ]
    for (const c of cases) {
      expect(sumsToOne(c.out), `${c.name} sum`).toBeCloseTo(1, 6)
      expect(allInRange(c.out), `${c.name} range`).toBe(true)
    }
  })

  it('star player penalty is proportioneel aan rank (config-contract)', () => {
    // Hogere rang (1 = belangrijkste sterspeler) => grotere penalty.
    expect(DEFAULT_WEIGHTS.starPenalty1).toBeGreaterThan(DEFAULT_WEIGHTS.starPenalty2)
    expect(DEFAULT_WEIGHTS.starPenalty2).toBeGreaterThan(DEFAULT_WEIGHTS.starPenalty3)

    // Een grotere logit-penalty moet een grotere winkans-daling geven (monotoon).
    const sigmoid = (x: number) => 1 / (1 + Math.exp(-x))
    const logit = (p: number) => Math.log(p / (1 - p))
    const drop = (pct: number) => 0.5 - sigmoid(logit(0.5) + Math.log((0.5 - pct) / (0.5 + pct)))
    expect(drop(DEFAULT_WEIGHTS.starPenalty1)).toBeGreaterThan(drop(DEFAULT_WEIGHTS.starPenalty2))
    expect(drop(DEFAULT_WEIGHTS.starPenalty2)).toBeGreaterThan(drop(DEFAULT_WEIGHTS.starPenalty3))
  })

  it('logit/sigmoid round-trip is stabiel', () => {
    const sigmoid = (x: number) => 1 / (1 + Math.exp(-x))
    const logit = (p: number) => Math.log(p / (1 - p))
    for (const p of [0.02, 0.1, 0.25, 0.5, 0.73, 0.9, 0.98]) {
      expect(sigmoid(logit(p))).toBeCloseTo(p, 12)
    }
  })

  it('all-fit teams: sterspeler-modifier is een no-op', () => {
    const base = matchP('Netherlands', 'Mexico')
    const out = applyStarPlayerModifier(base, toTeamNl('Netherlands') ?? '', toTeamNl('Mexico') ?? '')
    // Zonder out/twijfelachtige sterspelers blijven de kansen ongewijzigd.
    expect(out.pA).toBeCloseTo(base.pA, 10)
    expect(out.dr).toBeCloseTo(base.dr, 10)
    expect(out.pB).toBeCloseTo(base.pB, 10)
  })
})
