'use client'
import { useState } from 'react'
import PixelParticles from '@/components/ui/PixelParticles'
import OptimalCard from '@/components/sensitivity/OptimalCard'
import HoldoutTable from '@/components/sensitivity/HoldoutTable'
import RegPathChart from '@/components/sensitivity/RegPathChart'
import type { OptimalResult, TournamentLogLoss } from '@/lib/sensitivity/types'

class OptimizeError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'OptimizeError'
  }
}

async function fetchOptimal(): Promise<OptimalResult> {
  const response = await fetch('/api/optimize', { cache: 'no-store' })
  const body = (await response.json()) as OptimalResult | { error: string }
  if (!response.ok || 'error' in body) {
    throw new OptimizeError('error' in body ? body.error : `request failed: ${response.status}`)
  }
  return body
}

function tournamentCell(metrics: TournamentLogLoss[], year: number): string {
  const found = metrics.find((t) => t.year === year)
  if (found === undefined || found.n === 0) return 'live'
  return found.logLoss.toFixed(4)
}

function headlineCards(result: OptimalResult): { label: string; val: string; color: string }[] {
  const perYear = result.holdoutYears.map((year) => ({
    label: `OOS ${year}`,
    val: tournamentCell(result.headline.perTournament, year),
    color: 'var(--color-r)',
  }))
  return [...perYear, { label: 'POOLED OOS', val: result.headline.pooledLogLoss.toFixed(4), color: 'var(--color-b)' }]
}

function Headline({ result }: { result: OptimalResult }): React.ReactElement {
  const cards = headlineCards(result)
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cards.length}, 1fr)`, gap: 12, marginBottom: 14 }}>
      {cards.map((c) => (
        <div key={c.label} className="score-card">
          <div style={{ fontSize: 14, color: c.color, marginBottom: 6 }}>{c.val}</div>
          <div style={{ fontSize: 7, color: 'var(--color-muted)', letterSpacing: 1 }}>{c.label}</div>
        </div>
      ))}
    </div>
  )
}

function Caveat({ text }: { text: string }): React.ReactElement {
  return (
    <div className="about-quote" style={{ marginBottom: 28 }}>
      <div style={{ fontSize: 7, color: 'var(--color-r)', letterSpacing: 1, marginBottom: 8 }}>HONEST CAVEAT</div>
      <div style={{ fontSize: 8, color: 'var(--color-muted)', lineHeight: 2.2 }}>{text}</div>
    </div>
  )
}

function Provenance({ result }: { result: OptimalResult }): React.ReactElement {
  return (
    <div style={{ fontSize: 8, color: 'var(--color-muted)', lineHeight: 2.2, marginBottom: 24 }}>
      TRAIN: WORLD CUPS {result.trainYears[0]} - {result.trainYears[result.trainYears.length - 1]} (YEAR &lt;= 2014).
      OUT-OF-SAMPLE: {result.holdoutYears.join(', ')}, REPORTED POOLED AND PER-TOURNAMENT.
      STANDARDIZER AND CALIBRATION FIT ON &lt;= 2014 ONLY. SOURCE: {result.dataSource.toUpperCase()}.
    </div>
  )
}

function Results({ result }: { result: OptimalResult }): React.ReactElement {
  return (
    <div className="fade-in">
      <div className="section-title">TRAIN &lt;= 2014 / OUT-OF-SAMPLE 2018-2026</div>
      <Headline result={result} />
      <Provenance result={result} />
      <Caveat text={result.caveat} />
      <div className="section-title">SELECTED OPTIMAL MODEL</div>
      <OptimalCard result={result} />
      <div className="section-title">HOLDOUT VS BASELINES</div>
      <HoldoutTable result={result} />
      <div className="section-title">REGULARIZATION PATH</div>
      <RegPathChart regPath={result.regPath} config={result.config} />
    </div>
  )
}

function LoadingTrace(): React.ReactElement {
  return (
    <div className="about-formula" style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 9, color: 'var(--color-b)', letterSpacing: 1, marginBottom: 10 }}>RUN IN PROGRESS</div>
      <div style={{ fontSize: 8, color: 'var(--color-muted)', lineHeight: 2.2 }} className="blink">
        FETCHING SOURCES, BUILDING FEATURES, FITTING ON &lt;= 2014, SEARCHING L1 / L2 / ELASTIC-NET
        AND FORWARD-BACKWARD FEATURE SUBSETS, SCORING POOLED 2018-2026 HOLDOUT...
      </div>
    </div>
  )
}

export default function SensitivityPage(): React.ReactElement {
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<OptimalResult | null>(null)
  const [error, setError] = useState('')

  async function start(): Promise<void> {
    setRunning(true)
    setError('')
    setResult(null)
    try {
      setResult(await fetchOptimal())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'run failed')
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="sec page-enter" style={{ position: 'relative', overflow: 'hidden' }}>
      <PixelParticles variant="blue" />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div className="section-title" style={{ marginBottom: 0 }}>WEIGHT-SELECTION EXPLORER</div>
          <button
            className="px-btn"
            onClick={start}
            disabled={running}
            style={{
              fontFamily: 'inherit', fontSize: 9, padding: '10px 18px',
              backgroundColor: running ? 'var(--color-surf)' : 'var(--color-b)',
              color: running ? 'var(--color-muted)' : '#fff',
              border: 'none', boxShadow: '4px 4px 0 var(--color-b-sh)',
              cursor: running ? 'not-allowed' : 'pointer',
            }}
          >
            {running ? 'RUNNING...' : 'START'}
          </button>
        </div>

        <div style={{ fontSize: 9, color: 'var(--color-muted)', lineHeight: 2.4, marginBottom: 24 }}>
          A LIVE POINT-IN-TIME EXPERIMENT: FIT WEIGHTS, STANDARDIZER AND CALIBRATION ON WORLD<br />
          CUPS UP TO 2014, SEARCH L1 / L2 / ELASTIC-NET PLUS FORWARD-BACKWARD FEATURE SUBSETS,<br />
          THEN REPORT THE WINNER ON THE 2018 / 2022 / 2026 OUT-OF-SAMPLE HOLDOUT.
        </div>

        {running && <LoadingTrace />}

        {error && (
          <div className="about-quote" style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 9, color: 'var(--color-r)', lineHeight: 2.2 }}>RUN FAILED: {error.toUpperCase()}</div>
          </div>
        )}

        {result && <Results result={result} />}
      </div>
    </div>
  )
}
