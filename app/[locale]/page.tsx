import { useTranslations } from 'next-intl'
import Image from 'next/image'
import { Link } from '@/i18n/navigation'
import PixelBar from '@/components/ui/PixelBar'
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
    <div>

      {/* ── HERO — broadcast banner met tekst-overlay (statisch) ──
          Banner als achtergrond (ESPN-avond: vos + WK-trofee + scorebord), de
          bestaande hero-tekst links eroverheen. Op mobiel stapelt de banner met
          de tekst eronder (zie .hero-bc media-query in globals.css). */}
      <div className="hero-bc">
        {/* Nacht-banner (dark) en dag-banner (light) — getoond/verborgen per data-theme. */}
        <Image
          src="/Banner_night2.png"
          alt={t('bannerAlt')}
          width={1942}
          height={809}
          priority
          sizes="100vw"
          className="hero-bc-img hero-bc-img-dark"
        />
        <Image
          src="/Banner_day2.png"
          alt={t('bannerAlt')}
          width={1774}
          height={887}
          sizes="100vw"
          className="hero-bc-img hero-bc-img-light"
        />
        <div className="hero-bc-overlay" />

        <div className="hero-bc-content">
          {/* Broadcast top-strip: LIVE-tag + kicker */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
            <span className="bc-live"><span className="bc-live-dot" />{t('liveLabel')}</span>
            <span className="eyebrow" style={{ marginBottom: 0 }}>{t('eyebrow')}</span>
          </div>

          {/* Headline */}
          <h1 className="font-display" style={{
            fontSize: 'clamp(30px, 6vw, 52px)', margin: 0, color: 'var(--color-txt)',
          }}>
            {t('heroLine1')}<br />
            <span style={{ color: 'var(--color-r)' }}>{t('heroLine2')}</span>
          </h1>

          <p className="font-body" style={{
            fontSize: 13, lineHeight: 1.7, color: 'var(--color-txt)', opacity: 0.85,
            maxWidth: 440, margin: '18px 0 28px',
          }}>
            {t('heroSubtitle')}
          </p>

          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
            <Link href="/versus" className="px-btn font-display" style={{
              fontSize: 13, padding: '14px 26px',
              backgroundColor: 'var(--color-r)', color: '#0E0D0C', border: 'none',
              boxShadow: '4px 4px 0 var(--color-r-sh)', textDecoration: 'none', display: 'inline-block',
            }}>{t('ctaPredict')}</Link>
            <Link href="/model" className="px-btn font-display" style={{
              fontSize: 13, padding: '14px 26px',
              backgroundColor: 'var(--color-bg)', color: 'var(--color-txt)',
              border: '1px solid var(--color-brd2)',
              textDecoration: 'none', display: 'inline-block',
            }}>{t('ctaHowItWorks')}</Link>
          </div>
        </div>
      </div>

      {/* ── PUBLIC MODEL ACCURACY BADGE ── */}
      <ModelAccuracyBadge />

      {/* ── TODAY'S MATCHES ── */}
      <TodayMatches />

      {/* ── STATS BAR — broadcast stat-ribbon ── */}
      <div className="stats-bar">
        {[
          { num: '48',   label: t('statsQualified'), color: 'var(--color-r)' },
          { num: '3',    label: t('statsCorrect'),   color: 'var(--color-g)' },
          { num: '0.55', label: t('statsR2'),        color: 'var(--color-b)' },
        ].map(({ num, label, color }) => (
          <div key={label} className="stat-cell">
            <span className="font-display" style={{ fontSize: 'clamp(28px, 6vw, 40px)', color, display: 'block', marginBottom: 8 }}>{num}</span>
            <span className="font-pixel" style={{ fontSize: 8, color: 'var(--color-muted)', letterSpacing: 1 }}>{label}</span>
          </div>
        ))}
      </div>

      {/* ── TRACK RECORD ── */}
      <div className="sec">
        <div className="section-title">{t('trackRecordTitle')}</div>
        <div className="record-grid">
          {[
            { year: '2014', team: 'Germany',   name: 'GERMANY',   emoji: '🇩🇪' },
            { year: '2018', team: 'France',    name: 'FRANCE',    emoji: '🇫🇷' },
            { year: '2022', team: 'Argentina', name: 'ARGENTINA', emoji: '🇦🇷' },
          ].map(({ year, team, name, emoji }) => (
            <div key={year} className="record-card">
              <div className="record-badge">{t('recordBadge')}</div>
              <div className="font-pixel" style={{ fontSize: 8, color: 'var(--color-muted)', marginBottom: 12 }}>{year}</div>
              <div style={{ marginBottom: 10 }}>
                <FlagImg name={team} h={36} emoji={emoji} />
              </div>
              <div className="font-display" style={{ fontSize: 14, color: 'var(--color-txt)' }}>{name}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── PREDICTION BANNER — marquee call (statisch) ── */}
      <div className="sec">
        <div className="section-title">{t('predictionTitle')}</div>
        <div className="pred-banner">
          <div className="dot-grid" style={{ position: 'absolute', inset: 0, zIndex: 0 }} />
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ marginBottom: 18, border: '1px solid var(--color-brd2)', lineHeight: 0 }}>
              <FlagImg name="Netherlands" h={84} emoji="🇳🇱" />
            </div>
            <div className="font-display" style={{ fontSize: 'clamp(26px, 6vw, 38px)', color: 'var(--color-r)', marginBottom: 14 }}>
              NETHERLANDS
            </div>
            <div className="font-body" style={{ fontSize: 11, color: 'var(--color-muted)', lineHeight: 1.9, maxWidth: 520 }}>
              {t('predictionLine1')}<br />
              <span style={{ color: 'var(--color-txt)' }}>{t('predictionPathLabel')}</span> MOROCCO → CANADA → FRANCE → ARGENTINA → PORTUGAL
            </div>
            <PolymarketBtn teamName="Netherlands" variant="champion" />
          </div>
        </div>
      </div>

      {/* ── MODEL VARIABLES ── */}
      <div className="sec">
        <div className="section-title">{t('modelVariablesTitle')}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {factors.map(({ key, pct, color }) => (
            <div key={key} style={{ display: 'grid', gridTemplateColumns: '140px 1fr 48px', alignItems: 'center', gap: 14 }}>
              <div className="font-pixel" style={{ fontSize: 8, color: 'var(--color-muted)', letterSpacing: 0.5 }}>{tf(key)}</div>
              <PixelBar value={pct} color={color} />
              <div className="font-display" style={{ fontSize: 16, color, textAlign: 'right' }}>{pct}%</div>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
