import { useTranslations } from 'next-intl'
import { matchP, teamNames, sc, teamData } from '@/lib/klement'
import WDLBar from '@/components/ui/WDLBar'
import FlagImg from '@/components/ui/FlagImg'

interface Props {
  name: string
}

export default function H2HList({ name }: Props) {
  const t = useTranslations('h2h')
  const opponents = teamNames()
    .filter(t => t !== name)
    .sort((a, b) => sc(b) - sc(a))
    .slice(0, 6)

  const me = teamData(name)

  return (
    <div>
      <div className="section-title">{t('title')}</div>
      {opponents.map(opp => {
        const { pA, dr, pB } = matchP(name, opp)
        const pAp = Math.round(pA * 100)
        const drp = Math.round(dr * 100)
        const pBp = Math.round(pB * 100)
        const t = teamData(opp)
        return (
          <div key={opp} className="h2h-row">
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 9, overflow: 'hidden' }}>
              <FlagImg name={name} h={16} emoji={me?.flag ?? '🏳️'} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
            </div>
            <div className="h2h-bar">
              <div className="h2h-a" style={{ flex: pAp }}>{pAp}%</div>
              <div className="h2h-d" style={{ flex: drp }}>{drp}%</div>
              <div className="h2h-b" style={{ flex: pBp }}>{pBp}%</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 9, justifyContent: 'flex-end', color: 'var(--color-muted)', overflow: 'hidden' }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{opp}</span>
              <FlagImg name={opp} h={16} emoji={t?.flag ?? '🏳️'} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
