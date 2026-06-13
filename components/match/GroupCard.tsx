'use client'
import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { simResult, calcStandings, teamData } from '@/lib/klement'
import { venueForPair, resultForPair } from '@/lib/todays-matches'
import type { Standing, WDL } from '@/types'
import GroupMatchRow from './GroupMatchRow'
import FlagImg from '@/components/ui/FlagImg'

interface Props {
  group: string
  teams: string[]
}

// Eén wedstrijd in de groepsweergave: een definitieve uitslag (gespeeld, uit
// results.json) of een gesimuleerde uitkomst.
interface GroupMatch {
  teamA: string
  teamB: string
  result: WDL
  played: boolean
  scoreA?: number
  scoreB?: number
}

function buildFixtures(teams: string[]): [string, string][] {
  const pairs: [string, string][] = []
  for (let i = 0; i < teams.length; i++)
    for (let j = i + 1; j < teams.length; j++)
      pairs.push([teams[i]!, teams[j]!])
  return pairs
}

// Bouwt de wedstrijden van een groep. Gespeelde wedstrijden krijgen hun echte
// uitslag uit results.json; niet-gespeelde worden alleen gesimuleerd als
// simulateUnplayed true is (client-side, na hydratie — simResult gebruikt
// Math.random en mag niet tijdens SSR draaien).
function buildMatches(teams: string[], simulateUnplayed: boolean): GroupMatch[] {
  const out: GroupMatch[] = []
  for (const [a, b] of buildFixtures(teams)) {
    const real = resultForPair(a, b)
    if (real) {
      out.push({ teamA: a, teamB: b, result: real.result, played: true, scoreA: real.scoreA, scoreB: real.scoreB })
    } else if (simulateUnplayed) {
      out.push({ teamA: a, teamB: b, result: simResult(a, b), played: false })
    }
  }
  return out
}

function standingsFrom(teams: string[], matches: GroupMatch[]): Standing[] {
  return calcStandings(teams, matches.map(m => ({ teamA: m.teamA, teamB: m.teamB, result: m.result })))
}

export default function GroupCard({ group, teams }: Props) {
  const t = useTranslations('groups')
  const [open, setOpen] = useState(false)
  // Initiële render (SSR + eerste client-render): alleen de gespeelde wedstrijden
  // — deterministisch, dus geen hydratie-mismatch. De gesimuleerde wedstrijden
  // komen er client-side in de useEffect bij.
  const [{ standings, matches }, setData] = useState<{ standings: Standing[]; matches: GroupMatch[] }>(
    () => {
      const m = buildMatches(teams, false)
      return { standings: standingsFrom(teams, m), matches: m }
    }
  )

  // Alle wedstrijden gespeeld? Dan valt er niets te (her)simuleren → geen 🎲.
  const allPlayed = buildFixtures(teams).every(([a, b]) => resultForPair(a, b) !== undefined)

  const resimulate = () => {
    const m = buildMatches(teams, true)
    setData({ standings: standingsFrom(teams, m), matches: m })
  }

  useEffect(() => {
    // simResult() gebruikt Math.random en mag alleen client-side draaien, na
    // hydratie — de server-render toont enkel de echte uitslagen.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    resimulate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teams])

  return (
    <div className="group-card">
      <div className="group-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span>{t('groupLabel')} {group}</span>
        {!allPlayed && (
          <button
            onClick={resimulate}
            title={t('resimulate')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 10, color: 'var(--color-b)', padding: 0, lineHeight: 1 }}
          >🎲</button>
        )}
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
          {matches.map((m, i) => (
            <GroupMatchRow
              key={i}
              teamA={m.teamA}
              teamB={m.teamB}
              result={m.result}
              venue={venueForPair(m.teamA, m.teamB)}
              played={m.played}
              scoreA={m.scoreA}
              scoreB={m.scoreB}
            />
          ))}
        </div>
      )}
    </div>
  )
}
