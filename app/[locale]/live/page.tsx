import { getTranslations } from 'next-intl/server'
import PolymarketWidget from '@/components/live/PolymarketWidget'
import NewsCard from '@/components/live/NewsCard'
import PixelParticles from '@/components/ui/PixelParticles'

export default async function LivePage() {
  const t = await getTranslations('live')

  return (
    <div className="sec page-enter" style={{ position: 'relative', overflow: 'hidden' }}>
      <PixelParticles variant="red" />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div className="section-title">{t('pageTitle')}</div>
        <div style={{ fontSize: 10, color: 'var(--color-muted)', lineHeight: 2.2, marginBottom: 32 }}>
          {t('pageDescription')}
        </div>

        <PolymarketWidget />

        <div style={{ marginTop: 40 }}>
          <NewsCard />
        </div>

        <div style={{ fontSize: 9, color: 'var(--color-muted)', marginTop: 32, fontStyle: 'italic', textAlign: 'center' }}>
          {t('disclaimer')}
        </div>
      </div>
    </div>
  )
}
