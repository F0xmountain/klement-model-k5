'use client'
import { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { simResult, calcStandings, teamData } from '@/lib/klement'
import type { MatchResult } from '@/types'
import GroupMatchRow from './GroupMatchRow'
import FlagImg from '@/components/ui/FlagImg'

interface Props {
  group: string
  teams: string[]
}

function buildFixtures(teams: string[]): [string, string][] {
  const pairs: [string, string][] = []
  for (let i = 0; i < teams.length; i++)
    for (let j = i + 1; j < teams.length; j++)
      pairs.push([teams[i], teams[j]])
  return pairs
}

export default function GroupCard({ group, teams }: Props) {
  const t = useTranslations('groups')
  const [open, setOpen] = useState(false)
  const [tick, setTick] = useState(0)

  const { standings, results } = useMemo(() => {
    const fixtures = buildFixtures(teams)
    const results: MatchResult[] = fixtures.map(([a, b]) => ({
      teamA: a, teamB: b, result: simResult(a, b),
    }))
    return { standings: calcStandings(teams, results), results }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teams, tick])

  return (
    <div className="group-card">
      <div className="group-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span>{t('groupLabel')} {group}</span>
        <button
          onClick={() => setTick(prev => prev + 1)}
          title={t('resimulate')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 10, color: 'var(--color-b)', padding: 0, lineHeight: 1 }}
        >🎲</button>
      </div>
      <table className="group-table">
        <thead>
          <tr>
            <th>{t('colTeam')}</th>
            <th>W</th><th>D</th><th>L</th>
            <th>PTS</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((s, i) => {
            const t = teamData(s.team)
            const advancing = i < 2
            return (
              <tr key={s.team}>
                <td style={{ maxWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {advancing && <span className="qual-dot" />}
                  <FlagImg name={s.team} h={14} emoji={t?.flag ?? '🏳️'} />
                  {' '}{s.team}
                </td>
                <td>{s.w}</td>
                <td>{s.d}</td>
                <td>{s.l}</td>
                <td style={{ fontWeight: advancing ? 'bold' : 'normal', color: advancing ? 'var(--color-r)' : 'var(--color-txt)' }}>
                  {s.pts}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', padding: '6px 10px', textAlign: 'left',
          fontSize: 9, color: 'var(--color-muted)', backgroundColor: 'transparent',
          border: 'none', borderTop: '1px solid var(--color-brd)',
          cursor: 'pointer', fontFamily: 'inherit',
        }}
      >
        {open ? t('hideMatches') : t('showMatches')}
      </button>

      {open && (
        <div style={{ borderTop: '1px solid var(--color-brd)' }}>
          {results.map(({ teamA, teamB, result }, i) => (
            <GroupMatchRow key={i} teamA={teamA} teamB={teamB} result={result} />
          ))}
        </div>
      )}
    </div>
  )
}
