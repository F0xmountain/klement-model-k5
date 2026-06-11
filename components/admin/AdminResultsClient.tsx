'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import Btn from '@/components/ui/Btn'
import FlagImg from '@/components/ui/FlagImg'
import { teamData } from '@/lib/klement'

export interface ResultMatch {
  matchKey: string
  group: string
  teamA: string
  teamB: string
}

export interface ResultEntry {
  teamA: string
  teamB: string
  scoreA: number
  scoreB: number
}

interface Props {
  matches: ResultMatch[]
  initialResults: Record<string, ResultEntry>
}

type ScoreState = Record<string, { scoreA: string; scoreB: string }>
type SaveState = Record<string, 'idle' | 'saving' | 'saved' | 'error'>

export default function AdminResultsClient({ matches, initialResults }: Props) {
  const t = useTranslations('admin')

  const [scores, setScores] = useState<ScoreState>(() => {
    const init: ScoreState = {}
    for (const m of matches) {
      const r = initialResults[m.matchKey]
      init[m.matchKey] = { scoreA: r ? String(r.scoreA) : '', scoreB: r ? String(r.scoreB) : '' }
    }
    return init
  })
  const [saveState, setSaveState] = useState<SaveState>({})

  function setScore(matchKey: string, side: 'scoreA' | 'scoreB', value: string) {
    setScores(prev => ({ ...prev, [matchKey]: { ...prev[matchKey], [side]: value } }))
    setSaveState(prev => ({ ...prev, [matchKey]: 'idle' }))
  }

  async function handleSave(match: ResultMatch) {
    const { scoreA, scoreB } = scores[match.matchKey]
    if (scoreA === '' || scoreB === '') return

    setSaveState(prev => ({ ...prev, [match.matchKey]: 'saving' }))
    try {
      const res = await fetch('/api/admin/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchKey: match.matchKey,
          teamA: match.teamA,
          teamB: match.teamB,
          scoreA: Number(scoreA),
          scoreB: Number(scoreB),
        }),
      })
      if (!res.ok) throw new Error('save failed')
      setSaveState(prev => ({ ...prev, [match.matchKey]: 'saved' }))
    } catch {
      setSaveState(prev => ({ ...prev, [match.matchKey]: 'error' }))
    }
  }

  const groups = [...new Set(matches.map(m => m.group))].sort()

  return (
    <div>
      {groups.map(group => (
        <div key={group} className="group-card" style={{ marginBottom: 10 }}>
          <div className="group-header">{t('group')} {group}</div>
          {matches.filter(m => m.group === group).map(match => {
            const flagA = teamData(match.teamA)?.flag ?? '🏳️'
            const flagB = teamData(match.teamB)?.flag ?? '🏳️'
            const state = saveState[match.matchKey] ?? 'idle'

            return (
              <div key={match.matchKey} className="admin-result-row">
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <FlagImg name={match.teamA} h={14} emoji={flagA} /> {match.teamA}
                </span>
                <input
                  type="number"
                  min={0}
                  value={scores[match.matchKey].scoreA}
                  onChange={e => setScore(match.matchKey, 'scoreA', e.target.value)}
                  className="admin-score-input"
                />
                <span style={{ color: 'var(--color-muted)' }}>–</span>
                <input
                  type="number"
                  min={0}
                  value={scores[match.matchKey].scoreB}
                  onChange={e => setScore(match.matchKey, 'scoreB', e.target.value)}
                  className="admin-score-input"
                />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <FlagImg name={match.teamB} h={14} emoji={flagB} /> {match.teamB}
                </span>
                <Btn variant="green" onClick={() => handleSave(match)} disabled={state === 'saving'}>
                  {state === 'saving' ? t('saving') : t('save')}
                </Btn>
                <span style={{ fontSize: 8 }}>
                  {state === 'saved' && <span style={{ color: 'var(--color-g)' }}>{t('saved')}</span>}
                  {state === 'error' && <span style={{ color: 'var(--color-r)' }}>{t('saveError')}</span>}
                </span>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
