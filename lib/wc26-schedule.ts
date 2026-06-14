import scheduleRaw from './wc26-schedule.json'
import stadiumsRaw from './stadiums.json'
import type { ScheduledMatch, ScheduleRound } from './types/schedule'

export type { ScheduledMatch, ScheduleRound }

// wc26-schedule.json gebruikt de officiële FIFA-spelling, die voor enkele landen
// afwijkt van teams.json. Normaliseer naar de teams.json-naam zodat lookups op
// Engelse teamnaam werken.
const WC26_NAME_MAP: Record<string, string> = {
  'Korea Republic': 'South Korea',
  'Bosnia and Herzegovina': 'Bosnia-Herz',
  'Türkiye': 'Turkey',
  'Curaçao': 'Curacao',
  "Côte d'Ivoire": 'Ivory Coast',
  'Cabo Verde': 'Cape Verde',
  'IR Iran': 'Iran',
}
export function canonTeam(name: string | undefined): string | undefined {
  if (!name) return undefined
  return WC26_NAME_MAP[name] ?? name
}

export const SCHEDULE = scheduleRaw as ScheduledMatch[]

interface Stadium {
  stadium: string
  fifaName: string
  altitude_m: number
}
const STADIUMS = stadiumsRaw as Stadium[]

// Hoogte (m) van een venue uit lib/stadiums.json. De venue-naam uit het schedule
// is de stadionnaam (met fifaName als fallback). Undefined als het venue niet in
// stadiums.json staat — de UI toont dan geen hoogte.
export function venueAltitude(venue: string | undefined): number | undefined {
  if (!venue) return undefined
  return STADIUMS.find(s => s.stadium === venue || s.fifaName === venue)?.altitude_m
}

export function matchById(matchId: string): ScheduledMatch | undefined {
  return SCHEDULE.find(m => m.matchId === matchId)
}

// Alle groepswedstrijden van een team (teams.json-naam), chronologisch.
export function teamGroupMatches(englishName: string): ScheduledMatch[] {
  return SCHEDULE
    .filter(m => m.round === 'group' && (canonTeam(m.homeTeam) === englishName || canonTeam(m.awayTeam) === englishName))
    .sort((a, b) => a.dateUtc.localeCompare(b.dateUtc))
}

// Groepswedstrijd tussen twee teams (teams.json-namen), ongeacht thuis/uit.
export function groupMatchByTeams(a: string, b: string): ScheduledMatch | undefined {
  return SCHEDULE.find(m => {
    if (m.round !== 'group') return false
    const h = canonTeam(m.homeTeam), w = canonTeam(m.awayTeam)
    return (h === a && w === b) || (h === b && w === a)
  })
}

// KO-wedstrijden van een ronde, op FIFA-wedstrijdnummer.
export function roundMatches(round: ScheduleRound): ScheduledMatch[] {
  return SCHEDULE.filter(m => m.round === round).sort((a, b) => (a.matchNum ?? 0) - (b.matchNum ?? 0))
}
