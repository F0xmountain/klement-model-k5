import scheduleRaw from './schedule.json'
import resultsRaw from './results.json'
import { matchP } from './klement-custom'
import type { WDL } from '../types'

// schedule.json is een deterministisch opgebouwd, plausibel groepsfase-schema —
// NIET de exacte officiële FIFA-fixturelijst (die hangt af van de officiële
// speeldata/stadions per wedstrijd). Vervang schedule.json door de officiële data
// zodra beschikbaar; de logica hieronder verandert dan niet.

export interface ScheduleMatch {
  matchId: string
  teamA: string
  teamB: string
  group: string
  date: string // "2026-06-12"
  kickoffUTC: string // "19:00"
  venue: string
}

interface ResultEntry {
  teamA: string
  teamB: string
  scoreA: number
  scoreB: number
}
interface ResultsFile {
  results?: Record<string, ResultEntry>
}

const schedule = scheduleRaw as ScheduleMatch[]
const results = (resultsRaw as ResultsFile).results ?? {}

// De officiële FIFA-schedule gebruikt voor 4 landen een andere spelling dan
// teams.json; normaliseer naar de teams.json-sleutel zodat matchP/teamData (en dus
// de vlag en voorspelling) kloppen.
const SCHEDULE_NAME_MAP: Record<string, string> = {
  'Bosnia and Herzegovina': 'Bosnia-Herz',
  'Curaçao': 'Curacao',
  'Cape Verde Islands': 'Cape Verde',
  'DR Congo': 'Congo DR',
}
const canon = (name: string) => SCHEDULE_NAME_MAP[name] ?? name

const pairKey = (a: string, b: string) => [a, b].sort().join('|')

// Speellocatie ("Estadio Azteca, Mexico City") voor een teampaar (teams.json-namen),
// uit schedule.json. Gebruikt om groepswedstrijden naar /versus te koppelen.
const venueByPair = new Map<string, string>()
for (const m of scheduleRaw as ScheduleMatch[]) {
  venueByPair.set(pairKey(canon(m.teamA), canon(m.teamB)), m.venue)
}
export function venueForPair(a: string, b: string): string | undefined {
  return venueByPair.get(pairKey(a, b))
}

// Definitieve uitslag van een gespeelde wedstrijd (uit results.json), georiënteerd
// op het meegegeven teampaar (teams.json-namen). result is de W/D/L-uitkomst t.o.v.
// team a. Undefined als de wedstrijd nog niet gespeeld is.
export interface PlayedResult {
  scoreA: number
  scoreB: number
  result: WDL
}
const resultByPair = new Map<string, ResultEntry>()
for (const r of Object.values(results)) {
  resultByPair.set(pairKey(canon(r.teamA), canon(r.teamB)), r)
}
export function resultForPair(a: string, b: string): PlayedResult | undefined {
  const r = resultByPair.get(pairKey(a, b))
  if (!r) return undefined
  const aligned = canon(r.teamA) === a
  const scoreA = aligned ? r.scoreA : r.scoreB
  const scoreB = aligned ? r.scoreB : r.scoreA
  const result: WDL = scoreA > scoreB ? 'A' : scoreA < scoreB ? 'B' : 'D'
  return { scoreA, scoreB, result }
}

export interface TodayMatch extends ScheduleMatch {
  result?: { scoreA: number; scoreB: number }
  prediction: { pA: number; dr: number; pB: number }
}

const DAY_MS = 24 * 60 * 60 * 1000

// Kalenderdatum in de LOKALE tijdzone van de runtime (in de client = de tijdzone
// van de kijker), als "YYYY-MM-DD".
function localDateStr(d: Date): string {
  const y = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const da = String(d.getDate()).padStart(2, '0')
  return `${y}-${mo}-${da}`
}

// Het exacte aftrap-moment (UTC-instant) van een wedstrijd.
function kickoffInstant(m: ScheduleMatch): Date {
  return new Date(`${m.date}T${m.kickoffUTC}:00Z`)
}

function buildMatch(m: ScheduleMatch, byPair: Map<string, ResultEntry>): TodayMatch {
  const teamA = canon(m.teamA)
  const teamB = canon(m.teamB)
  const r = byPair.get(pairKey(teamA, teamB))
  const result = r
    ? r.teamA === teamA
      ? { scoreA: r.scoreA, scoreB: r.scoreB }
      : { scoreA: r.scoreB, scoreB: r.scoreA }
    : undefined
  const { pA, dr, pB } = matchP(teamA, teamB)
  return { ...m, teamA, teamB, result, prediction: { pA, dr, pB } }
}

// Wedstrijden waarvan de aftrap (UTC) binnen de lokale kalenderdag `localDate`
// valt (00:00–23:59 lokale tijd), gesorteerd op aftraptijd.
function matchesForLocalDate(localDate: string): TodayMatch[] {
  const byPair = new Map<string, ResultEntry>()
  for (const r of Object.values(results)) byPair.set(pairKey(r.teamA, r.teamB), r)

  return schedule
    .filter(m => localDateStr(kickoffInstant(m)) === localDate)
    .sort((a, b) => kickoffInstant(a).getTime() - kickoffInstant(b).getTime())
    .map(m => buildMatch(m, byPair))
}

// Wedstrijden "vandaag" volgens de LOKALE kalenderdag van de kijker (niet UTC).
export function getTodaysMatches(now: Date): TodayMatch[] {
  return matchesForLocalDate(localDateStr(now))
}

// Wedstrijden van de volgende lokale dag — voor de fallback op rustige dagen.
export function getTomorrowsMatches(now: Date): TodayMatch[] {
  return matchesForLocalDate(localDateStr(new Date(now.getTime() + DAY_MS)))
}
