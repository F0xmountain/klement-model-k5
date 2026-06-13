'use client'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { Link } from '@/i18n/navigation'
import { teamCode } from '@/lib/team-codes'
import { impactNarrative, matchSummaryNarrative, isNegligible } from '@/lib/impact-narrative'
import type { ImpactData, MatchImpact } from '@/lib/match-impact'

const COLORS = ['var(--color-b)', 'var(--color-r)', 'var(--color-g)', 'var(--color-o)', '#7B4FA0', '#1A8A8A']

const signPct = (d: number) => `${d >= 0 ? '+' : ''}${(d * 100).toFixed(1)}%`
const pct = (v: number) => `${(v * 100).toFixed(1)}%`

// Top-N teams op kampioenskans (na de wedstrijd) die nog actief zijn — een kans
// van 0 betekent uitgeschakeld (geen pad meer naar de titel). Zijn er minder dan
// N actief, dan worden ze allemaal getoond.
function topActiveTeams(after: Record<string, number>, n = 10): string[] {
  return Object.entries(after)
    .filter(([, p]) => p > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([team]) => team)
}

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
          {topActiveTeams(m.snapshots.after).map(team => (
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

// Horizontale micrometer-balk (60px): middelpunt = 0, rechts = groen (winst),
// links = rood (verlies), geschaald naar de grootste delta in de lijst.
function Micrometer({ delta, maxAbs }: { delta: number; maxAbs: number }) {
  const HALF = 30
  const w = maxAbs > 0 ? Math.min(HALF, (Math.abs(delta) / maxAbs) * HALF) : 0
  const positive = delta >= 0
  return (
    <div style={{ position: 'relative', width: 60, height: 8, backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-brd)', flexShrink: 0 }}>
      <div style={{ position: 'absolute', left: HALF, top: 0, bottom: 0, width: 1, backgroundColor: 'var(--color-brd2)' }} />
      <div style={{ position: 'absolute', top: 1, height: 6, backgroundColor: positive ? 'var(--color-g)' : 'var(--color-r)', left: positive ? HALF : HALF - w, width: w }} />
    </div>
  )
}

interface TeamDelta { team: string; delta: number }

function TeamDeltaRow({ row, maxAbs, narrative }: { row: TeamDelta; maxAbs: number; narrative: string }) {
  const negligible = isNegligible(row.delta)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', fontSize: 9, opacity: negligible ? 0.55 : 1 }}>
      <span style={{ width: 70, flexShrink: 0, color: 'var(--color-txt)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.team}</span>
      <Micrometer delta={row.delta} maxAbs={maxAbs} />
      <span style={{ width: 44, flexShrink: 0, textAlign: 'right', color: row.delta >= 0 ? 'var(--color-g)' : 'var(--color-r)' }}>{signPct(row.delta)}</span>
      <span style={{ flex: '1 1 auto', minWidth: 0, color: 'var(--color-muted)', fontSize: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{narrative}</span>
    </div>
  )
}

// Context-kaartje voor de meest recente wedstrijd: kop, narratieve duiding,
// volatiliteit + grootste winnaar/verliezer, en per-team-rijen met micrometer-balk.
function ContextCard({ m }: { m: MatchImpact }) {
  const t = useTranslations('impact')
  const tg = useTranslations('groups')
  const [showNeg, setShowNeg] = useState(false)

  const rows: TeamDelta[] = topActiveTeams(m.snapshots.after, 10)
    .map(team => ({ team, delta: (m.snapshots.after[team] ?? 0) - (m.snapshots.before[team] ?? 0) }))
  const significant = rows.filter(r => !isNegligible(r.delta)).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
  const negligible = rows.filter(r => isNegligible(r.delta))
  const maxAbs = Math.max(0.0001, ...significant.map(r => Math.abs(r.delta)))

  const header = [
    m.teamA && m.teamB ? `${teamCode(m.teamA)} ${m.result} ${teamCode(m.teamB)}` : m.matchLabel,
    m.group ? `${tg('groupLabel')} ${m.group}` : null,
    m.venue,
  ].filter(Boolean).join(' · ')

  const summary = matchSummaryNarrative(t, {
    group: m.group ?? '',
    biggestWinner: m.biggestWinner,
    biggestLoser: m.biggestLoser,
  })

  return (
    <div className="factor-card" style={{ padding: 16, border: '2px solid var(--color-b)', boxShadow: '4px 4px 0 var(--color-b-sh)', marginBottom: 24 }}>
      <div style={{ fontSize: 8, color: 'var(--color-b)', fontFamily: 'var(--font-pixel)', marginBottom: 8 }}>{t('summaryCard')}</div>
      <div style={{ fontSize: 11, color: 'var(--color-txt)', marginBottom: 8 }}>{header}</div>
      <div style={{ fontSize: 10, color: 'var(--color-muted)', lineHeight: 1.9, marginBottom: 10 }}>{summary}</div>
      <div style={{ fontSize: 8, color: 'var(--color-muted)', marginBottom: 14 }}>
        {t('totalVolatility')}: Σ|Δ| = {pct(m.totalVolatility)}
        {m.biggestWinner.team && <> · 🔼 {m.biggestWinner.team} {signPct(m.biggestWinner.delta)}</>}
        {m.biggestLoser.team && <> · 🔽 {m.biggestLoser.team} {signPct(m.biggestLoser.delta)}</>}
      </div>

      {significant.map(r => (
        <TeamDeltaRow key={r.team} row={r} maxAbs={maxAbs} narrative={impactNarrative(t, r.team, r.delta, { group: m.group, winner: m.biggestWinner.team })} />
      ))}

      {negligible.length > 0 && (
        <>
          <button
            onClick={() => setShowNeg(s => !s)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 8, color: 'var(--color-b)', padding: '8px 0 4px' }}
          >
            {showNeg ? t('hideMore') : t('showMore', { n: negligible.length })}
          </button>
          {showNeg && negligible.map(r => (
            <TeamDeltaRow key={r.team} row={r} maxAbs={maxAbs} narrative={t('negligible')} />
          ))}
        </>
      )}
    </div>
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

      {/* Context-kaartje — meest recente wedstrijd */}
      {feed[0] && <ContextCard m={feed[0]} />}

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
