import { getTranslations } from 'next-intl/server'
import { isAdminAuthed } from '@/lib/admin-auth'
import { getFullSquadWithStatus } from '@/lib/squad-modifier'
import squadsDbRaw from '@/lib/squads-db.json'
import playerStatusRaw from '@/lib/player-status.json'
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
    .map(([teamNl, team]) => ({
      teamNl,
      nameEn: team.name_en,
      group: team.group,
      coach: team.coach,
      fifaRanking: team.fifa_ranking,
      squadDataError: team.squad_data_error ?? false,
      players: getFullSquadWithStatus(teamNl),
    }))

  const lastUpdated = (playerStatusRaw as { lastUpdated?: string }).lastUpdated ?? ''

  return (
    <div className="sec page-enter">
      <div className="section-title">{t('pageTitle')}</div>
      <AdminSquadsClient teams={teams} lastUpdated={lastUpdated} />
    </div>
  )
}
