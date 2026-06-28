'use client'
import { useState } from 'react'
import { predictScore, scoreMatrix, teamNames, teamData } from '@/lib/klement'
import WDLBar from '@/components/ui/WDLBar'
import FlagImg from '@/components/ui/FlagImg'
import TeamSelect from '@/components/ui/TeamSelect'
import PixelBar from '@/components/ui/PixelBar'
import PixelParticles from '@/components/ui/PixelParticles'

const allTeams = teamNames().sort()
const GRID = 6

export default function ScorePage() {
  const [teamA, setTeamA] = useState('Netherlands')
  const [teamB, setTeamB] = useState('Brazil')

  const p = predictScore(teamA, teamB)
  const grid = scoreMatrix(teamA, teamB, GRID)
  const tA = teamData(teamA)
  const tB = teamData(teamB)
  const maxCell = Math.max(...grid.flat())
  const maxLine = Math.max(...p.topScorelines.map((s) => s.p))

  const markets = [
    { label: 'MOST LIKELY', val: `${p.likely.a}-${p.likely.b}`, sub: `${(p.likely.p * 100).toFixed(1)}%`, color: 'var(--color-g)' },
    { label: 'BOTH TEAMS SCORE', val: `${(p.btts * 100).toFixed(0)}%`, sub: 'BTTS', color: 'var(--color-b)' },
    { label: 'OVER 2.5 GOALS', val: `${(p.over25 * 100).toFixed(0)}%`, sub: `xG ${(p.lambdaA + p.lambdaB).toFixed(2)}`, color: 'var(--color-r)' },
  ]

  function surprise() {
    const a = allTeams[Math.floor(Math.random() * allTeams.length)]
    let b = allTeams[Math.floor(Math.random() * allTeams.length)]
    if (b === a) b = allTeams[(allTeams.indexOf(a) + 1) % allTeams.length]
    setTeamA(a)
    setTeamB(b)
  }

  return (
    <div className="sec page-enter" style={{ position: 'relative', overflow: 'hidden' }}>
      <PixelParticles variant="blue" />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div className="section-title" style={{ marginBottom: 0 }}>SCORE PREDICTION</div>
          <button className="px-btn" onClick={surprise} style={{ fontSize: 8, padding: '6px 12px', fontFamily: 'inherit', border: '2px solid var(--color-brd2)', background: 'var(--color-surf)', color: 'var(--color-txt)' }}>RANDOM</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 16, alignItems: 'center', marginBottom: 24 }}>
          <TeamSelect teams={allTeams} value={teamA} onChange={setTeamA} />
          <div style={{ fontSize: 14, color: 'var(--color-r)', textAlign: 'center', fontWeight: 'bold', padding: '0 8px' }}>VS</div>
          <TeamSelect teams={allTeams} value={teamB} onChange={setTeamB} />
        </div>

        <div className="pred-banner" style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 8, color: 'var(--color-g)', letterSpacing: 2, marginBottom: 14 }}>MOST LIKELY SCORELINE</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, width: 120 }}>
              <FlagImg name={teamA} h={28} emoji={tA?.flag ?? '🏳'} />
              <span style={{ fontSize: 8, color: 'var(--color-muted)' }}>{teamA.toUpperCase()}</span>
            </div>
            <div style={{ fontSize: 30, color: 'var(--color-txt)' }}>{p.likely.a} - {p.likely.b}</div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, width: 120 }}>
              <FlagImg name={teamB} h={28} emoji={tB?.flag ?? '🏳'} />
              <span style={{ fontSize: 8, color: 'var(--color-muted)' }}>{teamB.toUpperCase()}</span>
            </div>
          </div>
          <div style={{ fontSize: 9, color: 'var(--color-muted)', marginTop: 14 }}>
            EXPECTED GOALS {p.lambdaA.toFixed(2)} - {p.lambdaB.toFixed(2)}
          </div>
        </div>

        <WDLBar pA={p.pHome} dr={p.pDraw} pB={p.pAway} labelA={teamA} labelB={teamB} />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 24, marginBottom: 28 }}>
          {markets.map((mk) => (
            <div key={mk.label} className="score-card">
              <div style={{ fontSize: 18, color: mk.color, marginBottom: 6 }}>{mk.val}</div>
              <div style={{ fontSize: 7, color: 'var(--color-muted)', letterSpacing: 1 }}>{mk.label}</div>
              <div style={{ fontSize: 7, color: 'var(--color-muted)', marginTop: 4 }}>{mk.sub}</div>
            </div>
          ))}
        </div>

        <div className="section-title">MOST PROBABLE SCORELINES</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
          {p.topScorelines.map((s) => (
            <div key={`${s.a}-${s.b}`} style={{ display: 'grid', gridTemplateColumns: '60px 1fr 52px', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 11, color: 'var(--color-txt)' }}>{s.a} - {s.b}</span>
              <PixelBar value={(s.p / maxLine) * 100} color="var(--color-g-mid)" />
              <span style={{ fontSize: 9, color: 'var(--color-g)', textAlign: 'right' }}>{(s.p * 100).toFixed(1)}%</span>
            </div>
          ))}
        </div>

        <div className="section-title">SCORELINE HEATMAP</div>
        <div style={{ fontSize: 8, color: 'var(--color-muted)', marginBottom: 10 }}>
          ROWS: {teamA.toUpperCase()} GOALS &middot; COLUMNS: {teamB.toUpperCase()} GOALS
        </div>
        <div style={{ overflowX: 'auto' }}>
          <div style={{ display: 'inline-grid', gridTemplateColumns: `28px repeat(${GRID}, 40px)`, gap: 2 }}>
            <div />
            {Array.from({ length: GRID }, (_, b) => (
              <div key={`h${b}`} style={{ fontSize: 8, color: 'var(--color-muted)', textAlign: 'center' }}>{b}</div>
            ))}
            {grid.map((row, a) => (
              <Row key={`r${a}`} a={a} row={row} maxCell={maxCell} likely={p.likely} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function Row({ a, row, maxCell, likely }: { a: number; row: number[]; maxCell: number; likely: { a: number; b: number } }) {
  return (
    <>
      <div style={{ fontSize: 8, color: 'var(--color-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{a}</div>
      {row.map((cell, b) => {
        const intensity = cell / maxCell
        const isLikely = a === likely.a && b === likely.b
        return (
          <div
            key={b}
            style={{
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 8,
              color: intensity > 0.5 ? '#fff' : 'var(--color-muted)',
              backgroundColor: `rgba(59, 109, 17, ${intensity.toFixed(3)})`,
              border: isLikely ? '2px solid var(--color-r)' : '1px solid var(--color-brd)',
            }}
          >
            {(cell * 100).toFixed(0)}
          </div>
        )
      })}
    </>
  )
}
