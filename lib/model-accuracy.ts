import resultsRaw from './results.json'
import eloHistoryRaw from './elo-history.json'
import { matchP, type EloMap } from './klement-custom'

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

  const rows: AccuracyRow[] = []
  let correctCount = 0
  let brierSum = 0
  const OUTCOMES: Outcome[] = ['A', 'D', 'B']

  results.forEach((r, k) => {
    const elo = eloAfter(results, k) // stand vóór deze wedstrijd
    const { pA, dr, pB } = matchP(r.teamA, r.teamB, undefined, undefined, undefined, elo)
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
