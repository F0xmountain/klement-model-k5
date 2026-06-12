import { useTranslations } from 'next-intl'
import PixelParticles from '@/components/ui/PixelParticles'
import TimeAgo from '@/components/ui/TimeAgo'
import FlagImg from '@/components/ui/FlagImg'
import SimBracketView from '@/components/bracket/SimBracketView'
import { getResultsLastUpdated } from '@/lib/rest-days'
import { getUpsets } from '@/lib/upset-detector'
import { teamData } from '@/lib/klement'

export default function SimBracketPage() {
  const t = useTranslations('simBracket')
  const tc = useTranslations('common')
  const lastUpdated = getResultsLastUpdated()
  const upsets = getUpsets().slice(0, 5)

  return (
    <div className="sec page-enter" style={{ position: 'relative', overflow: 'hidden' }}>
      <PixelParticles variant="mix" />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div className="section-title">{t('title')}</div>
        <div style={{ fontSize: 10, color: 'var(--color-muted)', lineHeight: 2, marginBottom: 6 }}>
          {t('subtitle')}
        </div>
        {lastUpdated && (
          <div style={{ fontSize: 8, color: 'var(--color-muted)', marginBottom: 16 }}>
            {t('updated')} <TimeAgo iso={lastUpdated} />
          </div>
        )}
        <SimBracketView />

        {upsets.length > 0 && (
          <div style={{ marginTop: 28 }}>
            <div className="section-title">⚡ {t('upsets')}</div>
            <div className="factor-card">
              {upsets.map((u, i) => (
                <div key={u.matchLabel} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 9, padding: '7px 0', borderTop: i > 0 ? '1px solid var(--color-brd)' : 'none' }}>
                  <span style={{ color: 'var(--color-muted)', minWidth: 22 }}>{u.group}</span>
                  <FlagImg name={u.teamA} h={12} emoji={teamData(u.teamA)?.flag ?? '🏳️'} />
                  <span style={{ color: 'var(--color-txt)' }}>{u.teamA}</span>
                  <span style={{ color: 'var(--color-muted)' }}>{tc('vs')}</span>
                  <FlagImg name={u.teamB} h={12} emoji={teamData(u.teamB)?.flag ?? '🏳️'} />
                  <span style={{ color: 'var(--color-txt)' }}>{u.teamB}</span>
                  <span style={{ marginLeft: 'auto', color: 'var(--color-r)' }}>
                    {u.weakerTeam} {Math.round(u.upsetProb * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
