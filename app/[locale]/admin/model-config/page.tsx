import { getTranslations } from 'next-intl/server'
import { isAdminAuthed } from '@/lib/admin-auth'
import { getModelWeights } from '@/lib/model-config'
import AdminLoginForm from '@/components/admin/AdminLoginForm'
import ModelConfigClient from '@/components/admin/ModelConfigClient'

export const dynamic = 'force-dynamic'

export default async function ModelConfigPage() {
  const t = await getTranslations('modelConfig')
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
      <div style={{ fontSize: 9, color: 'var(--color-muted)', lineHeight: 2, marginBottom: 24 }}>
        {t('description')}
      </div>
      <ModelConfigClient initial={getModelWeights()} />
    </div>
  )
}
