import { useLocale, useTranslations } from 'next-intl'
import { matchP, teamData } from '@/lib/klement'
import { localKickoff } from '@/lib/venue-timezones'
import WDLBar from '@/components/ui/WDLBar'
import FlagImg from '@/components/ui/FlagImg'
import AltitudeBadge from '@/components/match/AltitudeBadge'

interface Props {
  teamA: string
  teamB: string
  k?: string
  isFinal?: boolean
  // Optionele speeldatum/venue (FIFA-schema). Bij KO is dit de venue van het
  // bracket-slot; de tegenstanders zijn Klement's voorspelling.
  dateUtc?: string
  venue?: string
  city?: string
  altitudeM?: number
}

export default function MatchCard({ teamA, teamB, k, isFinal = false, dateUtc, venue, city, altitudeM }: Props) {
  const t = useTranslations('common')
  const tm = useTranslations('match')
  const locale = useLocale()
  const { pA, dr, pB } = matchP(teamA, teamB)
  const tA = teamData(teamA)
  const tB = teamData(teamB)
  const kickoff = dateUtc && venue ? localKickoff(dateUtc, venue, locale) : null

  const cardStyle: React.CSSProperties = isFinal
    ? { border: '2px solid var(--color-g)', boxShadow: '0 0 0 2px var(--color-bg), 0 0 0 4px var(--color-g)' }
    : { border: '1px solid var(--color-brd)', boxShadow: '3px 3px 0 var(--color-brd)' }

  const teamAStyle: React.CSSProperties = k === teamA
    ? { backgroundColor: 'var(--color-g-bg)', padding: '6px 8px', border: '1px solid var(--color-g-sh)' }
    : { padding: '6px 8px' }
  const teamBStyle: React.CSSProperties = k === teamB
    ? { backgroundColor: 'var(--color-g-bg)', padding: '6px 8px', border: '1px solid var(--color-g-sh)' }
    : { padding: '6px 8px' }

  return (
    <div style={{ ...cardStyle, padding: 16, backgroundColor: 'var(--color-bg)' }}>
      {kickoff && venue && (
        <div style={{ fontSize: 8, color: 'var(--color-muted)', marginBottom: 10, lineHeight: 1.8 }}>
          <div>📅 {kickoff.date} · {kickoff.time} {tm('localTime')}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
            <span>🏟 {venue}{city ? ` · ${city}` : ''}</span>
            {altitudeM !== undefined && <AltitudeBadge altitudeM={altitudeM} />}
          </div>
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: 8, alignItems: 'center', marginBottom: 10 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6, ...teamAStyle }}>
          <FlagImg name={teamA} h={28} emoji={tA?.flag ?? '🏳️'} />
          <span style={{ fontSize: 9, color: k === teamA ? 'var(--color-g)' : 'var(--color-txt)', fontWeight: k === teamA ? 'bold' : 'normal' }}>{teamA}</span>
          {k === teamA && <span className="k-badge">{t('klementPick')}</span>}
        </div>
        <div style={{ textAlign: 'center', fontSize: 9, color: 'var(--color-muted)' }}>{t('vs')}</div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, ...teamBStyle }}>
          <FlagImg name={teamB} h={28} emoji={tB?.flag ?? '🏳️'} />
          <span style={{ fontSize: 9, color: k === teamB ? 'var(--color-g)' : 'var(--color-txt)', fontWeight: k === teamB ? 'bold' : 'normal' }}>{teamB}</span>
          {k === teamB && <span className="k-badge">{t('klementPick')}</span>}
        </div>
      </div>
      <div style={{ borderLeft: '3px solid var(--color-b)', paddingLeft: 8 }}>
        <WDLBar pA={pA} dr={dr} pB={pB} labelA={teamA} labelB={teamB} />
      </div>
    </div>
  )
}
