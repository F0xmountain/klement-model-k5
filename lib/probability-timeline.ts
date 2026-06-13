import resultsRaw from './results.json'
import eloHistoryRaw from './elo-history.json'
import { simulateTournament } from './simulate-tournament'
import type { EloMap } from './klement-custom'
import { teamNames } from './klement'

// Kampioenskans-tijdlijn: voor elke gespeelde wedstrijd (uit results.json) wordt
// de Elo-stand tot dat punt herberekend en het hele toernooi opnieuw gesimuleerd,
// zodat je ziet hoe de kampioenskansen evolueren naarmate er wordt gespeeld.

const SIM_N = 2000
const ELO_K = 32
const ELO_DEFAULT = 1500
const TOP_TEAMS = 16

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
    const v = eloHistory[i]![name]
    if (typeof v === 'number') return v
  }
  return undefined
}

// Elo na de eerste `count` uitslagen (zelfde K-factor-logica als de admin-route),
// elo-history als startwaarde. De map wordt VOORAF gevuld met de historische Elo
// van ALLE teams, zodat de teruggegeven override compleet is. Cruciaal: anders
// valt matchP voor niet-gespeelde teams terug op latestElo() → elo-current.json,
// dat door de workflow al met álle uitslagen is bijgewerkt. Dan zou de "before"-
// baseline geen echte pre-toernooistand zijn en zou de impact van een wedstrijd
// wegvallen. Met een complete history-gebaseerde map zijn baseline en elke
// snapshot consistent.
function eloAfter(results: ResultEntry[], count: number): EloMap {
  const elo: EloMap = {}
  for (const name of teamNames()) {
    const h = historicalElo(name)
    if (h !== undefined) elo[name] = h
  }
  for (let k = 0; k < count; k++) {
    const { teamA, teamB, scoreA, scoreB } = results[k]!
    const eloA = elo[teamA] ?? historicalElo(teamA) ?? ELO_DEFAULT
    const eloB = elo[teamB] ?? historicalElo(teamB) ?? ELO_DEFAULT
    const expA = 1 / (1 + 10 ** ((eloB - eloA) / 400))
    const actA = scoreA > scoreB ? 1 : scoreA < scoreB ? 0 : 0.5
    elo[teamA] = eloA + ELO_K * (actA - expA)
    elo[teamB] = eloB + ELO_K * ((1 - actA) - (1 - expA))
  }
  return elo
}

// Vaste seed → "common random numbers". Elke snapshot (de baseline + na elke
// wedstrijd) draait simulateTournament met DEZELFDE seed, zodat per wedstrijdslot
// identieke trekkingen worden gebruikt. Het verschil tussen twee snapshots komt
// dan alleen uit de Elo-update van die ene wedstrijd — niet uit Monte-Carlo-ruis.
// Daardoor beweegt een team uit een andere groep ~0% na een groep A-wedstrijd,
// i.p.v. een schijnbeweging van enkele procenten.
const SIM_SEED = 0x5f3759df

function championProbs(eloOverride: EloMap): Record<string, number> {
  const sim = simulateTournament(SIM_N, eloOverride, SIM_SEED)
  const out: Record<string, number> = {}
  for (const [team, count] of Object.entries(sim.champion)) out[team] = count / sim.n
  return out
}

const ABBR = (name: string) => name.slice(0, 3).toUpperCase()
const roundPrefix = (n: number) => (n <= 72 ? 'GRP' : n <= 88 ? 'R32' : n <= 96 ? 'R16' : n <= 100 ? 'QF' : n <= 102 ? 'SF' : 'F')

// De eerste snapshot is de PRE-toernooi-baseline (vóór wedstrijd 1). Herkenbaar
// aan de lege matchLabel; consumenten die alleen gespeelde wedstrijden willen
// (zoals de /stats-tijdlijn) filteren deze eruit. De impact-tracker gebruikt hem
// als "before" van de eerste wedstrijd.
export const BASELINE_LABEL = ''

// Herbouwt de volledige tijdlijn from scratch uit results.json: een baseline-
// snapshot gevolgd door één snapshot per gespeelde wedstrijd (Elo-stand t/m die
// wedstrijd). Alleen de top-N teams (op de meest recente kampioenskans) worden
// bijgehouden, zodat alle snapshots dezelfde teams bevatten.
export function buildSnapshots(): ProbabilitySnapshot[] {
  const file = resultsRaw as ResultsFile
  const results = Object.values(file.results ?? {})
  if (results.length === 0) return []

  // Top-N bepalen uit de eindstand (alle uitslagen toegepast)
  const latest = championProbs(eloAfter(results, results.length))
  const topTeams = Object.entries(latest)
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_TEAMS)
    .map(([team]) => team)

  const pick = (probs: Record<string, number>): Record<string, number> => {
    const out: Record<string, number> = {}
    for (const team of topTeams) out[team] = probs[team] ?? 0
    return out
  }

  // Baseline (k = 0): kansen vóór de eerste wedstrijd.
  const snapshots: ProbabilitySnapshot[] = [{
    timestamp: '',
    matchLabel: BASELINE_LABEL,
    snapshots: pick(championProbs(eloAfter(results, 0))),
  }]

  for (let k = 1; k <= results.length; k++) {
    const r = results[k - 1]!
    snapshots.push({
      timestamp: r.playedAt ?? '',
      matchLabel: `${roundPrefix(k)}: ${ABBR(r.teamA)} vs ${ABBR(r.teamB)}`,
      snapshots: pick(championProbs(eloAfter(results, k))),
    })
  }
  return snapshots
}
