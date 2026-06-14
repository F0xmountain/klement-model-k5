import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import Image from 'next/image'
import PixelBar from '@/components/ui/PixelBar'
import PixelParticles from '@/components/ui/PixelParticles'
import FlagImg from '@/components/ui/FlagImg'
import PolymarketBtn from '@/components/ui/PolymarketBtn'
import TodayMatches from '@/components/today/TodayMatches'
import ModelAccuracyBadge from '@/components/home/ModelAccuracyBadge'

const factors = [
  { key: 'fifa' as const,       pct: 45, color: 'var(--color-r)' },
  { key: 'wealth' as const,     pct: 20, color: 'var(--color-g)' },
  { key: 'climate' as const,    pct: 15, color: 'var(--color-b)' },
  { key: 'population' as const, pct: 15, color: 'var(--color-b)' },
  { key: 'homeEdge' as const,   pct: 5,  color: 'var(--color-r)' },
]

export default function LandingPage() {
  const t = useTranslations('home')
  const tf = useTranslations('factors')

  return (
    <div className="page-enter">

      {/* ── HERO ── */}
      <div className="sec" style={{ position: 'relative', overflow: 'hidden', paddingTop: 48, paddingBottom: 48 }}>
        <div className="dot-grid" style={{ position: 'absolute', inset: 0 }} />
        <div className="scanline" />
        <PixelParticles variant="mix" />

        <div className="hero-grid" style={{ position: 'relative', zIndex: 1 }}>
          {/* Left — text */}
          <div>
            <div className="eyebrow fade-in">{t('eyebrow')}</div>
            <div className="txt-shadow-r fade-in delay-1" style={{ fontSize: 22, color: 'var(--color-r)', lineHeight: 1.5, marginBottom: 16 }}>
              {t('heroLine1')}<br />
              <span style={{ color: 'var(--color-g)', textShadow: '3px 3px 0 var(--color-g-sh)' }}>{t('heroLine2')}</span>
            </div>
            <div className="fade-in delay-2" style={{ fontSize: 9, color: 'var(--color-muted)', lineHeight: 2.2, maxWidth: 480, marginBottom: 28 }}>
              {t('heroSubtitle')}
            </div>
            <div className="fade-in delay-3" style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
              <Link href="/versus" className="px-btn" style={{
                fontFamily: 'inherit', fontSize: 10, padding: '12px 22px',
                backgroundColor: 'var(--color-r)', color: '#fff', border: 'none',
                boxShadow: '4px 4px 0 var(--color-r-sh)', textDecoration: 'none', display: 'inline-block',
              }}>{t('ctaPredict')}</Link>
              <Link href="/about" className="px-btn" style={{
                fontFamily: 'inherit', fontSize: 10, padding: '12px 22px',
                backgroundColor: 'var(--color-bg)', color: 'var(--color-b)',
                border: '2px solid var(--color-b)', boxShadow: '4px 4px 0 var(--color-b-sh)',
                textDecoration: 'none', display: 'inline-block',
              }}>{t('ctaHowItWorks')}</Link>
              <span className="football-bounce" style={{ fontSize: 28, marginLeft: 8 }}>⚽</span>
            </div>
          </div>

          {/* Right — Klement mascot */}
          <div style={{ textAlign: 'center', flexShrink: 0 }}>
            <div className="mascot-float">
              <div style={{
                border: '3px solid var(--color-brd2)',
                boxShadow: '5px 5px 0 var(--color-brd)',
                display: 'inline-block',
                backgroundColor: 'var(--color-bg)',
              }}>
                <Image
                  src="/mascot.jpeg"
                  alt="Joachim Klement — Panmure Liberum"
                  width={200}
                  height={220}
                  priority
                  style={{ display: 'block', imageRendering: 'pixelated' }}
                />
              </div>
            </div>
            <div style={{ fontSize: 8, color: 'var(--color-b)', marginTop: 10, letterSpacing: 1 }}>JOACHIM KLEMENT</div>
            <div style={{ fontSize: 7, color: 'var(--color-muted)', marginTop: 2 }}>PANMURE LIBERUM</div>
          </div>
        </div>
      </div>

      {/* ── PUBLIC MODEL ACCURACY BADGE ── */}
      <ModelAccuracyBadge />

      {/* ── TODAY'S MATCHES ── */}
      <TodayMatches />

      {/* ── STATS BAR ── */}
      <div className="stats-bar">
        {[
          { num: '48',   label: t('statsQualified'), color: 'var(--color-r)', sh: 'var(--color-r-sh)' },
          { num: '3',    label: t('statsCorrect'),  color: 'var(--color-g)', sh: 'var(--color-g-sh)' },
          { num: '0.55', label: t('statsR2'),         color: 'var(--color-b)', sh: 'var(--color-b-sh)' },
        ].map(({ num, label, color, sh }) => (
          <div key={label} className="stat-cell">
            <span style={{ fontSize: 22, color, textShadow: `2px 2px 0 ${sh}`, display: 'block', marginBottom: 8 }}>{num}</span>
            <span style={{ fontSize: 8, color: 'var(--color-muted)', letterSpacing: 1 }}>{label}</span>
          </div>
        ))}
      </div>

      {/* ── TRACK RECORD ── */}
      <div className="sec" style={{ position: 'relative', overflow: 'hidden' }}>
        <PixelParticles variant="green" />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div className="section-title">{t('trackRecordTitle')}</div>
          <div className="record-grid">
            {[
              { year: '2014', team: 'Germany',   name: 'GERMANY',   emoji: '🇩🇪' },
              { year: '2018', team: 'France',    name: 'FRANCE',    emoji: '🇫🇷' },
              { year: '2022', team: 'Argentina', name: 'ARGENTINA', emoji: '🇦🇷' },
            ].map(({ year, team, name, emoji }) => (
              <div key={year} className="record-card">
                <div className="record-badge">{t('recordBadge')}</div>
                <div style={{ fontSize: 8, color: 'var(--color-muted)', marginBottom: 10 }}>{year}</div>
                <div style={{ marginBottom: 8 }}>
                  <FlagImg name={team} h={36} emoji={emoji} />
                </div>
                <div style={{ fontSize: 9, color: 'var(--color-g)' }}>{name}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── PREDICTION BANNER ── */}
      <div className="sec" style={{ position: 'relative', overflow: 'hidden' }}>
        <PixelParticles variant="green" />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div className="section-title">{t('predictionTitle')}</div>
          <div className="pred-banner">
            <div className="dot-grid" style={{ position: 'absolute', inset: 0, zIndex: 0 }} />
            <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{
                marginBottom: 18,
                border: '3px solid var(--color-g)',
                boxShadow: '6px 6px 0 var(--color-g-sh), 0 0 0 1px var(--color-g)',
                lineHeight: 0,
              }}>
                <FlagImg name="Netherlands" h={90} emoji="🇳🇱" />
              </div>
              <div className="txt-shadow-g" style={{ fontSize: 18, color: 'var(--color-g)', marginBottom: 12 }}>
                NETHERLANDS<span className="blink">_</span>
              </div>
              <div style={{ fontSize: 8, color: 'var(--color-g)', opacity: 0.75, lineHeight: 2.2 }}>
                {t('predictionLine1')}<br />
                {t('predictionPathLabel')} MOROCCO → CANADA → FRANCE → ARGENTINA → PORTUGAL
              </div>
              <PolymarketBtn
                teamName="Netherlands"
                variant="champion"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── MODEL VARIABLES ── */}
      <div className="sec" style={{ position: 'relative', overflow: 'hidden' }}>
        <PixelParticles variant="blue" />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div className="section-title">{t('modelVariablesTitle')}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {factors.map(({ key, pct, color }) => (
              <div key={key} style={{ display: 'grid', gridTemplateColumns: '140px 1fr 42px', alignItems: 'center', gap: 14 }}>
                <div style={{ fontSize: 9, color: 'var(--color-muted)' }}>{tf(key)}</div>
                <PixelBar value={pct} color={color} />
                <div style={{ fontSize: 9, color, textAlign: 'right', fontWeight: 'bold' }}>{pct}%</div>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  )
}
