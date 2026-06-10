import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import PixelBar from '@/components/ui/PixelBar'
import PixelParticles from '@/components/ui/PixelParticles'

const factors = [
  { key: 'fifa',       pct: 45, color: 'var(--color-r)' },
  { key: 'wealth',     pct: 20, color: 'var(--color-g)' },
  { key: 'climate',    pct: 15, color: 'var(--color-b)' },
  { key: 'population', pct: 15, color: 'var(--color-b)' },
  { key: 'homeEdge',   pct: 5,  color: 'var(--color-r)' },
] as const

export default function AboutPage() {
  const t = useTranslations('about')
  const tf = useTranslations('factors')
  return (
    <div className="sec page-enter" style={{ position: 'relative', overflow: 'hidden' }}>
      <PixelParticles variant="red" />
      <div style={{ position: 'relative', zIndex: 1 }}>
      <div className="section-title">{t('title')}</div>
      <div style={{ fontSize: 10, color: 'var(--color-muted)', lineHeight: 2.4, marginBottom: 28 }}>
        {t('introLine1')}<br />
        {t('introLine2')}<br /><br />
        {t('introLine3')}<br />
        {t('introLine4')}
      </div>

      <div className="about-formula">
        <div style={{ fontSize: 10, color: 'var(--color-b)', marginBottom: 16, letterSpacing: 1 }}>{t('formulaLabel')}</div>
        <div style={{ fontSize: 11, color: 'var(--color-txt)', lineHeight: 2.6 }}>
          S = 0.45·FIFA<br />
          &nbsp;&nbsp;&nbsp;+ 0.20·GDP<br />
          &nbsp;&nbsp;&nbsp;+ 0.15·TEMP<br />
          &nbsp;&nbsp;&nbsp;+ 0.15·POP<br />
          &nbsp;&nbsp;&nbsp;+ 0.05·HOST
        </div>
        <div style={{ fontSize: 9, color: 'var(--color-muted)', marginTop: 12, lineHeight: 2.2 }}>
          P(WIN) = Φ((S_A − S_B) / 0.28) × (1 − DRAW)
        </div>
      </div>

      <div className="section-title" style={{ marginTop: 32 }}>{t('factorWeightsTitle')}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginBottom: 32 }}>
        {factors.map(({ key, pct, color }) => (
          <div key={key} style={{ display: 'grid', gridTemplateColumns: '160px 1fr 48px', alignItems: 'center', gap: 16 }}>
            <div style={{ fontSize: 10, color: 'var(--color-muted)' }}>{tf(key)}</div>
            <PixelBar value={pct} color={color} />
            <div style={{ fontSize: 10, color, textAlign: 'right' }}>{pct}%</div>
          </div>
        ))}
      </div>

      <div className="about-quote">
        <div style={{ fontSize: 10, color: 'var(--color-r)', lineHeight: 2.6 }}>
          {t('quoteLine1')}<br />
          {t('quoteLine2')}<br /><br />
          — JOACHIM KLEMENT, PANMURE LIBERUM
        </div>
      </div>

      <div style={{ marginTop: 32, display: 'flex', gap: 16 }}>
        <Link href="/versus" className="px-btn" style={{
          fontFamily: 'inherit', fontSize: 10, padding: '12px 22px',
          backgroundColor: 'var(--color-r)', color: '#fff', border: 'none',
          boxShadow: '4px 4px 0 var(--color-r-sh)', textDecoration: 'none', display: 'inline-block',
        }}>{t('ctaPredictor')}</Link>
        <Link href="/mc" className="px-btn" style={{
          fontFamily: 'inherit', fontSize: 10, padding: '12px 22px',
          backgroundColor: 'var(--color-surf)', color: 'var(--color-txt)',
          border: '2px solid var(--color-brd2)', boxShadow: '4px 4px 0 var(--color-brd)',
          textDecoration: 'none', display: 'inline-block',
        }}>{t('ctaSimulations')}</Link>
      </div>
      </div>
    </div>
  )
}
