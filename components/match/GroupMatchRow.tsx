'use client'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { matchP, teamData } from '@/lib/klement'
import { matchP as matchPCustom } from '@/lib/klement-custom'
import { topScores } from '@/lib/score-distribution'
import { groupMatchByTeams } from '@/lib/wc26-schedule'
import { UPSET_THRESHOLD } from '@/lib/upset-detector'
import { Link } from '@/i18n/navigation'
import FlagImg from '@/components/ui/FlagImg'
import AltitudeBadge from '@/components/match/AltitudeBadge'
import { useViewerKickoff } from '@/components/match/ViewerKickoff'
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

// Pill-kleur op kans: ≥20% rood (waarschijnlijk), ≤5% groen (onwaarschijnlijk).
function pillColor(prob: number): string {
  if (prob >= 0.2) return 'var(--color-r)'
  if (prob <= 0.05) return 'var(--color-g)'
  return 'var(--color-muted)'
}

function ScorePills({ pWin, pLoss, actual }: { pWin: number; pLoss: number; actual?: { a: number; b: number } }) {
  const t = useTranslations('match')
  const top = topScores(pWin, pLoss, 5)
  const covered = top.reduce((s, x) => s + x.probability, 0)
  const other = Math.max(0, 1 - covered)
  const actualInTop = actual && top.some(s => s.homeGoals === actual.a && s.awayGoals === actual.b)

  const pill = (label: string, color: string, key: string, border?: string) => (
    <span key={key} style={{
      fontSize: 7, padding: '3px 6px', backgroundColor: 'var(--color-bg)',
      border: `1px solid ${border ?? 'var(--color-brd)'}`, color,
      whiteSpace: 'nowrap', borderRadius: 2,
    }}>{label}</span>
  )

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, padding: '4px 10px 8px 30px' }}>
      <span style={{ fontSize: 7, color: 'var(--color-muted)', alignSelf: 'center', marginRight: 2 }}>{t('scoreOdds')}:</span>
      {top.map(s => {
        const isActual = actual && s.homeGoals === actual.a && s.awayGoals === actual.b
        return pill(
          `${s.homeGoals}-${s.awayGoals} ${(s.probability * 100).toFixed(0)}%${isActual ? ' ✓' : ''}`,
          isActual ? 'var(--color-txt)' : pillColor(s.probability),
          `${s.homeGoals}-${s.awayGoals}`,
          isActual ? 'var(--color-g)' : undefined,
        )
      })}
      {actual && !actualInTop && pill(`${actual.a}-${actual.b} ✓`, 'var(--color-txt)', 'actual', 'var(--color-g)')}
      {other > 0.01 && pill(`${t('other')} ${(other * 100).toFixed(0)}%`, 'var(--color-muted)', 'other')}
    </div>
  )
}

export default function GroupMatchRow({ teamA, teamB, result, venue, played, scoreA, scoreB }: Props) {
  const t = useTranslations('groups')
  const tm = useTranslations('match')
  const sched = groupMatchByTeams(teamA, teamB)
  // Aftraptijd in de tijdzone van de bezoeker (leeg + onbenut als er geen sched is).
  const kickoff = useViewerKickoff(sched?.dateUtc ?? '')
  const { pA, dr, pB } = matchP(teamA, teamB)
  const { pA: cpA, pB: cpB } = matchPCustom(teamA, teamB)
  const tA = teamData(teamA)
  const tB = teamData(teamB)
  const fmtPct = (v: number) => `${(v * 100).toFixed(0)}%`
  const [showScores, setShowScores] = useState(false)

  // Verrassingspotentieel: winkans van de zwakkere ploeg (lagere FIFA-ranking)
  const aWeaker = (tA?.fifa ?? 0) <= (tB?.fifa ?? 0)
  const upsetProb = aWeaker ? cpA : cpB
  const isUpset = upsetProb >= UPSET_THRESHOLD

  const resultColor = result === 'A' ? 'var(--color-r)' : result === 'B' ? 'var(--color-b)' : 'var(--color-muted)'
  const resultLabel = result === 'A' ? t('resultWL') : result === 'B' ? t('resultLW') : t('resultDD')

  const query: Record<string, string> = { a: teamA, b: teamB }
  if (venue) query.venue = venue

  const isPlayed = played === true && scoreA !== undefined && scoreB !== undefined

  // 🎯 toggelt de scorekansen; preventDefault houdt de rij-link (/versus) tegen.
  const toggleScores = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setShowScores(s => !s)
  }
  const scoreBtn = (
    <button
      onClick={toggleScores}
      aria-label={tm('scoreOdds')}
      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 9, padding: 0, lineHeight: 1, opacity: showScores ? 1 : 0.55 }}
    >🎯</button>
  )

  return (
    <>
      <Link
        href={{ pathname: '/versus', query }}
        title={t('predictThisMatch')}
        style={{
          display: 'block',
          borderBottom: showScores ? 'none' : '1px solid var(--color-brd)',
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
          <span style={{ color: 'var(--color-txt)', minWidth: 56, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{teamA}</span>
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
          {scoreBtn}
          <span style={{ color: 'var(--color-txt)', minWidth: 56, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{teamB}</span>
          <FlagImg name={teamB} h={12} emoji={tB?.flag ?? '🏳️'} />
        </div>
        {sched && (
          <div style={{ padding: '0 10px 6px 30px', fontSize: 6, color: 'var(--color-muted)', display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              🏟 {sched.venue} · {sched.city} · {kickoff.date} {kickoff.time}
            </span>
            <AltitudeBadge altitudeM={sched.altitudeM} />
          </div>
        )}
      </Link>
      {showScores && (
        <div style={{ borderBottom: '1px solid var(--color-brd)' }}>
          <ScorePills pWin={cpA} pLoss={cpB} actual={isPlayed ? { a: scoreA!, b: scoreB! } : undefined} />
        </div>
      )}
    </>
  )
}
