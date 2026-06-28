import type { HoldoutMetrics, OptimalResult, TournamentLogLoss } from '@/lib/sensitivity/types'

interface Props {
  result: OptimalResult
}

interface Row {
  label: string
  metrics: HoldoutMetrics
  highlight: boolean
}

function lossAt(metrics: HoldoutMetrics, year: number): TournamentLogLoss | undefined {
  return metrics.perTournament.find((t) => t.year === year)
}

function cell(metrics: HoldoutMetrics, year: number): string {
  const found = lossAt(metrics, year)
  if (found === undefined || found.n === 0) return '-'
  return found.logLoss.toFixed(4)
}

function buildRows(result: OptimalResult): Row[] {
  const optimal: Row = { label: 'SELECTED MODEL', metrics: result.headline, highlight: true }
  const baselines = result.baselines.map((b) => ({ label: b.label.toUpperCase(), metrics: b.holdout, highlight: false }))
  return [optimal, ...baselines]
}

function HeaderRow({ years }: { years: number[] }): React.ReactElement {
  return (
    <div style={{ display: 'contents' }}>
      <span style={{ color: 'var(--color-muted)' }}>MODEL</span>
      {years.map((year) => (
        <span key={year} style={{ color: 'var(--color-muted)', textAlign: 'right' }}>{year}</span>
      ))}
      <span style={{ color: 'var(--color-muted)', textAlign: 'right' }}>POOLED</span>
    </div>
  )
}

function BodyRow({ row, years }: { row: Row; years: number[] }): React.ReactElement {
  const labelColor = row.highlight ? 'var(--color-b)' : 'var(--color-txt)'
  const pooledColor = row.highlight ? 'var(--color-b)' : 'var(--color-muted)'
  return (
    <div style={{ display: 'contents' }}>
      <span style={{ color: labelColor }}>{row.label}</span>
      {years.map((year) => (
        <span key={year} style={{ color: 'var(--color-muted)', textAlign: 'right' }}>{cell(row.metrics, year)}</span>
      ))}
      <span style={{ color: pooledColor, textAlign: 'right' }}>{row.metrics.pooledLogLoss.toFixed(4)}</span>
    </div>
  )
}

export default function HoldoutTable({ result }: Props): React.ReactElement {
  const years = result.holdoutYears
  const rows = buildRows(result)
  const cols = `1fr ${years.map(() => '70px').join(' ')} 80px`
  return (
    <div style={{ overflowX: 'auto', marginBottom: 28 }}>
      <div style={{ display: 'grid', gridTemplateColumns: cols, gap: 8, fontSize: 8, minWidth: 440 }}>
        <HeaderRow years={years} />
        {rows.map((row) => (
          <BodyRow key={row.label} row={row} years={years} />
        ))}
      </div>
    </div>
  )
}
