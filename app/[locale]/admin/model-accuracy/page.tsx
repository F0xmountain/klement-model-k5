import { getTranslations } from 'next-intl/server'
import { isAdminAuthed } from '@/lib/admin-auth'
import { predictionsFromResults, type MatchPrediction } from '@/lib/model-accuracy'
import AdminLoginForm from '@/components/admin/AdminLoginForm'
import ModelAccuracyClient from '@/components/admin/ModelAccuracyClient'
import logRaw from '@/lib/prediction-log.json'

export const dynamic = 'force-dynamic'

export default async function ModelAccuracyPage() {
  const t = await getTranslations('admin.accuracy')
  const authed = await isAdminAuthed()

  if (!authed) {
    return (
      <div className="sec page-enter">
        <div className="section-title">{t('title')}</div>
        <AdminLoginForm />
      </div>
    )
  }

  return (
    <div className="sec page-enter">
      <div className="section-title">{t('title')}</div>
      <div style={{ fontSize: 9, color: 'var(--color-muted)', lineHeight: 2, marginBottom: 20 }}>
        {t('description')}
      </div>
      <ModelAccuracyClient initialLog={logRaw as MatchPrediction[]} available={predictionsFromResults()} />
    </div>
  )
}
