'use client'

import { useState, useCallback, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { teamData } from '@/lib/klement'
import { simulateTournament, type SimResult } from '@/lib/simulate-tournament'
import Btn from '@/components/ui/Btn'
import FlagImg from '@/components/ui/FlagImg'

const SIM_N = 10000

const COLS: { key: keyof Pick<SimResult, 'reachR32' | 'reachR16' | 'reachQF' | 'reachSF' | 'reachFinal' | 'champion'>; label: string; color: string }[] = [
  { key: 'reachR32', label: 'mcColR32', color: 'var(--color-muted)' },
  { key: 'reachR16', label: 'mcColR16', color: 'var(--color-muted)' },
  { key: 'reachQF', label: 'mcColQf', color: 'var(--color-muted)' },
  { key: 'reachSF', label: 'mcColSf', color: 'var(--color-muted)' },
  { key: 'reachFinal', label: 'mcColFinal', color: 'var(--color-b)' },
  { key: 'champion', label: 'mcColChamp', color: 'var(--color-g)' },
]

export default function ModelMonteCarlo() {
  const t = useTranslations('model')
  const [sim, setSim] = useState<SimResult | null>(null)
  const [running, setRunning] = useState(false)

  const run = useCallback(() => {
    setRunning(true)
    // Laat de "running"-status renderen vóór de blokkerende lus
    setTimeout(() => {
      setSim(simulateTournament(SIM_N))
      setRunning(false)
    }, 20)
  }, [])

  // Initiële run ná mount (niet tijdens render) — de simulatie gebruikt Math.random,
  // dus server- en client-render zouden anders verschillen (hydration-mismatch).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    run()
  }, [run])

  const top = sim
    ? Object.entries(sim.champion).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([team]) => team)
    : null
  const pct = (m: Record<string, number>, team: string) => sim ? `${Math.round((m[team] ?? 0) / sim.n * 100)}%` : '0%'

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16, flexWrap: 'wrap' }}>
        <Btn variant="green" onClick={run} disabled={running}>
          {running ? t('mcRunning') : t('mcRun')}
        </Btn>
        <span style={{ fontSize: 8, color: 'var(--color-muted)' }}>
          {SIM_N.toLocaleString()} {t('mcSimsLabel')}
        </span>
      </div>

      {top && (
        <div className="factor-card" style={{ overflowX: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.6fr repeat(6, 1fr)', gap: 6, fontSize: 8, color: 'var(--color-muted)', marginBottom: 10, minWidth: 480 }}>
            <span>{t('mcColTeam')}</span>
            {COLS.map(c => <span key={c.key} style={{ textAlign: 'right' }}>{t(c.label)}</span>)}
          </div>
          {top.map(team => (
            <div key={team} style={{ display: 'grid', gridTemplateColumns: '1.6fr repeat(6, 1fr)', gap: 6, fontSize: 9, alignItems: 'center', padding: '6px 0', borderTop: '1px solid var(--color-brd)', minWidth: 480 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
                <FlagImg name={team} h={14} emoji={teamData(team)?.flag ?? '🏳️'} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{team}</span>
              </span>
              {COLS.map(c => (
                <span key={c.key} style={{ textAlign: 'right', color: c.color }}>{pct(sim![c.key], team)}</span>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
