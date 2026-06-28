import { teamFactors, teamData, teamElo } from '@/lib/klement'
import SectionLabel from '@/components/ui/SectionLabel'
import PixelBar from '@/components/ui/PixelBar'

interface Props {
  name: string
}

const COLOR: Record<string, string> = {
  fifa: 'var(--color-r)',
  elo: 'var(--color-r)',
  pop: 'var(--color-b)',
  temp: 'var(--color-b)',
  gdp: 'var(--color-b)',
  host: 'var(--color-g)',
}

function detail(key: string, t: ReturnType<typeof teamData>, elo: number): string {
  if (!t) return ''
  if (key === 'fifa') return `${t.fifa} pts`
  if (key === 'gdp') return `$${t.gdp}k`
  if (key === 'temp') return `${t.temp}°C`
  if (key === 'pop') return `${t.pop}M`
  if (key === 'elo') return `${elo}`
  if (key === 'host') return t.host ? 'host' : 'away'
  return ''
}

export default function FactorBreakdown({ name }: Props) {
  const t = teamData(name)
  if (!t) return null
  const factors = teamFactors(name)
  const elo = teamElo(name)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <SectionLabel>Factor Breakdown</SectionLabel>
      {factors.map(({ key, label, value, importancePct }) => (
        <div key={key}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 10 }}>
            <span style={{ color: 'var(--color-txt)' }}>{label}</span>
            <div style={{ display: 'flex', gap: 8, color: 'var(--color-muted)' }}>
              <span>{detail(key, t, elo)}</span>
              <span style={{ color: COLOR[key] ?? 'var(--color-b)' }}>{importancePct}% wt</span>
            </div>
          </div>
          <PixelBar value={value * 100} color={COLOR[key] ?? 'var(--color-g-mid)'} />
        </div>
      ))}
      <div style={{ fontSize: 8, color: 'var(--color-muted)', lineHeight: 2 }}>
        WEIGHTS ARE FIT FROM RESULTS AND REFRESH AFTER EACH MATCH. SEE ABOUT.
      </div>
    </div>
  )
}
