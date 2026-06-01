'use client'
import { useState, useMemo } from 'react'
import { simResult, calcStandings, teamData } from '@/lib/klement'
import type { MatchResult } from '@/types'
import GroupMatchRow from './GroupMatchRow'

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
  const [open, setOpen] = useState(false)

  const { standings, results } = useMemo(() => {
    const fixtures = buildFixtures(teams)
    const results: MatchResult[] = fixtures.map(([a, b]) => ({
      teamA: a, teamB: b, result: simResult(a, b),
    }))
    return { standings: calcStandings(teams, results), results }
  }, [teams])

  return (
    <div style={{ border: '1px solid var(--color-brd)', boxShadow: '3px 3px 0 var(--color-brd)', background: 'var(--color-bg)' }}>
      <div style={{
        background: 'var(--color-b-bg)',
        padding: '6px 12px',
        borderBottom: '1px solid var(--color-b-sh)',
        fontSize: 8,
        color: 'var(--color-b)',
        letterSpacing: 2,
      }}>
        GROUP {group}
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 7 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--color-brd)', color: 'var(--color-muted)' }}>
            <th style={{ padding: '6px 12px', textAlign: 'left', fontWeight: 'normal' }}>Team</th>
            <th style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 'normal', width: 24 }}>W</th>
            <th style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 'normal', width: 24 }}>D</th>
            <th style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 'normal', width: 24 }}>L</th>
            <th style={{ padding: '6px 12px', textAlign: 'right', fontWeight: 'normal', width: 32 }}>Pts</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((s, i) => {
            const t = teamData(s.team)
            const advancing = i < 2
            return (
              <tr key={s.team} style={{
                borderBottom: '1px solid var(--color-brd)',
                opacity: advancing ? 1 : 0.5,
              }}>
                <td style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
                  {advancing && (
                    <span style={{
                      width: 6, height: 6,
                      background: i === 0 ? 'var(--color-g)' : 'var(--color-b)',
                      flexShrink: 0,
                      display: 'inline-block',
                    }} />
                  )}
                  <span style={{ fontSize: 14 }}>{t?.flag}</span>
                  <span style={{ color: advancing ? 'var(--color-txt)' : 'var(--color-muted)' }}>{s.team}</span>
                </td>
                <td style={{ textAlign: 'center', color: 'var(--color-muted)', padding: '6px 4px' }}>{s.w}</td>
                <td style={{ textAlign: 'center', color: 'var(--color-muted)', padding: '6px 4px' }}>{s.d}</td>
                <td style={{ textAlign: 'center', color: 'var(--color-muted)', padding: '6px 4px' }}>{s.l}</td>
                <td style={{ textAlign: 'right', fontWeight: 'bold', color: advancing ? 'var(--color-r)' : 'var(--color-txt)', padding: '6px 12px' }}>{s.pts}</td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%',
          padding: '6px 12px',
          textAlign: 'left',
          fontSize: 6,
          color: 'var(--color-muted)',
          background: 'none',
          border: 'none',
          borderTop: '1px solid var(--color-brd)',
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}
      >
        {open ? '▲ HIDE MATCHES' : '▼ SHOW MATCHES'}
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
