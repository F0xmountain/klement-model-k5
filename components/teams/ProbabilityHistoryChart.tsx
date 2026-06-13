'use client'
import { useTranslations } from 'next-intl'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import snapshotsRaw from '@/lib/probability-snapshots.json'

interface Snapshot {
  timestamp: string
  matchLabel: string
  snapshots: Record<string, number>
}
const SNAPSHOTS = snapshotsRaw as Snapshot[]

interface Row {
  label: string
  value: number   // kampioenskans in %
  prev: number | null
}

function direction(value: number, prev: number | null): 'up' | 'down' | 'same' {
  if (prev === null) return 'same'
  if (value > prev) return 'up'
  if (value < prev) return 'down'
  return 'same'
}

function colorFor(r: Row): string {
  if (r.prev === null) return 'var(--color-b)'
  const dir = direction(r.value, r.prev)
  return dir === 'up' ? 'var(--color-g)' : dir === 'down' ? 'var(--color-r)' : 'var(--color-muted)'
}

// Groen bij stijging, rood bij daling, blauw voor het startpunt.
function probDot({ cx, cy, index }: { cx?: number; cy?: number; index?: number }, rows: Row[]) {
  if (cx == null || cy == null || index == null) return <g />
  const r = rows[index]
  return <circle cx={cx} cy={cy} r={3.5} fill={r ? colorFor(r) : 'var(--color-b)'} stroke="none" />
}

export default function ProbabilityHistoryChart({ teamName }: { teamName: string }) {
  const t = useTranslations('teams.probHistory')

  const present = SNAPSHOTS
    .map(s => ({ label: s.matchLabel, raw: s.snapshots[teamName] }))
    .filter((p): p is { label: string; raw: number } => typeof p.raw === 'number')

  // Minstens twee meetpunten nodig voor een verloop; anders niets tonen.
  if (present.length < 2) return null

  const startLabel = t('start')
  const rows: Row[] = present.map((p, i) => ({
    label: p.label || startLabel,
    value: Math.round(p.raw * 1000) / 10,
    prev: i > 0 ? Math.round(present[i - 1]!.raw * 1000) / 10 : null,
  }))

  return (
    <div style={{ marginBottom: 24 }}>
      <div className="section-title" style={{ marginBottom: 8 }}>{t('title')}</div>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={rows} margin={{ top: 6, right: 14, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--color-brd)" strokeDasharray="2 2" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 7, fontFamily: 'var(--font-pixel)', fill: 'var(--color-muted)' }}
            axisLine={{ stroke: 'var(--color-brd2)' }}
            tickLine={{ stroke: 'var(--color-brd2)' }}
            interval={0}
          />
          <YAxis
            domain={['dataMin - 0.3', 'dataMax + 0.3']}
            tickFormatter={(v: number) => `${v}%`}
            tick={{ fontSize: 7, fontFamily: 'var(--font-pixel)', fill: 'var(--color-muted)' }}
            axisLine={{ stroke: 'var(--color-brd2)' }}
            tickLine={{ stroke: 'var(--color-brd2)' }}
            width={42}
          />
          <Tooltip
            content={({ active, payload }: { active?: boolean; payload?: ReadonlyArray<{ payload?: Row }> }) => {
              if (!active || !payload || payload.length === 0) return null
              const r = payload[0]?.payload
              if (!r) return null
              const text = r.prev === null
                ? `${r.label}: ${r.value}%`
                : t('tooltip', {
                    match: r.label,
                    dir: direction(r.value, r.prev),
                    from: r.prev,
                    to: r.value,
                  })
              return (
                <div style={{
                  fontFamily: 'var(--font-pixel), monospace', fontSize: 8,
                  backgroundColor: 'var(--color-bg)', border: '2px solid var(--color-brd2)',
                  boxShadow: '3px 3px 0 var(--color-brd)', padding: '6px 8px', maxWidth: 220,
                }}>
                  {text}
                </div>
              )
            }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="var(--color-brd2)"
            strokeWidth={2}
            dot={props => probDot(props, rows)}
            activeDot={{ r: 5 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
