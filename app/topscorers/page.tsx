import PixelBar from '@/components/ui/PixelBar'
import PixelParticles from '@/components/ui/PixelParticles'
import FlagImg from '@/components/ui/FlagImg'
import { teamData } from '@/lib/klement'
import scorersData from '@/lib/model/scorers.json'
import liveData from '@/lib/model/live-scorers.json'
import type { ScorerProjection } from '@/types'

const players = scorersData.players as ScorerProjection[]
const live = liveData as { generatedAt: string | null; scorers: { player: string; team: string; goals: number }[] }

function flagFor(team: string): string {
  return teamData(team)?.flag ?? '🏳'
}

export default function TopscorersPage() {
  const maxProj = Math.max(...players.map((p) => p.projGoals))
  const hasLive = live.generatedAt !== null && live.scorers.length > 0

  return (
    <div className="sec page-enter" style={{ position: 'relative', overflow: 'hidden' }}>
      <PixelParticles variant="green" />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div className="section-title">GOLDEN BOOT RACE</div>
        <div style={{ fontSize: 10, color: 'var(--color-muted)', lineHeight: 2.4, marginBottom: 24 }}>
          PROJECTED TOURNAMENT GOALS = RECENT INTERNATIONAL SCORING RATE<br />
          (SINCE {scorersData.window}) TIMES THE MATCHES THE MODEL EXPECTS THE TEAM TO PLAY.
        </div>

        {hasLive && (
          <>
            <div className="section-title" style={{ marginTop: 8 }}>LIVE LEADERS (WC 2026)</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 28 }}>
              {live.scorers.slice(0, 10).map((s, i) => (
                <div key={`${s.player}-${i}`} style={{ display: 'flex', justifyContent: 'space-between', background: 'var(--color-r-bg)', border: '1px solid var(--color-r-sh)', padding: '8px 12px', fontSize: 9 }}>
                  <span style={{ color: 'var(--color-txt)' }}>
                    {i + 1}. <FlagImg name={s.team} h={12} emoji={flagFor(s.team)} /> {s.player.toUpperCase()}
                  </span>
                  <span style={{ color: 'var(--color-r)' }}>{s.goals} GOALS</span>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="section-title" style={{ marginTop: 8 }}>MODEL PROJECTION</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {players.map((p, i) => (
            <div key={`${p.player}-${p.team}`} style={{ background: i < 3 ? 'var(--color-g-bg)' : 'var(--color-surf)', border: `1px solid ${i < 3 ? 'var(--color-g-sh)' : 'var(--color-brd)'}`, padding: '12px 14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '28px 1fr 56px', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <span style={{ fontSize: 11, color: i < 3 ? 'var(--color-g)' : 'var(--color-muted)' }}>{i + 1}</span>
                <span style={{ fontSize: 10, color: 'var(--color-txt)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FlagImg name={p.team} h={14} emoji={flagFor(p.team)} />
                  {p.player.toUpperCase()}
                </span>
                <span style={{ fontSize: 13, color: 'var(--color-g)', textAlign: 'right' }}>{p.projGoals}</span>
              </div>
              <PixelBar value={(p.projGoals / maxProj) * 100} color="var(--color-g-mid)" />
              <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 7, color: 'var(--color-muted)' }}>
                <span>{p.team.toUpperCase()}</span>
                <span>{p.recentGoals} GOALS / {p.recentTeamMatches} GAMES</span>
                <span>RATE {p.ratePerMatch}</span>
                <span>EXP {p.expTeamMatches} MATCHES</span>
              </div>
            </div>
          ))}
        </div>

        <div style={{ fontSize: 8, color: 'var(--color-muted)', lineHeight: 2.2, marginTop: 24 }}>
          CANDIDATES ARE PLAYERS WHO HAVE SCORED FOR A QUALIFIED NATION SINCE {scorersData.window}.
          LIVE LEADERS REFRESH FROM football-data.org AFTER EACH MATCH WHEN A KEY IS CONFIGURED.
        </div>
      </div>
    </div>
  )
}
