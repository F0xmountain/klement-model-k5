import ratingsRaw from './player-ratings.json'
import { SCHEDULE, canonTeam, matchById } from './wc26-schedule'
import { teamCode } from './team-codes'

// Spelersratings per wedstrijd (1.0–10.0), ingevoerd via /admin/squads → tab
// "Ratings" en weggeschreven naar dit JSON-bestand via /api/admin/ratings.
// teamName is de teams.json-Engelse naam (zelfde sleutel als matchP/teamData).
export interface PlayerRating {
  matchId: string
  teamName: string
  playerName: string
  rating: number
}

interface RatingsFile {
  ratings: PlayerRating[]
}

const RATINGS = (ratingsRaw as RatingsFile).ratings ?? []

// Chronologische volgorde van een wedstrijd binnen het toernooi (voor sortering).
const SCHEDULE_ORDER = new Map(SCHEDULE.map((m, i) => [m.matchId, i]))

// Kort label voor een wedstrijd, bv. "MEX v RSA". Valt terug op de matchId.
function matchLabel(matchId: string): string {
  const m = matchById(matchId)
  if (!m) return matchId
  const home = canonTeam(m.homeTeam)
  const away = canonTeam(m.awayTeam)
  if (home && away) return `${teamCode(home)} v ${teamCode(away)}`
  return matchId
}

function avg(values: number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((s, v) => s + v, 0) / values.length
}

export interface PlayerMatchRating {
  matchId: string
  matchLabel: string
  rating: number
}

// Alle ratings van een speler (per wedstrijd), chronologisch op speeldatum.
export function getRatingsForPlayer(playerName: string, teamName: string): PlayerMatchRating[] {
  return RATINGS
    .filter(r => r.playerName === playerName && r.teamName === teamName)
    .map(r => ({ matchId: r.matchId, matchLabel: matchLabel(r.matchId), rating: r.rating }))
    .sort((a, b) => (SCHEDULE_ORDER.get(a.matchId) ?? 0) - (SCHEDULE_ORDER.get(b.matchId) ?? 0))
}

// Gemiddelde rating van alle (beoordeelde) spelers van een team in één wedstrijd.
export function getTeamAvgRating(teamName: string, matchId: string): number | null {
  return avg(RATINGS.filter(r => r.teamName === teamName && r.matchId === matchId).map(r => r.rating))
}

// Gemiddelde rating van een speler over alle wedstrijden.
export function getPlayerAvgRating(playerName: string, teamName: string): number | null {
  return avg(RATINGS.filter(r => r.playerName === playerName && r.teamName === teamName).map(r => r.rating))
}
