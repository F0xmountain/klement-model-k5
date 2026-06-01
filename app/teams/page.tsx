'use client'
import { useState } from 'react'
import { teamNames, teamData } from '@/lib/klement'
import SectionLabel from '@/components/ui/SectionLabel'
import TeamHeroCard from '@/components/team/TeamHeroCard'
import FactorBreakdown from '@/components/team/FactorBreakdown'
import H2HList from '@/components/team/H2HList'

const allTeams = teamNames().sort()

export default function TeamsPage() {
  const [selected, setSelected] = useState('Netherlands')
  const t = teamData(selected)

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 24px' }}>
      <div className="fade-in" style={{ marginBottom: 24 }}>
        <SectionLabel>Team Profile</SectionLabel>
        <h1 style={{ fontSize: 14, color: 'var(--color-r)', marginTop: 4 }}>EXPLORE A TEAM</h1>
      </div>

      <div className="fade-in delay-1" style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 6, color: 'var(--color-muted)', marginBottom: 6 }}>SELECT TEAM</p>
        <div style={{ position: 'relative', maxWidth: 320 }}>
          {t && <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 16, pointerEvents: 'none' }}>{t.flag}</span>}
          <select
            value={selected}
            onChange={e => setSelected(e.target.value)}
            style={{
              width: '100%',
              paddingLeft: 32,
              paddingRight: 12,
              paddingTop: 8,
              paddingBottom: 8,
              fontSize: 8,
              fontFamily: 'inherit',
              border: '2px solid var(--color-brd2)',
              background: 'var(--color-bg)',
              color: 'var(--color-txt)',
              cursor: 'pointer',
              boxShadow: '3px 3px 0 var(--color-brd)',
              appearance: 'none',
              outline: 'none',
            }}
          >
            {allTeams.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      <div className="fade-in delay-2" style={{ marginBottom: 24 }}>
        <TeamHeroCard name={selected} />
      </div>

      <div className="fade-in delay-3" style={{ border: '1px solid var(--color-brd)', boxShadow: '3px 3px 0 var(--color-brd)', padding: 16, marginBottom: 24 }}>
        <FactorBreakdown name={selected} />
      </div>

      <div className="fade-in delay-3">
        <H2HList name={selected} />
      </div>
    </div>
  )
}
