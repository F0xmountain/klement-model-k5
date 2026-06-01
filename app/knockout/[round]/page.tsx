import { notFound } from 'next/navigation'
import Link from 'next/link'
import SectionLabel from '@/components/ui/SectionLabel'
import MatchCard from '@/components/match/MatchCard'
import { ROUNDS, ROUND_LABELS } from '@/lib/fixtures'

const ROUND_ORDER = ['r32', 'r16', 'qf', 'sf', 'final'] as const
type Round = typeof ROUND_ORDER[number]

export function generateStaticParams() {
  return ROUND_ORDER.map(round => ({ round }))
}

export default async function KnockoutPage({ params }: { params: Promise<{ round: string }> }) {
  const { round } = await params
  if (!(round in ROUNDS)) notFound()

  const matches = ROUNDS[round as Round]
  const label = ROUND_LABELS[round]
  const isFinal = round === 'final'
  const currentIdx = ROUND_ORDER.indexOf(round as Round)

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 24px' }}>
      <div className="fade-in" style={{ marginBottom: 24 }}>
        <SectionLabel>Knockout Stage</SectionLabel>
        <h1 style={{ fontSize: 14, color: isFinal ? 'var(--color-g)' : 'var(--color-r)', marginTop: 4 }}>
          {isFinal ? '🏆 ' : ''}{label.toUpperCase()}
        </h1>
        {isFinal && (
          <p style={{ fontSize: 7, color: 'var(--color-muted)', lineHeight: 2, marginTop: 8 }}>
            KLEMENT&apos;S PREDICTED FINAL — THE MODEL&apos;S HEADLINE CALL.
          </p>
        )}
      </div>

      {/* Round tabs */}
      <nav className="fade-in delay-1" style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 24 }}>
        {ROUND_ORDER.map((r, i) => (
          <Link
            key={r}
            href={`/knockout/${r}`}
            style={{
              padding: '6px 10px',
              fontSize: 6,
              textDecoration: 'none',
              fontFamily: 'inherit',
              background: r === round ? 'var(--color-r-bg)' : 'var(--color-surf)',
              color: r === round ? 'var(--color-r)' : i < currentIdx ? 'var(--color-muted)' : 'var(--color-txt)',
              border: r === round ? '1px solid var(--color-r-sh)' : '1px solid var(--color-brd)',
            }}
          >
            {ROUND_LABELS[r].toUpperCase()}
          </Link>
        ))}
      </nav>

      <div className="fade-in delay-2" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {matches.map((m, i) => (
          <MatchCard key={i} teamA={m.teamA} teamB={m.teamB} k={m.k} isFinal={isFinal} />
        ))}
      </div>

      <div className="fade-in delay-3" style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24, fontSize: 7 }}>
        {currentIdx > 0 && (
          <Link href={`/knockout/${ROUND_ORDER[currentIdx - 1]}`} style={{ color: 'var(--color-muted)', textDecoration: 'none', fontFamily: 'inherit' }}>
            ← {ROUND_LABELS[ROUND_ORDER[currentIdx - 1]].toUpperCase()}
          </Link>
        )}
        {currentIdx < ROUND_ORDER.length - 1 && (
          <Link href={`/knockout/${ROUND_ORDER[currentIdx + 1]}`} style={{ color: 'var(--color-b)', textDecoration: 'none', fontFamily: 'inherit', marginLeft: 'auto' }}>
            {ROUND_LABELS[ROUND_ORDER[currentIdx + 1]].toUpperCase()} →
          </Link>
        )}
      </div>
    </div>
  )
}
