'use client'
import { useState } from 'react'
import { matchP, teamNames, teamData } from '@/lib/klement'
import SectionLabel from '@/components/ui/SectionLabel'
import WDLBar from '@/components/ui/WDLBar'
import FactorBreakdown from '@/components/team/FactorBreakdown'

const allTeams = teamNames().sort()

export default function LookupPage() {
  const [teamA, setTeamA] = useState('Netherlands')
  const [teamB, setTeamB] = useState('Portugal')

  const { pA, dr, pB } = matchP(teamA, teamB)
  const tA = teamData(teamA)
  const tB = teamData(teamB)

  const selectStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 10px',
    fontSize: 8,
    fontFamily: 'inherit',
    border: '2px solid var(--color-brd2)',
    background: 'var(--color-bg)',
    color: 'var(--color-txt)',
    cursor: 'pointer',
    boxShadow: '3px 3px 0 var(--color-brd)',
    appearance: 'none' as const,
    outline: 'none',
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 24px' }}>
      <div className="fade-in" style={{ marginBottom: 24 }}>
        <SectionLabel>Match Lookup</SectionLabel>
        <h1 style={{ fontSize: 14, color: 'var(--color-r)', marginTop: 4 }}>
          PICK A MATCHUP
        </h1>
      </div>

      <div className="fade-in delay-1" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        {([
          { label: 'TEAM A', value: teamA, set: setTeamA, flag: tA?.flag ?? '' },
          { label: 'TEAM B', value: teamB, set: setTeamB, flag: tB?.flag ?? '' },
        ] as const).map(({ label, value, set, flag }) => (
          <div key={label}>
            <p style={{ fontSize: 6, color: 'var(--color-muted)', marginBottom: 6 }}>{label}</p>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 16, pointerEvents: 'none' }}>{flag}</span>
              <select
                value={value}
                onChange={e => set(e.target.value)}
                style={{ ...selectStyle, paddingLeft: 32 }}
              >
                {allTeams.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
        ))}
      </div>

      <div className="fade-in delay-2" style={{ border: '1px solid var(--color-brd)', boxShadow: '4px 4px 0 var(--color-brd)', padding: 20, marginBottom: 24 }}>
        <WDLBar pA={pA} dr={dr} pB={pB} labelA={teamA} labelB={teamB} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 20 }}>
          {[
            { label: teamA, value: pA, flag: tA?.flag ?? '', color: 'var(--color-r)', border: 'var(--color-r)' },
            { label: 'DRAW', value: dr,  flag: '—',           color: 'var(--color-muted)', border: 'var(--color-brd2)' },
            { label: teamB, value: pB, flag: tB?.flag ?? '', color: 'var(--color-b)', border: 'var(--color-b)' },
          ].map(({ label, value, flag, color, border }) => (
            <div key={label} style={{ background: 'var(--color-surf)', border: `1px solid var(--color-brd)`, borderTop: `3px solid ${border}`, padding: 12, textAlign: 'center' }}>
              <div style={{ fontSize: 20, marginBottom: 6 }}>{flag}</div>
              <p style={{ fontSize: 14, color, marginBottom: 4 }}>{(value * 100).toFixed(1)}%</p>
              <p style={{ fontSize: 6, color: 'var(--color-muted)' }}>{label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="fade-in delay-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {[
          { team: teamA, borderColor: 'var(--color-r)' },
          { team: teamB, borderColor: 'var(--color-b)' },
        ].map(({ team, borderColor }) => (
          <div key={team} style={{ border: '1px solid var(--color-brd)', borderLeft: `3px solid ${borderColor}`, boxShadow: '3px 3px 0 var(--color-brd)', padding: 16 }}>
            <p style={{ fontSize: 8, color: 'var(--color-txt)', marginBottom: 16 }}>{team}</p>
            <FactorBreakdown name={team} />
          </div>
        ))}
      </div>
    </div>
  )
}
