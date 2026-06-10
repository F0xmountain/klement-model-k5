import { useTranslations } from 'next-intl'
import { teamData } from '@/lib/klement'
import SectionLabel from '@/components/ui/SectionLabel'
import PixelBar from '@/components/ui/PixelBar'

interface Props {
  name: string
}

const factors = [
  {
    key: 'fifa' as const,
    weight: 0.45,
    normalize: (v: number) => Math.max(0, Math.min(1, (v - 1400) / 600)),
    fmt: (v: number) => `${v} pts`,
  },
  {
    key: 'gdp' as const,
    weight: 0.20,
    normalize: (v: number) => Math.max(0, Math.min(1, 1 - ((v - 35) / 35) ** 2)),
    fmt: (v: number) => `$${v}k`,
  },
  {
    key: 'temp' as const,
    weight: 0.15,
    normalize: (v: number) => Math.max(0, Math.min(1, 1 - Math.abs(v - 14) / 22)),
    fmt: (v: number) => `${v}°C`,
  },
  {
    key: 'pop' as const,
    weight: 0.15,
    normalize: (v: number) => Math.max(0, Math.min(1, Math.log(v) / Math.log(200))),
    fmt: (v: number) => `${v}M`,
  },
]

export default function FactorBreakdown({ name }: Props) {
  const tr = useTranslations('factorBreakdown')
  const t = teamData(name)
  if (!t) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <SectionLabel>{tr('title')}</SectionLabel>
      {factors.map(({ key, weight, normalize, fmt }) => {
        const raw = t[key] as number
        const score = normalize(raw)
        const display = key === 'pop' && !t.latam ? score * 0.3 : score
        const weightedPct = display * weight * 100
        return (
          <div key={key}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 10 }}>
              <span style={{ color: 'var(--color-txt)' }}>{tr(key)}</span>
              <div style={{ display: 'flex', gap: 8, color: 'var(--color-muted)' }}>
                <span>{fmt(raw)}</span>
                <span style={{ color: 'var(--color-b)' }}>{weightedPct.toFixed(1)}{tr('weightSuffix')}</span>
              </div>
            </div>
            <PixelBar value={display * 100} />
          </div>
        )
      })}
      {t.host && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 8, backgroundColor: 'var(--color-g-bg)', border: '1px solid var(--color-g-sh)', fontSize: 10 }}>
          <span style={{ color: 'var(--color-g)', fontWeight: 'bold' }}>+5%</span>
          <span style={{ color: 'var(--color-txt)' }}>{tr('homeAdvantage')}</span>
        </div>
      )}
    </div>
  )
}
