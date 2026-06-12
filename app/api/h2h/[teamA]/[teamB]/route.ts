import { NextResponse } from 'next/server'

export const revalidate = 86400 // 1 dag

const API_BASE = 'https://v3.football.api-sports.io'

// teams.json-naam → naam zoals API-Football die voor het nationale team gebruikt
// (zelfde aliassen als /api/form/[team])
const API_FOOTBALL_NAME_MAP: Record<string, string> = {
  'Bosnia-Herz': 'Bosnia and Herzegovina',
  'Congo DR': 'DR Congo',
  'Cape Verde': 'Cape Verde Islands',
}

interface ApiFootballTeamEntry {
  team: { id: number; name: string; national: boolean }
}

interface ApiFootballFixture {
  fixture: { date: string }
  league: { name: string }
  teams: {
    home: { id: number; name: string }
    away: { id: number; name: string }
  }
  goals: { home: number | null; away: number | null }
}

export interface H2HMatch {
  date: string
  homeTeam: string
  awayTeam: string
  homeScore: number
  awayScore: number
  competition: string
}

export interface H2HResult {
  matches: H2HMatch[]
  summary: { teamAWins: number; draws: number; teamBWins: number }
}

const EMPTY: H2HResult = { matches: [], summary: { teamAWins: 0, draws: 0, teamBWins: 0 } }

async function resolveTeamId(apiKey: string, team: string): Promise<number | null> {
  const query = API_FOOTBALL_NAME_MAP[team] ?? team
  const res = await fetch(`${API_BASE}/teams?name=${encodeURIComponent(query)}`, {
    headers: { 'x-apisports-key': apiKey },
    next: { revalidate: 60 * 60 * 24 * 30 }, // team-ids zijn statisch — 30 dagen
  })
  if (!res.ok) return null
  const data: { response: ApiFootballTeamEntry[] } = await res.json()
  return data.response.find(t => t.team.national)?.team.id ?? null
}

function buildResult(idA: number, fixtures: ApiFootballFixture[]): H2HResult {
  const played = fixtures.filter(f => f.goals.home !== null && f.goals.away !== null)
  const sorted = played.sort(
    (a, b) => new Date(b.fixture.date).getTime() - new Date(a.fixture.date).getTime()
  )

  let teamAWins = 0, draws = 0, teamBWins = 0
  const matches: H2HMatch[] = sorted.map(f => {
    const homeScore = f.goals.home ?? 0
    const awayScore = f.goals.away ?? 0
    const aIsHome = f.teams.home.id === idA
    const aScore = aIsHome ? homeScore : awayScore
    const bScore = aIsHome ? awayScore : homeScore
    if (aScore > bScore) teamAWins++
    else if (aScore < bScore) teamBWins++
    else draws++

    return {
      date: f.fixture.date,
      homeTeam: f.teams.home.name,
      awayTeam: f.teams.away.name,
      homeScore,
      awayScore,
      competition: f.league.name,
    }
  })

  return { matches, summary: { teamAWins, draws, teamBWins } }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ teamA: string; teamB: string }> }
) {
  const { teamA: rawA, teamB: rawB } = await params
  const teamA = decodeURIComponent(rawA)
  const teamB = decodeURIComponent(rawB)
  const apiKey = process.env.API_FOOTBALL_KEY

  if (apiKey) {
    try {
      const [idA, idB] = await Promise.all([
        resolveTeamId(apiKey, teamA),
        resolveTeamId(apiKey, teamB),
      ])
      if (idA && idB) {
        const res = await fetch(`${API_BASE}/fixtures/headtohead?h2h=${idA}-${idB}&last=10`, {
          headers: { 'x-apisports-key': apiKey },
          next: { revalidate },
        })
        if (res.ok) {
          const data: { response: ApiFootballFixture[] } = await res.json()
          return NextResponse.json(buildResult(idA, data.response))
        }
      }
    } catch {
      // val terug op lege uitslag
    }
  }

  return NextResponse.json(EMPTY)
}
