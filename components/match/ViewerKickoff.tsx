'use client'
import { useState, useEffect } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { formatKickoff } from '@/lib/venue-timezones'

// De tijdzone van de bezoeker is pas ná hydratie bekend (resolvedOptions). Vóór
// hydratie 'UTC', zodat server- en client-render identiek zijn (geen mismatch);
// daarna re-rendert de aftraptijd in de eigen tijdzone van de bezoeker.
export function useViewerTimeZone(): string {
  const [tz, setTz] = useState('UTC')
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTz(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC')
  }, [])
  return tz
}

// Datum + tijd van een aftrap in de tijdzone van de bezoeker.
export function useViewerKickoff(dateUtc: string): { date: string; time: string } {
  const locale = useLocale()
  const tz = useViewerTimeZone()
  return formatKickoff(dateUtc, tz, locale)
}

// Herbruikbaar component voor (server-component) contexten waar de hook niet kan
// worden gebruikt, bv. app/[locale]/knockout/[round]/page.tsx. Toont
// "📅 {datum} · {tijd} {jouw tijd}" in de tijdzone van de bezoeker.
export default function ViewerKickoff({ dateUtc, style }: { dateUtc: string; style?: React.CSSProperties }) {
  const tm = useTranslations('match')
  const { date, time } = useViewerKickoff(dateUtc)
  return <span style={style}>📅 {date} · {time} {tm('yourTime')}</span>
}
