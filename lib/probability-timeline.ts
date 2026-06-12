import resultsRaw from './results.json'
import eloHistoryRaw from './elo-history.json'
import { simulateTournament } from './simulate-tournament'
import type { EloMap } from './klement-custom'

// Kampioenskans-tijdlijn: voor elke gespeelde wedstrijd (uit results.json) wordt
// de Elo-stand tot dat punt herberekend en het hele toernooi opnieuw gesimuleerd,
// zodat je ziet hoe de kampioenskansen evolueren naarmate er wordt gespeeld.

const SIM_N = 500
const ELO_K = 32
const ELO_DEFAULT = 1500
const TOP_TEAMS = 12

interface ResultEntry {
  teamA: string
  teamB: string
  scoreA: number
  scoreB: number
  playedAt?: string
}
interface ResultsFile {
  meta?: { lastUpdated?: string | null }
  results?: Record<string, ResultEntry>
}

const eloHistory = eloHistoryRaw as Array<Record<string, string | number>>

export interface ProbabilitySnapshot {
  timestamp: string
  matchLabel: string
  snapshots: Record<string, number> // team → kampioenskans (0-1)
}

// Meest recente numerieke Elo voor een team uit elo-history.json
function historicalElo(name: string): number | undefined {
  for (let i = eloHistory.length - 1; i >= 0; i--) {
    const v = eloHistory[i][name]
    if (typeof v === 'number') return v
  }
  return undefined
}

// Elo na de eerste `count` uitslagen (zelfde K-factor-logica als de admin-route),
// elo-history als startwaarde.
function eloAfter(results: ResultEntry[], count: number): EloMap {
  const elo: EloMap = {}
  for (let k = 0; k < count; k++) {
    const { teamA, teamB, scoreA, scoreB } = results[k]
    const eloA = elo[teamA] ?? historicalElo(teamA) ?? ELO_DEFAULT
    const eloB = elo[teamB] ?? historicalElo(teamB) ?? ELO_DEFAULT
    const expA = 1 / (1 + 10 ** ((eloB - eloA) / 400))
    const actA = scoreA > scoreB ? 1 : scoreA < scoreB ? 0 : 0.5
    elo[teamA] = eloA + ELO_K * (actA - expA)
    elo[teamB] = eloB + ELO_K * ((1 - actA) - (1 - expA))
  }
  return elo
}

function championProbs(eloOverride: EloMap): Record<string, number> {
  const sim = simulateTournament(SIM_N, eloOverride)
  const out: Record<string, number> = {}
  for (const [team, count] of Object.entries(sim.champion)) out[team] = count / sim.n
  return out
}

const ABBR = (name: string) => name.slice(0, 3).toUpperCase()
const roundPrefix = (n: number) => (n <= 72 ? 'GRP' : n <= 88 ? 'R32' : n <= 96 ? 'R16' : n <= 100 ? 'QF' : n <= 102 ? 'SF' : 'F')

// Herbouwt de volledige tijdlijn from scratch uit results.json. Eén snapshot per
// gespeelde wedstrijd, met de Elo-stand t/m die wedstrijd. Alleen de top-12 teams
// (op de meest recente kampioenskans) worden bijgehouden, zodat alle snapshots
// dezelfde teams bevatten.
export function buildSnapshots(): ProbabilitySnapshot[] {
  const file = resultsRaw as ResultsFile
  const results = Object.values(file.results ?? {})
  if (results.length === 0) return []

  // Top-12 bepalen uit de eindstand (alle uitslagen toegepast)
  const latest = championProbs(eloAfter(results, results.length))
  const topTeams = Object.entries(latest)
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_TEAMS)
    .map(([team]) => team)

  const snapshots: ProbabilitySnapshot[] = []
  for (let k = 1; k <= results.length; k++) {
    const probs = championProbs(eloAfter(results, k))
    const r = results[k - 1]
    const picked: Record<string, number> = {}
    for (const team of topTeams) picked[team] = probs[team] ?? 0
    snapshots.push({
      timestamp: r.playedAt ?? '',
      matchLabel: `${roundPrefix(k)}: ${ABBR(r.teamA)} vs ${ABBR(r.teamB)}`,
      snapshots: picked,
    })
  }
  return snapshots
}
