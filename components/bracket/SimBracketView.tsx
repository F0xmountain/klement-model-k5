'use client'

import { useState, useCallback, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { teamData } from '@/lib/klement'
import { simulateTournament, type SimResult, type SlotTeam, type BracketMatch } from '@/lib/simulate-tournament'
import Btn from '@/components/ui/Btn'
import FlagImg from '@/components/ui/FlagImg'

const SIM_N = 10000

// Kleurintensiteit op zekerheid: hogere kans = donkerder/voller blauw.
function slotBg(prob: number): string {
  const a = 0.06 + Math.min(Math.max(prob, 0), 1) * 0.5
  return `rgba(26, 95, 232, ${a.toFixed(2)})`
}

function SlotRow({ s }: { s: SlotTeam }) {
  const flag = teamData(s.team)?.flag ?? '🏳️'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 6px', background: slotBg(s.prob), fontSize: 8 }}>
      <FlagImg name={s.team} h={10} emoji={flag} />
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--color-txt)' }}>{s.team || '—'}</span>
      <span style={{ color: 'var(--color-muted)' }}>{Math.round(s.prob * 100)}%</span>
    </div>
  )
}

function MatchCard({ m }: { m: BracketMatch }) {
  return (
    <div style={{ border: '1px solid var(--color-brd)', background: 'var(--color-bg)', minWidth: 116 }}>
      <SlotRow s={m.home} />
      <div style={{ borderTop: '1px solid var(--color-brd)' }} />
      <SlotRow s={m.away} />
    </div>
  )
}

function RoundColumn({ matches }: { matches: BracketMatch[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-around', gap: 6 }}>
      {matches.map((m, i) => <MatchCard key={i} m={m} />)}
    </div>
  )
}

export default function SimBracketView() {
  const t = useTranslations('simBracket')
  const [sim, setSim] = useState<SimResult | null>(null)
  const [running, setRunning] = useState(false)

  const run = useCallback(() => {
    setRunning(true)
    setTimeout(() => {
      setSim(simulateTournament(SIM_N))
      setRunning(false)
    }, 20)
  }, [])

  // Initiële run ná mount (Math.random → client-only, anders hydration-mismatch).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    run()
  }, [run])

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16, flexWrap: 'wrap' }}>
        <Btn variant="green" onClick={run} disabled={running}>
          {running ? t('recalculating') : t('recalculate')}
        </Btn>
        {sim && (
          <span style={{ fontSize: 8, color: 'var(--color-muted)' }}>
            {t('basedOn', { n: sim.n })}
          </span>
        )}
      </div>

      {!sim ? (
        <div style={{ fontSize: 10, color: 'var(--color-muted)', padding: '20px 0' }}>…</div>
      ) : (
        <div style={{ overflowX: 'auto', paddingBottom: 8 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'stretch', minWidth: 1080 }}>
            {/* Linkerhelft: R32 → R16 → QF → SF */}
            <RoundColumn matches={sim.bracket.r32.slice(0, 8)} />
            <RoundColumn matches={sim.bracket.r16.slice(0, 4)} />
            <RoundColumn matches={sim.bracket.qf.slice(0, 2)} />
            <RoundColumn matches={sim.bracket.sf.slice(0, 1)} />

            {/* Midden: finale + kampioen */}
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 12, minWidth: 130 }}>
              <div style={{ fontSize: 8, color: 'var(--color-muted)', textAlign: 'center' }}>{t('final')}</div>
              <MatchCard m={sim.bracket.final} />
              <div style={{ border: '2px solid var(--color-g)', background: 'var(--color-g-bg)', padding: '8px 6px', textAlign: 'center' }}>
                <div style={{ fontSize: 7, color: 'var(--color-g)', marginBottom: 4 }}>{t('champion')}</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, fontSize: 9 }}>
                  <FlagImg name={sim.bracket.champion.team} h={14} emoji={teamData(sim.bracket.champion.team)?.flag ?? '🏳️'} />
                  <span>{sim.bracket.champion.team || '—'}</span>
                  <span style={{ color: 'var(--color-g)' }}>{Math.round(sim.bracket.champion.prob * 100)}%</span>
                </div>
              </div>
            </div>

            {/* Rechterhelft: SF → QF → R16 → R32 (gespiegeld) */}
            <RoundColumn matches={sim.bracket.sf.slice(1, 2)} />
            <RoundColumn matches={sim.bracket.qf.slice(2, 4)} />
            <RoundColumn matches={sim.bracket.r16.slice(4, 8)} />
            <RoundColumn matches={sim.bracket.r32.slice(8, 16)} />
          </div>
        </div>
      )}
    </div>
  )
}
