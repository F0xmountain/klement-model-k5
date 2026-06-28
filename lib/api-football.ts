// API-Football (api-sports.io) app-side client. World Cup is league 1; the
// season defaults to 2026. Gated on API_FOOTBALL_KEY. The event-driven refit
// uses the Node client in scripts/model/live.js; this typed client is available
// for any server-side page that wants live data directly.

const HOST = 'https://v3.football.api-sports.io'
const KEY = process.env.API_FOOTBALL_KEY ?? ''
const LEAGUE = process.env.API_FOOTBALL_LEAGUE ?? '1'
const SEASON = process.env.API_FOOTBALL_SEASON ?? '2026'

const TOURNAMENT_START = new Date('2026-06-11T00:00:00Z')

export function isTournamentLive(): boolean {
  return new Date() >= TOURNAMENT_START
}

async function afGet<T>(pathPart: string): Promise<T | null> {
  if (!KEY) return null
  try {
    const res = await fetch(`${HOST}${pathPart}`, {
      headers: { 'x-apisports-key': KEY },
      next: { revalidate: 3600 },
    })
    if (!res.ok) return null
    const data = (await res.json()) as { errors?: unknown; response?: T }
    const errs = data.errors
    if (errs && !Array.isArray(errs) && Object.keys(errs as object).length) return null
    return (data.response ?? null) as T | null
  } catch {
    return null
  }
}

export interface AFFixture {
  fixture: { id: number; date: string; status: { short: string } }
  teams: { home: { name: string }; away: { name: string } }
  goals: { home: number | null; away: number | null }
}

export interface AFScorer {
  player: { name: string }
  statistics: { team: { name: string }; goals: { total: number | null } }[]
}

export async function fetchWCFixtures(): Promise<AFFixture[] | null> {
  return afGet<AFFixture[]>(`/fixtures?league=${LEAGUE}&season=${SEASON}`)
}

export async function fetchWCScorers(): Promise<AFScorer[] | null> {
  return afGet<AFScorer[]>(`/players/topscorers?league=${LEAGUE}&season=${SEASON}`)
}
