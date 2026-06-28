import type { OptimalResult, RegFamily } from '@/lib/sensitivity/types'

const FAMILY_LABEL: Record<RegFamily, string> = {
  l2: 'L2 (ridge)',
  l1: 'L1 (lasso)',
  elasticNet: 'elastic-net',
}

interface Props {
  result: OptimalResult
}

interface WeightRow {
  key: string
  label: string
  beta: number
  importancePct: number
  kept: boolean
}

function configChips(result: OptimalResult): { label: string; val: string }[] {
  const c = result.config
  return [
    { label: 'FAMILY', val: FAMILY_LABEL[c.family].toUpperCase() },
    { label: 'LAMBDA', val: c.lambda.toFixed(4) },
    { label: 'ALPHA', val: c.family === 'elasticNet' ? c.alpha.toFixed(2) : '-' },
    { label: 'KEPT', val: `${c.featureSubset.length}/${result.weights.length}` },
  ]
}

function ConfigChips({ result }: Props): React.ReactElement {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
      {configChips(result).map((c) => (
        <div key={c.label} className="score-card" style={{ padding: '14px 10px' }}>
          <div style={{ fontSize: 12, color: 'var(--color-b)', marginBottom: 6 }}>{c.val}</div>
          <div style={{ fontSize: 7, color: 'var(--color-muted)', letterSpacing: 1 }}>{c.label}</div>
        </div>
      ))}
    </div>
  )
}

function toRows(result: OptimalResult): WeightRow[] {
  const kept = new Set<string>(result.config.featureSubset)
  return result.weights.map((w) => ({ ...w, kept: kept.has(w.key) }))
}

function WeightLine({ row }: { row: WeightRow }): React.ReactElement {
  const color = row.kept ? 'var(--color-txt)' : 'var(--color-muted)'
  const status = row.kept ? 'KEPT' : 'DROPPED'
  const statusColor = row.kept ? 'var(--color-g)' : 'var(--color-r)'
  return (
    <div style={{ display: 'contents' }}>
      <span style={{ color }}>{row.label.toUpperCase()}</span>
      <span style={{ color: statusColor, textAlign: 'center' }}>{status}</span>
      <span style={{ color, textAlign: 'right' }}>{row.beta.toFixed(3)}</span>
      <span style={{ color: 'var(--color-muted)', textAlign: 'right' }}>{row.importancePct.toFixed(1)}%</span>
    </div>
  )
}

function WeightTable({ result }: Props): React.ReactElement {
  const rows = toRows(result)
  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 70px 60px', gap: 8, fontSize: 8, minWidth: 360 }}>
        <span style={{ color: 'var(--color-muted)' }}>FEATURE</span>
        <span style={{ color: 'var(--color-muted)', textAlign: 'center' }}>STATUS</span>
        <span style={{ color: 'var(--color-muted)', textAlign: 'right' }}>BETA</span>
        <span style={{ color: 'var(--color-muted)', textAlign: 'right' }}>IMPORT</span>
        {rows.map((row) => (
          <WeightLine key={row.key} row={row} />
        ))}
      </div>
    </div>
  )
}

export default function OptimalCard({ result }: Props): React.ReactElement {
  return (
    <div className="about-formula" style={{ marginBottom: 28, padding: 20 }}>
      <div style={{ fontSize: 9, color: 'var(--color-b)', letterSpacing: 1, marginBottom: 16 }}>
        SELECTED OPTIMAL MODEL (REFIT ON WORLD CUPS &lt;= 2014)
      </div>
      <ConfigChips result={result} />
      <WeightTable result={result} />
    </div>
  )
}
