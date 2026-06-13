'use client'
import { useTranslations } from 'next-intl'
import { teamData } from '@/lib/klement'
import { matchP } from '@/lib/klement-custom'
import { topScores } from '@/lib/score-distribution'
import { teamGroupMatches, canonTeam, type ScheduledMatch } from '@/lib/wc26-schedule'
import { restDaysBefore } from '@/lib/rest-days'
import { resultForPair } from '@/lib/todays-matches'
import { ROUNDS } from '@/lib/fixtures'
import FlagImg from '@/components/ui/FlagImg'
import AltitudeBadge from '@/components/match/AltitudeBadge'
import ViewerKickoff from '@/components/match/ViewerKickoff'
import ProbabilityHistoryChart from './ProbabilityHistoryChart'

const KO_ORDER = ['r32', 'r16', 'qf', 'sf', 'final'] as const

const fmtPct = (v: number) => `${Math.round(v * 100)}%`

// Compacte top-3 scoreverwachting onder de W/D/L-balk van ongespeelde wedstrijden.
function TopScoresLine({ pWin, pLoss }: { pWin: number; pLoss: number }) {
  const tm = useTranslations('match')
  const top = topScores(pWin, pLoss, 3)
  return (
    <div style={{ fontSize: 8, color: 'var(--color-muted)', marginTop: 4 }}>
      {tm('mostLikely')}: {top.map(s => `${s.homeGoals}-${s.awayGoals} (${fmtPct(s.probability)})`).join(' · ')}
    </div>
  )
}

// Rustdagen-indicator: <3 dagen = ⚠️ geel · 3–5 = grijs · >5 = ✅ groen.
// Toont niets bij de eerste wedstrijd van het team (geen vorige wedstrijd).
function RestIndicator({ teamName, matchId }: { teamName: string; matchId: string }) {
  const tm = useTranslations('match')
  const days = restDaysBefore(teamName, matchId)
  if (days === null) return null
  const { icon, color } = days < 3
    ? { icon: '⚠️', color: 'var(--color-o)' }
    : days <= 5
      ? { icon: '', color: 'var(--color-muted)' }
      : { icon: '✅', color: 'var(--color-g)' }
  return (
    <span style={{ fontSize: 8, color, whiteSpace: 'nowrap' }}>
      {icon && `${icon} `}{tm('restDays', { days })}
    </span>
  )
}

function GroupMatchCard({ teamName, match }: { teamName: string; match: ScheduledMatch }) {
  const opponent = canonTeam(match.homeTeam) === teamName ? canonTeam(match.awayTeam)! : canonTeam(match.homeTeam)!
  const { pA, dr, pB } = matchP(teamName, opponent)
  const played = resultForPair(teamName, opponent)

  // Randkleur naar resultaat (vanuit dit team gezien).
  const borderColor = !played
    ? 'var(--color-brd)'
    : played.result === 'A' ? 'var(--color-g)' : played.result === 'B' ? 'var(--color-r)' : 'var(--color-o)'

  return (
    <div className="factor-card" style={{ padding: 12, borderLeft: `3px solid ${borderColor}`, marginBottom: 10 }}>
      <div style={{ fontSize: 8, color: 'var(--color-muted)', display: 'flex', justifyContent: 'space-between', gap: 8 }}>
        <ViewerKickoff dateUtc={match.dateUtc} />
        <RestIndicator teamName={teamName} matchId={match.matchId} />
      </div>
      <div style={{ fontSize: 8, color: 'var(--color-muted)', marginBottom: 8 }}>
        🏟 {match.venue} · {match.city}<AltitudeBadge altitudeM={match.altitudeM} style={{ marginLeft: 6 }} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <FlagImg name={opponent} h={16} emoji={teamData(opponent)?.flag ?? '🏳️'} />
        <span style={{ fontSize: 11, color: 'var(--color-txt)' }}>{opponent}</span>
        {played && (
          <span style={{ marginLeft: 'auto', fontSize: 11, fontFamily: 'var(--font-pixel)', color: 'var(--color-txt)' }}>
            FT {played.scoreA}–{played.scoreB}
          </span>
        )}
      </div>
      {!played && (
        <>
          <div style={{ fontSize: 9, display: 'flex', gap: 10 }}>
            <span style={{ color: 'var(--color-g)' }}>W {fmtPct(pA)}</span>
            <span style={{ color: 'var(--color-muted)' }}>D {fmtPct(dr)}</span>
            <span style={{ color: 'var(--color-r)' }}>L {fmtPct(pB)}</span>
          </div>
          <TopScoresLine pWin={pA} pLoss={pB} />
        </>
      )}
    </div>
  )
}

interface PathStep { round: string; opponent: string; advances: boolean }

function klementPath(teamName: string): PathStep[] {
  const path: PathStep[] = []
  for (const round of KO_ORDER) {
    const m = ROUNDS[round]!.find(x => x.teamA === teamName || x.teamB === teamName)
    if (!m) break
    const opponent = m.teamA === teamName ? m.teamB : m.teamA
    const advances = m.k === teamName
    path.push({ round, opponent, advances })
    if (!advances) break
  }
  return path
}

export default function ScheduleTab({ teamName }: { teamName: string }) {
  const t = useTranslations('teams')
  const tr = useTranslations('rounds')
  const groupMatches = teamGroupMatches(teamName)
  const path = klementPath(teamName)

  return (
    <div>
      {/* Kampioenskans-verloop — alleen voor teams met ≥2 snapshots */}
      <ProbabilityHistoryChart teamName={teamName} />

      {/* Groepsfase */}
      <div className="section-title" style={{ marginBottom: 8 }}>{t('schedule.group')}</div>
      {groupMatches.map(m => <GroupMatchCard key={m.matchId} teamName={teamName} match={m} />)}

      {/* Knockoutfase — Klement's voorspelde pad */}
      {path.length > 0 && (
        <>
          <div className="section-title" style={{ marginTop: 20, marginBottom: 4 }}>{t('schedule.knockout')}</div>
          <div style={{ fontSize: 8, color: 'var(--color-muted)', marginBottom: 8 }}>{t('schedule.predicted')}</div>
          {path.map(step => {
            const { pA, dr, pB } = matchP(teamName, step.opponent)
            return (
              <div key={step.round} className="factor-card" style={{ padding: 12, borderLeft: `3px solid ${step.advances ? 'var(--color-g)' : 'var(--color-r)'}`, marginBottom: 10 }}>
                <div style={{ fontSize: 8, color: 'var(--color-muted)', marginBottom: 6 }}>{tr(`${step.round}Full`)}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <FlagImg name={step.opponent} h={16} emoji={teamData(step.opponent)?.flag ?? '🏳️'} />
                  <span style={{ fontSize: 11, color: 'var(--color-txt)' }}>{step.opponent}</span>
                  {!step.advances && (
                    <span style={{ marginLeft: 'auto', fontSize: 8, color: 'var(--color-r)', fontWeight: 'bold' }}>
                      ❌ {t('schedule.eliminated')}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 9, display: 'flex', gap: 10 }}>
                  <span style={{ color: 'var(--color-g)' }}>W {fmtPct(pA)}</span>
                  <span style={{ color: 'var(--color-muted)' }}>D {fmtPct(dr)}</span>
                  <span style={{ color: 'var(--color-r)' }}>L {fmtPct(pB)}</span>
                </div>
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}
