'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { teamData } from '@/lib/klement'
import { runMonteCarlo, type McResult } from '@/lib/monte-carlo'
import { predictedTopScorers } from '@/lib/topscorers'
import FlagImg from '@/components/ui/FlagImg'
import PixelBar from '@/components/ui/PixelBar'

const SIM_N = 1000

interface Props {
  initial: McResult | null
}

// Positiekleur voor de badge: aanvaller=rood, middenvelder=blauw,
// verdediger=groen, keeper=grijs.
const POS_COLOR: Record<string, string> = {
  attacker: 'var(--color-r)',
  midfielder: 'var(--color-b)',
  defender: 'var(--color-g)',
  goalkeeper: 'var(--color-muted)',
}

export default function TopScorersList({ initial }: Props) {
  const tCat = useTranslations('admin')
  const hasCache = !!initial && Object.keys(initial.teams).length > 0
  const [data, setData] = useState<McResult | null>(hasCache ? initial : null)

  // Live-fallback: alleen een MC-run bij mount als er geen cache is. Ná mount
  // (niet tijdens render) want runMonteCarlo gebruikt Math.random → anders
  // hydration-mismatch tussen server en client.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!hasCache) setData(runMonteCarlo(SIM_N))
  }, [hasCache])

  const ranked = data ? predictedTopScorers(data, 20) : null
  const maxScore = ranked && ranked.length > 0 ? ranked[0].score : 1

  if (!ranked) {
    return <div style={{ fontSize: 10, color: 'var(--color-muted)', padding: '20px 0' }}>…</div>
  }

  return (
    <div className="factor-card" style={{ overflowX: 'auto' }}>
      {ranked.map((p, i) => {
        const flag = teamData(p.team)?.flag ?? '🏳️'
        const color = POS_COLOR[p.category] ?? 'var(--color-muted)'
        return (
          <div
            key={`${p.team}-${p.name}-${i}`}
            style={{
              display: 'grid',
              gridTemplateColumns: '28px 1.8fr 80px 1fr 44px',
              gap: 10,
              alignItems: 'center',
              padding: '8px 0',
              borderTop: i === 0 ? 'none' : '1px solid var(--color-brd)',
              minWidth: 460,
            }}
          >
            <div style={{ fontSize: 10, color: 'var(--color-muted)', textAlign: 'center' }}>{i + 1}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 10, color: 'var(--color-txt)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
              <div style={{ fontSize: 8, color: 'var(--color-muted)', display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
                <FlagImg name={p.team} h={11} emoji={flag} />
                {p.team}
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: 7, color, border: `1px solid ${color}`, padding: '3px 5px', whiteSpace: 'nowrap' }}>
                {tCat(`category.${p.category}`)}
              </span>
            </div>
            <PixelBar value={Math.round((p.score / maxScore) * 100)} color={color} />
            <div style={{ fontSize: 10, color: 'var(--color-g)', textAlign: 'right' }}>{p.score.toFixed(1)}</div>
          </div>
        )
      })}
    </div>
  )
}
