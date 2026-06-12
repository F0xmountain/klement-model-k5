'use client'

import { useState, useEffect } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { teamData } from '@/lib/klement'
import { getTodaysMatches, type TodayMatch } from '@/lib/todays-matches'
import PixelParticles from '@/components/ui/PixelParticles'
import FlagImg from '@/components/ui/FlagImg'

const MAX_SHOWN = 4
const abbr = (name: string) => name.slice(0, 3).toUpperCase()

export default function TodaysMatches() {
  const t = useTranslations('home')
  const tc = useTranslations('common')
  const locale = useLocale()
  const [matches, setMatches] = useState<TodayMatch[] | null>(null)

  // "Vandaag" (UTC) pas ná mount bepalen — anders verschilt de server- van de
  // client-render (datum-afhankelijk) en krijg je een hydration-mismatch.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMatches(getTodaysMatches(new Date()))
  }, [])

  if (!matches || matches.length === 0) return null

  const localTime = (m: TodayMatch) =>
    new Date(`${m.date}T${m.kickoffUTC}:00Z`).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="sec" style={{ position: 'relative', overflow: 'hidden' }}>
      <PixelParticles variant="red" />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div className="section-title">{t('todayMatches')}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 460, overflowY: 'auto' }}>
          {matches.slice(0, MAX_SHOWN).map(m => {
            return (
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
                <div style={{ textAlign: 'center', fontSize: 8, marginTop: 8, color: m.result ? 'var(--color-muted)' : 'var(--color-muted)', opacity: m.result ? 0.6 : 1 }}>
                  {t('modelPrediction')}: {abbr(m.teamA)} {Math.round(m.prediction.pA * 100)}% · {tc('draw')} {Math.round(m.prediction.dr * 100)}% · {abbr(m.teamB)} {Math.round(m.prediction.pB * 100)}%
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
