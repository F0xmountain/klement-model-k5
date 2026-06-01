// football-data.org free tier — used once group stage starts June 11 2026
// Docs: https://www.football-data.org/documentation/api

const BASE = 'https://api.football-data.org/v4'
const KEY = process.env.FOOTBALL_DATA_API_KEY ?? ''

// WC 2026 group stage starts June 11 2026
const TOURNAMENT_START = new Date('2026-06-11T00:00:00Z')

export function isTournamentLive(): boolean {
  return new Date() >= TOURNAMENT_START
}

export interface FDStandingEntry {
  team: { name: string; shortName: string; tla: string }
  position: number
  playedGames: number
  won: number
  draw: number
  lost: number
  points: number
  goalsFor: number
  goalsAgainst: number
}

export interface FDGroup {
  stage: string
  group: string
  table: FDStandingEntry[]
}

export async function fetchWCStandings(): Promise<FDGroup[] | null> {
  if (!isTournamentLive() || !KEY) return null

  try {
    const res = await fetch(`${BASE}/competitions/WC/standings`, {
      headers: { 'X-Auth-Token': KEY },
      next: { revalidate: 3600 }, // re-fetch every hour
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.standings as FDGroup[]
  } catch {
    return null
  }
}
