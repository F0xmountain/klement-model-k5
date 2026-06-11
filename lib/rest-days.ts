import resultsRaw from './results.json'

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
