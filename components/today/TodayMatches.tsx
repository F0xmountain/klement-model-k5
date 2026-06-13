'use client'

import { useState, useEffect } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { teamData } from '@/lib/klement'
import { localKickoff } from '@/lib/venue-timezones'
import { matchesOnUtcDay, nextMatchAfter, type TodayScheduleMatch } from '@/lib/today-schedule'
import { Link } from '@/i18n/navigation'
import PixelParticles from '@/components/ui/PixelParticles'
import FlagImg from '@/components/ui/FlagImg'
import AltitudeBadge from '@/components/match/AltitudeBadge'

export default function TodayMatches() {
  const t = useTranslations('today')
  const tg = useTranslations('groups')
  const locale = useLocale()
  const [state, setState] = useState<{ today: TodayScheduleMatch[]; next: TodayScheduleMatch | null } | null>(null)

  // "Vandaag" (UTC-kalenderdag) pas ná mount bepalen, anders verschilt de server-
  // van de client-render → hydration-mismatch.
  useEffect(() => {
    const now = new Date()
    const today = matchesOnUtcDay(now)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState({ today, next: today.length === 0 ? nextMatchAfter(now) : null })
  }, [])

  if (!state) return null

  const card = (m: TodayScheduleMatch) => {
    const { time } = localKickoff(m.dateUtc, m.venue, locale)
    return (
      <div key={m.matchId} className="factor-card">
        {m.group && (
          <div style={{ fontSize: 7, color: 'var(--color-muted)', letterSpacing: 1, marginBottom: 8 }}>
            {tg('groupLabel')} {m.group}
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10, minWidth: 0 }}>
            <FlagImg name={m.home} h={16} emoji={teamData(m.home)?.flag ?? '🏳️'} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.home}</span>
          </div>
          <div style={{ textAlign: 'center', minWidth: 64 }}>
            {m.played ? (
              <span style={{ fontSize: 16, color: 'var(--color-txt)', fontWeight: 'bold' }}>
                {m.played.scoreA}–{m.played.scoreB}
              </span>
            ) : (
              <span style={{ fontSize: 11, color: 'var(--color-b)' }}>{time}</span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, fontSize: 10, minWidth: 0 }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.away}</span>
            <FlagImg name={m.away} h={16} emoji={teamData(m.away)?.flag ?? '🏳️'} />
          </div>
        </div>
        <div style={{ fontSize: 8, color: 'var(--color-muted)', marginTop: 8, textAlign: 'center' }}>
          🏟 {m.venue} · {m.city}<AltitudeBadge altitudeM={m.altitudeM} style={{ marginLeft: 6 }} />
        </div>
        <div style={{ textAlign: 'center', marginTop: 8 }}>
          <Link
            href={{ pathname: '/versus', query: { a: m.home, b: m.away, venue: m.venue } }}
            style={{ fontSize: 8, color: 'var(--color-b)', textDecoration: 'none', letterSpacing: 0.5 }}
          >
            {tg('predictThisMatch')}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="sec" style={{ position: 'relative', overflow: 'hidden' }}>
      <PixelParticles variant="red" />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div className="section-title">{t('title')}</div>
        {state.today.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 520, overflowY: 'auto' }}>
            {state.today.map(card)}
          </div>
        ) : (
          <div style={{ fontSize: 9, color: 'var(--color-muted)', lineHeight: 2.2 }}>
            <div>{t('noMatches')}</div>
            {state.next && (
              <div style={{ marginTop: 6, color: 'var(--color-txt)' }}>
                {t('next', {
                  date: localKickoff(state.next.dateUtc, state.next.venue, locale).date,
                  teams: `${state.next.home} – ${state.next.away}`,
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
