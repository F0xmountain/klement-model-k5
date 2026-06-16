'use client'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Link, usePathname, useRouter } from '@/i18n/navigation'
import { teamNames, teamData, sc } from '@/lib/klement'
import { GROUPS, ROUNDS } from '@/lib/fixtures'
import { teamSlug } from '@/lib/team-slug'
import FlagImg from '@/components/ui/FlagImg'
import TeamSelect from '@/components/ui/TeamSelect'
import PixelParticles from '@/components/ui/PixelParticles'
import ProfileTab from '@/components/team/ProfileTab'
import SquadTab from './SquadTab'
import ScorersTab from './ScorersTab'
import ScheduleTab from './ScheduleTab'
import BracketPathTab from './BracketPathTab'

// Profiel staat vooraan: de detailpagina is nu de "thuisbasis" van een team, dus
// de overzichts-/factor-tab is het eerste wat je ziet (en de default zonder ?tab=).
const TABS = ['profile', 'squad', 'scorers', 'schedule', 'path'] as const
type Tab = (typeof TABS)[number]

const allTeams = teamNames().sort()

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
  const router = useRouter()

  const raw = params.get('tab')
  const tab: Tab = (TABS as readonly string[]).includes(raw ?? '') ? (raw as Tab) : 'profile'

  const tv = useTranslations('versus')
  const team = teamData(teamName)
  const score = sc(teamName)
  const opponent = defaultOpponent(teamName)

  // Team-switcher: navigeer naar een ander team en behoud de actieve tab. Prev/next
  // lopen alfabetisch (zelfde volgorde als de dropdown) en wrappen rond.
  const idx = allTeams.indexOf(teamName)
  const teamHref = (name: string) => `/teams/${teamSlug(name)}?tab=${tab}`
  const goToTeam = (name: string) => router.push(teamHref(name))
  const prevTeam = allTeams[(idx - 1 + allTeams.length) % allTeams.length]!
  const nextTeam = allTeams[(idx + 1) % allTeams.length]!

  return (
    <div className="sec page-enter" style={{ position: 'relative', overflow: 'hidden' }}>
      <PixelParticles variant="green" />
      <div style={{ position: 'relative', zIndex: 1 }}>

        {/* Team-header — wrapt op smalle schermen zodat de Vergelijk-knop en lange
            teamnamen niet buiten de kaart vallen. */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 20, rowGap: 12, flexWrap: 'wrap', padding: '20px 24px', marginBottom: 20,
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

        {/* Team-switcher — spring direct naar een ander team zonder terug naar de
            index. Pijlen (vorig/volgend, alfabetisch) + doorzoekbare dropdown; de
            actieve tab blijft behouden. */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <Link
            href={teamHref(prevTeam)}
            className="px-btn"
            aria-label={tt('switcher.prev')}
            title={tt('switcher.prev')}
            style={{
              display: 'flex', alignItems: 'center', padding: '8px 12px', fontSize: 11,
              backgroundColor: 'var(--color-bg)', color: 'var(--color-txt)',
              border: '2px solid var(--color-brd2)', boxShadow: '3px 3px 0 var(--color-brd)',
              textDecoration: 'none', flexShrink: 0,
            }}
          >◀</Link>
          <TeamSelect
            teams={allTeams}
            value={teamName}
            onChange={goToTeam}
            style={{ flex: 1, maxWidth: 360 }}
          />
          <Link
            href={teamHref(nextTeam)}
            className="px-btn"
            aria-label={tt('switcher.next')}
            title={tt('switcher.next')}
            style={{
              display: 'flex', alignItems: 'center', padding: '8px 12px', fontSize: 11,
              backgroundColor: 'var(--color-bg)', color: 'var(--color-txt)',
              border: '2px solid var(--color-brd2)', boxShadow: '3px 3px 0 var(--color-brd)',
              textDecoration: 'none', flexShrink: 0,
            }}
          >▶</Link>
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

        {tab === 'profile' && <ProfileTab team={teamName} />}
        {tab === 'squad' && <SquadTab teamName={teamName} />}
        {tab === 'scorers' && <ScorersTab teamName={teamName} />}
        {tab === 'schedule' && <ScheduleTab teamName={teamName} />}
        {tab === 'path' && <BracketPathTab teamName={teamName} />}

      </div>
    </div>
  )
}
