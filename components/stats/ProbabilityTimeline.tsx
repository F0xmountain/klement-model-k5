'use client'
import { useTranslations } from 'next-intl'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import snapshotsRaw from '@/lib/probability-snapshots.json'

interface Snapshot {
  timestamp: string
  matchLabel: string
  snapshots: Record<string, number>
}

const snapshots = snapshotsRaw as Snapshot[]
const COLORS = ['var(--color-b)', 'var(--color-r)', 'var(--color-g)', 'var(--color-o)', '#7B4FA0', '#1A8A8A']
const TOP_LINES = 6

export default function ProbabilityTimeline() {
  const t = useTranslations('stats')

  if (snapshots.length === 0) {
    return (
      <div>
        <div className="section-title">{t('probTimeline')}</div>
        <div style={{ fontSize: 10, color: 'var(--color-muted)', lineHeight: 2.2, marginBottom: 20 }}>
          {t('probTimelineSub')}
        </div>
        <div style={{ fontSize: 10, color: 'var(--color-muted)', padding: '40px 0', textAlign: 'center', border: '1px solid var(--color-brd)' }}>
          {t('probTimelineEmpty')}
        </div>
      </div>
    )
  }

  // Top-6 teams op de meest recente kampioenskans (laatste snapshot)
  const last = snapshots[snapshots.length - 1]!.snapshots
  const topTeams = Object.entries(last).sort((a, b) => b[1] - a[1]).slice(0, TOP_LINES).map(([team]) => team)

  // Grafiekdata in procenten (1 decimaal)
  const data = snapshots.map(s => {
    const row: Record<string, number | string> = { label: s.matchLabel }
    for (const team of topTeams) row[team] = Math.round((s.snapshots[team] ?? 0) * 1000) / 10
    return row
  })

  return (
    <div>
      <div className="section-title">{t('probTimeline')}</div>
      <div style={{ fontSize: 10, color: 'var(--color-muted)', lineHeight: 2.2, marginBottom: 20 }}>
        {t('probTimelineSub')}
      </div>
      <ResponsiveContainer width="100%" height={340}>
        <LineChart data={data} margin={{ top: 6, right: 14, left: 0, bottom: 0 }}>
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
          {topTeams.map((team, i) => (
            <Line key={team} type="monotone" dataKey={team} name={team} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={false} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
