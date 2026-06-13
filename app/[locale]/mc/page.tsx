'use client'
import { useState, useCallback, useMemo, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { simKO, teamData } from '@/lib/klement'
import { ROUNDS } from '@/lib/fixtures'
import PixelBar from '@/components/ui/PixelBar'
import PixelParticles from '@/components/ui/PixelParticles'
import FlagImg from '@/components/ui/FlagImg'

type ChampCounts = Record<string, number>

const BAR_COLORS = [
  'var(--color-r)', 'var(--color-g)', 'var(--color-b)',
  'var(--color-r)', 'var(--color-g)', 'var(--color-b)',
  'var(--color-r)', 'var(--color-g)',
]

function simulateTournament(): string {
  const r32 = ROUNDS.r32!.map(m => simKO(m.teamA, m.teamB).winner)
  const r16: string[] = []
  for (let i = 0; i < r32.length; i += 2) r16.push(simKO(r32[i]!, r32[i + 1]!).winner)
  const qf: string[] = []
  for (let i = 0; i < r16.length; i += 2) qf.push(simKO(r16[i]!, r16[i + 1]!).winner)
  const sf: string[] = []
  for (let i = 0; i < qf.length; i += 2) sf.push(simKO(qf[i]!, qf[i + 1]!).winner)
  return simKO(sf[0]!, sf[1]!).winner
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
  const t = useTranslations('mc')
  const [n, setN] = useState(1000)
  const [results, setResults] = useState<ChampCounts | null>(null)
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [phase, setPhase] = useState('')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Realistic phase labels shown during loading
  const PHASES = useMemo(() => [
    t('phaseLoading'),
    t('phaseSeeding'),
    t('phaseSimulating'),
    t('phaseEngine'),
    t('phaseAggregating'),
    t('phaseSorting'),
  ], [t])

  const run = useCallback(() => {
    setRunning(true)
    setResults(null)
    setProgress(0)
    setPhase(PHASES[0]!)

    // Visual delay: 1.4s base + scale with N
    const totalDelay = 1400 + Math.floor((n / 5000) * 600)
    const tickInterval = Math.floor(totalDelay / 28)
    let tick = 0

    intervalRef.current = setInterval(() => {
      tick++
      const pct = Math.min(88, Math.round((tick / 28) * 100))
      setProgress(Math.round((pct / 100) * n))
      setPhase(PHASES[Math.min(tick >> 2, PHASES.length - 1)]!)

      if (tick >= 28) {
        clearInterval(intervalRef.current!)
      }
    }, tickInterval)

    setTimeout(() => {
      clearInterval(intervalRef.current!)
      const res = runSims(n)
      setProgress(n)
      setPhase('COMPLETE')
      setResults(res)
      setRunning(false)
    }, totalDelay)
  }, [n, PHASES])

  const sorted = results
    ? Object.entries(results).sort((a, b) => b[1] - a[1]).slice(0, 8)
    : null
  const maxCount = sorted ? sorted[0]?.[1] ?? 1 : 1

  return (
    <div className="sec page-enter" style={{ position: 'relative', overflow: 'hidden' }}>
      <PixelParticles variant="mix" />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div className="section-title">{t('title')}</div>
        <div style={{ fontSize: 10, color: 'var(--color-muted)', lineHeight: 2.2, marginBottom: 28 }}>
          {t('description')}
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 32, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 10, color: 'var(--color-muted)' }}>{t('simulationsLabel')}</div>
          <div style={{ fontSize: 18, color: 'var(--color-b)' }}>{n.toLocaleString()}</div>
          <input
            type="range" min={100} max={5000} step={100} value={n}
            onChange={e => setN(Number(e.target.value))}
            disabled={running}
            style={{ accentColor: 'var(--color-g)', width: 160 }}
          />
          <button
            className="px-btn"
            onClick={run}
            disabled={running}
            style={{
              fontFamily: 'inherit', fontSize: 10, padding: '12px 20px',
              backgroundColor: 'var(--color-g)', color: '#fff', border: 'none',
              boxShadow: '4px 4px 0 var(--color-g-sh)',
              opacity: running ? 0.7 : 1,
            }}
          >
            {running ? t('running') : t('runBtn')}
          </button>
        </div>

        {/* Progress display while running */}
        {running && (
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 9 }}>
              <span style={{ color: 'var(--color-g)' }}>{phase}</span>
              <span style={{ color: 'var(--color-b)' }}>
                {progress.toLocaleString()} / {n.toLocaleString()}
              </span>
            </div>
            <PixelBar value={Math.round((progress / n) * 100)} color="var(--color-g-mid)" />
            <div className="marching" />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4, fontSize: 8, color: 'var(--color-muted)' }}>
              {Math.round((progress / n) * 100)}%
            </div>
          </div>
        )}

        {/* Results */}
        {sorted && !running && (
          <>
            <div className="section-title" style={{ marginTop: 4 }}>{t('championDistribution')}</div>
            {sorted.map(([team, count], i) => {
              const t = teamData(team)
              const pct = Math.round((count / n) * 100)
              return (
                <div key={team} className="mc-row">
                  <div style={{ fontSize: 9, color: 'var(--color-muted)', textAlign: 'center' }}>{i + 1}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10 }}>
                    <FlagImg name={team} h={16} emoji={t?.flag ?? '🏳️'} />
                    {team}
                  </div>
                  <PixelBar value={Math.round((count / maxCount) * 100)} color={BAR_COLORS[i]} />
                  <div style={{ fontSize: 10, color: 'var(--color-g)', textAlign: 'right' }}>{pct}%</div>
                </div>
              )
            })}
            <div style={{ fontSize: 9, color: 'var(--color-muted)', marginTop: 20, lineHeight: 2.2 }}>
              {n.toLocaleString()} {t('simulationsCompleteNote')}
            </div>
          </>
        )}

        {!sorted && !running && (
          <div style={{ fontSize: 10, color: 'var(--color-muted)', padding: '20px 0' }}>
            {t('idleMessage')}
          </div>
        )}
      </div>
    </div>
  )
}
