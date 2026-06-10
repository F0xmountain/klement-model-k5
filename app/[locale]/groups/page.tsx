import { useTranslations } from 'next-intl'
import GroupCard from '@/components/match/GroupCard'
import { GROUPS } from '@/lib/fixtures'
import PixelParticles from '@/components/ui/PixelParticles'

export default function GroupsPage() {
  const t = useTranslations('groups')

  return (
    <div className="sec page-enter" style={{ position: 'relative', overflow: 'hidden' }}>
      <PixelParticles variant="blue" />
      <div style={{ position: 'relative', zIndex: 1 }}>
      <div className="section-title">{t('pageTitle')}</div>
      <div style={{ fontSize: 9, color: 'var(--color-muted)', marginBottom: 24, lineHeight: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className="qual-dot" /> {t('qualifiedLegend')}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {Object.entries(GROUPS).map(([group, teams]) => (
          <GroupCard key={group} group={group} teams={teams} />
        ))}
      </div>
      </div>
    </div>
  )
}
