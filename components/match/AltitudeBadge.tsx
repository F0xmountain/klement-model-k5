import { useTranslations } from 'next-intl'
import { venueAltitude } from '@/lib/wc26-schedule'

// Toont altijd de hoogte van het venue ("⛰ Xm"), ongeacht de hoogte — geen
// drempel, geen waarschuwing. De hoogte komt uit lib/stadiums.json via de
// venue-lookup; staat het venue daar niet in, dan toont de badge niets.
export default function AltitudeBadge({ venue, style }: { venue: string | undefined; style?: React.CSSProperties }) {
  const tm = useTranslations('match')
  const m = venueAltitude(venue)
  if (m === undefined) return null
  return (
    <span style={{ color: 'var(--color-muted)', fontSize: 8, whiteSpace: 'nowrap', ...style }}>
      ⛰ {tm('altitudeShort', { m })}
    </span>
  )
}
