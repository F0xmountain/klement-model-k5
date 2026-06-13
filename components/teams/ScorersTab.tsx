'use client'
import { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { getSquadTeam, starRankOf, type Category } from '@/lib/squad-utils'
import { calcExpectedPoints, calcExpectedGoals } from '@/lib/fantasy-points'

interface ScorerRow {
  name: string
  club: string | null
  category: Category
  starRank?: number
  points: number
  goals: number
}

type Filter = 'all' | Category

export default function ScorersTab({ teamName }: { teamName: string }) {
  const t = useTranslations('teams')
  const team = getSquadTeam(teamName)
  const [filter, setFilter] = useState<Filter>('all')

  // Verwachte punten/goals hangen af van positie + team (niet van de individuele
  // speler), dus identiek binnen een positie. Sterspelers eerst als tiebreak.
  const rows = useMemo<ScorerRow[]>(() => {
    if (!team) return []
    return team.squad
      .map(p => ({
        name: p.name,
        club: p.club,
        category: p.category,
        starRank: starRankOf(team, p.name),
        points: calcExpectedPoints(p.category, teamName),
        goals: calcExpectedGoals(p.category, teamName),
      }))
      .sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points
        if (a.starRank && b.starRank) return a.starRank - b.starRank
        if (a.starRank) return -1
        if (b.starRank) return 1
        return a.name.localeCompare(b.name)
      })
  }, [team, teamName])

  if (!team) {
    return <div style={{ fontSize: 10, color: 'var(--color-muted)', padding: 12 }}>—</div>
  }

  const shown = filter === 'all' ? rows : rows.filter(r => r.category === filter)
  // Aanvallend → verdedigend, conform de gevraagde tabvolgorde.
  const filters: Filter[] = ['all', 'attacker', 'midfielder', 'defender', 'goalkeeper']

  return (
    <div>
      {/* Positie sub-tabs */}
      <div className="ko-tabs" style={{ overflowX: 'auto', marginBottom: 16 }}>
        {filters.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`ko-tab${filter === f ? ' active' : ''}`}
            style={{ background: 'none', fontFamily: 'inherit' }}
          >
            {f === 'all' ? t('scorers.all') : t(`squad.${f}`)}
          </button>
        ))}
      </div>

      <div className="factor-card" style={{ padding: '4px 14px' }}>
        {shown.map((r, i) => (
          <div key={r.name} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderTop: i === 0 ? 'none' : '1px solid var(--color-brd)' }}>
            <span style={{ width: 18, flexShrink: 0, textAlign: 'right', color: 'var(--color-muted)', fontSize: 9 }}>{i + 1}</span>
            <span style={{ width: 14, flexShrink: 0, textAlign: 'center' }}>{r.starRank ? '⭐' : ''}</span>
            <div style={{ flex: '1 1 auto', minWidth: 0 }}>
              <div style={{ fontSize: 10, color: 'var(--color-txt)', fontWeight: r.starRank ? 'bold' : 'normal', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</div>
              <div style={{ fontSize: 8, color: 'var(--color-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.club ?? ''}</div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 14, color: 'var(--color-g)', fontFamily: 'var(--font-pixel)' }}>{r.points.toFixed(1)}</div>
              <div style={{ fontSize: 8, color: 'var(--color-muted)' }}>{r.goals.toFixed(2)} {t('scorers.expectedGoals').toLowerCase()}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 8, color: 'var(--color-muted)', lineHeight: 1.8, marginTop: 12 }}>
        {t('scorers.legend')}<br />
        {t('scorers.disclaimer')}
      </div>
    </div>
  )
}
