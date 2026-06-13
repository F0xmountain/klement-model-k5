import { SCHEDULE, canonTeam, type ScheduledMatch } from './wc26-schedule'
import { resultForPair, type PlayedResult } from './todays-matches'

// "Vandaag"-widget en LIVE-badge draaien op de officiële lib/wc26-schedule.json
// (UTC-aftraptijden + venue/hoogte). Groepswedstrijden hebben teams; KO-wedstrijden
// hebben nog slots (geen tegenstander) — die laten we hier weg tot ze ingevuld zijn.

export interface TodayScheduleMatch {
  matchId: string
  group?: string
  dateUtc: string
  venue: string
  city: string
  altitudeM: number
  home: string
  away: string
  played?: PlayedResult
}

// Een venster van ~2 uur na de aftrap waarin een wedstrijd zonder eindstand als
// "live" geldt.
const LIVE_WINDOW_MS = 2 * 60 * 60 * 1000

function toTodayMatch(m: ScheduledMatch): TodayScheduleMatch | null {
  const home = canonTeam(m.homeTeam)
  const away = canonTeam(m.awayTeam)
  if (!home || !away) return null
  return {
    matchId: m.matchId,
    group: m.group,
    dateUtc: m.dateUtc,
    venue: m.venue,
    city: m.city,
    altitudeM: m.altitudeM,
    home,
    away,
    played: resultForPair(home, away),
  }
}

// Wedstrijden waarvan de aftrap op de UTC-kalenderdag van `now` valt, chronologisch.
export function matchesOnUtcDay(now: Date): TodayScheduleMatch[] {
  const day = now.toISOString().slice(0, 10)
  return SCHEDULE
    .filter(m => m.dateUtc.slice(0, 10) === day)
    .map(toTodayMatch)
    .filter((m): m is TodayScheduleMatch => m !== null)
    .sort((a, b) => a.dateUtc.localeCompare(b.dateUtc))
}

// De eerstvolgende wedstrijd na `now` (met bekende teams), voor de fallback op
// dagen zonder wedstrijden.
export function nextMatchAfter(now: Date): TodayScheduleMatch | null {
  const t = now.getTime()
  const upcoming = SCHEDULE
    .filter(m => Date.parse(m.dateUtc) > t)
    .sort((a, b) => a.dateUtc.localeCompare(b.dateUtc))
  for (const m of upcoming) {
    const tm = toTodayMatch(m)
    if (tm) return tm
  }
  return null
}

// Een wedstrijd die nu bezig is: aftrap < LIVE_WINDOW_MS geleden en nog geen
// eindstand. null als er niets live is.
export function liveMatchNow(now: Date): TodayScheduleMatch | null {
  const t = now.getTime()
  for (const m of SCHEDULE) {
    const ko = Date.parse(m.dateUtc)
    if (Number.isNaN(ko) || t < ko || t > ko + LIVE_WINDOW_MS) continue
    const tm = toTodayMatch(m)
    if (tm && !tm.played) return tm
  }
  return null
}
