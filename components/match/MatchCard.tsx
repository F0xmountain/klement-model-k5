import { matchP, teamData } from '@/lib/klement'
import WDLBar from '@/components/ui/WDLBar'

interface Props {
  teamA: string
  teamB: string
  k?: string
  isFinal?: boolean
}

export default function MatchCard({ teamA, teamB, k, isFinal = false }: Props) {
  const { pA, dr, pB } = matchP(teamA, teamB)
  const tA = teamData(teamA)
  const tB = teamData(teamB)

  const cardStyle: React.CSSProperties = isFinal
    ? { border: '2px solid var(--color-g)', boxShadow: '0 0 0 2px var(--color-bg), 0 0 0 4px var(--color-g)' }
    : { border: '1px solid var(--color-brd)', boxShadow: '3px 3px 0 var(--color-brd)' }

  return (
    <div style={{ ...cardStyle, padding: 16, background: 'var(--color-bg)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: 8, alignItems: 'center', marginBottom: 10 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
          <span style={{ fontSize: 24 }}>{tA?.flag ?? '🏳'}</span>
          <span style={{ fontSize: 7, color: k === teamA ? 'var(--color-g)' : 'var(--color-txt)' }}>{teamA}</span>
          {k === teamA && <span className="k-badge">K✓</span>}
        </div>
        <div style={{ textAlign: 'center', fontSize: 7, color: 'var(--color-muted)' }}>VS</div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <span style={{ fontSize: 24 }}>{tB?.flag ?? '🏳'}</span>
          <span style={{ fontSize: 7, color: k === teamB ? 'var(--color-g)' : 'var(--color-txt)' }}>{teamB}</span>
          {k === teamB && <span className="k-badge">K✓</span>}
        </div>
      </div>
      <div style={{ borderLeft: '3px solid var(--color-b)', paddingLeft: 8 }}>
        <WDLBar pA={pA} dr={dr} pB={pB} labelA={teamA} labelB={teamB} />
      </div>
    </div>
  )
}
