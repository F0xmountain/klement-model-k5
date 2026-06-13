import { getTranslations } from 'next-intl/server'
import { isAdminAuthed } from '@/lib/admin-auth'
import { getFullSquadWithStatus } from '@/lib/squad-modifier'
import { teamNames } from '@/lib/klement'
import { teamGroupMatches, canonTeam } from '@/lib/wc26-schedule'
import { resultForPair } from '@/lib/todays-matches'
import { teamCode } from '@/lib/team-codes'
import squadsDbRaw from '@/lib/squads-db.json'
import playerStatusRaw from '@/lib/player-status.json'
import ratingsRaw from '@/lib/player-ratings.json'
import type { PlayerRating } from '@/lib/player-ratings'
import AdminLoginForm from '@/components/admin/AdminLoginForm'
import AdminSquadsClient, { type AdminTeam } from '@/components/admin/AdminSquadsClient'

export const dynamic = 'force-dynamic'

interface SquadDbTeam {
  name_en: string
  group: string
  coach: string
  fifa_ranking: number
  squad_data_error?: boolean
}

const squadsDb = (squadsDbRaw as unknown as { teams: Record<string, SquadDbTeam> }).teams

// squads-db name_en wijkt voor 4 landen af van de teams.json-naam (de sleutel die
// matchP/wc26-schedule/results gebruiken). Ratings worden op de teams.json-naam
// gesleuteld, consistent met SquadTab's teamName-prop.
const TEAMS_JSON = new Set(teamNames())
const EN_TO_TEAMS: Record<string, string> = {
  'Bosnia and Herzegovina': 'Bosnia-Herz',
  'Curaçao': 'Curacao',
  'Cape Verde Islands': 'Cape Verde',
  'DR Congo': 'Congo DR',
}
function toTeamsName(nameEn: string): string {
  return TEAMS_JSON.has(nameEn) ? nameEn : (EN_TO_TEAMS[nameEn] ?? nameEn)
}

// Gespeelde groepswedstrijden van een team (uit results.json), met kort label.
function playedMatchesFor(teamsName: string): { matchId: string; label: string }[] {
  return teamGroupMatches(teamsName)
    .filter(m => {
      const home = canonTeam(m.homeTeam)
      const away = canonTeam(m.awayTeam)
      return !!(home && away && resultForPair(home, away))
    })
    .map(m => ({
      matchId: m.matchId,
      label: `${teamCode(canonTeam(m.homeTeam)!)} v ${teamCode(canonTeam(m.awayTeam)!)}`,
    }))
}

export default async function AdminSquadsPage() {
  const t = await getTranslations('admin')
  const authed = await isAdminAuthed()

  if (!authed) {
    return (
      <div className="sec page-enter">
        <div className="section-title">{t('pageTitle')}</div>
        <AdminLoginForm />
      </div>
    )
  }

  const teams: AdminTeam[] = Object.entries(squadsDb)
    .sort(([, a], [, b]) => a.fifa_ranking - b.fifa_ranking)
    .map(([teamNl, team]) => {
      const teamName = toTeamsName(team.name_en)
      return {
        teamNl,
        nameEn: team.name_en,
        teamName,
        group: team.group,
        coach: team.coach,
        fifaRanking: team.fifa_ranking,
        squadDataError: team.squad_data_error ?? false,
        players: getFullSquadWithStatus(teamNl),
        playedMatches: playedMatchesFor(teamName),
      }
    })

  const lastUpdated = (playerStatusRaw as { lastUpdated?: string }).lastUpdated ?? ''
  const initialRatings = (ratingsRaw as { ratings: PlayerRating[] }).ratings ?? []

  return (
    <div className="sec page-enter">
      <div className="section-title">{t('pageTitle')}</div>
      <AdminSquadsClient teams={teams} lastUpdated={lastUpdated} initialRatings={initialRatings} />
    </div>
  )
}
