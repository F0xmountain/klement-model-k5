import { useTranslations } from 'next-intl'
import EloTrendChart from '@/components/stats/EloTrendChart'
import FactorRadar from '@/components/stats/FactorRadar'
import WCHistoryTable from '@/components/stats/WCHistoryTable'
import PixelParticles from '@/components/ui/PixelParticles'

export default function StatsPage() {
  const t = useTranslations('stats')

  return (
    <div className="sec page-enter" style={{ position: 'relative', overflow: 'hidden' }}>
      <PixelParticles variant="blue" />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div className="section-title">{t('pageTitle')}</div>
        <div style={{ fontSize: 10, color: 'var(--color-muted)', lineHeight: 2.2, marginBottom: 32 }}>
          {t('pageDescription')}
        </div>

        <EloTrendChart />

        <div style={{ marginTop: 40 }}>
          <FactorRadar />
        </div>

        <div style={{ marginTop: 40 }}>
          <WCHistoryTable />
        </div>
      </div>
    </div>
  )
}
