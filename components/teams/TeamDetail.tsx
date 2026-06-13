'use client'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Link, usePathname } from '@/i18n/navigation'
import { teamData, sc } from '@/lib/klement'
import { GROUPS, ROUNDS } from '@/lib/fixtures'
import { teamSlug } from '@/lib/team-slug'
import FlagImg from '@/components/ui/FlagImg'
import PixelParticles from '@/components/ui/PixelParticles'
import SquadTab from './SquadTab'
import ScorersTab from './ScorersTab'
import ScheduleTab from './ScheduleTab'
import BracketPathTab from './BracketPathTab'

const TABS = ['squad', 'scorers', 'schedule', 'path'] as const
type Tab = (typeof TABS)[number]

// Standaardtegenstander voor de "Vergelijk →"-knop: Klement's eerste KO-
// tegenstander als die een WK-team is (in teams.json), anders de eerste
// groepsgenoot. Zo wijst de link altijd naar een geldige /versus-slug.
function defaultOpponent(team: string): string | undefined {
  const r32 = ROUNDS.r32!.find(m => m.teamA === team || m.teamB === team)
  const koOpp = r32 ? (r32.teamA === team ? r32.teamB : r32.teamA) : undefined
  if (koOpp && teamData(koOpp)) return koOpp
  for (const teams of Object.values(GROUPS)) {
    if (teams.includes(team)) return teams.find(x => x !== team)
  }
  return undefined
}

export default function TeamDetail({ teamName }: { teamName: string }) {
  const tt = useTranslations('teams')
  const pathname = usePathname()
  const params = useSearchParams()

  const raw = params.get('tab')
  const tab: Tab = (TABS as readonly string[]).includes(raw ?? '') ? (raw as Tab) : 'squad'

  const tv = useTranslations('versus')
  const team = teamData(teamName)
  const score = sc(teamName)
  const opponent = defaultOpponent(teamName)

  return (
    <div className="sec page-enter" style={{ position: 'relative', overflow: 'hidden' }}>
      <PixelParticles variant="green" />
      <div style={{ position: 'relative', zIndex: 1 }}>

        {/* Team-header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 20, padding: '20px 24px', marginBottom: 20,
          backgroundColor: 'var(--color-surf)', border: '2px solid var(--color-brd2)', boxShadow: '4px 4px 0 var(--color-brd)',
        }}>
          <FlagImg name={teamName} h={64} emoji={team?.flag ?? '🏳️'} />
          <div>
            <div style={{ fontSize: 16, color: 'var(--color-txt)', marginBottom: 6, lineHeight: 1.3 }}>
              {teamName.toUpperCase()}
            </div>
            <div style={{ fontSize: 8, color: 'var(--color-muted)', letterSpacing: 1 }}>
              {team?.conf} · FIFA {team?.fifa} PTS · MODEL {score.toFixed(3)}
            </div>
          </div>
          {opponent && (
            <Link
              href={`/versus/${teamSlug(teamName)}/${teamSlug(opponent)}`}
              className="px-btn"
              style={{
                marginLeft: 'auto', fontSize: 8, padding: '8px 14px',
                backgroundColor: 'var(--color-bg)', color: 'var(--color-b)',
                border: '2px solid var(--color-b)', boxShadow: '3px 3px 0 var(--color-b-sh)',
                textDecoration: 'none', whiteSpace: 'nowrap',
              }}
            >
              {tv('compareBtn')}
            </Link>
          )}
        </div>

        {/* Tab-navigatie — horizontaal scrollbaar op mobiel */}
        <div className="ko-tabs" style={{ overflowX: 'auto', marginBottom: 20 }}>
          {TABS.map(tb => (
            <Link
              key={tb}
              href={{ pathname, query: { tab: tb } }}
              className={`ko-tab${tab === tb ? ' active' : ''}`}
              scroll={false}
            >
              {tt(`tabs.${tb}`)}
            </Link>
          ))}
        </div>

        {tab === 'squad' && <SquadTab teamName={teamName} />}
        {tab === 'scorers' && <ScorersTab teamName={teamName} />}
        {tab === 'schedule' && <ScheduleTab teamName={teamName} />}
        {tab === 'path' && <BracketPathTab teamName={teamName} />}

      </div>
    </div>
  )
}
