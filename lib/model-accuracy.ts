import resultsRaw from './results.json'
import eloHistoryRaw from './elo-history.json'
import { matchP, type EloMap } from './klement-custom'
import { canonTeam } from './wc26-schedule'

// Modelnauwkeurigheid: per gespeelde wedstrijd de modelvoorspelling (met de Elo-
// stand VÓÓR die wedstrijd, dus zonder data-lek) versus de werkelijke uitslag.

const ELO_K = 32
const ELO_DEFAULT = 1500
const eloHistory = eloHistoryRaw as Array<Record<string, string | number>>

interface ResultEntry {
  teamA: string
  teamB: string
  scoreA: number
  scoreB: number
  playedAt?: string
}
interface ResultsFile {
  results?: Record<string, ResultEntry>
}

type Outcome = 'A' | 'D' | 'B'

function historicalElo(name: string): number | undefined {
  for (let i = eloHistory.length - 1; i >= 0; i--) {
    const v = eloHistory[i]![name]
    if (typeof v === 'number') return v
  }
  return undefined
}

// Elo na de eerste `count` uitslagen (start = elo-history), zelfde K-factor als de
// admin-route. eloAfter(results, k) = de stand VÓÓR wedstrijd k.
function eloAfter(results: ResultEntry[], count: number): EloMap {
  const elo: EloMap = {}
  for (let i = 0; i < count; i++) {
    const { teamA, teamB, scoreA, scoreB } = results[i]!
    const eloA = elo[teamA] ?? historicalElo(teamA) ?? ELO_DEFAULT
    const eloB = elo[teamB] ?? historicalElo(teamB) ?? ELO_DEFAULT
    const expA = 1 / (1 + 10 ** ((eloB - eloA) / 400))
    const actA = scoreA > scoreB ? 1 : scoreA < scoreB ? 0 : 0.5
    elo[teamA] = eloA + ELO_K * (actA - expA)
    elo[teamB] = eloB + ELO_K * ((1 - actA) - (1 - expA))
  }
  return elo
}

function actualOutcome(scoreA: number, scoreB: number): Outcome {
  return scoreA > scoreB ? 'A' : scoreA < scoreB ? 'B' : 'D'
}

export interface AccuracyRow {
  teamA: string
  teamB: string
  modelPick: Outcome
  modelPickLabel: string
  actual: Outcome
  actualLabel: string
  score: string
  correct: boolean
  confidence: number
}

export interface ModelAccuracy {
  rows: AccuracyRow[]
  correct: number
  total: number
  brier: number | null // null tot er > 5 resultaten zijn
}

const BRIER_MIN_RESULTS = 5

export function getModelAccuracy(): ModelAccuracy {
  const file = resultsRaw as ResultsFile
  const results = Object.values(file.results ?? {})
  // Normaliseer teamnamen naar de teams.json-spelling (bv. "Bosnia and
  // Herzegovina" → "Bosnia-Herz") zodat matchP en de Elo-lookup het team
  // herkennen; zonder dit kreeg een onbekend team sc()=0 en dus een foutieve
  // (veel te lage) sterkte. Labels blijven de originele namen uit results.json.
  const canonResults: ResultEntry[] = results.map(r => ({
    teamA: canonTeam(r.teamA) ?? r.teamA,
    teamB: canonTeam(r.teamB) ?? r.teamB,
    scoreA: r.scoreA,
    scoreB: r.scoreB,
    playedAt: r.playedAt,
  }))

  const rows: AccuracyRow[] = []
  let correctCount = 0
  let brierSum = 0
  const OUTCOMES: Outcome[] = ['A', 'D', 'B']

  results.forEach((r, k) => {
    const elo = eloAfter(canonResults, k) // stand vóór deze wedstrijd
    const cr = canonResults[k]!
    const { pA, dr, pB } = matchP(cr.teamA, cr.teamB, undefined, undefined, undefined, elo)
    const probs: Record<Outcome, number> = { A: pA, D: dr, B: pB }

    const modelPick = OUTCOMES.reduce((best, o) => (probs[o] > probs[best] ? o : best), 'A' as Outcome)
    const actual = actualOutcome(r.scoreA, r.scoreB)
    const correct = modelPick === actual
    if (correct) correctCount++

    brierSum += OUTCOMES.reduce((s, o) => s + (probs[o] - (o === actual ? 1 : 0)) ** 2, 0)

    const label = (o: Outcome) => (o === 'D' ? 'Draw' : o === 'A' ? r.teamA : r.teamB)
    rows.push({
      teamA: r.teamA,
      teamB: r.teamB,
      modelPick,
      modelPickLabel: label(modelPick),
      actual,
      actualLabel: label(actual),
      score: `${r.scoreA}–${r.scoreB}`,
      correct,
      confidence: probs[modelPick],
    })
  })

  return {
    rows,
    correct: correctCount,
    total: results.length,
    brier: results.length > BRIER_MIN_RESULTS ? brierSum / results.length : null,
  }
}

// ── Handmatige voorspellings-log: log loss + Brier score ─────────────────────
// Proper scoring rules voor probabilistische W/D/L-voorspellingen (Brier 1950,
// Gneiting & Raftery 2007). Anders dan getModelAccuracy hierboven (die telkens
// herberekent uit results.json) werkt dit op een persistente snapshot-log van
// voorspellingen zoals ze op het moment van voorspellen waren.

export interface MatchPrediction {
  matchId: string
  homeTeam: string
  awayTeam: string
  matchDate: string
  predictedHome: number // P(thuiswinst) op moment van voorspelling
  predictedDraw: number
  predictedAway: number // P(uitwinst)
  actualHome: number // werkelijke goals thuis
  actualAway: number // werkelijke goals uit
}

export type PredOutcome = 'home' | 'draw' | 'away'

export interface MatchResult extends MatchPrediction {
  actualOutcome: PredOutcome
  logLoss: number
  brierScore: number
  correct: boolean // was het meest waarschijnlijke voorspelde resultaat correct?
}

export interface AccuracySummary {
  results: MatchResult[]
  meanLogLoss: number // lager = beter, baseline = 1.099
  meanBrierScore: number // lager = beter, baseline = 0.667
  accuracy: number // fractie correct voorspeld
  n: number
}

// Baseline van een random 33/33/33-model — referentielijn in de UI.
export const BASELINE_LOG_LOSS = 1.0986 // −ln(1/3)
export const BASELINE_BRIER = 0.6667 // 2 × (1/3)² + (2/3)²

// Voorkomt log(0) als een voorspelling het werkelijke resultaat 0% kans gaf.
const LOGLOSS_EPS = 1e-15

function predOutcomeOf(actualHome: number, actualAway: number): PredOutcome {
  if (actualHome > actualAway) return 'home'
  if (actualHome < actualAway) return 'away'
  return 'draw'
}

function probForOutcome(p: MatchPrediction, o: PredOutcome): number {
  return o === 'home' ? p.predictedHome : o === 'away' ? p.predictedAway : p.predictedDraw
}

export function calcLogLoss(pred: MatchPrediction): number {
  const o = predOutcomeOf(pred.actualHome, pred.actualAway)
  // + 0 normaliseert −0 (bij p=1) naar +0.
  return -Math.log(Math.max(probForOutcome(pred, o), LOGLOSS_EPS)) + 0
}

export function calcBrierScore(pred: MatchPrediction): number {
  const o = predOutcomeOf(pred.actualHome, pred.actualAway)
  return (
    (pred.predictedHome - (o === 'home' ? 1 : 0)) ** 2 +
    (pred.predictedDraw - (o === 'draw' ? 1 : 0)) ** 2 +
    (pred.predictedAway - (o === 'away' ? 1 : 0)) ** 2
  )
}

// Meest waarschijnlijke voorspelde resultaat.
function modelPickOutcome(p: MatchPrediction): PredOutcome {
  const max = Math.max(p.predictedHome, p.predictedDraw, p.predictedAway)
  return p.predictedHome === max ? 'home' : p.predictedDraw === max ? 'draw' : 'away'
}

export function evaluateAll(predictions: MatchPrediction[]): AccuracySummary {
  const results: MatchResult[] = predictions.map(p => {
    const actualOutcome = predOutcomeOf(p.actualHome, p.actualAway)
    return {
      ...p,
      actualOutcome,
      logLoss: calcLogLoss(p),
      brierScore: calcBrierScore(p),
      correct: modelPickOutcome(p) === actualOutcome,
    }
  })
  const n = results.length
  return {
    results,
    meanLogLoss: n ? results.reduce((s, r) => s + r.logLoss, 0) / n : 0,
    meanBrierScore: n ? results.reduce((s, r) => s + r.brierScore, 0) / n : 0,
    accuracy: n ? results.filter(r => r.correct).length / n : 0,
    n,
  }
}

// Pre-fill voor het admin-formulier: voor elke gespeelde wedstrijd de
// modelvoorspelling met de Elo-stand VÓÓR die wedstrijd (geen data-lek) plus de
// werkelijke uitslag. Teamnamen worden genormaliseerd naar teams.json.
export function predictionsFromResults(): MatchPrediction[] {
  const file = resultsRaw as ResultsFile
  const entries = Object.entries(file.results ?? {})
  const canonResults: ResultEntry[] = entries.map(([, r]) => ({
    teamA: canonTeam(r.teamA) ?? r.teamA,
    teamB: canonTeam(r.teamB) ?? r.teamB,
    scoreA: r.scoreA,
    scoreB: r.scoreB,
    playedAt: r.playedAt,
  }))
  return entries.map(([matchId, r], k) => {
    const elo = eloAfter(canonResults, k) // stand vóór deze wedstrijd
    const cr = canonResults[k]!
    const { pA, dr, pB } = matchP(cr.teamA, cr.teamB, undefined, undefined, undefined, elo)
    return {
      matchId,
      homeTeam: r.teamA,
      awayTeam: r.teamB,
      matchDate: r.playedAt ?? '',
      predictedHome: pA,
      predictedDraw: dr,
      predictedAway: pB,
      actualHome: r.scoreA,
      actualAway: r.scoreB,
    }
  })
}
