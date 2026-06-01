import { sc, teamData } from '@/lib/klement'
import Tag from '@/components/ui/Tag'

interface Props {
  name: string
}

export default function TeamHeroCard({ name }: Props) {
  const t = teamData(name)
  const score = sc(name)

  if (!t) return null

  return (
    <div style={{ border: '1px solid var(--color-b)', borderLeft: '4px solid var(--color-b)', boxShadow: '4px 4px 0 var(--color-b-sh)', padding: 20, background: 'var(--color-bg)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
        <span style={{ fontSize: 48 }}>{t.flag}</span>
        <div>
          <h1 style={{ fontSize: 14, color: 'var(--color-txt)', marginBottom: 8 }}>{name}</h1>
          <div style={{ display: 'flex', gap: 6 }}>
            <Tag variant="gray">{t.conf}</Tag>
            {t.host && <Tag variant="green">HOST</Tag>}
            {t.latam && <Tag variant="blue">LATAM</Tag>}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {[
          { label: 'Model Score', value: score.toFixed(3), color: 'var(--color-b)' },
          { label: 'FIFA Pts', value: String(t.fifa), color: 'var(--color-txt)' },
          { label: 'GDP/cap', value: `$${t.gdp}k`, color: 'var(--color-txt)' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: 'var(--color-surf)', border: '1px solid var(--color-brd)', padding: 12, textAlign: 'center' }}>
            <p style={{ fontSize: 14, color, marginBottom: 4 }}>{value}</p>
            <p style={{ fontSize: 6, color: 'var(--color-muted)' }}>{label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
