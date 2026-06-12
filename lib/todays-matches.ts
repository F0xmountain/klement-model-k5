import scheduleRaw from './schedule.json'
import resultsRaw from './results.json'
import { matchP } from './klement-custom'

// schedule.json is een deterministisch opgebouwd, plausibel groepsfase-schema —
// NIET de exacte officiële FIFA-fixturelijst (die hangt af van de officiële
// speeldata/stadions per wedstrijd). Vervang schedule.json door de officiële data
// zodra beschikbaar; de logica hieronder verandert dan niet.

export interface ScheduleMatch {
  matchId: string
  teamA: string
  teamB: string
  group: string
  date: string // "2026-06-12"
  kickoffUTC: string // "19:00"
  venue: string
}

interface ResultEntry {
  teamA: string
  teamB: string
  scoreA: number
  scoreB: number
}
interface ResultsFile {
  results?: Record<string, ResultEntry>
}

const schedule = scheduleRaw as ScheduleMatch[]
const results = (resultsRaw as ResultsFile).results ?? {}

const pairKey = (a: string, b: string) => [a, b].sort().join('|')

export interface TodayMatch extends ScheduleMatch {
  result?: { scoreA: number; scoreB: number }
  prediction: { pA: number; dr: number; pB: number }
}

// Wedstrijden van vandaag (UTC-datum van `now`), elk met de werkelijke uitslag
// (indien in results.json) en altijd de modelvoorspelling.
export function getTodaysMatches(now: Date): TodayMatch[] {
  const todayUTC = now.toISOString().slice(0, 10)

  const byPair = new Map<string, ResultEntry>()
  for (const r of Object.values(results)) byPair.set(pairKey(r.teamA, r.teamB), r)

  return schedule
    .filter(m => m.date === todayUTC)
    .map(m => {
      const r = byPair.get(pairKey(m.teamA, m.teamB))
      const result = r
        ? r.teamA === m.teamA
          ? { scoreA: r.scoreA, scoreB: r.scoreB }
          : { scoreA: r.scoreB, scoreB: r.scoreA }
        : undefined
      const { pA, dr, pB } = matchP(m.teamA, m.teamB)
      return { ...m, result, prediction: { pA, dr, pB } }
    })
}
