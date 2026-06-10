import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { matchP, teamData } from '@/lib/klement'
import { ROUNDS, makeSlug } from '@/lib/fixtures'
import PixelParticles from '@/components/ui/PixelParticles'
import FlagImg from '@/components/ui/FlagImg'

const ROUND_ORDER = ['r32', 'r16', 'qf', 'sf', 'final'] as const
type Round = typeof ROUND_ORDER[number]

export function generateStaticParams() {
  return ROUND_ORDER.map(round => ({ round }))
}

export default async function KnockoutPage({ params }: { params: Promise<{ round: string }> }) {
  const { round } = await params
  if (!(round in ROUNDS)) notFound()

  const matches = ROUNDS[round as Round]
  const isFinal = round === 'final'
  const tr = await getTranslations('rounds')
  const tk = await getTranslations('knockout')
  const tc = await getTranslations('common')

  return (
    <div className="page-enter" style={{ position: 'relative', overflow: 'hidden' }}>
      <PixelParticles variant={isFinal ? 'green' : 'mix'} />
      <div style={{ position: 'relative', zIndex: 1 }}>
      <div className="ko-tabs">
        <Link href="/knockout/bracket" className="ko-tab">{tr('bracket')}</Link>
        {ROUND_ORDER.map(r => (
          <Link key={r} href={`/knockout/${r}`} className={`ko-tab${round === r ? ' active' : ''}`}>
            {tr(r)}
          </Link>
        ))}
      </div>

      <div style={{ padding: '36px 36px' }}>
        <div style={{ fontSize: 10, color: 'var(--color-muted)', marginBottom: 24, letterSpacing: 1 }}>
          {isFinal && <span className="trophy-pulse" style={{ marginRight: 8 }}>🏆</span>}
          {tr(`${round}Full` as 'r32Full' | 'r16Full' | 'qfFull' | 'sfFull' | 'finalFull')}
          {isFinal && <span style={{ color: 'var(--color-g)', marginLeft: 12 }}>{tk('headlineCall')}</span>}
        </div>

        {matches.map((m, i) => {
          const matchHref = `/knockout/${round}/${makeSlug(m.teamA, m.teamB)}`
          const { pA, dr, pB } = matchP(m.teamA, m.teamB)
          const pAp = Math.round(pA * 100)
          const drp = Math.round(dr * 100)
          const pBp = Math.round(pB * 100)
          const tA = teamData(m.teamA)
          const tB = teamData(m.teamB)
          const pickIsA = m.k === m.teamA

          return (
            <Link
              key={i}
              href={matchHref}
              className="ko-match"
              style={{
                textDecoration: 'none',
                ...(isFinal ? { border: '2px solid var(--color-g)', boxShadow: '4px 4px 0 var(--color-g-sh)' } : {}),
              }}
            >
              <div>
                <div style={{ marginBottom: 6 }}>
                  <FlagImg name={m.teamA} h={28} emoji={tA?.flag ?? '🏳️'} />
                </div>
                <div style={{ fontSize: 10, lineHeight: 1.8 }}>{m.teamA}</div>
                <div style={{ fontSize: 9, color: 'var(--color-muted)', marginTop: 2 }}>{tA?.conf}</div>
                {pickIsA && <span className="k-badge">{tc('klementPick')}</span>}
              </div>

              <div className="ko-mini-bar">
                <div style={{ flex: pAp, backgroundColor: 'var(--color-r)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9 }}>{pAp}%</div>
                <div style={{ flex: drp, backgroundColor: 'var(--color-surf)', color: 'var(--color-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, borderLeft: '1px solid var(--color-brd)', borderRight: '1px solid var(--color-brd)' }}>{drp}%</div>
                <div style={{ flex: pBp, backgroundColor: 'var(--color-b)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9 }}>{pBp}%</div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ marginBottom: 6, display: 'flex', justifyContent: 'flex-end' }}>
                  <FlagImg name={m.teamB} h={28} emoji={tB?.flag ?? '🏳️'} />
                </div>
                <div style={{ fontSize: 10, lineHeight: 1.8 }}>{m.teamB}</div>
                <div style={{ fontSize: 9, color: 'var(--color-muted)', marginTop: 2 }}>{tB?.conf}</div>
                {!pickIsA && m.k === m.teamB && <span className="k-badge">{tc('klementPick')}</span>}
              </div>
            </Link>
          )
        })}
      </div>
      </div>
    </div>
  )
}
