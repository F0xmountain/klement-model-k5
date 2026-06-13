'use client'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import { teamNames, teamData, sc } from '@/lib/klement'
import { teamSlug } from '@/lib/team-slug'
import FactorBreakdown from '@/components/team/FactorBreakdown'
import H2HList from '@/components/team/H2HList'
import StarPlayersCard from '@/components/team/StarPlayersCard'
import FormBar from '@/components/stats/FormBar'
import FlagImg from '@/components/ui/FlagImg'
import TeamSelect from '@/components/ui/TeamSelect'
import PixelParticles from '@/components/ui/PixelParticles'

const allTeams = teamNames().sort()
const ranked = [...allTeams].sort((a, b) => sc(b) - sc(a))

export default function TeamProfile({ initialTeam }: { initialTeam: string }) {
  const tt = useTranslations('teams')
  const router = useRouter()
  const [selected, setSelected] = useState(initialTeam)
  const [tab, setTab] = useState<'profile' | 'ranking'>('profile')
  const team = teamData(selected)
  const score = sc(selected)

  // Houd de URL in sync met de selectie (deelbare /teams/[team]-links), zonder
  // een volledige navigatie/herrender.
  const select = (name: string) => {
    setSelected(name)
    router.replace(`/teams/${teamSlug(name)}`, { scroll: false })
  }

  return (
    <div className="sec page-enter" style={{ position: 'relative', overflow: 'hidden' }}>
      <PixelParticles variant="green" />
      <div style={{ position: 'relative', zIndex: 1 }}>

      <div style={{ display: 'flex', borderBottom: '2px solid var(--color-brd)', marginBottom: 24 }}>
        {(['profile', 'ranking'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`ko-tab${tab === t ? ' active' : ''}`}>
            {t === 'profile' ? tt('tabProfile') : tt('tabRanking')}
          </button>
        ))}
      </div>

      {tab === 'ranking' && (
        <div>
          <table className="group-table" style={{ marginBottom: 24 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>#</th>
                <th style={{ textAlign: 'left' }}>{tt('colTeam')}</th>
                <th>{tt('colScore')}</th>
                <th>FIFA</th>
                <th>CONF</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((name, i) => {
                const t = teamData(name)
                const s = sc(name)
                return (
                  <tr key={name} style={{ cursor: 'pointer' }} onClick={() => { select(name); setTab('profile') }}>
                    <td style={{ color: i < 3 ? 'var(--color-g)' : 'var(--color-muted)', fontWeight: i < 3 ? 'bold' : 'normal' }}>{i + 1}</td>
                    <td style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <FlagImg name={name} h={16} emoji={t?.flag ?? '🏳️'} />
                      {name}
                    </td>
                    <td style={{ textAlign: 'center', color: 'var(--color-g)', fontFamily: 'monospace' }}>{s.toFixed(3)}</td>
                    <td style={{ textAlign: 'center' }}>{t?.fifa}</td>
                    <td style={{ textAlign: 'center', color: 'var(--color-muted)', fontSize: 8 }}>{t?.conf}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'profile' && <>

      <TeamSelect
        teams={allTeams}
        value={selected}
        onChange={select}
        style={{ maxWidth: 360, marginBottom: 20 }}
      />

      {/* Country banner */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 20,
        padding: '20px 24px',
        marginBottom: 24,
        backgroundColor: 'var(--color-surf)',
        border: '2px solid var(--color-brd2)',
        boxShadow: '4px 4px 0 var(--color-brd)',
      }}>
        <FlagImg name={selected} h={64} emoji={team?.flag ?? '🏳️'} />
        <div>
          <div style={{ fontSize: 16, color: 'var(--color-txt)', marginBottom: 6, lineHeight: 1.3 }}>
            {selected.toUpperCase()}
          </div>
          <div style={{ fontSize: 8, color: 'var(--color-muted)', letterSpacing: 1 }}>
            {team?.conf} · FIFA {team?.fifa} PTS · MODEL {score.toFixed(3)}
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 8, color: 'var(--color-muted)', letterSpacing: 1, marginBottom: 8 }}>
          {tt('formLabel')}
        </div>
        <FormBar team={selected} />
      </div>

      <StarPlayersCard name={selected} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
        {[
          { num: score.toFixed(3), label: tt('scoreModelScore'), color: 'var(--color-g)', sh: 'var(--color-g-sh)' },
          { num: team?.fifa ?? '',  label: tt('scoreFifaPts'),    color: 'var(--color-b)', sh: 'var(--color-b-sh)' },
          { num: `$${team?.gdp}k`, label: tt('scoreGdpCapita'),  color: 'var(--color-r)', sh: 'var(--color-r-sh)' },
        ].map(({ num, label, color, sh }) => (
          <div key={label} className="score-card">
            <span style={{ fontSize: 18, color, textShadow: `2px 2px 0 ${sh}`, display: 'block', marginBottom: 8 }}>{num}</span>
            <span style={{ fontSize: 9, color: 'var(--color-muted)' }}>{label}</span>
          </div>
        ))}
      </div>

      <FactorBreakdown name={selected} />

      <div style={{ marginTop: 32 }}>
        <H2HList name={selected} />
      </div>
      </>}

      </div>
    </div>
  )
}
