import { useTranslations } from 'next-intl'
import { isHighAltitude } from '@/lib/wc26-schedule'
import { ALTITUDE_FACTOR_ENABLED } from '@/lib/feature-flags'

// ⚠️-badge bij venues > 1500m. Zichtbaar ongeacht de feature-flag; de tekst
// vermeldt "(binnenkort in het model)" zolang de hoogte-factor nog uit staat.
export default function AltitudeBadge({ altitudeM, style }: { altitudeM: number; style?: React.CSSProperties }) {
  const tm = useTranslations('match')
  if (!isHighAltitude(altitudeM)) return null
  return (
    <span
      title={tm('altitudeWarning')}
      style={{ color: 'var(--color-o)', fontSize: 8, whiteSpace: 'nowrap', cursor: 'help', ...style }}
    >
      ⚠️ {tm('altitude', { m: altitudeM })}{!ALTITUDE_FACTOR_ENABLED && ` ${tm('altitudeSoon')}`}
    </span>
  )
}
