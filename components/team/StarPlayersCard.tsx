'use client'
import { useTranslations } from 'next-intl'
import { toTeamNl, getFullSquadWithStatus, type PlayerStatus } from '@/lib/squad-modifier'

const STATUS_KEY: Record<PlayerStatus, 'statusFit' | 'statusDoubtful' | 'statusOut'> = {
  fit: 'statusFit',
  doubtful: 'statusDoubtful',
  out: 'statusOut',
}

// Top-3 sterspelers met statusbol + selectievolledigheid (% van de 26-mans
// selectie dat niet "out" is). Toont niets als het team geen squad-data heeft.
export default function StarPlayersCard({ name }: { name: string }) {
  const tt = useTranslations('teams')
  const tc = useTranslations('common')
  const nl = toTeamNl(name)
  const squad = nl ? getFullSquadWithStatus(nl) : []
  if (squad.length === 0) return null

  const stars = squad
    .filter(p => p.isStar)
    .sort((a, b) => (a.starRank ?? 99) - (b.starRank ?? 99))
    .slice(0, 3)
  const outCount = squad.filter(p => p.status === 'out').length
  const completeness = Math.round(((squad.length - outCount) / squad.length) * 100)

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <span style={{ fontSize: 8, color: 'var(--color-muted)', letterSpacing: 1 }}>{tt('starPlayersLabel')}</span>
        <span style={{ fontSize: 8, color: 'var(--color-muted)' }}>{tt('squadCompleteness', { pct: completeness })}</span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
        {stars.map(p => (
          <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 9, color: 'var(--color-txt)' }}>
            <span className={`status-dot status-dot-${p.status}`} />
            {p.name}
            <span style={{ fontSize: 7, color: 'var(--color-muted)' }}>{tc(STATUS_KEY[p.status])}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
