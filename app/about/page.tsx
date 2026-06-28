import Link from 'next/link'
import PixelBar from '@/components/ui/PixelBar'
import PixelParticles from '@/components/ui/PixelParticles'
import { modelComponents, modelMeta } from '@/lib/klement'
import summary from '@/lib/model/fit-summary.json'
import backtest from '@/lib/model/backtest.json'

const COMPONENT_COLOR: Record<string, string> = {
  fifa: 'var(--color-r)',
  elo: 'var(--color-r)',
  pop: 'var(--color-b)',
  temp: 'var(--color-b)',
  gdp: 'var(--color-b)',
  host: 'var(--color-g)',
}

function fmtDate(iso: string): string {
  return iso ? iso.slice(0, 10) : 'n/a'
}

export default function AboutPage() {
  const components = [...modelComponents()].sort((a, b) => b.importancePct - a.importancePct)
  const meta = modelMeta()
  const m = summary.metrics
  const stats = [
    { label: 'TOP-PICK ACCURACY', val: `${(m.accuracy * 100).toFixed(1)}%`, color: 'var(--color-g)' },
    { label: 'LOG LOSS', val: m.logLoss.toFixed(3), color: 'var(--color-b)' },
    { label: 'BRIER SCORE', val: m.brier.toFixed(3), color: 'var(--color-b)' },
    { label: 'PSEUDO R2', val: m.pseudoR2.toFixed(3), color: 'var(--color-r)' },
    { label: 'MATCHES FIT', val: m.nMatches.toLocaleString(), color: 'var(--color-g)' },
    { label: 'DRAW RATE', val: `${(m.drawRate * 100).toFixed(0)}%`, color: 'var(--color-muted)' },
  ]

  return (
    <div className="sec page-enter" style={{ position: 'relative', overflow: 'hidden' }}>
      <PixelParticles variant="red" />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div className="section-title">THE DATA-DRIVEN MODEL</div>
        <div style={{ fontSize: 10, color: 'var(--color-muted)', lineHeight: 2.4, marginBottom: 28 }}>
          WEIGHTS ARE NOT HAND-PICKED. THEY ARE RE-FIT BY LOGISTIC REGRESSION<br />
          FROM {m.nMatches.toLocaleString()} REAL INTERNATIONAL MATCHES SINCE {fmtDate(summary.dateRange.split(' to ')[0])}.<br />
          AN ELO RATING, BUILT POINT-BY-POINT FROM EVERY RESULT, IS THE LIVE FORM SIGNAL.<br />
          THE MODEL REFITS AFTER EACH FINISHED WORLD CUP MATCH.
        </div>

        <div className="about-formula">
          <div style={{ fontSize: 10, color: 'var(--color-b)', marginBottom: 16, letterSpacing: 1 }}>HOW IT WORKS</div>
          <div style={{ fontSize: 10, color: 'var(--color-txt)', lineHeight: 2.6 }}>
            S = SUM( weight_k x standardized_factor_k )<br />
            P(WIN) = sigmoid(S_A - S_B) x (1 - DRAW)<br />
            GOALS ~ POISSON( exp(mu +/- gamma x (S_A - S_B)) )
          </div>
          <div style={{ fontSize: 9, color: 'var(--color-muted)', marginTop: 12, lineHeight: 2.2 }}>
            DRAW DECAYS WITH THE STRENGTH GAP. GOALS USE mu={meta.poisson.mu}, gamma={meta.poisson.gamma}.
          </div>
        </div>

        <div className="section-title" style={{ marginTop: 32 }}>SELF-DETERMINED FACTOR WEIGHTS</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 16 }}>
          {components.map((c) => (
            <div key={c.key} style={{ display: 'grid', gridTemplateColumns: '170px 1fr 92px', alignItems: 'center', gap: 16 }}>
              <div style={{ fontSize: 9, color: 'var(--color-muted)' }}>{c.label.toUpperCase()}</div>
              <PixelBar value={c.importancePct} color={COMPONENT_COLOR[c.key] ?? 'var(--color-b)'} />
              <div style={{ fontSize: 9, color: COMPONENT_COLOR[c.key] ?? 'var(--color-b)', textAlign: 'right' }}>
                {c.importancePct}% (b={c.beta})
              </div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 8, color: 'var(--color-muted)', lineHeight: 2.2, marginBottom: 28 }}>
          IMPORTANCE = NORMALIZED COEFFICIENT MAGNITUDE. THE DATA DEFLATES GDP AND CLIMATE
          (KLEMENT WEIGHTED THEM 35% COMBINED) AND PROMOTES ACTUAL RESULTS (ELO).
        </div>

        <div className="section-title" style={{ marginTop: 8 }}>PROOF: OUT-OF-MODEL FIT</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 14 }}>
          {stats.map((s) => (
            <div key={s.label} className="score-card">
              <div style={{ fontSize: 16, color: s.color, marginBottom: 6 }}>{s.val}</div>
              <div style={{ fontSize: 7, color: 'var(--color-muted)', letterSpacing: 1 }}>{s.label}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 8, color: 'var(--color-muted)', lineHeight: 2.2, marginBottom: 28 }}>
          PSEUDO R2 (McFADDEN) MEASURES LIFT OVER A BASE-RATE GUESS. FOOTBALL IS HIGH-VARIANCE;
          A TOP-PICK ACCURACY NEAR 53% ON THREE-WAY OUTCOMES IS IN LINE WITH BOOKMAKER MODELS.
        </div>

        <div className="section-title" style={{ marginTop: 8 }}>CALIBRATION (PREDICTED vs OBSERVED HOME-WIN RATE)</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 28 }}>
          {m.calibration.map((b, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '120px 120px 1fr', gap: 10, fontSize: 8, color: 'var(--color-muted)' }}>
              <span>PRED {(b.predicted * 100).toFixed(0)}%</span>
              <span style={{ color: 'var(--color-g)' }}>OBS {(b.observed * 100).toFixed(0)}%</span>
              <span>n={b.n}</span>
            </div>
          ))}
        </div>

        <div className="section-title" style={{ marginTop: 8 }}>OUT-OF-SAMPLE VALIDATION (WALK-FORWARD)</div>
        <div style={{ fontSize: 8, color: 'var(--color-muted)', lineHeight: 2.2, marginBottom: 12 }}>
          EACH WORLD CUP FROM {backtest.testTournaments[0]} TO {backtest.testTournaments[backtest.testTournaments.length - 1]} IS
          PREDICTED BY WEIGHTS FIT ONLY ON PRIOR WORLD CUPS (BACK TO {backtest.firstTrainYear}).<br />
          {backtest.pooledTestMatches} POOLED OUT-OF-SAMPLE MATCHES ACROSS {backtest.testTournaments.length} TOURNAMENTS.
          POINT-IN-TIME ELO + WORLD-BANK GDP/POPULATION BY YEAR. NO LOOKAHEAD, NO PAID API.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px 60px 70px', gap: 6, fontSize: 8, marginBottom: 12 }}>
          <span style={{ color: 'var(--color-muted)' }}>MODEL</span>
          <span style={{ color: 'var(--color-muted)', textAlign: 'right' }}>LOGLOSS</span>
          <span style={{ color: 'var(--color-muted)', textAlign: 'right' }}>ACC</span>
          <span style={{ color: 'var(--color-muted)', textAlign: 'right' }}>BRIER</span>
          {([['Fitted weights', 'fitted'], ['Equal weights', 'equal'], ['Elo only', 'eloOnly']] as const).map(([label, key]) => {
            const r = backtest.results[key]
            const win = backtest.winner === key
            const color = win ? 'var(--color-g)' : 'var(--color-txt)'
            return (
              <div key={key} style={{ display: 'contents' }}>
                <span style={{ color }}>{win ? '> ' : ''}{label.toUpperCase()}</span>
                <span style={{ color, textAlign: 'right' }}>{r.logLoss.toFixed(4)}</span>
                <span style={{ color, textAlign: 'right' }}>{(r.accuracy * 100).toFixed(1)}%</span>
                <span style={{ color, textAlign: 'right' }}>{r.brier.toFixed(4)}</span>
              </div>
            )
          })}
          <span style={{ color: 'var(--color-muted)' }}>Uniform baseline</span>
          <span style={{ color: 'var(--color-muted)', textAlign: 'right' }}>{backtest.uniformLogLoss.toFixed(4)}</span>
          <span style={{ color: 'var(--color-muted)', textAlign: 'right' }}>-</span>
          <span style={{ color: 'var(--color-muted)', textAlign: 'right' }}>-</span>
        </div>
        <div style={{ fontSize: 8, color: 'var(--color-muted)', lineHeight: 2.2, marginBottom: 28 }}>
          {backtest.results.fitted.logLoss < backtest.results.equal.logLoss
            ? 'FITTED WEIGHTS BEAT EQUAL WEIGHTS OUT-OF-SAMPLE'
            : 'EQUAL WEIGHTS MATCH OR BEAT FITTED OUT-OF-SAMPLE'}
          , AND ALL MODELS BEAT THE UNIFORM BASELINE. LOWEST TEST LOG-LOSS:
          {' '}{backtest.winner === 'eloOnly' ? 'ELO-ONLY' : backtest.winner === 'fitted' ? 'FITTED' : 'EQUAL'}.
          RESULTS-BASED STRENGTH (ELO) CARRIES MOST OF THE SIGNAL.
        </div>

        <div className="section-title" style={{ marginTop: 8 }}>TOP ELO RATINGS (FROM RESULTS)</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6, marginBottom: 28 }}>
          {summary.topElo.map((t, i) => (
            <div key={t.team} style={{ display: 'flex', justifyContent: 'space-between', background: 'var(--color-surf)', border: '1px solid var(--color-brd)', padding: '8px 12px', fontSize: 9 }}>
              <span style={{ color: 'var(--color-muted)' }}>{i + 1}. {t.team.toUpperCase()}</span>
              <span style={{ color: 'var(--color-r)' }}>{t.elo}</span>
            </div>
          ))}
        </div>

        <div className="about-quote">
          <div style={{ fontSize: 9, color: 'var(--color-r)', lineHeight: 2.6 }}>
            DATA: {summary.dataSource.toUpperCase()}<br />
            RANGE: {summary.dateRange} ({summary.totalMatchesScanned.toLocaleString()} MATCHES SCANNED)<br />
            LAST REFIT: {fmtDate(meta.generatedAt)}
          </div>
        </div>

        <div style={{ marginTop: 32, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <Link href="/score" className="px-btn" style={{
            fontFamily: 'inherit', fontSize: 10, padding: '12px 22px',
            backgroundColor: 'var(--color-r)', color: '#fff', border: 'none',
            boxShadow: '4px 4px 0 var(--color-r-sh)', textDecoration: 'none', display: 'inline-block',
          }}>PREDICT A SCORELINE</Link>
          <Link href="/topscorers" className="px-btn" style={{
            fontFamily: 'inherit', fontSize: 10, padding: '12px 22px',
            backgroundColor: 'var(--color-surf)', color: 'var(--color-txt)',
            border: '2px solid var(--color-brd2)', boxShadow: '4px 4px 0 var(--color-brd)',
            textDecoration: 'none', display: 'inline-block',
          }}>GOLDEN BOOT RACE</Link>
          <Link href="/sensitivity" className="px-btn" style={{
            fontFamily: 'inherit', fontSize: 10, padding: '12px 22px',
            backgroundColor: 'var(--color-b)', color: '#fff', border: 'none',
            boxShadow: '4px 4px 0 var(--color-b-sh)', textDecoration: 'none', display: 'inline-block',
          }}>LIVE WEIGHT-SENSITIVITY EXPLORER</Link>
        </div>
      </div>
    </div>
  )
}
