import { matchP, teamNames, sc, teamData } from '@/lib/klement'
import SectionLabel from '@/components/ui/SectionLabel'
import WDLBar from '@/components/ui/WDLBar'

interface Props {
  name: string
}

export default function H2HList({ name }: Props) {
  const opponents = teamNames()
    .filter(t => t !== name)
    .sort((a, b) => sc(b) - sc(a))
    .slice(0, 6)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <SectionLabel>Head-to-Head vs Top Teams</SectionLabel>
      {opponents.map(opp => {
        const { pA, dr, pB } = matchP(name, opp)
        const t = teamData(opp)
        return (
          <div key={opp} style={{ border: '1px solid var(--color-brd)', borderLeft: '3px solid var(--color-b)', boxShadow: '3px 3px 0 var(--color-brd)', padding: 12, background: 'var(--color-bg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, fontSize: 8 }}>
              <span style={{ color: 'var(--color-txt)' }}>{name}</span>
              <span style={{ fontSize: 16 }}>{t?.flag}</span>
              <span style={{ color: 'var(--color-txt)' }}>{opp}</span>
            </div>
            <WDLBar pA={pA} dr={dr} pB={pB} labelA={name} labelB={opp} />
          </div>
        )
      })}
    </div>
  )
}
