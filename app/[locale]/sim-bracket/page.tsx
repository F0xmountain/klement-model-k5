import { useTranslations } from 'next-intl'
import PixelParticles from '@/components/ui/PixelParticles'
import TimeAgo from '@/components/ui/TimeAgo'
import SimBracketView from '@/components/bracket/SimBracketView'
import { getResultsLastUpdated } from '@/lib/rest-days'

export default function SimBracketPage() {
  const t = useTranslations('simBracket')
  const lastUpdated = getResultsLastUpdated()

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
      </div>
    </div>
  )
}
