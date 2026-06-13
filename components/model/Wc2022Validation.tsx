'use client'
import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer,
} from 'recharts'
import { getWc2022Validation, type ValidationRow } from '@/lib/wc2022-validation'

const pct = (v: number) => `${Math.round(v * 100)}%`

// Volgorde van de rondefilters. 'all' = geen filter.
const FILTERS = ['all', 'group', 'r16', 'qf', 'sf', 'third', 'final'] as const
type Filter = (typeof FILTERS)[number]

const FILTER_LABEL: Record<Filter, string> = {
  all: 'filterAll', group: 'filterGroup', r16: 'filterR16',
  qf: 'filterQf', sf: 'filterSf', third: 'filterThird', final: 'filterFinal',
}

function StatCard({ label, value, hint, accent }: { label: string; value: string; hint?: string; accent?: string }) {
  return (
    <div className="factor-card" style={{ padding: 14, flex: '1 1 140px', minWidth: 140 }}>
      <div style={{ fontSize: 8, color: 'var(--color-muted)', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 20, color: accent ?? 'var(--color-txt)', fontFamily: 'var(--font-pixel)' }}>{value}</div>
      {hint && <div style={{ fontSize: 7, color: 'var(--color-muted)', marginTop: 4, lineHeight: 1.6 }}>{hint}</div>}
    </div>
  )
}

export default function Wc2022Validation() {
  const t = useTranslations('model')
  const v = useMemo(() => getWc2022Validation(), [])
  const [filter, setFilter] = useState<Filter>('all')

  const rows: ValidationRow[] = filter === 'all' ? v.rows : v.rows.filter(r => r.round === filter)

  const chartData = v.cumulative.map((c, i) => ({
    x: i + 1,
    label: c.label,
    brier: Math.round(c.brier * 1000) / 1000,
  }))

  const groupPct = v.groupTotal > 0 ? Math.round((v.groupCorrect / v.groupTotal) * 100) : 0

  return (
    <div>
      <div className="section-title" style={{ marginTop: 32 }}>{t('validation')}</div>
      <div style={{ fontSize: 10, color: 'var(--color-muted)', lineHeight: 2.2, marginBottom: 16 }}>
        {t('val.intro')}
      </div>

      {/* Samenvatting */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
        <StatCard label={t('brierScore')} value={v.brier.toFixed(3)} hint={t('val.brierHint')} accent="var(--color-b)" />
        <StatCard label={t('favoritesWon')} value={pct(v.favoriteWon / v.n)} hint={`${v.favoriteWon} / ${v.n}`} accent="var(--color-g)" />
        <StatCard label={t('val.groupAccuracy')} value={`${v.groupCorrect}/${v.groupTotal}`} accent="var(--color-txt)" />
        <StatCard label={t('val.koAccuracy')} value={`${v.koCorrect}/${v.koTotal}`} accent="var(--color-txt)" />
        <StatCard
          label={t('val.championCorrect')}
          value={v.championCorrect ? '✅' : '❌'}
          hint={v.championCorrect ? t('val.championYes', { team: v.championTeam }) : t('val.championNo', { team: v.championTeam })}
          accent={v.championCorrect ? 'var(--color-g)' : 'var(--color-r)'}
        />
      </div>

      {/* Verwachting voor 2026 */}
      <div className="factor-card" style={{ padding: 12, marginBottom: 20, fontSize: 9, color: 'var(--color-muted)', lineHeight: 1.9 }}>
        {t('val.forecast', { pct: groupPct })}
      </div>

      {/* Cumulatieve Brier-grafiek */}
      <div className="section-title">{t('val.cumulativeTitle')}</div>
      <div style={{ fontSize: 9, color: 'var(--color-muted)', lineHeight: 2, marginBottom: 12 }}>
        {t('val.cumulativeSub')}
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={chartData} margin={{ top: 6, right: 14, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--color-brd)" strokeDasharray="2 2" />
          <XAxis
            dataKey="x"
            tick={{ fontSize: 7, fontFamily: 'var(--font-pixel)', fill: 'var(--color-muted)' }}
            axisLine={{ stroke: 'var(--color-brd2)' }}
            tickLine={{ stroke: 'var(--color-brd2)' }}
          />
          <YAxis
            domain={[0, 0.8]}
            tick={{ fontSize: 8, fontFamily: 'var(--font-pixel)', fill: 'var(--color-muted)' }}
            axisLine={{ stroke: 'var(--color-brd2)' }}
            tickLine={{ stroke: 'var(--color-brd2)' }}
            width={36}
          />
          <Tooltip
            formatter={v => [v, 'Brier']}
            labelFormatter={(_label, payload) => payload?.[0]?.payload?.label ?? ''}
            contentStyle={{
              fontFamily: 'var(--font-pixel), monospace', fontSize: 9,
              backgroundColor: 'var(--color-bg)', border: '2px solid var(--color-brd2)',
              boxShadow: '3px 3px 0 var(--color-brd)',
            }}
          />
          {/* Referentielijn: willekeurige voorspeller ≈ 0.667 */}
          <ReferenceLine y={0.667} stroke="var(--color-r)" strokeDasharray="4 3" />
          <Line type="monotone" dataKey="brier" name="Brier" stroke="var(--color-b)" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>

      {/* Rondefilter */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '20px 0 12px' }}>
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="px-btn"
            style={{
              fontFamily: 'inherit', fontSize: 8, padding: '6px 12px', cursor: 'pointer',
              border: '2px solid var(--color-brd2)',
              backgroundColor: filter === f ? 'var(--color-b)' : 'var(--color-bg)',
              color: filter === f ? '#fff' : 'var(--color-txt)',
            }}
          >
            {t(`val.${FILTER_LABEL[f]}`)}
          </button>
        ))}
      </div>

      {/* Wedstrijdtabel */}
      <div className="factor-card" style={{ overflowX: 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2.4fr 2.2fr 1fr 0.6fr', gap: 10, fontSize: 8, color: 'var(--color-muted)', marginBottom: 10, minWidth: 460 }}>
          <span>{t('val.colMatch')}</span>
          <span>{t('val.colModel')}</span>
          <span style={{ textAlign: 'right' }}>{t('val.colActual')}</span>
          <span style={{ textAlign: 'right' }}>{t('val.colHit')}</span>
        </div>
        {rows.map(r => {
          const actualLabel = r.actual === 'D' ? '—' : r.actual === 'A' ? r.teamA : r.teamB
          return (
            <div key={r.matchId} style={{ display: 'grid', gridTemplateColumns: '2.4fr 2.2fr 1fr 0.6fr', gap: 10, fontSize: 9, alignItems: 'center', padding: '7px 0', borderTop: '1px solid var(--color-brd)', minWidth: 460 }}>
              <span style={{ color: 'var(--color-txt)' }}>
                {r.teamA} <span style={{ color: 'var(--color-muted)' }}>{r.score}</span> {r.teamB}
              </span>
              <span style={{ color: 'var(--color-muted)', fontSize: 8, fontFamily: 'var(--font-pixel)' }}>
                {pct(r.pA)} / {pct(r.pDraw)} / {pct(r.pB)}
              </span>
              <span style={{ textAlign: 'right', color: 'var(--color-txt)', fontSize: 8 }}>{actualLabel}</span>
              <span style={{ textAlign: 'right', color: r.correct ? 'var(--color-g)' : 'var(--color-r)' }}>
                {r.correct ? '✓' : '✗'}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
