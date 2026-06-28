import type { OptimalConfig, RegPathPoint, RegFamily } from '@/lib/sensitivity/types'

const W = 640
const H = 220
const PAD_L = 46
const PAD_R = 14
const PAD_T = 16
const PAD_B = 34

const FAMILY_COLOR: Record<RegFamily, string> = {
  l2: 'var(--color-b)',
  l1: 'var(--color-r)',
  elasticNet: 'var(--color-g)',
}

const FAMILY_LABEL: Record<RegFamily, string> = {
  l2: 'L2 (ridge)',
  l1: 'L1 (lasso)',
  elasticNet: 'elastic-net',
}

interface Props {
  regPath: RegPathPoint[]
  config: OptimalConfig
}

interface Scale {
  xAt: (lambda: number) => number
  yAt: (loss: number) => number
  loMin: number
  loMax: number
}

// Lambda spans several decades, so the x-axis is log10 to keep the ridge/lasso
// knees legible. Each (family, alpha) draws its own polyline.
function buildScale(regPath: RegPathPoint[]): Scale {
  const logs = regPath.map((p) => Math.log10(p.lambda))
  const losses = regPath.map((p) => p.pooledHoldoutLogLoss)
  const xMin = Math.min(...logs)
  const xMax = Math.max(...logs)
  const loMin = Math.min(...losses)
  const loMax = Math.max(...losses)
  const xSpan = xMax - xMin || 1
  const loSpan = loMax - loMin || 1
  return {
    xAt: (lambda) => PAD_L + ((Math.log10(lambda) - xMin) / xSpan) * (W - PAD_L - PAD_R),
    yAt: (loss) => PAD_T + (1 - (loss - loMin) / loSpan) * (H - PAD_T - PAD_B),
    loMin,
    loMax,
  }
}

function seriesKey(point: RegPathPoint): string {
  return point.family === 'elasticNet' ? `elasticNet:${point.alpha}` : point.family
}

function groupSeries(regPath: RegPathPoint[]): Map<string, RegPathPoint[]> {
  const map = new Map<string, RegPathPoint[]>()
  for (const point of regPath) {
    const key = seriesKey(point)
    const existing = map.get(key) ?? []
    existing.push(point)
    map.set(key, existing)
  }
  return map
}

function polyline(points: RegPathPoint[], scale: Scale): string {
  return points
    .slice()
    .sort((a, b) => a.lambda - b.lambda)
    .map((p) => `${scale.xAt(p.lambda).toFixed(1)},${scale.yAt(p.pooledHoldoutLogLoss).toFixed(1)}`)
    .join(' ')
}

function Axes(): React.ReactElement {
  const x0 = PAD_L
  const y0 = H - PAD_B
  return (
    <g stroke="var(--color-brd2)" strokeWidth={1}>
      <line x1={x0} y1={PAD_T} x2={x0} y2={y0} />
      <line x1={x0} y1={y0} x2={W - PAD_R} y2={y0} />
    </g>
  )
}

function Labels({ scale }: { scale: Scale }): React.ReactElement {
  const y0 = H - PAD_B
  return (
    <g fontSize={7} fill="var(--color-muted)" fontFamily="var(--font-pixel), monospace">
      <text x={PAD_L - 4} y={PAD_T + 4} textAnchor="end">{scale.loMax.toFixed(3)}</text>
      <text x={PAD_L - 4} y={y0} textAnchor="end">{scale.loMin.toFixed(3)}</text>
      <text x={PAD_L} y={H - 8}>LAMBDA (LOG10)</text>
    </g>
  )
}

function ChosenMarker({ scale, config }: { scale: Scale; config: OptimalConfig }): React.ReactElement {
  const x = scale.xAt(config.lambda)
  return (
    <g>
      <line x1={x} y1={PAD_T} x2={x} y2={H - PAD_B} stroke="var(--color-txt)" strokeWidth={1} strokeDasharray="2 3" />
      <text x={x} y={PAD_T - 4} fontSize={7} fill="var(--color-txt)" textAnchor="middle" fontFamily="var(--font-pixel), monospace">CHOSEN</text>
    </g>
  )
}

function colorFor(key: string): string {
  const family = key.startsWith('elasticNet') ? 'elasticNet' : (key as RegFamily)
  return FAMILY_COLOR[family]
}

function Legend({ keys }: { keys: string[] }): React.ReactElement {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginTop: 8, fontSize: 7, color: 'var(--color-muted)' }}>
      {keys.map((key) => (
        <span key={key}>
          <span style={{ color: colorFor(key) }}>--</span>{' '}
          {legendLabel(key)}
        </span>
      ))}
    </div>
  )
}

function legendLabel(key: string): string {
  if (!key.startsWith('elasticNet')) return FAMILY_LABEL[key as RegFamily].toUpperCase()
  const alpha = key.split(':')[1]
  return `ELASTIC-NET a=${alpha}`
}

export default function RegPathChart({ regPath, config }: Props): React.ReactElement {
  const scale = buildScale(regPath)
  const series = groupSeries(regPath)
  const keys = [...series.keys()]
  return (
    <div className="score-card" style={{ textAlign: 'left', padding: 16 }}>
      <div style={{ fontSize: 9, color: 'var(--color-txt)', marginBottom: 8 }}>
        REGULARIZATION PATH - POOLED 2018-2026 OUT-OF-SAMPLE LOG-LOSS VS LAMBDA
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }} role="img" aria-label="regularization path">
        <Axes />
        <ChosenMarker scale={scale} config={config} />
        {keys.map((key) => (
          <polyline
            key={key}
            points={polyline(series.get(key) ?? [], scale)}
            fill="none"
            stroke={colorFor(key)}
            strokeWidth={1.5}
          />
        ))}
        <Labels scale={scale} />
      </svg>
      <Legend keys={keys} />
    </div>
  )
}
