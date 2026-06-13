import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { matchP, teamData } from '@/lib/klement'
import { ROUNDS, makeSlug } from '@/lib/fixtures'
import WDLBar from '@/components/ui/WDLBar'
import FlagImg from '@/components/ui/FlagImg'
import FactorBreakdown from '@/components/team/FactorBreakdown'
import PixelParticles from '@/components/ui/PixelParticles'

type Round = 'r32' | 'r16' | 'qf' | 'sf' | 'final'

export function generateStaticParams() {
  return Object.entries(ROUNDS).flatMap(([round, matches]) =>
    matches.map(m => ({ round, match: makeSlug(m.teamA, m.teamB) }))
  )
}

export default async function MatchPage({
  params,
}: {
  params: Promise<{ round: string; match: string }>
}) {
  const { round, match } = await params
  if (!(round in ROUNDS)) notFound()

  const matches = ROUNDS[round as Round]!
  const found = matches.find(m => makeSlug(m.teamA, m.teamB) === match)
  if (!found) notFound()

  const { teamA, teamB, k } = found
  const { pA, dr, pB } = matchP(teamA, teamB)
  const tA = teamData(teamA)
  const tB = teamData(teamB)
  const isFinal = round === 'final'
  const pAp = Math.round(pA * 100)
  const pBp = Math.round(pB * 100)
  const tr = await getTranslations('rounds')
  const tc = await getTranslations('common')
  const roundFull = tr(`${round}Full` as 'r32Full' | 'r16Full' | 'qfFull' | 'sfFull' | 'finalFull')

  return (
    <div className="page-enter" style={{ position: 'relative', overflow: 'hidden' }}>
      <PixelParticles variant={isFinal ? 'green' : 'mix'} />
      <div style={{ position: 'relative', zIndex: 1 }}>

        {/* Breadcrumb nav */}
        <div className="ko-tabs">
          <Link href="/knockout/bracket" className="ko-tab">{tr('bracket')}</Link>
          <Link href={`/knockout/${round}`} className="ko-tab active">
            {roundFull}
          </Link>
          <div className="ko-tab" style={{ color: 'var(--color-txt)', cursor: 'default' }}>
            {teamA} {tc('vs').toLowerCase()} {teamB}
          </div>
        </div>

        <div style={{ padding: '32px 36px' }}>

          {/* Match header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto 1fr',
            gap: 24,
            alignItems: 'center',
            marginBottom: 32,
            padding: '28px 24px',
            backgroundColor: 'var(--color-surf)',
            border: isFinal ? '2px solid var(--color-g)' : '2px solid var(--color-brd2)',
            boxShadow: isFinal ? '5px 5px 0 var(--color-g-sh)' : '4px 4px 0 var(--color-brd)',
          }}>
            {/* Team A */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: 10,
              padding: '12px',
              backgroundColor: k === teamA ? 'var(--color-g-bg)' : 'transparent',
              border: k === teamA ? '1px solid var(--color-g-sh)' : '1px solid transparent',
            }}>
              <FlagImg name={teamA} h={48} emoji={tA?.flag ?? '🏳️'} />
              <div style={{ fontSize: 12, color: k === teamA ? 'var(--color-g)' : 'var(--color-txt)', fontWeight: k === teamA ? 'bold' : 'normal' }}>
                {teamA.toUpperCase()}
              </div>
              <div style={{ fontSize: 8, color: 'var(--color-muted)' }}>{tA?.conf}</div>
              {k === teamA && <span className="k-badge">{tc('klementPickFull')}</span>}
              <div style={{ fontSize: 14, color: 'var(--color-r)', fontWeight: 'bold' }}>{pAp}%</div>
            </div>

            {/* VS */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 18, color: 'var(--color-r)', fontWeight: 'bold', marginBottom: 8 }}>{tc('vs')}</div>
              <div style={{ fontSize: 8, color: 'var(--color-muted)', letterSpacing: 1 }}>
                {roundFull}
              </div>
              {isFinal && <div style={{ fontSize: 8, color: 'var(--color-g)', marginTop: 6 }}>🏆 {tr('final')}</div>}
            </div>

            {/* Team B */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              gap: 10,
              padding: '12px',
              backgroundColor: k === teamB ? 'var(--color-g-bg)' : 'transparent',
              border: k === teamB ? '1px solid var(--color-g-sh)' : '1px solid transparent',
            }}>
              <FlagImg name={teamB} h={48} emoji={tB?.flag ?? '🏳️'} />
              <div style={{ fontSize: 12, color: k === teamB ? 'var(--color-g)' : 'var(--color-txt)', fontWeight: k === teamB ? 'bold' : 'normal' }}>
                {teamB.toUpperCase()}
              </div>
              <div style={{ fontSize: 8, color: 'var(--color-muted)' }}>{tB?.conf}</div>
              {k === teamB && <span className="k-badge">{tc('klementPickFull')}</span>}
              <div style={{ fontSize: 14, color: 'var(--color-b)', fontWeight: 'bold' }}>{pBp}%</div>
            </div>
          </div>

          {/* WDL bar */}
          <div style={{ marginBottom: 32 }}>
            <WDLBar pA={pA} dr={dr} pB={pB} labelA={teamA} labelB={teamB} />
          </div>

          {/* Factor breakdowns */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {[
              { team: tA, name: teamA, color: 'var(--color-r)' },
              { team: tB, name: teamB, color: 'var(--color-b)' },
            ].map(({ team, name, color }) => (
              <div key={name} className="factor-card" style={{ borderLeft: `4px solid ${color}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10, color, marginBottom: 16 }}>
                  <FlagImg name={name} h={18} emoji={team?.flag ?? '🏳️'} />
                  {name.toUpperCase()}
                </div>
                {[
                  { label: 'FIFA', val: `${team?.fifa} PTS` },
                  { label: 'GDP',  val: `$${team?.gdp}K` },
                  { label: 'TEMP', val: `${team?.temp}°C` },
                  { label: 'POP',  val: `${team?.pop}M` },
                  { label: 'CONF', val: team?.conf ?? '' },
                ].map(({ label, val }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 9, color: 'var(--color-muted)' }}>{label}</span>
                    <span style={{ fontSize: 9, color: 'var(--color-g)', backgroundColor: 'var(--color-g-bg)', padding: '3px 6px', border: '1px solid var(--color-g-sh)' }}>{val}</span>
                  </div>
                ))}
                <div style={{ marginTop: 16 }}>
                  <FactorBreakdown name={name} />
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  )
}
