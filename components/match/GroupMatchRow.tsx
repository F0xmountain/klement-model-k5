import { useTranslations } from 'next-intl'
import { matchP, teamData } from '@/lib/klement'
import { matchP as matchPCustom } from '@/lib/klement-custom'
import { UPSET_THRESHOLD } from '@/lib/upset-detector'
import { Link } from '@/i18n/navigation'
import FlagImg from '@/components/ui/FlagImg'
import type { WDL } from '@/types'

interface Props {
  teamA: string
  teamB: string
  result?: WDL
  venue?: string
  // Gespeelde wedstrijd: definitieve uitslag uit results.json i.p.v. een
  // gesimuleerde/verwachte score.
  played?: boolean
  scoreA?: number
  scoreB?: number
}

// Verwachte goals afgeleid van de winkans (zelfde formule als /versus) — geen
// scorevoorspelling, alleen een indicatie. Basis 1.35 goals/team, bijgesteld
// naar winkans. Afgerond op gehele doelpunten voor de groepsweergave.
const expectedGoals = (p: number) => Math.round(1.35 * (0.5 + (p - 0.5) * 0.8))

// Kleurcodering op zekerheid van de favoriet: duidelijke favoriet (>65%) groen,
// favoriet (50-65%) oranje, gelijkopgaand (<50%) grijs.
function confidenceColor(favWin: number): string {
  if (favWin > 0.65) return 'var(--color-g)'
  if (favWin > 0.5) return 'var(--color-o)'
  return 'var(--color-muted)'
}

export default function GroupMatchRow({ teamA, teamB, result, venue, played, scoreA, scoreB }: Props) {
  const t = useTranslations('groups')
  const { pA, dr, pB } = matchP(teamA, teamB)
  const { pA: cpA, pB: cpB } = matchPCustom(teamA, teamB)
  const tA = teamData(teamA)
  const tB = teamData(teamB)
  const fmtPct = (v: number) => `${(v * 100).toFixed(0)}%`

  // Verrassingspotentieel: winkans van de zwakkere ploeg (lagere FIFA-ranking)
  const aWeaker = (tA?.fifa ?? 0) <= (tB?.fifa ?? 0)
  const upsetProb = aWeaker ? cpA : cpB
  const isUpset = upsetProb >= UPSET_THRESHOLD

  const resultColor = result === 'A' ? 'var(--color-r)' : result === 'B' ? 'var(--color-b)' : 'var(--color-muted)'
  const resultLabel = result === 'A' ? t('resultWL') : result === 'B' ? t('resultLW') : t('resultDD')

  const query: Record<string, string> = { a: teamA, b: teamB }
  if (venue) query.venue = venue

  const isPlayed = played === true && scoreA !== undefined && scoreB !== undefined

  return (
    <Link
      href={{ pathname: '/versus', query }}
      title={t('predictThisMatch')}
      style={{
        display: 'block',
        borderBottom: '1px solid var(--color-brd)',
        textDecoration: 'none',
        color: 'inherit',
        cursor: 'pointer',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', fontSize: 7 }}>
        <span style={{ width: 10, flexShrink: 0, textAlign: 'center' }} title={isUpset ? `${t('upsetPotential')}: ${Math.round(upsetProb * 100)}%` : undefined}>
          {isPlayed ? '' : isUpset ? '⚡' : ''}
        </span>
        <FlagImg name={teamA} h={12} emoji={tA?.flag ?? '🏳️'} />
        <span style={{ color: 'var(--color-txt)', minWidth: 64, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{teamA}</span>
        {isPlayed ? (
          <span style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: 6 }}>
            <span style={{ color: 'var(--color-txt)', fontWeight: 'bold', fontSize: 9 }}>{scoreA} – {scoreB}</span>
            <span style={{ color: 'var(--color-g)', fontSize: 6 }}>{t('final')}</span>
          </span>
        ) : result ? (
          <span style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: 6 }}>
            <span style={{ color: resultColor, fontWeight: 'bold' }}>{resultLabel}</span>
            <span
              style={{ color: confidenceColor(Math.max(cpA, cpB)) }}
              title={`${Math.round(Math.max(cpA, cpB) * 100)}%`}
            >
              ~{expectedGoals(cpA)} – {expectedGoals(cpB)}
            </span>
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
      {isPlayed && venue && (
        <div style={{ padding: '0 10px 6px 30px', fontSize: 6, color: 'var(--color-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          🏟 {venue}
        </div>
      )}
    </Link>
  )
}
