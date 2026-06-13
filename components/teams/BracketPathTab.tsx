'use client'
import { useTranslations } from 'next-intl'
import { teamData } from '@/lib/klement'
import { matchP } from '@/lib/klement-custom'
import { GROUPS, ROUNDS } from '@/lib/fixtures'
import { resultForPair } from '@/lib/todays-matches'
import FlagImg from '@/components/ui/FlagImg'

const KO_ORDER = ['r32', 'r16', 'qf', 'sf', 'final'] as const
type KoRound = (typeof KO_ORDER)[number]

interface PathStep { round: KoRound; opponent: string; advances: boolean }

// Klement's voorspelde pad: per ronde de wedstrijd met dit team uit fixtures.ts,
// stoppend zodra Klement het team laat verliezen (k !== team).
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

function groupOf(teamName: string): { letter: string; opponents: string[] } | null {
  for (const [letter, teams] of Object.entries(GROUPS)) {
    if (teams.includes(teamName)) return { letter, opponents: teams.filter(t => t !== teamName) }
  }
  return null
}

const fmtPct = (v: number) => Math.round(v * 100)

// Eén knoop in de boom: gekleurde linkerrand naar status.
function Node({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <div className="factor-card" style={{ padding: 12, borderLeft: `3px solid ${color}`, marginBottom: 0 }}>
      {children}
    </div>
  )
}

function Connector() {
  return <div style={{ textAlign: 'center', color: 'var(--color-muted)', fontSize: 10, lineHeight: 1, margin: '2px 0' }}>↓</div>
}

export default function BracketPathTab({ teamName }: { teamName: string }) {
  const t = useTranslations('teams.path')
  const tr = useTranslations('rounds')
  const group = groupOf(teamName)
  const path = klementPath(teamName)
  const stepByRound = new Map(path.map(s => [s.round, s]))
  const playedCount = group ? group.opponents.filter(o => resultForPair(teamName, o)).length : 0

  return (
    <div>
      <div className="section-title" style={{ marginBottom: 12 }}>{t('title')}</div>

      {/* Groep — huidige positie (uit results.json) */}
      <Node color="var(--color-g)">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <FlagImg name={teamName} h={16} emoji={teamData(teamName)?.flag ?? '🏳️'} />
          <span style={{ fontSize: 11, color: 'var(--color-txt)' }}>
            {group ? t('group', { letter: group.letter }) : teamName}
          </span>
          <span style={{ marginLeft: 'auto', fontSize: 7, color: 'var(--color-g)', border: '1px solid var(--color-g)', padding: '2px 6px', letterSpacing: 1 }}>
            ● {t('current')}
          </span>
        </div>
        <div style={{ fontSize: 8, color: 'var(--color-muted)' }}>{t('played', { n: playedCount })}</div>
      </Node>

      {/* Knockoutrondes — Klement's voorspelde pad */}
      {KO_ORDER.map(round => {
        const step = stepByRound.get(round)
        // Niet op het voorspelde pad → grijze alternatieve tak.
        if (!step) {
          return (
            <div key={round}>
              <Connector />
              <Node color="var(--color-brd)">
                <div style={{ fontSize: 8, color: 'var(--color-muted)', marginBottom: 4, letterSpacing: 1 }}>{tr(`${round}Full`)}</div>
                <div style={{ fontSize: 9, color: 'var(--color-muted)' }}>{t('notPredicted')}</div>
              </Node>
            </div>
          )
        }

        const advancePct = fmtPct(matchP(teamName, step.opponent).pA)
        const isFinalWin = round === 'final' && step.advances
        const color = step.advances ? 'var(--color-g)' : 'var(--color-r)'

        return (
          <div key={round}>
            <Connector />
            <Node color={color}>
              <div style={{ fontSize: 8, color: 'var(--color-muted)', marginBottom: 6, letterSpacing: 1 }}>{tr(`${round}Full`)}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 7, color: 'var(--color-muted)' }}>vs</span>
                <FlagImg name={step.opponent} h={14} emoji={teamData(step.opponent)?.flag ?? '🏳️'} />
                <span style={{ fontSize: 10, color: 'var(--color-txt)' }}>{step.opponent}</span>
                <span style={{ marginLeft: 'auto', fontSize: 8, color: 'var(--color-g)' }}>{t('advance', { pct: advancePct })}</span>
              </div>
              {!step.advances && (
                <div style={{ fontSize: 8, color: 'var(--color-r)', marginTop: 6 }}>❌ {t('eliminated')}</div>
              )}
              {isFinalWin && (
                <div style={{ fontSize: 8, color: 'var(--color-g)', marginTop: 6 }}>{t('champion')}</div>
              )}
            </Node>
          </div>
        )
      })}
    </div>
  )
}
