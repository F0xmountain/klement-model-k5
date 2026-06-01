import SectionLabel from '@/components/ui/SectionLabel'
import Btn from '@/components/ui/Btn'
import PixelBar from '@/components/ui/PixelBar'

const factors = [
  { label: 'FIFA RANKING (45%)', weight: 45, desc: 'LINEAR NORMALISATION ON [1400, 2000]. THE DOMINANT SIGNAL — CURRENT SQUAD STRENGTH IS THE BEST SINGLE PREDICTOR.' },
  { label: 'WEALTH — GDP PER CAPITA (20%)', weight: 20, desc: 'INVERTED-U WITH PEAK AT $35K. VERY POOR NATIONS LACK INFRASTRUCTURE; VERY RICH NATIONS DEPRIORITISE FOOTBALL.' },
  { label: 'CLIMATE — AVG TEMPERATURE (15%)', weight: 15, desc: 'LINEAR DECAY FROM OPTIMAL 14°C. NATIONS CLOSE TO THE TEMPERATE SWEET SPOT CONSISTENTLY OUTPERFORM.' },
  { label: 'POPULATION (15%)', weight: 15, desc: 'LOG-SCALE. MULTIPLIED BY 0.3 FOR NON-LATAM NATIONS — LARGE NON-FOOTBALL POPULATIONS DILUTE THE TALENT POOL SIGNAL.' },
  { label: 'HOME ADVANTAGE (5%)', weight: 5, desc: 'BINARY BONUS FOR HOST NATIONS. SMALLER EFFECT THAN IN SINGLE-HOST TOURNAMENTS GIVEN THE 3-COUNTRY FORMAT.' },
]

export default function AboutPage() {
  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: 32 }}>
      <div className="fade-in">
        <SectionLabel>About the Model</SectionLabel>
        <h1 style={{ fontSize: 14, color: 'var(--color-r)', marginTop: 4 }}>THE KLEMENT FRAMEWORK</h1>
      </div>

      <section className="fade-in delay-1">
        <h2 style={{ fontSize: 9, color: 'var(--color-b)', marginBottom: 16 }}>THE FORMULA</h2>
        <div style={{ background: 'var(--color-surf)', border: '1px solid var(--color-brd)', padding: 16, fontFamily: 'var(--font-pixel), monospace', fontSize: 7, lineHeight: 2.2 }}>
          <p style={{ color: 'var(--color-txt)' }}>S_i = 0.20·fG(gdp) + 0.15·fP(pop) + 0.15·fT(temp) + 0.45·fF(fifa) + 0.05·host</p>
          <p style={{ color: 'var(--color-muted)', marginTop: 8 }}>P(A wins) = Φ((S_A − S_B) / 0.28) × (1 − draw)</p>
          <p style={{ color: 'var(--color-muted)' }}>draw = clip(0.20 × (1 − 0.3 × |z|), 0.05, 0.24)</p>
        </div>
        <p style={{ fontSize: 7, color: 'var(--color-muted)', lineHeight: 2, marginTop: 12 }}>
          EACH TEAM RECEIVES A COMPOSITE SCORE S_i ∈ [0, 1] FROM FIVE WEIGHTED FACTORS.
          MATCH PROBABILITIES USE THE NORMAL CDF (Φ) SCALED BY σ = 0.28.
          THE MODEL EXPLAINS R² ≈ 0.55 OF VARIANCE IN HISTORICAL WORLD CUP RESULTS.
        </p>
      </section>

      <section className="fade-in delay-2">
        <h2 style={{ fontSize: 9, color: 'var(--color-b)', marginBottom: 16 }}>FIVE FACTORS</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {factors.map(({ label, weight, desc }) => (
            <div key={label} style={{ border: '1px solid var(--color-brd)', borderLeft: '3px solid var(--color-b)', boxShadow: '3px 3px 0 var(--color-brd)', padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <p style={{ fontSize: 7, color: 'var(--color-txt)' }}>{label}</p>
              </div>
              <PixelBar value={weight * 2} color="var(--color-b)" />
              <p style={{ fontSize: 6, color: 'var(--color-muted)', lineHeight: 2, marginTop: 8 }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="fade-in delay-3">
        <h2 style={{ fontSize: 9, color: 'var(--color-b)', marginBottom: 16 }}>THE LUCK COMPONENT</h2>
        <div style={{ background: 'var(--color-r-bg)', border: '1px solid var(--color-r-sh)', padding: 16 }}>
          <p style={{ fontSize: 7, color: 'var(--color-txt)', lineHeight: 2.2 }}>
            THE MODEL USES σ = 0.28 AS THE RESIDUAL NOISE PARAMETER. THIS MEANS{' '}
            <strong style={{ color: 'var(--color-r)' }}>45% OF MATCH VARIANCE IS UNEXPLAINED</strong>{' '}
            — ENCODED IN RANDOM DRAWS FROM THE NORMAL DISTRIBUTION.
            EVERY SIMULATION IS DIFFERENT. A 70% FAVOURITE LOSES 30% OF THE TIME.
            JAPAN BEATING BRAZIL IS UNLIKELY — BUT THE MODEL PUTS IT AT ROUGHLY 15%.
          </p>
        </div>
      </section>

      <section className="fade-in delay-3">
        <h2 style={{ fontSize: 9, color: 'var(--color-b)', marginBottom: 16 }}>KLEMENT&apos;S 2026 CALL</h2>
        <div style={{ border: '2px solid var(--color-g)', boxShadow: '0 0 0 2px var(--color-bg), 0 0 0 4px var(--color-g)', padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
            <span style={{ fontSize: 40 }}>🇳🇱</span>
            <div>
              <p style={{ fontSize: 12, color: 'var(--color-g)' }}>NETHERLANDS</p>
              <span className="k-badge" style={{ fontSize: 6 }}>2026 PREDICTED WINNER</span>
            </div>
          </div>
          <p style={{ fontSize: 7, color: 'var(--color-muted)', lineHeight: 2 }}>
            PATH: MOROCCO (R32) → CANADA (R16) → FRANCE (QF) → ARGENTINA (SF) → PORTUGAL (FINAL).
          </p>
          <div style={{ marginTop: 12, background: 'var(--color-r-bg)', border: '1px solid var(--color-r-sh)', padding: 10 }}>
            <p style={{ fontSize: 7, color: 'var(--color-txt)' }}>
              <strong style={{ color: 'var(--color-r)' }}>⚡ BIGGEST UPSET:</strong>{' '}
              JAPAN DEFEAT BRAZIL IN THE ROUND OF 32.
            </p>
          </div>
        </div>
      </section>

      <section className="fade-in delay-3">
        <h2 style={{ fontSize: 9, color: 'var(--color-b)', marginBottom: 16 }}>REFERENCES</h2>
        <div style={{ fontSize: 6, color: 'var(--color-muted)', lineHeight: 2.5, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <p>KLEMENT, J. (2026). FIFA WORLD CUP 2026 PREDICTIONS. PANMURE LIBERUM RESEARCH, 9 APRIL 2026.</p>
          <p>HOFFMANN, R., GING, L.C. &amp; RAMASAMY, B. (2002). THE SOCIOECONOMIC DETERMINANTS OF INTERNATIONAL SOCCER PERFORMANCE. JOURNAL OF APPLIED ECONOMICS, 5(2), 253–272.</p>
        </div>
      </section>

      <div className="fade-in" style={{ paddingTop: 8, borderTop: '2px solid var(--color-brd)', display: 'flex', gap: 12 }}>
        <Btn href="/lookup" variant="red">TRY THE PREDICTOR →</Btn>
        <Btn href="/mc" variant="default">RUN SIMULATIONS</Btn>
      </div>
    </div>
  )
}
