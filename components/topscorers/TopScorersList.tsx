'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { teamData } from '@/lib/klement'
import type { PredictedScorer } from '@/lib/topscorers'
import FlagImg from '@/components/ui/FlagImg'
import PixelBar from '@/components/ui/PixelBar'

interface Props {
  ranked: PredictedScorer[]
}

// Positiekleur voor de badge: aanvaller=rood, middenvelder=blauw,
// verdediger=groen, keeper=grijs.
const POS_COLOR: Record<string, string> = {
  attacker: 'var(--color-r)',
  midfielder: 'var(--color-b)',
  defender: 'var(--color-g)',
  goalkeeper: 'var(--color-muted)',
}

const TABS = ['all', 'attacker', 'midfielder', 'defender', 'goalkeeper'] as const
type Tab = (typeof TABS)[number]
const PER_TAB = 20

export default function TopScorersList({ ranked }: Props) {
  const tCat = useTranslations('admin')
  const t = useTranslations('topscorers')
  const [tab, setTab] = useState<Tab>('all')

  // ranked is al op score gesorteerd; per tab filteren op categorie en top-20 tonen.
  const shown = (tab === 'all' ? ranked : ranked.filter(p => p.category === tab)).slice(0, PER_TAB)
  const maxScore = shown.length > 0 ? shown[0]!.score : 1

  return (
    <>
      <div className="ko-tabs" style={{ overflowX: 'auto', marginBottom: 16 }}>
        {TABS.map(tb => (
          <button
            key={tb}
            onClick={() => setTab(tb)}
            className={`ko-tab${tab === tb ? ' active' : ''}`}
            style={{ background: 'none', fontFamily: 'inherit' }}
          >
            {t(`tabs.${tb}`)}
          </button>
        ))}
      </div>

      <div className="factor-card" style={{ overflowX: 'auto' }}>
        {shown.map((p, i) => {
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
    </>
  )
}
