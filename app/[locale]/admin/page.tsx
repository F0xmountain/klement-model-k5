import { isAdminAuthed } from '@/lib/admin-auth'
import { Link } from '@/i18n/navigation'
import TimeAgo from '@/components/ui/TimeAgo'
import AdminLoginForm from '@/components/admin/AdminLoginForm'
import resultsRaw from '@/lib/results.json'
import playerStatusRaw from '@/lib/player-status.json'
import starStatusRaw from '@/lib/star-player-status.json'

export const dynamic = 'force-dynamic'

interface ResultsFile {
  meta: { lastUpdated: string | null }
  results: Record<string, unknown>
}
interface StatusFile {
  statuses?: Record<string, Record<string, string>>
  overrides?: Record<string, Record<string, string>>
}

const CARDS = [
  {
    icon: 'ti-trophy',
    title: 'Match Results',
    description: 'Enter scores for completed matches. Triggers Elo recalculation and bracket update.',
    href: '/admin/results',
  },
  {
    icon: 'ti-users',
    title: 'Player Status',
    description: 'Set fit / doubtful / out for star players. Affects match win probabilities.',
    href: '/admin/squads',
  },
  {
    icon: 'ti-adjustments-horizontal',
    title: 'Model Config',
    description: 'Adjust factor weights, Elo/FIFA blend, Polymarket weight, and star player penalties.',
    href: '/admin/model-config',
  },
  {
    icon: 'ti-microscope',
    title: 'Model Internals',
    description: 'Step-by-step calculation for any match. Shows every factor, formula, and modifier.',
    href: '/admin/model-explain',
  },
] as const

// Aantal spelers met status doubtful/out over beide statuslagen, ontdubbeld op team+naam
function countNotFit(): number {
  const player = (playerStatusRaw as StatusFile).statuses ?? {}
  const star = (starStatusRaw as StatusFile).overrides ?? {}
  const notFit = new Set<string>()
  for (const layer of [player, star]) {
    for (const team of Object.keys(layer)) {
      for (const [name, status] of Object.entries(layer[team] ?? {})) {
        if (status !== 'fit') notFit.add(`${team}|${name}`)
      }
    }
  }
  return notFit.size
}

export default async function AdminDashboardPage() {
  const authed = await isAdminAuthed()

  if (!authed) {
    return (
      <div className="sec page-enter">
        <div className="section-title">ADMIN DASHBOARD</div>
        <AdminLoginForm />
      </div>
    )
  }

  const file = resultsRaw as ResultsFile
  const matchCount = Object.keys(file.results).length
  const notFitCount = countNotFit()

  return (
    <div className="sec page-enter">
      <div className="section-title">ADMIN DASHBOARD</div>
      <div style={{ fontSize: 9, color: 'var(--color-muted)', lineHeight: 2, marginBottom: 8 }}>
        WC26 Klement Model
        {file.meta.lastUpdated && (
          <> — last results update <TimeAgo iso={file.meta.lastUpdated} /></>
        )}
      </div>
      <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', fontSize: 9, color: 'var(--color-b)', marginBottom: 28 }}>
        <span>{matchCount} matches recorded</span>
        <span>{notFitCount} players doubtful/out</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
        {CARDS.map(card => (
          <div key={card.href} className="factor-card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <i className={`ti ${card.icon}`} style={{ fontSize: 24, color: 'var(--color-b)' }} aria-hidden />
            <div style={{ fontSize: 11, color: 'var(--color-txt)' }}>{card.title}</div>
            <div style={{ fontSize: 9, color: 'var(--color-muted)', lineHeight: 1.9, flex: 1 }}>{card.description}</div>
            <Link
              href={card.href}
              className="px-btn"
              style={{
                fontFamily: 'inherit', fontSize: 9, padding: '8px 14px', alignSelf: 'flex-start',
                backgroundColor: 'var(--color-b)', color: '#fff', border: 'none',
                boxShadow: '3px 3px 0 var(--color-b-sh)', textDecoration: 'none',
              }}
            >
              Open →
            </Link>
          </div>
        ))}
      </div>
    </div>
  )
}
