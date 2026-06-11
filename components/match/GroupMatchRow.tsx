import { useTranslations } from 'next-intl'
import { matchP, teamData } from '@/lib/klement'
import { matchP as matchPCustom } from '@/lib/klement-custom'
import FlagImg from '@/components/ui/FlagImg'
import type { WDL } from '@/types'

interface Props {
  teamA: string
  teamB: string
  result?: WDL
}

// Verwachte goals afgeleid van de winkans (zelfde formule als /versus) — geen
// scorevoorspelling, alleen een indicatie. Basis 1.35 goals/team, bijgesteld
// naar winkans. Afgerond op 1 decimaal.
const expectedGoals = (p: number) => (1.35 * (0.5 + (p - 0.5) * 0.8)).toFixed(1)

export default function GroupMatchRow({ teamA, teamB, result }: Props) {
  const t = useTranslations('groups')
  const { pA, dr, pB } = matchP(teamA, teamB)
  const { pA: cpA, pB: cpB } = matchPCustom(teamA, teamB)
  const tA = teamData(teamA)
  const tB = teamData(teamB)
  const fmtPct = (v: number) => `${(v * 100).toFixed(0)}%`

  const resultColor = result === 'A' ? 'var(--color-r)' : result === 'B' ? 'var(--color-b)' : 'var(--color-muted)'
  const resultLabel = result === 'A' ? t('resultWL') : result === 'B' ? t('resultLW') : t('resultDD')

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '6px 10px',
      fontSize: 7,
      borderBottom: '1px solid var(--color-brd)',
    }}>
      <FlagImg name={teamA} h={12} emoji={tA?.flag ?? '🏳️'} />
      <span style={{ color: 'var(--color-txt)', minWidth: 64, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{teamA}</span>
      {result ? (
        <span style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: 6 }}>
          <span style={{ color: resultColor, fontWeight: 'bold' }}>{resultLabel}</span>
          <span style={{ color: 'var(--color-muted)' }}>{expectedGoals(cpA)} – {expectedGoals(cpB)}</span>
        </span>
      ) : (
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: 6 }}>
          <span style={{ color: 'var(--color-r)' }}>{fmtPct(pA)}</span>
          <span style={{ color: 'var(--color-muted)' }}>{fmtPct(dr)}</span>
          <span style={{ color: 'var(--color-b)' }}>{fmtPct(pB)}</span>
        </div>
      )}
      <span style={{ color: 'var(--color-txt)', minWidth: 64, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{teamB}</span>
      <FlagImg name={teamB} h={12} emoji={tB?.flag ?? '🏳️'} />
    </div>
  )
}
