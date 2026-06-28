import Link from 'next/link'
import Image from 'next/image'
import PixelBar from '@/components/ui/PixelBar'
import PixelParticles from '@/components/ui/PixelParticles'
import FlagImg from '@/components/ui/FlagImg'
import PolymarketBtn from '@/components/ui/PolymarketBtn'
import { modelComponents, teamData } from '@/lib/klement'
import { ROUNDS } from '@/lib/fixtures'
import summary from '@/lib/model/fit-summary.json'

const COMPONENT_COLOR: Record<string, string> = {
  fifa: 'var(--color-r)', elo: 'var(--color-r)', pop: 'var(--color-b)',
  temp: 'var(--color-b)', gdp: 'var(--color-g)', host: 'var(--color-g)',
}

const factors = [...modelComponents()]
  .sort((a, b) => b.importancePct - a.importancePct)
  .map((c) => ({ label: c.label.toUpperCase(), pct: c.importancePct, color: COMPONENT_COLOR[c.key] ?? 'var(--color-b)' }))

const champion = ROUNDS.final[0].k

function championPath(champ: string): string[] {
  const order = ['r32', 'r16', 'qf', 'sf', 'final']
  const path: string[] = []
  for (const round of order) {
    const match = ROUNDS[round].find((m) => m.teamA === champ || m.teamB === champ)
    if (match) path.push(match.teamA === champ ? match.teamB : match.teamA)
  }
  return path
}

export default function LandingPage() {
  const path = championPath(champion)
  const championFlag = teamData(champion)?.flag ?? '🏳'
  return (
    <div className="page-enter">

      {/* ── HERO ── */}
      <div className="sec" style={{ position: 'relative', overflow: 'hidden', paddingTop: 48, paddingBottom: 48 }}>
        <div className="dot-grid" style={{ position: 'absolute', inset: 0 }} />
        <div className="scanline" />
        <PixelParticles variant="mix" />

        <div style={{ position: 'relative', zIndex: 1, display: 'grid', gridTemplateColumns: '1fr 220px', gap: 32, alignItems: 'center' }}>
          {/* Left — text */}
          <div>
            <div className="eyebrow fade-in">PANMURE LIBERUM · APRIL 2026</div>
            <div className="txt-shadow-r fade-in delay-1" style={{ fontSize: 22, color: 'var(--color-r)', lineHeight: 1.5, marginBottom: 16 }}>
              WHO WINS THE<br />
              <span style={{ color: 'var(--color-g)', textShadow: '3px 3px 0 var(--color-g-sh)' }}>2026 WORLD CUP?</span>
            </div>
            <div className="fade-in delay-2" style={{ fontSize: 9, color: 'var(--color-muted)', lineHeight: 2.2, maxWidth: 480, marginBottom: 28 }}>
              AN ECONOMETRIC MODEL, NOW RE-FIT FROM {summary.totalMatchesScanned.toLocaleString()} REAL
              INTERNATIONAL RESULTS AND UPDATED AFTER EVERY MATCH.
            </div>
            <div className="fade-in delay-3" style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
              <Link href="/versus" className="px-btn" style={{
                fontFamily: 'inherit', fontSize: 10, padding: '12px 22px',
                backgroundColor: 'var(--color-r)', color: '#fff', border: 'none',
                boxShadow: '4px 4px 0 var(--color-r-sh)', textDecoration: 'none', display: 'inline-block',
              }}>▶ PREDICT MATCH</Link>
              <Link href="/about" className="px-btn" style={{
                fontFamily: 'inherit', fontSize: 10, padding: '12px 22px',
                backgroundColor: 'var(--color-bg)', color: 'var(--color-b)',
                border: '2px solid var(--color-b)', boxShadow: '4px 4px 0 var(--color-b-sh)',
                textDecoration: 'none', display: 'inline-block',
              }}>? HOW IT WORKS</Link>
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

      {/* ── STATS BAR ── */}
      <div className="stats-bar">
        {[
          { num: '48',   label: 'QUALIFIED TEAMS', color: 'var(--color-r)', sh: 'var(--color-r-sh)' },
          { num: '3',    label: 'CORRECT CALLS',  color: 'var(--color-g)', sh: 'var(--color-g-sh)' },
          { num: `${(summary.metrics.accuracy * 100).toFixed(0)}%`, label: 'TOP-PICK ACCURACY', color: 'var(--color-b)', sh: 'var(--color-b-sh)' },
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
          <div className="section-title">TRACK RECORD</div>
          <div className="record-grid">
            {[
              { year: '2014', team: 'Germany',   name: 'GERMANY',   emoji: '🇩🇪' },
              { year: '2018', team: 'France',    name: 'FRANCE',    emoji: '🇫🇷' },
              { year: '2022', team: 'Argentina', name: 'ARGENTINA', emoji: '🇦🇷' },
            ].map(({ year, team, name, emoji }) => (
              <div key={year} className="record-card">
                <div className="record-badge">✓ WIN</div>
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
          <div className="section-title">MODEL PREDICTION: CHAMPION</div>
          <div className="pred-banner">
            <div className="dot-grid" style={{ position: 'absolute', inset: 0, zIndex: 0 }} />
            <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{
                marginBottom: 18,
                border: '3px solid var(--color-g)',
                boxShadow: '6px 6px 0 var(--color-g-sh), 0 0 0 1px var(--color-g)',
                lineHeight: 0,
              }}>
                <FlagImg name={champion} h={90} emoji={championFlag} />
              </div>
              <div className="txt-shadow-g" style={{ fontSize: 18, color: 'var(--color-g)', marginBottom: 12 }}>
                {champion.toUpperCase()}<span className="blink">_</span>
              </div>
              <div style={{ fontSize: 8, color: 'var(--color-g)', opacity: 0.75, lineHeight: 2.2 }}>
                THE CURRENT DATA-DRIVEN BRACKET WINNER<br />
                PATH: {path.map((p) => p.toUpperCase()).join('  >  ')}
              </div>
              <PolymarketBtn
                teamName={champion}
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
          <div className="section-title">SELF-DETERMINED WEIGHTS</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {factors.map(({ label, pct, color }) => (
              <div key={label} style={{ display: 'grid', gridTemplateColumns: '170px 1fr 42px', alignItems: 'center', gap: 14 }}>
                <div style={{ fontSize: 9, color: 'var(--color-muted)' }}>{label}</div>
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
