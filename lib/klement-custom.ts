import teamsRaw from './teams.json'
import eloHistoryRaw from './elo-history.json'
import type { TeamData, WDL } from '../types'
import { fG, fP, fT, fF } from './klement'
import { applyStarPlayerModifier, toTeamNl } from './squad-modifier'

// Wrapper rond klement.ts's matchP. lib/klement.ts is read-only — modelaanpassingen
// (Elo-weging, sterspeler-blessures) leven hier.

const td = teamsRaw as Record<string, TeamData>
const eloHistory = eloHistoryRaw as Array<Record<string, string | number>>

const W = { gdp: 0.20, pop: 0.15, temp: 0.15, fifa: 0.45, host: 0.05 }

// "Teamsterkte" (de 0.45-gewogen factor) is een mix van FIFA-ranking en Elo-rating
export const ELO_WEIGHT = 0.30
export const FIFA_WEIGHT = 0.70

// Elo-normalisatie [1000, 2200] → [0, 1], analoog aan fF's FIFA-normalisatie [1400, 2000]
const ELO_MIN = 1000
const ELO_MAX = 2200

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v))
}

export function fE(elo: number): number {
  return clamp((elo - ELO_MIN) / (ELO_MAX - ELO_MIN), 0, 1)
}

// Meest recente Elo-waarde voor een team (laatste entry in elo-history.json met deze sleutel)
export function latestElo(name: string): number | undefined {
  for (let i = eloHistory.length - 1; i >= 0; i--) {
    const v = eloHistory[i][name]
    if (typeof v === 'number') return v
  }
  return undefined
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

// Teamscore zoals klement.ts's sc(), maar de FIFA-factor is vervangen door een
// FIFA/Elo-mix (FIFA_WEIGHT/ELO_WEIGHT). Zonder Elo-data valt terug op fF alleen.
function sc(name: string): number {
  const t = td[name]
  if (!t) return 0

  const elo = latestElo(name)
  const strength = elo !== undefined
    ? FIFA_WEIGHT * fF(t.fifa) + ELO_WEIGHT * fE(elo)
    : fF(t.fifa)

  return (
    W.gdp * fG(t.gdp) +
    W.pop * fP(t.pop, t.latam) +
    W.temp * fT(t.temp) +
    W.fifa * strength +
    W.host * (t.host ? 1 : 0)
  )
}

function matchPElo(nA: string, nB: string): { pA: number; dr: number; pB: number } {
  const sA = sc(nA)
  const sB = sc(nB)
  const z = (sA - sB) / 0.28
  const dr = clamp(0.20 * (1 - 0.3 * Math.abs(z)), 0.05, 0.24)
  const pA = phi(z) * (1 - dr)
  const pB = (1 - phi(z)) * (1 - dr)
  return { pA, dr, pB }
}

// Drop-in vervanging van klement.ts's matchP: zelfde signatuur, nA/nB zijn
// Engelse teamnamen uit lib/teams.json. Past Elo-weging en de blessure-status
// van sterspelers toe op de basisberekening.
export function matchP(nA: string, nB: string): { pA: number; dr: number; pB: number } {
  const probs = matchPElo(nA, nB)
  const teamNlA = toTeamNl(nA) ?? ''
  const teamNlB = toTeamNl(nB) ?? ''
  return applyStarPlayerModifier(probs, teamNlA, teamNlB)
}

// Drop-in vervanging van klement.ts's simResult, met de matchP hierboven
// (Elo-weging + sterspeler-blessures) in plaats van de basisversie.
export function simResultCustom(nA: string, nB: string): WDL {
  const { pA, dr } = matchP(nA, nB)
  const r = Math.random()
  if (r < pA) return 'A'
  if (r < pA + dr) return 'D'
  return 'B'
}
