import { isAdminAuthed } from '@/lib/admin-auth'
import AdminLoginForm from '@/components/admin/AdminLoginForm'
import ModelExplainClient from '@/components/admin/ModelExplainClient'

export const dynamic = 'force-dynamic'

export default async function ModelExplainPage() {
  const authed = await isAdminAuthed()

  if (!authed) {
    return (
      <div className="sec page-enter">
        <div className="section-title">MODEL INTERNALS</div>
        <AdminLoginForm />
      </div>
    )
  }

  return (
    <div className="sec page-enter">
      <div className="section-title">MODEL INTERNALS</div>
      <div style={{ fontSize: 9, color: 'var(--color-muted)', lineHeight: 2, marginBottom: 24 }}>
        Exactly how the model turns factor inputs into a W/D/L probability — with live numbers for any match.
      </div>
      <ModelExplainClient />
    </div>
  )
}
