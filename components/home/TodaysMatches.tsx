'use client'

import { useState, useEffect } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { teamData } from '@/lib/klement'
import { getTodaysMatches, getTomorrowsMatches, type TodayMatch } from '@/lib/todays-matches'
import PixelParticles from '@/components/ui/PixelParticles'
import FlagImg from '@/components/ui/FlagImg'

const MAX_SHOWN = 4
const MIN_TODAY = 2
const abbr = (name: string) => name.slice(0, 3).toUpperCase()

export default function TodaysMatches() {
  const t = useTranslations('home')
  const tc = useTranslations('common')
  const locale = useLocale()
  const [data, setData] = useState<{ today: TodayMatch[]; tomorrow: TodayMatch[] } | null>(null)

  // "Vandaag" pas ná mount bepalen, in de LOKALE tijdzone van de kijker (new Date()).
  // Anders verschilt de server- van de client-render → hydration-mismatch.
  useEffect(() => {
    const now = new Date()
    const today = getTodaysMatches(now)
    const tomorrow = today.length < MIN_TODAY ? getTomorrowsMatches(now) : []
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setData({ today, tomorrow })
  }, [])

  if (!data || (data.today.length === 0 && data.tomorrow.length === 0)) return null

  // Aftraptijd in de lokale tijd van de kijker (Intl converteert het UTC-instant)
  const localTime = (m: TodayMatch) =>
    new Date(`${m.date}T${m.kickoffUTC}:00Z`).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })

  const card = (m: TodayMatch) => (
    <div key={m.matchId} className="factor-card">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10, minWidth: 0 }}>
          <FlagImg name={m.teamA} h={16} emoji={teamData(m.teamA)?.flag ?? '🏳️'} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.teamA}</span>
        </div>
        <div style={{ textAlign: 'center', minWidth: 64 }}>
          {m.result ? (
            <span style={{ fontSize: 16, color: 'var(--color-txt)', fontWeight: 'bold' }}>
              {m.result.scoreA}–{m.result.scoreB}
            </span>
          ) : (
            <span style={{ fontSize: 11, color: 'var(--color-b)' }}>{localTime(m)}</span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, fontSize: 10, minWidth: 0 }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.teamB}</span>
          <FlagImg name={m.teamB} h={16} emoji={teamData(m.teamB)?.flag ?? '🏳️'} />
        </div>
      </div>
      <div style={{ textAlign: 'center', fontSize: 8, marginTop: 8, color: 'var(--color-muted)', opacity: m.result ? 0.6 : 1 }}>
        {t('modelPrediction')}: {abbr(m.teamA)} {Math.round(m.prediction.pA * 100)}% · {tc('draw')} {Math.round(m.prediction.dr * 100)}% · {abbr(m.teamB)} {Math.round(m.prediction.pB * 100)}%
      </div>
    </div>
  )

  return (
    <div className="sec" style={{ position: 'relative', overflow: 'hidden' }}>
      <PixelParticles variant="red" />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div className="section-title">{t('todayMatches')}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 520, overflowY: 'auto' }}>
          {data.today.slice(0, MAX_SHOWN).map(card)}
          {data.tomorrow.length > 0 && (
            <>
              <div style={{ fontSize: 9, color: 'var(--color-muted)', marginTop: 8, letterSpacing: 1 }}>{t('tomorrowMatches')}</div>
              {data.tomorrow.slice(0, MAX_SHOWN).map(card)}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
