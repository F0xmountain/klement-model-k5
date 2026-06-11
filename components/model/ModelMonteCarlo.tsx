'use client'

import { useState, useCallback, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { teamData } from '@/lib/klement'
import { runMonteCarlo, type McResult } from '@/lib/monte-carlo'
import TimeAgo from '@/components/ui/TimeAgo'
import Btn from '@/components/ui/Btn'
import FlagImg from '@/components/ui/FlagImg'

const SIM_N = 2000

interface Props {
  initial: McResult | null
  lastUpdated: string | null
}

export default function ModelMonteCarlo({ initial, lastUpdated }: Props) {
  const t = useTranslations('model')
  // Cache uit mc-cache.json heeft voorrang; live-resultaat overschrijft de tijdstempel.
  const hasCache = !!initial && Object.keys(initial.teams).length > 0
  const [data, setData] = useState<McResult | null>(hasCache ? initial : null)
  const [stamp, setStamp] = useState<string | null>(hasCache ? lastUpdated : null)
  const [running, setRunning] = useState(false)

  const run = useCallback(() => {
    setRunning(true)
    // Laat de "running"-status renderen vóór de blokkerende lus
    setTimeout(() => {
      setData(runMonteCarlo(SIM_N))
      setStamp(new Date().toISOString())
      setRunning(false)
    }, 20)
  }, [])

  // Live-fallback: alleen een run bij mount als er geen cache is. Ná mount (niet
  // tijdens render) want runMonteCarlo gebruikt Math.random → anders hydration-mismatch.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!hasCache) run()
  }, [hasCache, run])

  const pct = (v: number) => `${data ? Math.round((v / data.n) * 100) : 0}%`

  const top8 = data
    ? Object.entries(data.teams).sort((a, b) => b[1].champ - a[1].champ).slice(0, 8)
    : null

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16, flexWrap: 'wrap' }}>
        <Btn variant="green" onClick={run} disabled={running}>
          {running ? t('mcRunning') : t('mcRun')}
        </Btn>
        <span style={{ fontSize: 8, color: 'var(--color-muted)' }}>
          {SIM_N.toLocaleString()} {t('mcSimsLabel')}
        </span>
        {stamp && (
          <span style={{ fontSize: 8, color: 'var(--color-muted)' }}>
            · {t('mcLastUpdated')} <TimeAgo iso={stamp} />
          </span>
        )}
      </div>

      {top8 && (
        <div className="factor-card" style={{ overflowX: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.6fr repeat(4, 1fr)', gap: 8, fontSize: 8, color: 'var(--color-muted)', marginBottom: 10, minWidth: 360 }}>
            <span>{t('mcColTeam')}</span>
            <span style={{ textAlign: 'right' }}>{t('mcColQf')}</span>
            <span style={{ textAlign: 'right' }}>{t('mcColSf')}</span>
            <span style={{ textAlign: 'right' }}>{t('mcColFinal')}</span>
            <span style={{ textAlign: 'right' }}>{t('mcColChamp')}</span>
          </div>
          {top8.map(([team, c]) => (
            <div key={team} style={{ display: 'grid', gridTemplateColumns: '1.6fr repeat(4, 1fr)', gap: 8, fontSize: 9, alignItems: 'center', padding: '6px 0', borderTop: '1px solid var(--color-brd)', minWidth: 360 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <FlagImg name={team} h={14} emoji={teamData(team)?.flag ?? '🏳️'} />
                {team}
              </span>
              <span style={{ textAlign: 'right', color: 'var(--color-muted)' }}>{pct(c.qf)}</span>
              <span style={{ textAlign: 'right', color: 'var(--color-muted)' }}>{pct(c.sf)}</span>
              <span style={{ textAlign: 'right', color: 'var(--color-b)' }}>{pct(c.final)}</span>
              <span style={{ textAlign: 'right', color: 'var(--color-g)' }}>{pct(c.champ)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
