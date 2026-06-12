'use client'

import { useTranslations } from 'next-intl'
import { teamData } from '@/lib/klement'
import type { ResolvedBracket, ResolvedMatch } from '@/lib/my-picks'
import FlagImg from '@/components/ui/FlagImg'

interface Props {
  resolved: ResolvedBracket
}

// Eén team-slot. Een ingevulde pick krijgt een highlight: oranje als hij afwijkt
// van Klements keuze (--color-o), anders groen. Lege slots tonen "?".
function Slot({ team, isPick, differs, empty }: { team: string | null; isPick: boolean; differs: boolean; empty: string }) {
  if (!team) {
    return (
      <div style={{ padding: '4px 6px', background: 'var(--color-surf)', color: 'var(--color-muted)', fontSize: 8, textAlign: 'center' }}>
        {empty}
      </div>
    )
  }
  const bg = isPick ? (differs ? 'var(--color-o-bg)' : 'var(--color-g-bg)') : 'transparent'
  const color = isPick ? (differs ? 'var(--color-o)' : 'var(--color-g)') : 'var(--color-txt)'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 6px', background: bg, color, fontSize: 8, fontWeight: isPick ? 'bold' : 'normal' }}>
      <FlagImg name={team} h={10} emoji={teamData(team)?.flag ?? '🏳️'} />
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{team}</span>
    </div>
  )
}

function MatchCard({ m, empty }: { m: ResolvedMatch; empty: string }) {
  return (
    <div style={{ border: '1px solid var(--color-brd)', background: 'var(--color-bg)', minWidth: 116 }}>
      <Slot team={m.teamA} isPick={m.pick !== null && m.pick === m.teamA} differs={m.differs} empty={empty} />
      <div style={{ borderTop: '1px solid var(--color-brd)' }} />
      <Slot team={m.teamB} isPick={m.pick !== null && m.pick === m.teamB} differs={m.differs} empty={empty} />
    </div>
  )
}

function RoundColumn({ matches, empty }: { matches: ResolvedMatch[]; empty: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-around', gap: 6 }}>
      {matches.map((m, i) => <MatchCard key={i} m={m} empty={empty} />)}
    </div>
  )
}

export default function MyBracketView({ resolved }: Props) {
  const t = useTranslations('myBracket')
  const empty = t('emptySlot')
  const champion = resolved.final[0]?.pick ?? null
  const championDiffers = resolved.final[0]?.differs ?? false

  return (
    <div style={{ overflowX: 'auto', paddingBottom: 8 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'stretch', minWidth: 1080 }}>
        {/* Linkerhelft */}
        <RoundColumn matches={resolved.r32.slice(0, 8)} empty={empty} />
        <RoundColumn matches={resolved.r16.slice(0, 4)} empty={empty} />
        <RoundColumn matches={resolved.qf.slice(0, 2)} empty={empty} />
        <RoundColumn matches={resolved.sf.slice(0, 1)} empty={empty} />

        {/* Midden: finale + kampioen */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 12, minWidth: 130 }}>
          <div style={{ fontSize: 8, color: 'var(--color-muted)', textAlign: 'center' }}>{t('championTitle')}</div>
          <MatchCard m={resolved.final[0]} empty={empty} />
          <div style={{ border: `2px solid ${champion ? (championDiffers ? 'var(--color-o)' : 'var(--color-g)') : 'var(--color-brd)'}`, background: champion ? (championDiffers ? 'var(--color-o-bg)' : 'var(--color-g-bg)') : 'var(--color-surf)', padding: '8px 6px', textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, fontSize: 9 }}>
              {champion ? (
                <>
                  <FlagImg name={champion} h={14} emoji={teamData(champion)?.flag ?? '🏳️'} />
                  <span style={{ color: championDiffers ? 'var(--color-o)' : 'var(--color-g)' }}>{champion}</span>
                </>
              ) : (
                <span style={{ color: 'var(--color-muted)' }}>{empty}</span>
              )}
            </div>
          </div>
        </div>

        {/* Rechterhelft (gespiegeld) */}
        <RoundColumn matches={resolved.sf.slice(1, 2)} empty={empty} />
        <RoundColumn matches={resolved.qf.slice(2, 4)} empty={empty} />
        <RoundColumn matches={resolved.r16.slice(4, 8)} empty={empty} />
        <RoundColumn matches={resolved.r32.slice(8, 16)} empty={empty} />
      </div>
    </div>
  )
}
