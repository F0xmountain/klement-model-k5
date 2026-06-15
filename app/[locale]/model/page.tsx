import { useTranslations } from 'next-intl'
import Image from 'next/image'
import { Link } from '@/i18n/navigation'
import PixelParticles from '@/components/ui/PixelParticles'
import TimeAgo from '@/components/ui/TimeAgo'
import ModelMonteCarlo from '@/components/model/ModelMonteCarlo'
import Wc2022Validation from '@/components/model/Wc2022Validation'
import { getModelWeights } from '@/lib/model-config'
import { getResultsLastUpdated } from '@/lib/rest-days'

const pct = (v: number) => `${Math.round(v * 100)}%`

interface FactorRow {
  key: string
  icon: string
  weight: string
  source: string
  accent: string
}

function buildFactors(): FactorRow[] {
  const w = getModelWeights()
  return [
    { key: 'gdp',       icon: '💰', weight: pct(w.gdp),                       source: 'World Bank',     accent: 'var(--color-g)' },
    { key: 'pop',       icon: '👥', weight: pct(w.pop),                       source: 'World Bank',     accent: 'var(--color-g)' },
    { key: 'climate',   icon: '🌡️', weight: pct(w.temp),                      source: 'NOAA',           accent: 'var(--color-b)' },
    { key: 'fifa',      icon: '📊', weight: pct(w.fifa * (1 - w.eloWeight)),  source: 'FIFA',           accent: 'var(--color-r)' },
    { key: 'elo',       icon: '⚡', weight: pct(w.fifa * w.eloWeight),        source: 'eloratings.net', accent: 'var(--color-r)' },
    { key: 'form',      icon: '📈', weight: pct(w.formWeight),                source: 'API-Football',   accent: 'var(--color-b)' },
    { key: 'league',    icon: '🏆', weight: pct(w.leagueWeight),              source: 'Transfermarkt',  accent: 'var(--color-g)' },
    { key: 'home',      icon: '🏠', weight: pct(w.host),                      source: '—',              accent: 'var(--color-r)' },
    { key: 'star',      icon: '⭐', weight: `−${pct(w.starPenalty1)}`,        source: 'Manual',         accent: 'var(--color-g)' },
    { key: 'altitude',  icon: '⛰️', weight: '−5%',                            source: 'Wikipedia',      accent: 'var(--color-b)' },
    { key: 'travel',    icon: '✈️', weight: '−3%',                            source: 'Calculated',     accent: 'var(--color-b)' },
    { key: 'wcexp',     icon: '🎖️', weight: '+2%',                            source: 'FIFA',           accent: 'var(--color-r)' },
  ]
}

export default function ModelPage() {
  const t = useTranslations('model')
  const factors = buildFactors()
  const resultsLastUpdated = getResultsLastUpdated()

  return (
    <div className="sec page-enter" style={{ position: 'relative', overflow: 'hidden' }}>
      <PixelParticles variant="mix" />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div className="section-title">{t('title')}</div>
        {resultsLastUpdated && (
          <div style={{ fontSize: 9, color: 'var(--color-muted)', marginTop: -8, marginBottom: 8 }}>
            {t('lastUpdated')} <TimeAgo iso={resultsLastUpdated} />
          </div>
        )}

        {/* Hoe het model werkt */}
        <div className="section-title" style={{ marginTop: 24 }}>{t('howTitle')}</div>
        <div style={{ fontSize: 10, color: 'var(--color-muted)', lineHeight: 2.2, marginBottom: 16 }}>
          {t('howIntro')}
        </div>

        {/* Oorspronkelijk Klement-model — formule, herkomst en quote
            (samengevoegd vanuit /about, sessie 15 stap 5). */}
        <div style={{ fontSize: 9, color: 'var(--color-muted)', lineHeight: 2.2, marginBottom: 20 }}>
          {t('paperRef')}<br />
          {t('variance')}
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

        {/* Klement-portret naast zijn quote (pixel-art). De afbeelding toont
            Joachim Klement zelf — passend bij zijn citaat en naam hieronder. */}
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginTop: 20 }}>
          <div style={{ flex: '0 0 auto', textAlign: 'center' }}>
            <div style={{
              display: 'inline-block', padding: 14, background: 'var(--color-surf)',
              border: '1px solid var(--color-brd2)', borderTop: '3px solid var(--color-r)',
            }}>
              <Image
                src="/mascot.jpeg"
                alt={t('klementCaption')}
                width={160}
                height={176}
                style={{ display: 'block', imageRendering: 'pixelated', border: '1px solid var(--color-brd2)' }}
              />
              <div className="font-pixel" style={{ fontSize: 7, color: 'var(--color-r)', marginTop: 10, letterSpacing: 1 }}>JOACHIM KLEMENT</div>
              <div className="font-pixel" style={{ fontSize: 6, color: 'var(--color-muted)', marginTop: 3 }}>PANMURE LIBERUM</div>
            </div>
            <div style={{ fontSize: 8, color: 'var(--color-muted)', marginTop: 8, maxWidth: 188, lineHeight: 1.6 }}>{t('klementCaption')}</div>
          </div>
          <div className="about-quote" style={{ flex: '1 1 260px' }}>
            <div style={{ fontSize: 10, color: 'var(--color-r)', lineHeight: 2.6 }}>
              {t('quoteLine1')}<br />
              {t('quoteLine2')}<br /><br />
              — JOACHIM KLEMENT, PANMURE LIBERUM
            </div>
          </div>
        </div>

        {/* Factoren */}
        <div className="section-title" style={{ marginTop: 32 }}>{t('factorsTitle')}</div>
        <div className="factor-card" style={{ overflowX: 'auto' }}>
          <div className="model-table-head">
            <span />
            <span>{t('colFactor')}</span>
            <span>{t('colDesc')}</span>
            <span style={{ textAlign: 'right' }}>{t('colWeight')}</span>
            <span style={{ textAlign: 'right' }}>{t('colSource')}</span>
          </div>
          {factors.map(f => (
            <div key={f.key} className="model-table-row">
              <span style={{ fontSize: 13 }}>{f.icon}</span>
              <span style={{ color: 'var(--color-txt)' }}>{t(`factors.${f.key}.name`)}</span>
              <span style={{ color: 'var(--color-muted)', fontSize: 8, lineHeight: 1.7 }}>{t(`factors.${f.key}.desc`)}</span>
              <span style={{ textAlign: 'right', color: f.accent }}>{f.weight}</span>
              <span style={{ textAlign: 'right', color: 'var(--color-muted)', fontSize: 8 }}>{f.source}</span>
            </div>
          ))}
        </div>

        {/* Monte Carlo simulaties */}
        <div className="section-title" style={{ marginTop: 32 }}>{t('mcTitle')}</div>
        <div style={{ fontSize: 10, color: 'var(--color-muted)', lineHeight: 2.2, marginBottom: 16 }}>
          {t('mcIntro')}
        </div>
        <ModelMonteCarlo />

        {/* Track record & validatie — terugrekening op WK 2022 */}
        <Wc2022Validation />

        {/* Configurator-link */}
        <div className="factor-card" style={{ marginTop: 32 }}>
          <div style={{ fontSize: 10, color: 'var(--color-txt)', marginBottom: 8 }}>{t('configTitle')}</div>
          <div style={{ fontSize: 9, color: 'var(--color-muted)', lineHeight: 2, marginBottom: 16 }}>{t('configIntro')}</div>
          <Link href="/admin/model-config" className="px-btn" style={{
            fontFamily: 'inherit', fontSize: 10, padding: '12px 22px',
            backgroundColor: 'var(--color-b)', color: '#fff', border: 'none',
            boxShadow: '4px 4px 0 var(--color-b-sh)', textDecoration: 'none', display: 'inline-block',
          }}>{t('configCta')} →</Link>
        </div>

        {/* Inspiratie-credit — oorspronkelijke maker van de open-source fork */}
        <div style={{ fontSize: 8, color: 'var(--color-muted)', lineHeight: 2, marginTop: 32 }}>
          {t('attribution')}<br />
          {t('attributionFork')}
        </div>
      </div>
    </div>
  )
}
