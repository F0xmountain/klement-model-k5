'use client'
import { useState, useCallback } from 'react'
import { simKO, teamData } from '@/lib/klement'
import { ROUNDS } from '@/lib/fixtures'
import SectionLabel from '@/components/ui/SectionLabel'
import Btn from '@/components/ui/Btn'
import PixelBar from '@/components/ui/PixelBar'

type ChampCounts = Record<string, number>

function simulateTournament(): string {
  const r32 = ROUNDS.r32.map(m => simKO(m.teamA, m.teamB).winner)
  const r16: string[] = []
  for (let i = 0; i < r32.length; i += 2) r16.push(simKO(r32[i], r32[i + 1]).winner)
  const qf: string[] = []
  for (let i = 0; i < r16.length; i += 2) qf.push(simKO(r16[i], r16[i + 1]).winner)
  const sf: string[] = []
  for (let i = 0; i < qf.length; i += 2) sf.push(simKO(qf[i], qf[i + 1]).winner)
  return simKO(sf[0], sf[1]).winner
}

function runSims(n: number): ChampCounts {
  const counts: ChampCounts = {}
  for (let i = 0; i < n; i++) {
    const champ = simulateTournament()
    counts[champ] = (counts[champ] ?? 0) + 1
  }
  return counts
}

export default function MCPage() {
  const [n, setN] = useState(1000)
  const [results, setResults] = useState<ChampCounts | null>(null)
  const [running, setRunning] = useState(false)

  const run = useCallback(() => {
    setRunning(true)
    setTimeout(() => {
      setResults(runSims(n))
      setRunning(false)
    }, 10)
  }, [n])

  const sorted = results
    ? Object.entries(results).sort((a, b) => b[1] - a[1]).slice(0, 15)
    : null
  const maxCount = sorted ? sorted[0]?.[1] ?? 1 : 1

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 24px' }}>
      <div className="fade-in" style={{ marginBottom: 24 }}>
        <SectionLabel>Monte Carlo Simulator</SectionLabel>
        <h1 style={{ fontSize: 14, color: 'var(--color-r)', marginTop: 4 }}>RUN THE TOURNAMENT</h1>
        <p style={{ fontSize: 7, color: 'var(--color-muted)', lineHeight: 2, marginTop: 8 }}>
          EACH SIMULATION RUNS THE FULL 32-TEAM BRACKET WITH RANDOM OUTCOMES
          SAMPLED FROM THE MODEL&apos;S W/D/L PROBABILITIES.
        </p>
      </div>

      <div className="fade-in delay-1" style={{ border: '1px solid var(--color-brd)', boxShadow: '4px 4px 0 var(--color-brd)', padding: 20, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
          <label style={{ fontSize: 7, color: 'var(--color-txt)', minWidth: 96 }}>SIMULATIONS</label>
          <input
            type="range"
            min={100} max={5000} step={100}
            value={n}
            onChange={e => setN(Number(e.target.value))}
            style={{ flex: 1, accentColor: 'var(--color-g)' }}
          />
          <span style={{ fontSize: 10, color: 'var(--color-g)', minWidth: 48, textAlign: 'right' }}>{n.toLocaleString()}</span>
        </div>
        <Btn variant="green" onClick={run} disabled={running}>
          {running ? '⏳ RUNNING...' : `RUN ${n.toLocaleString()} SIMULATIONS →`}
        </Btn>
      </div>

      {sorted && (
        <div className="fade-in delay-2">
          <SectionLabel>Champion Distribution</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {sorted.map(([team, count], i) => {
              const t = teamData(team)
              const pct = ((count / n) * 100).toFixed(1)
              const barWidth = (count / maxCount) * 100
              return (
                <div key={team} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 6, color: 'var(--color-muted)', minWidth: 16, textAlign: 'right' }}>{i + 1}</span>
                  <span style={{ fontSize: 16, minWidth: 24 }}>{t?.flag}</span>
                  <span style={{ fontSize: 7, color: 'var(--color-txt)', minWidth: 96 }}>{team}</span>
                  <div style={{ flex: 1 }}>
                    <PixelBar value={barWidth} color="var(--color-g-mid)" />
                  </div>
                  <span style={{ fontSize: 7, color: 'var(--color-g)', minWidth: 36, textAlign: 'right' }}>{pct}%</span>
                  <span style={{ fontSize: 6, color: 'var(--color-muted)', minWidth: 32, textAlign: 'right' }}>{count}×</span>
                </div>
              )
            })}
          </div>
          <p style={{ marginTop: 20, fontSize: 6, color: 'var(--color-muted)', lineHeight: 2 }}>
            {n} SIMULATIONS COMPLETE. 45% VARIANCE IS UNMODELLED NOISE.
          </p>
        </div>
      )}
    </div>
  )
}
