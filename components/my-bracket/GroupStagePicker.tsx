'use client'

import { useSyncExternalStore, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { GROUPS } from '@/lib/fixtures'
import { teamData } from '@/lib/klement'
import {
  GROUP_LETTERS, groupAdvanceProbs, parseGroupPicks, saveGroupPicks,
  subscribeGroupPicks, getGroupPicksSnapshot, getServerGroupPicksSnapshot,
} from '@/lib/group-picks'
import FlagImg from '@/components/ui/FlagImg'

interface Props {
  onSimulate: () => void
}

const arrowBtn: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
  fontSize: 7, lineHeight: 1, padding: '1px 4px', color: 'var(--color-b)',
}

export default function GroupStagePicker({ onSimulate }: Props) {
  const t = useTranslations('myBracket')
  const tg = useTranslations('groups')
  const raw = useSyncExternalStore(subscribeGroupPicks, getGroupPicksSnapshot, getServerGroupPicksSnapshot)
  const picks = useMemo(() => parseGroupPicks(raw), [raw])

  // P(top-2) per groep — kans om door te gaan naar de R32. Exact (enumeratie),
  // deterministisch, dus eenmalig te memoïzen.
  const probs = useMemo(
    () => Object.fromEntries(GROUP_LETTERS.map(l => [l, groupAdvanceProbs(GROUPS[l]!)])),
    []
  )

  function move(letter: string, idx: number, dir: -1 | 1) {
    const order = [...picks[letter]!]
    const j = idx + dir
    if (j < 0 || j >= order.length) return
    ;[order[idx], order[j]] = [order[j]!, order[idx]!]
    saveGroupPicks({ ...picks, [letter]: order })
  }

  return (
    <div>
      <div style={{ fontSize: 9, color: 'var(--color-muted)', lineHeight: 2, marginBottom: 16 }}>
        {t('groupRank')}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 14 }}>
        {GROUP_LETTERS.map(letter => (
          <div key={letter} className="group-card">
            <div className="group-header">{tg('groupLabel')} {letter}</div>
            {picks[letter]!.map((team, idx) => {
              const advances = idx < 2
              const isThird = idx === 2
              const bg = advances ? 'var(--color-g-bg)' : isThird ? 'var(--color-o-bg)' : 'transparent'
              return (
                <div key={team} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderTop: '1px solid var(--color-brd)', background: bg }}>
                  <span style={{ width: 12, fontSize: 9, color: 'var(--color-muted)', textAlign: 'center' }}>{idx + 1}</span>
                  <FlagImg name={team} h={13} emoji={teamData(team)?.flag ?? '🏳️'} />
                  <span style={{ flex: 1, fontSize: 9, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{team}</span>
                  <span style={{ fontSize: 8, color: 'var(--color-muted)', minWidth: 28, textAlign: 'right' }}>{Math.round((probs[letter]?.[team] ?? 0) * 100)}%</span>
                  {advances && <span style={{ fontSize: 7, color: 'var(--color-g)' }}>{t('advancesTop2')}</span>}
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <button onClick={() => move(letter, idx, -1)} disabled={idx === 0} aria-label="up" style={{ ...arrowBtn, opacity: idx === 0 ? 0.25 : 1 }}>▲</button>
                    <button onClick={() => move(letter, idx, 1)} disabled={idx === 3} aria-label="down" style={{ ...arrowBtn, opacity: idx === 3 ? 0.25 : 1 }}>▼</button>
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>

      <div style={{ marginTop: 24, textAlign: 'center' }}>
        <button
          onClick={onSimulate}
          className="px-btn"
          style={{
            fontFamily: 'inherit', fontSize: 10, padding: '12px 22px',
            backgroundColor: 'var(--color-g)', color: '#fff', border: 'none',
            boxShadow: '4px 4px 0 var(--color-g-sh)', cursor: 'pointer',
          }}
        >
          {t('simulateBtn')}
        </button>
      </div>
    </div>
  )
}
