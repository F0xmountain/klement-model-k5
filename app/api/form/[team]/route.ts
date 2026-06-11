import { NextResponse } from 'next/server'
import teamsRaw from '@/lib/teams.json'
import formCacheRaw from '@/lib/form-cache.json'
import type { TeamData } from '@/types'

export const revalidate = 86400 // 1 dag

const API_BASE = 'https://v3.football.api-sports.io'
const FORM_MAX = 30
const TOP_TIER_BONUS = 1.5
const TOP_TIER_COUNT = 10

const td = teamsRaw as Record<string, TeamData>

// Top-10 landen op basis van teams.json's FIFA-punten — een overwinning hierop
// telt 1.5x mee in het vormcijfer
const TOP_TIER_TEAMS = new Set(
  Object.entries(td)
    .sort(([, a], [, b]) => b.fifa - a.fifa)
    .slice(0, TOP_TIER_COUNT)
    .map(([name]) => name)
)

// teams.json-naam → naam zoals API-Football die voor het nationale team gebruikt
// (alleen voor landen waar de naamgeving afwijkt). Voeg hier aliassen toe als
// de live API een team niet vindt.
const API_FOOTBALL_NAME_MAP: Record<string, string> = {
  'Bosnia-Herz': 'Bosnia and Herzegovina',
  'Congo DR': 'DR Congo',
  'Cape Verde': 'Cape Verde Islands',
}

// Omgekeerde mapping — om tegenstandernamen uit API-Football terug te herleiden
// naar teams.json-sleutels voor de TOP_TIER_TEAMS check
const TEAMS_NAME_FROM_API_FOOTBALL: Record<string, string> = Object.fromEntries(
  Object.entries(API_FOOTBALL_NAME_MAP).map(([teamsName, apiName]) => [apiName, teamsName])
)

interface ApiFootballTeamEntry {
  team: { id: number; name: string; national: boolean }
}

interface ApiFootballFixture {
  fixture: { date: string }
  teams: {
    home: { id: number; name: string }
    away: { id: number; name: string }
  }
  goals: { home: number | null; away: number | null }
}

export interface FormResultEntry {
  date: string
  opponent: string
  score: string
  result: 'W' | 'D' | 'L'
  weight: number
}

export interface TeamForm {
  team: string
  formScore: number | null
  max: number
  results: FormResultEntry[]
}

// Zoekt het API-Football team-id op via /teams?name=. Filtert op national:true
// om het nationale elftal te krijgen i.p.v. een clubteam met vergelijkbare naam.
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

// Vormcijfer: win=3pt, gelijk=1pt, verlies=0pt, gewogen naar recentheid
// (meest recent = 1.0, oudste = 0.5, lineair) en tegenstandersterkte
// (winst tegen top-10 FIFA-land telt 1.5x).
function calcForm(team: string, teamId: number, fixtures: ApiFootballFixture[]): TeamForm {
  const sorted = [...fixtures].sort(
    (a, b) => new Date(b.fixture.date).getTime() - new Date(a.fixture.date).getTime()
  )

  const n = sorted.length
  let formScore = 0

  const results: FormResultEntry[] = sorted.map((f, i) => {
    const isHome = f.teams.home.id === teamId
    const goalsFor = (isHome ? f.goals.home : f.goals.away) ?? 0
    const goalsAgainst = (isHome ? f.goals.away : f.goals.home) ?? 0
    const opponentRaw = isHome ? f.teams.away.name : f.teams.home.name
    const opponent = TEAMS_NAME_FROM_API_FOOTBALL[opponentRaw] ?? opponentRaw

    const result: 'W' | 'D' | 'L' =
      goalsFor > goalsAgainst ? 'W' : goalsFor < goalsAgainst ? 'L' : 'D'

    const weight = n === 1 ? 1 : 1 - (i / (n - 1)) * 0.5

    const basePoints = result === 'W' ? 3 : result === 'D' ? 1 : 0
    const points = result === 'W' && TOP_TIER_TEAMS.has(opponent) ? basePoints * TOP_TIER_BONUS : basePoints
    formScore += points * weight

    return {
      date: f.fixture.date,
      opponent,
      score: `${goalsFor}-${goalsAgainst}`,
      result,
      weight: Math.round(weight * 100) / 100,
    }
  })

  return { team, formScore: Math.round(formScore * 100) / 100, max: FORM_MAX, results }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ team: string }> }
) {
  const { team: teamParam } = await params
  const team = decodeURIComponent(teamParam)
  const apiKey = process.env.API_FOOTBALL_KEY

  if (apiKey) {
    try {
      const teamId = await resolveTeamId(apiKey, team)
      if (teamId) {
        const res = await fetch(`${API_BASE}/fixtures?team=${teamId}&last=10`, {
          headers: { 'x-apisports-key': apiKey },
          next: { revalidate },
        })
        if (res.ok) {
          const data: { response: ApiFootballFixture[] } = await res.json()
          if (data.response.length > 0) {
            return NextResponse.json(calcForm(team, teamId, data.response))
          }
        }
      }
    } catch {
      // val terug op form-cache.json
    }
  }

  const formCache = formCacheRaw as Record<string, TeamForm>
  const cached = formCache[team]
  if (cached) return NextResponse.json(cached)

  return NextResponse.json({ team, formScore: null, max: FORM_MAX, results: [] })
}
