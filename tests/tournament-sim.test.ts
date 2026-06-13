import { describe, it, expect } from 'vitest'
import { GROUPS } from '../lib/fixtures'
import { simulateTournament, simulateBracket, seedR32 } from '../lib/simulate-tournament'
import { seedR32FromGroups, defaultGroupPicks, groupOutcomeProbs } from '../lib/group-picks'

describe('Monte Carlo simulator', () => {
  it('elke groep heeft exact 4 teams (12 groepen)', () => {
    expect(Object.keys(GROUPS).length).toBe(12)
    for (const [letter, teams] of Object.entries(GROUPS)) {
      expect(teams.length, `group ${letter}`).toBe(4)
      expect(new Set(teams).size, `group ${letter} unieke teams`).toBe(4)
    }
  })

  it('precies 32 teams bereiken de R32 per simulatie', () => {
    const n = 60
    const sim = simulateTournament(n)
    const reachR32Sum = Object.values(sim.reachR32).reduce((a, b) => a + b, 0)
    expect(reachR32Sum).toBe(32 * n)

    // En de seeding vanuit groepskeuzes levert 32 unieke teams.
    const r32 = seedR32FromGroups(defaultGroupPicks())
    expect(r32.length).toBe(32)
    expect(new Set(r32).size).toBe(32)
  })

  it('champion frequencies sommeren op tot N simulaties', () => {
    const n = 60
    const sim = simulateTournament(n)
    const champSum = Object.values(sim.champion).reduce((a, b) => a + b, 0)
    expect(champSum).toBe(n)
    expect(sim.bracket.champion.prob).toBeGreaterThan(0)
    expect(sim.bracket.champion.prob).toBeLessThanOrEqual(1)
  })

  it('geen team kan zichzelf ontmoeten', () => {
    const r32 = seedR32FromGroups(defaultGroupPicks())
    // Elke R32-wedstrijd is een paar [home, away] op opeenvolgende indexen.
    for (let i = 0; i < r32.length; i += 2) {
      expect(r32[i]).not.toBe(r32[i + 1])
    }
    // En in de meest-waarschijnlijke bracket evenmin.
    const sim = simulateBracket(r32, 40)
    for (const m of sim.bracket.r32) {
      if (m.home.team && m.away.team) expect(m.home.team).not.toBe(m.away.team)
    }
  })

  it('KO-bracket (R32-seeding) heeft geen duplicaten', () => {
    const r32 = seedR32(
      Object.keys(GROUPS).map(l => GROUPS[l][0]), // 12 winnaars
      Object.keys(GROUPS).map(l => GROUPS[l][1]), // 12 nummers-twee
      Object.keys(GROUPS).slice(0, 8).map(l => GROUPS[l][2]) // 8 nummers-drie
    )
    expect(r32.length).toBe(32)
    expect(new Set(r32).size).toBe(32)
  })

  it('groepsuitkomst: P(top-2) sommeert tot 2.00 en P(win) tot 1.00', () => {
    for (const [letter, teams] of Object.entries(GROUPS)) {
      const { win, top2 } = groupOutcomeProbs(teams)
      const sumWin = Object.values(win).reduce((a, b) => a + b, 0)
      const sumTop2 = Object.values(top2).reduce((a, b) => a + b, 0)
      expect(sumWin, `group ${letter} win`).toBeCloseTo(1, 6)
      expect(sumTop2, `group ${letter} top2`).toBeCloseTo(2, 6)
      // P(top-2) >= P(groepswinst) voor elk team.
      for (const t of teams) expect(top2[t]).toBeGreaterThanOrEqual(win[t] - 1e-9)
    }
  })
})
