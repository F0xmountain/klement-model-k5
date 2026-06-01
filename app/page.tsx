import Link from 'next/link'
import PixelBar from '@/components/ui/PixelBar'

const factors = [
  { label: 'FIFA RANKING',    weight: 45, color: 'var(--color-b)' },
  { label: 'WEALTH (GDP)',    weight: 20, color: 'var(--color-g-mid)' },
  { label: 'CLIMATE (TEMP)', weight: 15, color: 'var(--color-g)' },
  { label: 'POPULATION',     weight: 15, color: 'var(--color-r)' },
  { label: 'HOME ADVANTAGE', weight: 5,  color: 'var(--color-muted)' },
]

export default function LandingPage() {
  return (
    <div>
      {/* SECTION 1 — HERO */}
      <section style={{ borderBottom: '2px solid var(--color-brd)', padding: '48px 24px', position: 'relative', overflow: 'hidden' }}>
        <div className="dot-grid" style={{ position: 'absolute', inset: 0 }} />
        <div style={{ maxWidth: 800, margin: '0 auto', position: 'relative' }}>
          <div className="fade-in" style={{ display: 'inline-block', background: 'var(--color-b-bg)', border: '1px solid var(--color-b-sh)', padding: '4px 10px', fontSize: 6, color: 'var(--color-b)', marginBottom: 24 }}>
            PANMURE LIBERUM · APRIL 2026
          </div>
          <h1 className="fade-in delay-1 txt-shadow-r" style={{ fontSize: 18, color: 'var(--color-r)', lineHeight: 1.6, marginBottom: 20 }}>
            WHO WINS THE<br />
            <span style={{ color: 'var(--color-g)' }}>2026 WORLD CUP?</span>
          </h1>
          <p className="fade-in delay-2" style={{ fontSize: 8, color: 'var(--color-muted)', lineHeight: 2, marginBottom: 32, maxWidth: 480 }}>
            AN ECONOMETRIC MODEL THAT CALLED 2014, 2018 AND 2022 CORRECTLY
            — NOW RUNNING ON ALL 48 QUALIFIED NATIONS.
          </p>
          <div className="fade-in delay-3" style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <Link href="/lookup" className="px-btn" style={{
              display: 'inline-block',
              padding: '10px 20px',
              fontSize: 8,
              background: 'var(--color-r)',
              color: '#fff',
              textDecoration: 'none',
              boxShadow: '4px 4px 0 var(--color-r-sh)',
              fontFamily: 'inherit',
            }}>
              PREDICT A MATCH →
            </Link>
            <Link href="/about" className="px-btn" style={{
              display: 'inline-block',
              padding: '10px 20px',
              fontSize: 8,
              background: 'transparent',
              color: 'var(--color-b)',
              textDecoration: 'none',
              border: '2px solid var(--color-b)',
              boxShadow: '4px 4px 0 var(--color-b-sh)',
              fontFamily: 'inherit',
            }}>
              HOW IT WORKS
            </Link>
          </div>
        </div>
      </section>

      {/* SECTION 2 — STATS BAR */}
      <section style={{ background: 'var(--color-surf)', borderBottom: '2px solid var(--color-brd)', padding: '0' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)' }}>
          {[
            { value: '3',    label: 'CORRECT CALLS',  color: 'var(--color-r)' },
            { value: '48',   label: 'QUALIFIED TEAMS', color: 'var(--color-g)' },
            { value: '0.55', label: 'MODEL R²',        color: 'var(--color-b)' },
          ].map(({ value, label, color }, i) => (
            <div key={label} style={{
              padding: '20px 16px',
              textAlign: 'center',
              borderRight: i < 2 ? '1px solid var(--color-brd)' : 'none',
            }}>
              <p style={{ fontSize: 18, color, marginBottom: 6 }}>{value}</p>
              <p style={{ fontSize: 6, color: 'var(--color-muted)' }}>{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 3 — TRACK RECORD */}
      <section style={{ borderBottom: '2px solid var(--color-brd)', padding: '40px 24px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <p className="section-title">KLEMENT&apos;S TRACK RECORD</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {[
              { year: '2014', team: 'GERMANY',   flag: '🇩🇪', border: 'var(--color-muted)' },
              { year: '2018', team: 'FRANCE',    flag: '🇫🇷', border: 'var(--color-b)' },
              { year: '2022', team: 'ARGENTINA', flag: '🇦🇷', border: 'var(--color-g)' },
            ].map(({ year, team, flag, border }) => (
              <div key={year} style={{ border: `1px solid var(--color-brd)`, borderTop: `3px solid ${border}`, boxShadow: '3px 3px 0 var(--color-brd)', padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <p style={{ fontSize: 6, color: 'var(--color-muted)', marginBottom: 4 }}>{year} CHAMPION</p>
                    <p style={{ fontSize: 9, color: 'var(--color-txt)' }}>{team}</p>
                  </div>
                  <span style={{ fontSize: 28 }}>{flag}</span>
                </div>
                <span style={{ fontSize: 5, color: 'var(--color-g)', background: 'var(--color-g-bg)', padding: '2px 6px', border: '1px solid var(--color-g-sh)' }}>
                  PREDICTED ✓
                </span>
              </div>
            ))}
          </div>
          <blockquote style={{ marginTop: 24, borderLeft: '3px solid var(--color-brd2)', paddingLeft: 16 }}>
            <p style={{ fontSize: 8, color: 'var(--color-muted)', fontStyle: 'italic', lineHeight: 2 }}>
              &ldquo;I BUILT THIS MODEL TO PROVE ECONOMETRICS CAN&apos;T PREDICT FOOTBALL. THEN IT DID.&rdquo;
            </p>
            <footer style={{ fontSize: 6, color: 'var(--color-muted)', marginTop: 6 }}>
              — JOACHIM KLEMENT, PANMURE LIBERUM
            </footer>
          </blockquote>
        </div>
      </section>

      {/* SECTION 4 — PREDICTION BANNER */}
      <section style={{ background: 'var(--color-g)', borderBottom: '2px solid var(--color-brd)', padding: '40px 24px', position: 'relative', overflow: 'hidden' }}>
        <div className="dot-grid" style={{ position: 'absolute', inset: 0 }} />
        <div style={{ maxWidth: 800, margin: '0 auto', position: 'relative', textAlign: 'center' }}>
          <p style={{ fontSize: 6, color: 'var(--color-g-bg)', letterSpacing: 3, marginBottom: 16 }}>THE 2026 PREDICTION</p>
          <div style={{ fontSize: 36 }}>🇳🇱</div>
          <h2 style={{ fontSize: 18, color: '#fff', marginTop: 12 }}>
            NETHERLANDS<span className="blink" style={{ color: 'var(--color-g-bg)' }}>_</span>
          </h2>
          <p style={{ fontSize: 8, color: 'var(--color-g-bg)', lineHeight: 2, marginTop: 12, maxWidth: 480, margin: '12px auto 0' }}>
            FOR THE FIRST TIME IN THEIR HISTORY, THE NETHERLANDS ARE
            PROJECTED TO LIFT THE TROPHY. PATH: MOROCCO → CANADA → FRANCE → ARGENTINA → PORTUGAL (FINAL).
          </p>
          <div style={{ marginTop: 24, display: 'inline-block', background: 'var(--color-r)', border: '1px solid var(--color-r-sh)', padding: '8px 16px' }}>
            <p style={{ fontSize: 6, color: '#fff', letterSpacing: 1, marginBottom: 4 }}>⚡ BIGGEST UPSET</p>
            <p style={{ fontSize: 8, color: '#fff' }}>JAPAN DEFEAT BRAZIL — ROUND OF 32</p>
          </div>
          <div style={{ marginTop: 24 }}>
            <Link href="/mc" style={{
              fontSize: 7,
              color: '#fff',
              textDecoration: 'underline',
              fontFamily: 'inherit',
            }}>
              RUN 1,000 SIMULATIONS →
            </Link>
          </div>
        </div>
      </section>

      {/* SECTION 5 — MODEL VARIABLES */}
      <section style={{ borderBottom: '2px solid var(--color-brd)', padding: '40px 24px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <p className="section-title">MODEL VARIABLES</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {factors.map(({ label, weight, color }) => (
              <div key={label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 7 }}>
                  <span style={{ color: 'var(--color-txt)' }}>{label}</span>
                  <span style={{ color: 'var(--color-muted)' }}>{weight}%</span>
                </div>
                <PixelBar value={weight * 2} color={color} />
              </div>
            ))}
          </div>
          <p style={{ marginTop: 24, fontSize: 6, color: 'var(--color-muted)', lineHeight: 2 }}>
            MODEL EXPLAINS 55% OF VARIANCE BETWEEN TEAMS. THE OTHER 45% IS LUCK — AND IT&apos;S BUILT IN.
          </p>
        </div>
      </section>
    </div>
  )
}
