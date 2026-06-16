'use client'
import { useTranslations } from 'next-intl'
import { teamData, sc } from '@/lib/klement'
import FactorBreakdown from '@/components/team/FactorBreakdown'
import H2HList from '@/components/team/H2HList'
import StarPlayersCard from '@/components/team/StarPlayersCard'
import FormBar from '@/components/stats/FormBar'

// Gedeelde profiel-/factor-content voor één team: recente vorm, sterspelers,
// kerncijfers (model/FIFA/BBP), factor-breakdown en H2H. Eén bron, gebruikt op
// zowel /teams (TeamProfile, profiel-tab) als /teams/[team] (TeamDetail, profiel-
// tab), zodat er geen duplicatie is. De team-header/banner zit hier bewust NIET in
// — elke surface heeft z'n eigen header met de teamnaam.
export default function ProfileTab({ team }: { team: string }) {
  const tt = useTranslations('teams')
  const data = teamData(team)
  const score = sc(team)

  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 8, color: 'var(--color-muted)', letterSpacing: 1, marginBottom: 8 }}>
          {tt('formLabel')}
        </div>
        <FormBar team={team} />
      </div>

      <StarPlayersCard name={team} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
        {[
          { num: score.toFixed(3), label: tt('scoreModelScore'), color: 'var(--color-g)', sh: 'var(--color-g-sh)' },
          { num: data?.fifa ?? '',  label: tt('scoreFifaPts'),    color: 'var(--color-b)', sh: 'var(--color-b-sh)' },
          { num: `$${data?.gdp}k`, label: tt('scoreGdpCapita'),  color: 'var(--color-r)', sh: 'var(--color-r-sh)' },
        ].map(({ num, label, color, sh }) => (
          <div key={label} className="score-card">
            <span style={{ fontSize: 18, color, textShadow: `2px 2px 0 ${sh}`, display: 'block', marginBottom: 8 }}>{num}</span>
            <span style={{ fontSize: 9, color: 'var(--color-muted)' }}>{label}</span>
          </div>
        ))}
      </div>

      <FactorBreakdown name={team} />

      <div style={{ marginTop: 32 }}>
        <H2HList name={team} />
      </div>
    </>
  )
}
