'use client'

import { useState, useCallback, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { teamData } from '@/lib/klement'
import { matchP } from '@/lib/klement-custom'
import { ROUNDS } from '@/lib/fixtures'
import Btn from '@/components/ui/Btn'
import FlagImg from '@/components/ui/FlagImg'

const SIM_N = 2000

interface RoundCounts {
  qf: number
  sf: number
  final: number
  champ: number
}

// Knockout-winnaar volgens het volledige custom-model: de gelijkspelkans wordt
// weggenormaliseerd zodat er altijd één team doorgaat (penalty-achtige resolutie).
function koWinner(a: string, b: string): string {
  const { pA, pB } = matchP(a, b)
  return Math.random() < pA / (pA + pB) ? a : b
}

function runSims(n: number): Record<string, RoundCounts> {
  const counts: Record<string, RoundCounts> = {}
  const bump = (team: string, key: keyof RoundCounts) => {
    const c = counts[team] ?? (counts[team] = { qf: 0, sf: 0, final: 0, champ: 0 })
    c[key]++
  }

  for (let i = 0; i < n; i++) {
    const r16 = ROUNDS.r32.map(m => koWinner(m.teamA, m.teamB))
    const qf: string[] = []
    for (let j = 0; j < r16.length; j += 2) qf.push(koWinner(r16[j], r16[j + 1]))
    qf.forEach(t => bump(t, 'qf'))
    const sf: string[] = []
    for (let j = 0; j < qf.length; j += 2) sf.push(koWinner(qf[j], qf[j + 1]))
    sf.forEach(t => bump(t, 'sf'))
    const finalists: string[] = []
    for (let j = 0; j < sf.length; j += 2) finalists.push(koWinner(sf[j], sf[j + 1]))
    finalists.forEach(t => bump(t, 'final'))
    bump(koWinner(finalists[0], finalists[1]), 'champ')
  }
  return counts
}

export default function ModelMonteCarlo() {
  const t = useTranslations('model')
  const [counts, setCounts] = useState<Record<string, RoundCounts> | null>(null)
  const [running, setRunning] = useState(false)

  const run = useCallback(() => {
    setRunning(true)
    // Laat de "running"-status renderen vóór de blokkerende lus
    setTimeout(() => {
      setCounts(runSims(SIM_N))
      setRunning(false)
    }, 20)
  }, [])

  // Initiële run ná mount (niet tijdens render) zodat de tabel meteen gevuld is.
  // De simulatie gebruikt Math.random — server- en client-render zouden anders
  // verschillen en een hydration-mismatch geven, dus dit moet client-side gebeuren.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { run() }, [run])

  const pct = (v: number) => `${Math.round((v / SIM_N) * 100)}%`

  const top8 = counts
    ? Object.entries(counts).sort((a, b) => b[1].champ - a[1].champ).slice(0, 8)
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
