import matchesRaw from './wc2022-matches.json'
import { fG, fP, fT } from './klement'
import { fF, fE } from './klement-custom'
import { getModelWeights } from './model-config'

// Academische validatie: draai het custom-model (zelfde sc()/matchP()-logica)
// op de WK 2022-data en vergelijk de voorspelde W/D/L-kansen met de werkelijke
// uitkomsten. Dit is een terugrekening — het toont hoe goed het model gekalibreerd
// is, los van de huidige 2026-voorspellingen.
//
// De waarden in wc2022-matches.json zijn de FIFA-rankings, Elo-ratings, GDP/capita,
// populatie en jaartemperatuur van november 2022 (niet de huidige teams.json-waarden).

type Outcome = 'A' | 'D' | 'B'

interface Wc2022Match {
  matchId: string
  round: string
  group: string | null
  teamA: string
  teamB: string
  goalsA: number
  goalsB: number
  result: Outcome
  date: string
  fifaA: number; fifaB: number
  eloA: number;  eloB: number
  gdpA: number;  gdpB: number
  popA: number;  popB: number
  tempA: number; tempB: number
  latamA: boolean; latamB: boolean
  hostA: boolean;  hostB: boolean
}

const matches = matchesRaw as Wc2022Match[]

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v))
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

// Per-team inputs uit een wedstrijd. GDP staat in volle USD/capita; fG verwacht
// duizenden (piek bij $35k), dus delen door 1000 — analoog aan teams.json's schaal.
interface SideInput {
  gdp: number; pop: number; temp: number
  fifa: number; elo: number; latam: boolean; host: boolean
}

function sideA(m: Wc2022Match): SideInput {
  return { gdp: m.gdpA, pop: m.popA, temp: m.tempA, fifa: m.fifaA, elo: m.eloA, latam: m.latamA, host: m.hostA }
}
function sideB(m: Wc2022Match): SideInput {
  return { gdp: m.gdpB, pop: m.popB, temp: m.tempB, fifa: m.fifaB, elo: m.eloB, latam: m.latamB, host: m.hostB }
}

// Teamscore met de WK 2022-inputs — zelfde formule als sc()/scWith() in
// klement-custom.ts (de fifa-factor is een FIFA/Elo-mix volgens eloWeight).
function score2022(s: SideInput): number {
  const w = getModelWeights()
  const strength = (1 - w.eloWeight) * fF(s.fifa) + w.eloWeight * fE(s.elo)
  return (
    w.gdp * fG(s.gdp / 1000) +
    w.pop * fP(s.pop, s.latam) +
    w.temp * fT(s.temp) +
    w.fifa * strength +
    w.host * (s.host ? 1 : 0)
  )
}

// W/D/L-kansen — identiek aan matchPElo() in klement-custom.ts (geen post-hoc
// extension factors: die vereisen 2026-data die voor 2022 niet beschikbaar is).
function matchP2022(m: Wc2022Match): { pA: number; dr: number; pB: number } {
  const sA = score2022(sideA(m))
  const sB = score2022(sideB(m))
  const z = (sA - sB) / 0.28
  const dr = clamp(0.20 * (1 - 0.3 * Math.abs(z)), 0.05, 0.24)
  const pA = phi(z) * (1 - dr)
  const pB = (1 - phi(z)) * (1 - dr)
  return { pA, dr, pB }
}

export interface ValidationRow {
  matchId: string
  round: string
  group: string | null
  teamA: string
  teamB: string
  score: string
  pA: number
  pDraw: number
  pB: number
  modelPick: Outcome      // hoogste van pA/pDraw/pB
  favorite: string        // sterkste team (hoogste winkans, draw genegeerd)
  actual: Outcome
  correct: boolean        // model-favoriet (winkans) won daadwerkelijk
  brier: number           // Brier-bijdrage van deze wedstrijd
}

export interface CumulativePoint {
  matchId: string
  label: string           // "Qatar–Ecuador"
  brier: number           // lopend gemiddelde t/m deze wedstrijd
}

export interface Wc2022Validation {
  rows: ValidationRow[]
  brier: number
  n: number
  favoriteWon: number
  favoriteDrew: number
  favoriteLost: number
  groupCorrect: number
  groupTotal: number
  koCorrect: number
  koTotal: number
  championTeam: string
  championCorrect: boolean
  cumulative: CumulativePoint[]
}

const OUTCOMES: Outcome[] = ['A', 'D', 'B']

function buildRow(m: Wc2022Match): ValidationRow {
  const { pA, dr, pB } = matchP2022(m)
  const probs: Record<Outcome, number> = { A: pA, D: dr, B: pB }
  const modelPick = OUTCOMES.reduce((best, o) => (probs[o] > probs[best] ? o : best), 'A' as Outcome)
  const favorite = pA >= pB ? m.teamA : m.teamB
  const favoriteSide: Outcome = pA >= pB ? 'A' : 'B'
  const brier = OUTCOMES.reduce((s, o) => s + (probs[o] - (o === m.result ? 1 : 0)) ** 2, 0)
  return {
    matchId: m.matchId,
    round: m.round,
    group: m.group,
    teamA: m.teamA,
    teamB: m.teamB,
    score: `${m.goalsA}–${m.goalsB}`,
    pA, pDraw: dr, pB,
    modelPick,
    favorite,
    actual: m.result,
    correct: m.result === favoriteSide,
    brier,
  }
}

// De finale (laatste wedstrijd): rateerde het model de werkelijke kampioen als
// favoriet? In 2022 won Argentinië na strafschoppen (90+ verlenging: gelijk).
function isChampionCorrect(rows: ValidationRow[]): { team: string; correct: boolean } {
  const final = rows.find(r => r.round === 'final')
  if (!final) return { team: '', correct: false }
  // Werkelijke kampioen 2022 = Argentinië (teamA in de finale-entry).
  const champion = final.teamA
  return { team: champion, correct: final.favorite === champion }
}

export function getWc2022Validation(): Wc2022Validation {
  const rows = matches.map(buildRow)
  const n = rows.length

  const brier = rows.reduce((s, r) => s + r.brier, 0) / n

  let favoriteWon = 0, favoriteDrew = 0, favoriteLost = 0
  let groupCorrect = 0, groupTotal = 0, koCorrect = 0, koTotal = 0
  for (const r of rows) {
    const favoriteSide: Outcome = r.favorite === r.teamA ? 'A' : 'B'
    if (r.actual === favoriteSide) favoriteWon++
    else if (r.actual === 'D') favoriteDrew++
    else favoriteLost++

    if (r.round === 'group') { groupTotal++; if (r.correct) groupCorrect++ }
    else { koTotal++; if (r.correct) koCorrect++ }
  }

  // Lopend gemiddelde Brier-score over het toernooi (chronologisch).
  let running = 0
  const cumulative: CumulativePoint[] = rows.map((r, i) => {
    running += r.brier
    return { matchId: r.matchId, label: `${r.teamA}–${r.teamB}`, brier: running / (i + 1) }
  })

  const { team, correct } = isChampionCorrect(rows)

  return {
    rows,
    brier,
    n,
    favoriteWon,
    favoriteDrew,
    favoriteLost,
    groupCorrect,
    groupTotal,
    koCorrect,
    koTotal,
    championTeam: team,
    championCorrect: correct,
    cumulative,
  }
}
