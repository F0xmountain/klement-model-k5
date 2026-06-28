'use client'
import { useState, useMemo } from 'react'
import { simResult, matchP, calcStandings, teamData } from '@/lib/klement'
import type { MatchResult, Standing } from '@/types'
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

// Deterministic default: expected record from match probabilities. This renders
// identically on server and client (no Math.random), so it never triggers a
// hydration mismatch. The dice button swaps in a real random simulation.
function expectedView(teams: string[], fixtures: [string, string][]): { standings: Standing[]; results: MatchResult[] } {
  const acc: Record<string, { w: number; d: number; l: number; pts: number }> = {}
  for (const t of teams) acc[t] = { w: 0, d: 0, l: 0, pts: 0 }
  const results: MatchResult[] = fixtures.map(([a, b]) => {
    const { pA, dr, pB } = matchP(a, b)
    acc[a].w += pA; acc[a].d += dr; acc[a].l += pB; acc[a].pts += 3 * pA + dr
    acc[b].w += pB; acc[b].d += dr; acc[b].l += pA; acc[b].pts += 3 * pB + dr
    const result = pA >= dr && pA >= pB ? 'A' : pB >= dr && pB >= pA ? 'B' : 'D'
    return { teamA: a, teamB: b, result }
  })
  const standings: Standing[] = teams
    .map((t) => ({ team: t, w: Math.round(acc[t].w), d: Math.round(acc[t].d), l: Math.round(acc[t].l), pts: Math.round(acc[t].pts) }))
    .sort((a, b) => b.pts - a.pts)
  return { standings, results }
}

export default function GroupCard({ group, teams }: Props) {
  const [open, setOpen] = useState(false)
  const [sim, setSim] = useState<MatchResult[] | null>(null)
  const fixtures = useMemo(() => buildFixtures(teams), [teams])

  const { standings, results } = useMemo(() => {
    if (sim) return { standings: calcStandings(teams, sim), results: sim }
    return expectedView(teams, fixtures)
  }, [teams, fixtures, sim])

  function resimulate(): void {
    setSim(fixtures.map(([a, b]) => ({ teamA: a, teamB: b, result: simResult(a, b) })))
  }

  return (
    <div className="group-card">
      <div className="group-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span>GROUP {group}</span>
        <button
          onClick={resimulate}
          title="Run a random simulation"
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 8, color: 'var(--color-b)', padding: 0, lineHeight: 1, fontFamily: 'inherit' }}
        >{sim ? 'RESIM' : 'SIMULATE'}</button>
      </div>
      <table className="group-table">
        <thead>
          <tr>
            <th>TEAM</th>
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
                  <FlagImg name={s.team} h={14} emoji={t?.flag ?? '🏳'} />
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
