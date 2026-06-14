'use client'
import type { CSSProperties } from 'react'
import { useTranslations } from 'next-intl'
import { matchP, teamData } from '@/lib/klement'
import FlagImg from '@/components/ui/FlagImg'
import type { ResolvedMatch } from '@/lib/my-picks'
import { venueAltitude, type ScheduledMatch } from '@/lib/wc26-schedule'

interface Props {
  match: ResolvedMatch
  onPick?: (team: string) => void
  sched?: ScheduledMatch // venue van het bracket-slot uit het FIFA-schema
}

export default function MatchPickRow({ match, onPick, sched }: Props) {
  const tc = useTranslations('common')
  const tmb = useTranslations('myBracket')
  const tm = useTranslations('match')
  const alt = venueAltitude(sched?.venue)
  const { teamA, teamB, pick, klementPick, differs } = match
  const ready = teamA !== null && teamB !== null
  const hint = ready ? matchP(teamA, teamB) : null
  const pAp = hint ? Math.round(hint.pA * 100) : 0
  const drp = hint ? Math.round(hint.dr * 100) : 0
  const pBp = hint ? Math.round(hint.pB * 100) : 0

  function renderTeam(name: string | null, side: 'A' | 'B') {
    const style: CSSProperties = {
      alignItems: side === 'A' ? 'flex-start' : 'flex-end',
      textAlign: side === 'A' ? 'left' : 'right',
    }

    if (!name) {
      return (
        <div className="pick-slot-empty" style={{ ...style, justifyContent: side === 'A' ? 'flex-start' : 'flex-end' }}>
          {tmb('tbd')}
        </div>
      )
    }

    const td = teamData(name)
    const isPick = pick === name
    const isK = klementPick === name
    const className = `pick-slot${isPick ? ' pick-slot-selected' : ''}`

    const content = (
      <>
        <FlagImg name={name} h={28} emoji={td?.flag ?? '🏳️'} />
        <span style={{ fontSize: 10, color: isPick ? 'var(--color-o)' : 'var(--color-txt)', fontWeight: isPick ? 'bold' : 'normal' }}>
          {name}
        </span>
        <div style={{ fontSize: 9, color: 'var(--color-muted)' }}>{td?.conf}</div>
        {isK && <span className="k-badge">{tc('klementPick')}</span>}
        {isPick && differs && <span className="diff-badge">{tmb('diffBadge')}</span>}
      </>
    )

    if (onPick && ready) {
      return (
        <button type="button" className={className} style={style} onClick={() => onPick(name)}>
          {content}
        </button>
      )
    }

    return (
      <div className={className} style={style}>
        {content}
      </div>
    )
  }

  return (
    <div className="ko-match">
      {renderTeam(teamA, 'A')}
      {ready ? (
        <div className="ko-mini-bar">
          <div style={{ flex: pAp, backgroundColor: 'var(--color-r)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9 }}>{pAp}%</div>
          <div style={{ flex: drp, backgroundColor: 'var(--color-surf)', color: 'var(--color-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, borderLeft: '1px solid var(--color-brd)', borderRight: '1px solid var(--color-brd)' }}>{drp}%</div>
          <div style={{ flex: pBp, backgroundColor: 'var(--color-b)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9 }}>{pBp}%</div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', fontSize: 9, color: 'var(--color-muted)' }}>{tmb('tbd')}</div>
      )}
      {renderTeam(teamB, 'B')}
      {sched?.venue && (
        <div style={{ gridColumn: '1 / -1', textAlign: 'center', fontSize: 8, color: 'var(--color-muted)' }}>
          🏟 {sched.venue} · {sched.city}{alt !== undefined && ` · ⛰ ${tm('altitudeShort', { m: alt })}`}
        </div>
      )}
    </div>
  )
}
