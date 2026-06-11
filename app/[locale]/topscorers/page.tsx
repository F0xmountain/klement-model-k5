import { useTranslations } from 'next-intl'
import PixelParticles from '@/components/ui/PixelParticles'
import TopScorersList from '@/components/topscorers/TopScorersList'
import mcCacheRaw from '@/lib/mc-cache.json'
import type { McResult } from '@/lib/monte-carlo'

interface McCache {
  lastUpdated: string | null
  n: number
  teams: McResult['teams']
}

export default function TopScorersPage() {
  const t = useTranslations('topscorers')

  const mcCache = mcCacheRaw as McCache
  const initial: McResult | null = Object.keys(mcCache.teams).length > 0
    ? { n: mcCache.n, teams: mcCache.teams }
    : null

  return (
    <div className="sec page-enter" style={{ position: 'relative', overflow: 'hidden' }}>
      <PixelParticles variant="mix" />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div className="section-title">{t('title')}</div>
        <div style={{ fontSize: 10, color: 'var(--color-muted)', lineHeight: 2, marginBottom: 6 }}>
          {t('subtitle')}
        </div>
        <div style={{ fontSize: 8, color: 'var(--color-muted)', marginBottom: 20 }}>
          {t('posWeight')}
        </div>

        <TopScorersList initial={initial} />

        <div style={{ fontSize: 8, color: 'var(--color-muted)', marginTop: 16, lineHeight: 1.8 }}>
          {t('disclaimer')}
        </div>
      </div>
    </div>
  )
}
