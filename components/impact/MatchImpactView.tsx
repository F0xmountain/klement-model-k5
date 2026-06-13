'use client'
import { useTranslations } from 'next-intl'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { Link } from '@/i18n/navigation'
import type { ImpactData, MatchImpact } from '@/lib/match-impact'

const COLORS = ['var(--color-b)', 'var(--color-r)', 'var(--color-g)', 'var(--color-o)', '#7B4FA0', '#1A8A8A']

const signPct = (d: number) => `${d >= 0 ? '+' : ''}${(d * 100).toFixed(1)}%`
const pct = (v: number) => `${(v * 100).toFixed(1)}%`

function ImpactCard({ m, highlight, badge }: { m: MatchImpact; highlight?: boolean; badge?: string }) {
  const t = useTranslations('impact')
  return (
    <div
      className="factor-card"
      style={{
        padding: 14,
        border: highlight ? '2px solid var(--color-b)' : undefined,
        boxShadow: highlight ? '4px 4px 0 var(--color-b-sh)' : undefined,
      }}
    >
      {badge && (
        <div style={{ fontSize: 8, color: 'var(--color-b)', fontFamily: 'var(--font-pixel)', marginBottom: 6 }}>
          ★ {badge}
        </div>
      )}
      {m.group && (
        <div style={{ fontSize: 8, color: 'var(--color-muted)', letterSpacing: 0.5, marginBottom: 2 }}>
          GROUP {m.group}
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontSize: 11, color: 'var(--color-txt)' }}>{m.matchLabel}</span>
        {m.result && <span style={{ fontSize: 11, color: 'var(--color-txt)', fontFamily: 'var(--font-pixel)' }}>{m.result}</span>}
      </div>

      <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 4, fontSize: 9 }}>
        <div style={{ color: 'var(--color-g)' }}>
          🔼 {t('biggestWinner')}: {m.biggestWinner.team || '—'} {m.biggestWinner.team && signPct(m.biggestWinner.delta)}
        </div>
        <div style={{ color: 'var(--color-r)' }}>
          🔽 {t('biggestLoser')}: {m.biggestLoser.team || '—'} {m.biggestLoser.team && signPct(m.biggestLoser.delta)}
        </div>
        <div style={{ color: 'var(--color-muted)' }}>
          {t('volatility')}: Σ|Δ| = {pct(m.totalVolatility)}
        </div>
      </div>

      {/* Before/after top teams */}
      <details style={{ marginTop: 8 }}>
        <summary style={{ fontSize: 8, color: 'var(--color-muted)', cursor: 'pointer' }}>
          {t('before')} → {t('after')}
        </summary>
        <div style={{ marginTop: 6, display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '2px 10px', fontSize: 8 }}>
          {Object.keys(m.snapshots.after).map(team => (
            <BeforeAfterRow key={team} team={team} before={m.snapshots.before[team] ?? 0} after={m.snapshots.after[team] ?? 0} />
          ))}
        </div>
      </details>

      {m.teamA && m.teamB && (
        <div style={{ marginTop: 10 }}>
          <Link
            href={{ pathname: '/versus', query: { a: m.teamA, b: m.teamB, ...(m.venue ? { venue: m.venue } : {}) } }}
            style={{ fontSize: 8, color: 'var(--color-b)', textDecoration: 'none', letterSpacing: 0.5 }}
          >
            → {t('predict')}
          </Link>
        </div>
      )}
    </div>
  )
}

function BeforeAfterRow({ team, before, after }: { team: string; before: number; after: number }) {
  const delta = after - before
  return (
    <>
      <span style={{ color: 'var(--color-txt)' }}>{team}</span>
      <span style={{ color: 'var(--color-muted)', textAlign: 'right' }}>{pct(before)} → {pct(after)}</span>
      <span style={{ color: delta >= 0 ? 'var(--color-g)' : 'var(--color-r)', textAlign: 'right' }}>{signPct(delta)}</span>
    </>
  )
}

export default function MatchImpactView({ data }: { data: ImpactData }) {
  const t = useTranslations('impact')

  if (data.impacts.length === 0) {
    return (
      <div className="sec page-enter">
        <div className="section-title">{t('title')}</div>
        <div style={{ fontSize: 10, color: 'var(--color-muted)', padding: '40px 0', textAlign: 'center', border: '1px solid var(--color-brd)' }}>
          {t('empty')}
        </div>
      </div>
    )
  }

  const chartData = data.timeline.map(p => ({
    label: p.label,
    ...Object.fromEntries(data.topTeams.map(tm => [tm, Math.round((p.teams[tm] ?? 0) * 1000) / 10])),
  }))

  // Nieuwste wedstrijd bovenaan in de feed.
  const feed = [...data.impacts].reverse()

  return (
    <div className="sec page-enter">
      <div className="section-title">{t('title')}</div>
      <div style={{ fontSize: 10, color: 'var(--color-muted)', lineHeight: 2.2, marginBottom: 16 }}>
        {t('intro')}
      </div>

      {data.isDemo && (
        <div className="factor-card" style={{ padding: 10, marginBottom: 20, fontSize: 9, color: 'var(--color-o)', borderColor: 'var(--color-o)' }}>
          {t('demoNote')}
        </div>
      )}

      {/* Most impactful badge */}
      {data.mostImpactful && (
        <div style={{ marginBottom: 24 }}>
          <ImpactCard m={data.mostImpactful} highlight badge={t('mostImpactful')} />
        </div>
      )}

      {/* Cumulatieve grafiek */}
      <div className="section-title">{t('timelineTitle')}</div>
      <div style={{ fontSize: 9, color: 'var(--color-muted)', lineHeight: 2, marginBottom: 12 }}>
        {t('timelineSub')}
      </div>
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={chartData} margin={{ top: 6, right: 14, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--color-brd)" strokeDasharray="2 2" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 7, fontFamily: 'var(--font-pixel)', fill: 'var(--color-muted)' }}
            axisLine={{ stroke: 'var(--color-brd2)' }}
            tickLine={{ stroke: 'var(--color-brd2)' }}
          />
          <YAxis
            domain={[0, 25]}
            tickFormatter={v => `${v}%`}
            tick={{ fontSize: 8, fontFamily: 'var(--font-pixel)', fill: 'var(--color-muted)' }}
            axisLine={{ stroke: 'var(--color-brd2)' }}
            tickLine={{ stroke: 'var(--color-brd2)' }}
            width={44}
          />
          <Tooltip
            formatter={v => `${v}%`}
            contentStyle={{
              fontFamily: 'var(--font-pixel), monospace', fontSize: 9,
              backgroundColor: 'var(--color-bg)', border: '2px solid var(--color-brd2)',
              boxShadow: '3px 3px 0 var(--color-brd)',
            }}
          />
          <Legend wrapperStyle={{ fontSize: 8, fontFamily: 'var(--font-pixel)' }} />
          {data.topTeams.map((team, i) => (
            <Line key={team} type="monotone" dataKey={team} name={team} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={false} />
          ))}
        </LineChart>
      </ResponsiveContainer>

      {/* Impact-tijdlijn (feed) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 24 }}>
        {feed.map(m => (
          <ImpactCard key={`${m.matchLabel}-${m.date}`} m={m} />
        ))}
      </div>
    </div>
  )
}
