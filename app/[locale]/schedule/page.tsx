'use client'
import { useTranslations, useLocale } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { SCHEDULE, canonTeam, type ScheduledMatch, type ScheduleRound } from '@/lib/wc26-schedule'
import { dateKeyInTz } from '@/lib/venue-timezones'
import { resultForPair } from '@/lib/todays-matches'
import { teamData } from '@/lib/klement'
import FlagImg from '@/components/ui/FlagImg'
import AltitudeBadge from '@/components/match/AltitudeBadge'
import PixelParticles from '@/components/ui/PixelParticles'
import ViewerKickoff, { useViewerTimeZone } from '@/components/match/ViewerKickoff'

const ROUND_ORDER: ScheduleRound[] = ['group', 'r32', 'r16', 'qf', 'sf', '3rd', 'final']

const INTL_LOCALE: Record<string, string> = { nl: 'nl-NL', en: 'en-GB' }

function matchesForRound(round: ScheduleRound): ScheduledMatch[] {
  return SCHEDULE
    .filter(m => m.round === round)
    .sort((a, b) => a.dateUtc.localeCompare(b.dateUtc) || (a.matchNum ?? 0) - (b.matchNum ?? 0))
}

// Eén wedstrijdkaart. Groepswedstrijden (teams bekend) zijn klikbaar naar /versus;
// KO-wedstrijden tonen de slot-labels (tegenstander nog onbekend). De aftraptijd
// staat in de tijdzone van de bezoeker via ViewerKickoff.
function MatchRow({ m }: { m: ScheduledMatch }) {
  const tg = useTranslations('groups')
  const home = canonTeam(m.homeTeam)
  const away = canonTeam(m.awayTeam)
  const isGroup = m.round === 'group' && !!home && !!away
  const played = isGroup ? resultForPair(home!, away!) : undefined

  const borderColor = played
    ? played.result === 'A' ? 'var(--color-g)' : played.result === 'B' ? 'var(--color-r)' : 'var(--color-o)'
    : 'var(--color-brd)'

  const side = (name: string | undefined, slot: string | undefined, align: 'left' | 'right') => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: align === 'right' ? 'flex-end' : 'flex-start', gap: 8, minWidth: 0, fontSize: 10 }}>
      {align === 'left' && name && <FlagImg name={name} h={14} emoji={teamData(name)?.flag ?? '🏳️'} />}
      <span style={{ color: name ? 'var(--color-txt)' : 'var(--color-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {name ?? slot ?? 'TBD'}
      </span>
      {align === 'right' && name && <FlagImg name={name} h={14} emoji={teamData(name)?.flag ?? '🏳️'} />}
    </div>
  )

  const inner = (
    <div className="factor-card" style={{ padding: 12, marginBottom: 8, borderLeft: `3px solid ${borderColor}` }}>
      <div style={{ fontSize: 8, color: 'var(--color-muted)' }}><ViewerKickoff dateUtc={m.dateUtc} /></div>
      <div style={{ fontSize: 8, color: 'var(--color-muted)', marginBottom: 8 }}>
        🏟 {m.venue} · {m.city}<AltitudeBadge venue={m.venue} style={{ marginLeft: 6 }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 10 }}>
        {side(home, m.homeSlot, 'left')}
        <div style={{ textAlign: 'center', minWidth: 56 }}>
          {played
            ? <span style={{ fontSize: 14, color: 'var(--color-txt)', fontWeight: 'bold' }}>{played.scoreA}–{played.scoreB}</span>
            : <span style={{ fontSize: 9, color: 'var(--color-muted)' }}>vs</span>}
        </div>
        {side(away, m.awaySlot, 'right')}
      </div>
    </div>
  )

  if (isGroup) {
    return (
      <Link
        href={{ pathname: '/versus', query: { a: home!, b: away!, venue: m.venue } }}
        title={tg('predictThisMatch')}
        style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}
      >
        {inner}
      </Link>
    )
  }
  return inner
}

// Groepsfase per kalenderdag in de tijdzone van de bezoeker gegroepeerd, met een
// datumkop per dag. Zowel sleutel als kop gebruiken viewerTz, zodat kop en kaart
// altijd dezelfde dag tonen.
function GroupStage({ matches, locale, viewerTz }: { matches: ScheduledMatch[]; locale: string; viewerTz: string }) {
  const intlLocale = INTL_LOCALE[locale] ?? 'en-GB'
  const byDate: { date: string; label: string; matches: ScheduledMatch[] }[] = []
  for (const m of matches) {
    const date = dateKeyInTz(m.dateUtc, viewerTz)
    let bucket = byDate.find(b => b.date === date)
    if (!bucket) {
      const label = new Intl.DateTimeFormat(intlLocale, {
        weekday: 'long', day: 'numeric', month: 'long', timeZone: viewerTz,
      }).format(new Date(m.dateUtc))
      bucket = { date, label, matches: [] }
      byDate.push(bucket)
    }
    bucket.matches.push(m)
  }
  byDate.sort((a, b) => a.date.localeCompare(b.date))
  return (
    <>
      {byDate.map(b => (
        <div key={b.date} style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 9, color: 'var(--color-b)', letterSpacing: 1, marginBottom: 6, textTransform: 'capitalize' }}>{b.label}</div>
          {b.matches.map(m => <MatchRow key={m.matchId} m={m} />)}
        </div>
      ))}
    </>
  )
}

export default function SchedulePage() {
  const t = useTranslations('schedule')
  const locale = useLocale()
  const viewerTz = useViewerTimeZone()

  return (
    <div className="sec page-enter" style={{ position: 'relative', overflow: 'hidden' }}>
      <PixelParticles variant="mix" />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div className="section-title">{t('title')}</div>

        {ROUND_ORDER.map(round => {
          const matches = matchesForRound(round)
          if (matches.length === 0) return null
          return (
            <div key={round} style={{ marginBottom: 28 }}>
              <div className="section-title" style={{ marginTop: 12 }}>{t(`rounds.${round}`)}</div>
              {round === 'group'
                ? <GroupStage matches={matches} locale={locale} viewerTz={viewerTz} />
                : matches.map(m => <MatchRow key={m.matchId} m={m} />)}
            </div>
          )
        })}
      </div>
    </div>
  )
}
