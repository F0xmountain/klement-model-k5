'use client'

import { useMemo, useState } from 'react'
import { teamNames } from '@/lib/klement'
import {
  matchPairSensitivity, championSensitivity, SENS_DELTA,
  type FactorSens,
} from '@/lib/sensitivity'
import type { ModelWeights } from '@/lib/model-config'

// Admin-only paneel — bewust Engelstalig (geen i18n), conform de master-prompt.

interface Props {
  weights: ModelWeights
}

const allTeams = teamNames().sort()

const signPct = (d: number) => `${d >= 0 ? '+' : ''}${(d * 100).toFixed(1)}%`
const pct = (v: number) => `${Math.round(v * 100)}%`

function MoverList({ movers, color }: { movers: { team: string; delta: number }[]; color: string }) {
  if (movers.length === 0) return <span style={{ fontSize: 8, color: 'var(--color-muted)' }}>—</span>
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
      {movers.map(m => (
        <span key={m.team} style={{ fontSize: 8, color, whiteSpace: 'nowrap' }}>
          {m.team} {signPct(m.delta)}
        </span>
      ))}
    </div>
  )
}

export default function SensitivityPanel({ weights }: Props) {
  const [open, setOpen] = useState(false)
  const [teamA, setTeamA] = useState('Netherlands')
  const [teamB, setTeamB] = useState('France')

  const [sens, setSens] = useState<FactorSens[] | null>(null)
  const [running, setRunning] = useState(false)

  const pairRows = useMemo(
    () => (teamA === teamB ? [] : matchPairSensitivity(teamA, teamB, weights)),
    [teamA, teamB, weights]
  )

  const runChampion = () => {
    setRunning(true)
    // setTimeout zodat de "running" state eerst rendert vóór de blokkerende sim.
    setTimeout(() => {
      const res = championSensitivity(weights, 500)
      setSens(res)
      setRunning(false)
    }, 20)
  }

  const selectStyle: React.CSSProperties = {
    fontFamily: 'inherit', fontSize: 10, padding: '8px 10px',
    border: '2px solid var(--color-brd2)', backgroundColor: 'var(--color-bg)', color: 'var(--color-txt)',
  }

  return (
    <div className="factor-card" style={{ marginTop: 28 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          fontFamily: 'inherit', fontSize: 11, padding: 0, cursor: 'pointer',
          background: 'none', border: 'none', color: 'var(--color-txt)', width: '100%', textAlign: 'left',
        }}
      >
        {open ? '▾' : '▸'} SENSITIVITY ANALYSIS
      </button>

      {open && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 9, color: 'var(--color-muted)', lineHeight: 1.9, marginBottom: 16 }}>
            How much does each weight move the outcome? Each row bumps one weight by +{SENS_DELTA.toFixed(2)} and
            recomputes. Match-level updates live; champion-level runs a paired 500-sim Monte Carlo.
          </div>

          {/* Wedstrijdpaar-selectie */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 14 }}>
            <select value={teamA} onChange={e => setTeamA(e.target.value)} style={selectStyle}>
              {allTeams.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <span style={{ fontSize: 10, color: 'var(--color-muted)' }}>vs</span>
            <select value={teamB} onChange={e => setTeamB(e.target.value)} style={selectStyle}>
              {allTeams.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* Wedstrijdpaar-tabel */}
          <div style={{ display: 'grid', gridTemplateColumns: '2.4fr 1fr 1.4fr', gap: 10, fontSize: 8, color: 'var(--color-muted)', marginBottom: 8 }}>
            <span>FACTOR</span>
            <span style={{ textAlign: 'right' }}>WEIGHT</span>
            <span style={{ textAlign: 'right' }}>Δ P({teamA} win)</span>
          </div>
          {pairRows.map(r => (
            <div key={r.factor} style={{ display: 'grid', gridTemplateColumns: '2.4fr 1fr 1.4fr', gap: 10, fontSize: 9, alignItems: 'center', padding: '6px 0', borderTop: '1px solid var(--color-brd)' }}>
              <span style={{ color: 'var(--color-txt)' }}>{r.label}</span>
              <span style={{ textAlign: 'right', color: 'var(--color-muted)' }}>{pct(r.currentWeight)}</span>
              <span style={{ textAlign: 'right', color: r.deltaPA >= 0 ? 'var(--color-g)' : 'var(--color-r)', fontFamily: 'var(--font-pixel)' }}>
                {signPct(r.deltaPA)}
              </span>
            </div>
          ))}
          {teamA === teamB && (
            <div style={{ fontSize: 9, color: 'var(--color-r)', padding: '8px 0' }}>Pick two different teams.</div>
          )}

          {/* Champion-kans sensitiviteit */}
          <div style={{ marginTop: 24, marginBottom: 10, fontSize: 10, color: 'var(--color-txt)' }}>
            Champion-probability sensitivity — biggest movers per +{SENS_DELTA.toFixed(2)} weight
          </div>
          <button
            onClick={runChampion}
            disabled={running}
            className="px-btn"
            style={{
              fontFamily: 'inherit', fontSize: 10, padding: '10px 18px', cursor: running ? 'default' : 'pointer',
              backgroundColor: running ? 'var(--color-brd2)' : 'var(--color-b)', color: '#fff', border: 'none',
              boxShadow: '4px 4px 0 var(--color-b-sh)',
            }}
          >
            {running ? '⏳ Computing 500 sims…' : sens ? '↻ Recompute' : '▶ Run champion sensitivity (500 sims)'}
          </button>

          {sens && !running && (
            <div style={{ marginTop: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 2.2fr 2.2fr', gap: 10, fontSize: 8, color: 'var(--color-muted)', marginBottom: 8 }}>
                <span>FACTOR +{SENS_DELTA.toFixed(2)}</span>
                <span>🔼 BIGGEST GAINERS</span>
                <span>🔽 BIGGEST LOSERS</span>
              </div>
              {sens.map(f => (
                <div key={f.factor} style={{ display: 'grid', gridTemplateColumns: '1.6fr 2.2fr 2.2fr', gap: 10, alignItems: 'start', padding: '8px 0', borderTop: '1px solid var(--color-brd)' }}>
                  <span style={{ fontSize: 9, color: 'var(--color-txt)' }}>{f.label}</span>
                  <MoverList movers={f.winners} color="var(--color-g)" />
                  <MoverList movers={f.losers} color="var(--color-r)" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
