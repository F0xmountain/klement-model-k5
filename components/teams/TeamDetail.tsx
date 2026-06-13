'use client'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Link, usePathname } from '@/i18n/navigation'
import { teamData, sc } from '@/lib/klement'
import FlagImg from '@/components/ui/FlagImg'
import PixelParticles from '@/components/ui/PixelParticles'
import SquadTab from './SquadTab'
import ScorersTab from './ScorersTab'
import ScheduleTab from './ScheduleTab'
import BracketPathTab from './BracketPathTab'

const TABS = ['squad', 'scorers', 'schedule', 'path'] as const
type Tab = (typeof TABS)[number]

export default function TeamDetail({ teamName }: { teamName: string }) {
  const tt = useTranslations('teams')
  const pathname = usePathname()
  const params = useSearchParams()

  const raw = params.get('tab')
  const tab: Tab = (TABS as readonly string[]).includes(raw ?? '') ? (raw as Tab) : 'squad'

  const team = teamData(teamName)
  const score = sc(teamName)

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
