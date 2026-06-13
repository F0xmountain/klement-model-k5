import teamsRaw from './teams.json'
import type { TeamData } from '../types'
import { fG, fP, fT } from './klement'
import { fF, fE, latestElo, previewMatchP } from './klement-custom'
import { GROUPS } from './fixtures'
import { seedR32 } from './simulate-tournament'
import type { ModelWeights } from './model-config'

// Sensitiviteitsanalyse: hoe gevoelig zijn de uitkomsten voor elk modelgewicht?
// Twee niveaus:
//  1. Per wedstrijdpaar — Δ winkans van team A als één gewicht +0.05 stijgt.
//  2. Per kampioen-kans — welke teams stijgen/dalen het meest in een Monte Carlo
//     als één gewicht +0.05 stijgt.
//
// Voor het kampioen-niveau gebruiken we gepaarde simulaties (common random
// numbers): de basis- en de opgehoogde run delen exact dezelfde willekeurige
// stroom, zodat de Δ alleen de gewichtswijziging weerspiegelt en niet de
// Monte-Carlo-ruis. Met 500 sims is dat ruim genoeg om de richting te zien.

const td = teamsRaw as Record<string, TeamData>

// De ophoging per gewicht (5 procentpunt), zoals in de master-prompt.
const DELTA = 0.05

export type SensFactor = 'gdp' | 'pop' | 'temp' | 'fifa' | 'host' | 'eloWeight' | 'formWeight' | 'leagueWeight'

export const SENS_FACTORS: { key: SensFactor; label: string }[] = [
  { key: 'fifa', label: 'Team strength (FIFA/Elo slot)' },
  { key: 'eloWeight', label: 'Elo share of strength' },
  { key: 'gdp', label: 'GDP per capita' },
  { key: 'pop', label: 'Population' },
  { key: 'temp', label: 'Climate' },
  { key: 'host', label: 'Home advantage' },
  { key: 'formWeight', label: 'Recent form' },
  { key: 'leagueWeight', label: 'League quality' },
]

function bump(w: ModelWeights, f: SensFactor): ModelWeights {
  return { ...w, [f]: w[f] + DELTA }
}

// ── Per wedstrijdpaar ────────────────────────────────────────────────────────

export interface PairSensRow {
  factor: SensFactor
  label: string
  currentWeight: number
  deltaPA: number // verandering van P(team A wint) bij +0.05 op dit gewicht
}

// Voor elk gewicht: het effect van +0.05 op de winkans van team A. Gesorteerd op
// absolute impact (grootste invloed bovenaan).
export function matchPairSensitivity(nA: string, nB: string, w: ModelWeights): PairSensRow[] {
  const basePA = previewMatchP(nA, nB, w).pA
  return SENS_FACTORS
    .map(({ key, label }) => ({
      factor: key,
      label,
      currentWeight: w[key],
      deltaPA: previewMatchP(nA, nB, bump(w, key)).pA - basePA,
    }))
    .sort((a, b) => Math.abs(b.deltaPA) - Math.abs(a.deltaPA))
}

// ── Per kampioen-kans (Monte Carlo) ──────────────────────────────────────────

// Teamscore met expliciete gewichten — zelfde formule als scWith() in
// klement-custom.ts. Alleen gebruikt als laatste tiebreaker in de groepsstand.
function scW(name: string, w: ModelWeights): number {
  const t = td[name]
  if (!t) return 0
  const elo = latestElo(name)
  const strength = elo !== undefined
    ? (1 - w.eloWeight) * fF(t.fifa) + w.eloWeight * fE(elo)
    : fF(t.fifa)
  return (
    w.gdp * fG(t.gdp) +
    w.pop * fP(t.pop, t.latam) +
    w.temp * fT(t.temp) +
    w.fifa * strength +
    w.host * (t.host ? 1 : 0)
  )
}

// Mulberry32 — kleine, deterministische PRNG. Met dezelfde seed produceren de
// basis- en de opgehoogde simulatie identieke wedstrijdtrekkingen (op de
// gewichtswijziging na), wat de Δ-ruis sterk reduceert.
function makeRng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a += 0x6d2b79f5
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const BASE_SCORING_RATE = 1.35
function expectedGoals(p: number): number {
  return BASE_SCORING_RATE * (0.5 + (p - 0.5) * 0.8)
}

function samplePoisson(lambda: number, rng: () => number): number {
  const L = Math.exp(-lambda)
  let k = 0
  let p = 1
  do {
    k++
    p *= rng()
  } while (p > L)
  return k - 1
}

function sampleScore(pA: number, pB: number, result: 'A' | 'D' | 'B', rng: () => number): [number, number] {
  const lambdaA = expectedGoals(pA)
  const lambdaB = expectedGoals(pB)
  for (let tries = 0; tries < 20; tries++) {
    const ga = samplePoisson(lambdaA, rng)
    const gb = samplePoisson(lambdaB, rng)
    if (result === 'A' && ga > gb) return [ga, gb]
    if (result === 'B' && ga < gb) return [ga, gb]
    if (result === 'D' && ga === gb) return [ga, gb]
  }
  if (result === 'A') return [1, 0]
  if (result === 'B') return [0, 1]
  return [1, 1]
}

interface Standing {
  team: string
  pts: number
  gf: number
  ga: number
}

function cmpStanding(w: ModelWeights) {
  return (a: Standing, b: Standing): number => {
    if (b.pts !== a.pts) return b.pts - a.pts
    const gdA = a.gf - a.ga
    const gdB = b.gf - b.ga
    if (gdB !== gdA) return gdB - gdA
    if (b.gf !== a.gf) return b.gf - a.gf
    return scW(b.team, w) - scW(a.team, w)
  }
}

function simGroupW(teams: string[], w: ModelWeights, rng: () => number): Standing[] {
  const table: Record<string, Standing> = {}
  for (const t of teams) table[t] = { team: t, pts: 0, gf: 0, ga: 0 }

  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      const a = teams[i]!, b = teams[j]!
      const ta = table[a]!, tb = table[b]!
      const { pA, dr, pB } = previewMatchP(a, b, w)
      const rnd = rng()
      const r: 'A' | 'D' | 'B' = rnd < pA ? 'A' : rnd < pA + dr ? 'D' : 'B'
      const [gi, gj] = sampleScore(pA, pB, r, rng)
      ta.gf += gi; ta.ga += gj
      tb.gf += gj; tb.ga += gi
      if (r === 'A') ta.pts += 3
      else if (r === 'B') tb.pts += 3
      else { ta.pts += 1; tb.pts += 1 }
    }
  }
  return Object.values(table).sort(cmpStanding(w))
}

function koWinnerW(a: string, b: string, w: ModelWeights, rng: () => number): string {
  const { pA, pB } = previewMatchP(a, b, w)
  return rng() < pA / (pA + pB) ? a : b
}

const GROUP_LETTERS = Object.keys(GROUPS)

// Champion-kans per team (count/n) onder gewichten w, met een gegeven seed zodat de
// trekkingen reproduceerbaar zijn. Zelfde toernooistructuur als
// simulateTournament(): groepsfase → 8 beste nummers-drie → SEED_TEMPLATE → KO.
function championMC(w: ModelWeights, n: number, seed: number): Record<string, number> {
  const rng = makeRng(seed)
  const cmp = cmpStanding(w)
  const champion: Record<string, number> = {}

  for (let s = 0; s < n; s++) {
    const winners: string[] = []
    const runners: string[] = []
    const thirdsRaw: Standing[] = []

    GROUP_LETTERS.forEach((g, gi) => {
      const st = simGroupW(GROUPS[g]!, w, rng)
      winners[gi] = st[0]!.team
      runners[gi] = st[1]!.team
      thirdsRaw.push(st[2]!)
    })

    thirdsRaw.sort(cmp)
    const thirds = thirdsRaw.slice(0, 8).map(t => t.team)

    let round = seedR32(winners, runners, thirds)
    while (round.length > 1) {
      const next: string[] = []
      for (let i = 0; i < round.length; i += 2) {
        next.push(koWinnerW(round[i]!, round[i + 1]!, w, rng))
      }
      round = next
    }
    const champ = round[0]!
    champion[champ] = (champion[champ] ?? 0) + 1
  }

  for (const k of Object.keys(champion)) champion[k]! /= n
  return champion
}

export interface FactorMover {
  team: string
  delta: number
}

export interface FactorSens {
  factor: SensFactor
  label: string
  winners: FactorMover[] // top-5 stijgers
  losers: FactorMover[]  // top-5 dalers
}

// Vaste seed → gepaarde basis/opgehoogde runs (common random numbers).
const SENS_SEED = 1234567

// Voor elk gewicht: welke teams winnen/verliezen het meest aan kampioen-kans als
// dat gewicht +0.05 stijgt. Gepaarde Monte Carlo (zelfde seed) houdt de ruis laag.
export function championSensitivity(w: ModelWeights, n = 500): FactorSens[] {
  const base = championMC(w, n, SENS_SEED)
  return SENS_FACTORS.map(({ key, label }) => {
    const bumped = championMC(bump(w, key), n, SENS_SEED)
    const teams = new Set<string>([...Object.keys(base), ...Object.keys(bumped)])
    const deltas: FactorMover[] = [...teams]
      .map(t => ({ team: t, delta: (bumped[t] ?? 0) - (base[t] ?? 0) }))
      .sort((a, b) => b.delta - a.delta)
    return {
      factor: key,
      label,
      winners: deltas.filter(d => d.delta > 0).slice(0, 5),
      losers: deltas.filter(d => d.delta < 0).slice(-5).reverse(),
    }
  })
}

export { DELTA as SENS_DELTA }
