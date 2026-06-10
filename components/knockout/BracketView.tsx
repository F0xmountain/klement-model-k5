'use client'
import { Fragment } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { ROUNDS, makeSlug } from '@/lib/fixtures'
import { teamData } from '@/lib/klement'
import FlagImg from '@/components/ui/FlagImg'

const MATCH_H = 50
const STEP    = 54      // MATCH_H + 4px gap between R32 matches
const CONN_W  = 22      // fixed pixel width of SVG connectors
const TOTAL_H = 15 * STEP + MATCH_H   // 860px
const ROW_H   = Math.floor((MATCH_H - 1) / 2)

function matchY(round: number, idx: number): number {
  if (round === 0) return idx * STEP
  const tY = matchY(round - 1, idx * 2)
  const bY = matchY(round - 1, idx * 2 + 1)
  return (tY + bY + MATCH_H) / 2 - MATCH_H / 2
}

function TeamRow({ name, isPick }: { name: string; isPick: boolean }) {
  const t = teamData(name)
  const tc = useTranslations('common')
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      padding: '0 6px',
      height: ROW_H,
      backgroundColor: isPick ? 'var(--color-g-bg)' : 'transparent',
      borderLeft: isPick ? '2px solid var(--color-g)' : '2px solid transparent',
      boxSizing: 'border-box',
    }}>
      <FlagImg name={name} h={14} emoji={t?.flag ?? '🏳️'} />
      <span style={{
        fontSize: 7,
        color: isPick ? 'var(--color-g)' : 'var(--color-txt)',
        fontWeight: isPick ? 'bold' : 'normal',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        flex: 1,
        minWidth: 0,
        lineHeight: 1,
      }}>{name}</span>
      {isPick && <span style={{ fontSize: 6, color: 'var(--color-g)', flexShrink: 0 }}>{tc('klementPick')}</span>}
    </div>
  )
}

function MatchSlot({ teamA, teamB, k, top, isFinal, href }: {
  teamA: string; teamB: string; k?: string; top: number; isFinal?: boolean; href: string
}) {
  return (
    <Link
      href={href}
      className={`bracket-match${isFinal ? ' bracket-final' : ''}`}
      style={{
        position: 'absolute',
        top,
        left: 0,
        right: 0,
        height: MATCH_H,
        overflow: 'hidden',
        boxSizing: 'border-box',
        textDecoration: 'none',
        display: 'block',
        cursor: 'pointer',
      }}
    >
      <TeamRow name={teamA} isPick={k === teamA} />
      <div style={{ height: 1, backgroundColor: 'var(--color-brd)' }} />
      <TeamRow name={teamB} isPick={k === teamB} />
    </Link>
  )
}

function ColConnector({ fromRound, count }: { fromRound: number; count: number }) {
  const mid = CONN_W / 2
  return (
    <svg
      width={CONN_W}
      height={TOTAL_H}
      style={{ display: 'block', flexShrink: 0 }}
    >
      {Array.from({ length: count }, (_, i) => {
        const tY = matchY(fromRound, i * 2)     + MATCH_H / 2
        const bY = matchY(fromRound, i * 2 + 1) + MATCH_H / 2
        const pY = matchY(fromRound + 1, i)     + MATCH_H / 2
        return (
          <g key={i}>
            <line x1={0}      y1={tY} x2={mid}    y2={tY} stroke="var(--color-brd2)" strokeWidth={1} />
            <line x1={mid}    y1={tY} x2={mid}    y2={bY} stroke="var(--color-brd2)" strokeWidth={1} />
            <line x1={0}      y1={bY} x2={mid}    y2={bY} stroke="var(--color-brd2)" strokeWidth={1} />
            <line x1={mid}    y1={pY} x2={CONN_W} y2={pY} stroke="var(--color-brd2)" strokeWidth={1} />
          </g>
        )
      })}
    </svg>
  )
}

const BRACKET_ROUNDS = [
  { key: 'r32'   as const, connCount: 8 },
  { key: 'r16'   as const, connCount: 4 },
  { key: 'qf'    as const, connCount: 2 },
  { key: 'sf'    as const, connCount: 1 },
  { key: 'final' as const, connCount: 0 },
]

// CSS grid: 5 match columns (1fr each) interleaved with 4 fixed connector columns
const GRID_COLS = `1fr ${CONN_W}px 1fr ${CONN_W}px 1fr ${CONN_W}px 1fr ${CONN_W}px 1fr`

export default function BracketView() {
  const tr = useTranslations('rounds')
  return (
    <div style={{ paddingTop: 24, paddingBottom: 12 }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: GRID_COLS,
        alignItems: 'start',
      }}>
        {BRACKET_ROUNDS.map(({ key, connCount }, roundIdx) => {
          const matches = ROUNDS[key]
          return (
            <Fragment key={key}>
              {/* Round column — 1fr, stretches to fill available space */}
              <div style={{ position: 'relative', height: TOTAL_H }}>
                <div style={{
                  position: 'absolute',
                  top: -18,
                  left: 0,
                  right: 0,
                  fontSize: 7,
                  color: key === 'final' ? 'var(--color-g)' : 'var(--color-muted)',
                  textAlign: 'center',
                  letterSpacing: 1,
                  fontWeight: key === 'final' ? 'bold' : 'normal',
                }}>{tr(key)}</div>

                {matches.map((m, i) => (
                  <MatchSlot
                    key={i}
                    teamA={m.teamA}
                    teamB={m.teamB}
                    k={m.k}
                    top={matchY(roundIdx, i)}
                    isFinal={key === 'final'}
                    href={`/knockout/${key}/${makeSlug(m.teamA, m.teamB)}`}
                  />
                ))}
              </div>

              {connCount > 0 && <ColConnector fromRound={roundIdx} count={connCount} />}
            </Fragment>
          )
        })}
      </div>
    </div>
  )
}
