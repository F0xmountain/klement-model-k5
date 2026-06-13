import resultsRaw from './results.json'
import { SCHEDULE, canonTeam } from './wc26-schedule'

// Rustdagen per team, afgeleid uit lib/results.json. Elke opgeslagen uitslag krijgt
// een playedAt-datum (zie app/api/admin/results/route.ts); rustdagen = aantal dagen
// sinds de meest recente wedstrijd van het team t.o.v. nu.
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

const results = (resultsRaw as ResultsFile).results ?? {}

const DAY_MS = 1000 * 60 * 60 * 24

// Tijdstip (ms) van de laatste wedstrijd waarin dit team speelde, of undefined.
function lastPlayedAt(team: string): number | undefined {
  let latest: number | undefined
  for (const r of Object.values(results)) {
    if (r.teamA !== team && r.teamB !== team) continue
    if (!r.playedAt) continue
    const ts = Date.parse(r.playedAt)
    if (Number.isNaN(ts)) continue
    if (latest === undefined || ts > latest) latest = ts
  }
  return latest
}

// Aantal rustdagen sinds de laatste wedstrijd van het team. undefined als het team
// nog niet gespeeld heeft (dan geen penalty en geen waarschuwing).
export function getRestDays(team: string, asOf: number = Date.now()): number | undefined {
  const last = lastPlayedAt(team)
  if (last === undefined) return undefined
  return Math.max(0, Math.floor((asOf - last) / DAY_MS))
}

// Tijdstip van de meest recente uitslag-invoer (results.json meta), of null.
export function getResultsLastUpdated(): string | null {
  return (resultsRaw as ResultsFile).meta?.lastUpdated ?? null
}

// Rustdagen vóór een specifieke wedstrijd, op basis van het officiële
// lib/wc26-schedule.json (UTC-aftraptijden). Zoekt de vorige wedstrijd van het
// team (teams.json-naam) chronologisch vóór `matchId` en geeft het verschil in
// hele dagen. null als dit de eerste wedstrijd van het team is of matchId niet
// bestaat. Werkt alleen voor wedstrijden met bekende teams (groepsfase).
export function restDaysBefore(teamName: string, matchId: string): number | null {
  const target = SCHEDULE.find(m => m.matchId === matchId)
  if (!target) return null
  const targetTime = Date.parse(target.dateUtc)
  if (Number.isNaN(targetTime)) return null

  const isTeam = (m: typeof target) =>
    canonTeam(m.homeTeam) === teamName || canonTeam(m.awayTeam) === teamName

  let prevTime: number | undefined
  for (const m of SCHEDULE) {
    if (m.matchId === matchId || !isTeam(m)) continue
    const ts = Date.parse(m.dateUtc)
    if (Number.isNaN(ts) || ts >= targetTime) continue
    if (prevTime === undefined || ts > prevTime) prevTime = ts
  }
  if (prevTime === undefined) return null
  return Math.floor((targetTime - prevTime) / DAY_MS)
}
