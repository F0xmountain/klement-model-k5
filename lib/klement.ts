import teamsRaw from './teams.json'
import type { TeamData, WDL, SimResult, Standing, MatchResult } from '../types'

const td = teamsRaw as Record<string, TeamData>

const W = { gdp: 0.20, pop: 0.15, temp: 0.15, fifa: 0.45, host: 0.05 }

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v))
}

export function fG(gdp: number) {
  return clamp(1 - ((gdp - 35) / 35) ** 2, 0, 1)
}

export function fP(pop: number, latam: boolean) {
  return clamp((Math.log(pop) / Math.log(200)) * (latam ? 1 : 0.3), 0, 1)
}

export function fT(temp: number) {
  return clamp(1 - Math.abs(temp - 14) / 22, 0, 1)
}

export function fF(fifa: number) {
  return clamp((fifa - 1400) / 600, 0, 1)
}

function erf(x: number): number {
  const t = 1 / (1 + 0.3275911 * Math.abs(x))
  const p =
    t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))))
  const r = 1 - p * Math.exp(-x * x)
  return x >= 0 ? r : -r
}

function phi(x: number) {
  return 0.5 * (1 + erf(x / Math.sqrt(2)))
}

export function sc(name: string): number {
  const t = td[name]
  if (!t) return 0
  return (
    W.gdp * fG(t.gdp) +
    W.pop * fP(t.pop, t.latam) +
    W.temp * fT(t.temp) +
    W.fifa * fF(t.fifa) +
    W.host * (t.host ? 1 : 0)
  )
}

export function matchP(nA: string, nB: string): { pA: number; dr: number; pB: number } {
  const sA = sc(nA)
  const sB = sc(nB)
  const delta = sA - sB
  const z = delta / 0.28
  const dr = clamp(0.20 * (1 - 0.3 * Math.abs(z)), 0.05, 0.24)
  const pA = phi(z) * (1 - dr)
  const pB = (1 - phi(z)) * (1 - dr)
  return { pA, dr, pB }
}

export function simResult(nA: string, nB: string): WDL {
  const { pA, dr } = matchP(nA, nB)
  const r = Math.random()
  if (r < pA) return 'A'
  if (r < pA + dr) return 'D'
  return 'B'
}

export function simKO(nA: string, nB: string): SimResult {
  const result = simResult(nA, nB)
  if (result !== 'D') return { winner: result === 'A' ? nA : nB, pen: false }
  const sA = sc(nA)
  const sB = sc(nB)
  const winner = Math.random() < sA / (sA + sB) ? nA : nB
  return { winner, pen: true }
}

export function calcStandings(teams: string[], results: MatchResult[]): Standing[] {
  const map: Record<string, Standing> = {}
  for (const t of teams) map[t] = { team: t, pts: 0, w: 0, d: 0, l: 0 }

  for (const { teamA, teamB, result } of results) {
    const a = map[teamA], b = map[teamB]
    if (!a || !b) continue
    if (result === 'A') {
      a.pts += 3; a.w++; b.l++
    } else if (result === 'B') {
      b.pts += 3; b.w++; a.l++
    } else {
      a.pts += 1; a.d++
      b.pts += 1; b.d++
    }
  }

  return Object.values(map).sort((a, b) =>
    b.pts !== a.pts ? b.pts - a.pts : b.w - a.w
  )
}

export function teamNames(): string[] {
  return Object.keys(td)
}

export function teamData(name: string): TeamData | undefined {
  return td[name]
}
