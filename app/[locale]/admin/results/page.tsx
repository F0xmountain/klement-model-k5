import { getTranslations } from 'next-intl/server'
import { isAdminAuthed } from '@/lib/admin-auth'
import { GROUPS, makeSlug } from '@/lib/fixtures'
import resultsRaw from '@/lib/results.json'
import AdminLoginForm from '@/components/admin/AdminLoginForm'
import AdminResultsClient, { type ResultMatch, type ResultEntry } from '@/components/admin/AdminResultsClient'

export const dynamic = 'force-dynamic'

function buildGroupMatches(): ResultMatch[] {
  const matches: ResultMatch[] = []
  for (const [group, teams] of Object.entries(GROUPS)) {
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        matches.push({ matchKey: makeSlug(teams[i], teams[j]), group, teamA: teams[i], teamB: teams[j] })
      }
    }
  }
  return matches
}

export default async function AdminResultsPage() {
  const t = await getTranslations('admin')
  const authed = await isAdminAuthed()

  if (!authed) {
    return (
      <div className="sec page-enter">
        <div className="section-title">{t('resultsPageTitle')}</div>
        <AdminLoginForm />
      </div>
    )
  }

  const matches = buildGroupMatches()
  const results = resultsRaw as Record<string, ResultEntry>

  return (
    <div className="sec page-enter">
      <div className="section-title">{t('resultsPageTitle')}</div>
      <AdminResultsClient matches={matches} initialResults={results} />
    </div>
  )
}
