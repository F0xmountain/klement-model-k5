import SectionLabel from '@/components/ui/SectionLabel'
import GroupCard from '@/components/match/GroupCard'
import { GROUPS } from '@/lib/fixtures'

export default function GroupsPage() {
  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 24px' }}>
      <div className="fade-in" style={{ marginBottom: 24 }}>
        <SectionLabel>Group Stage</SectionLabel>
        <h1 style={{ fontSize: 14, color: 'var(--color-r)', marginTop: 4 }}>12 GROUPS — SIMULATED</h1>
        <p style={{ fontSize: 7, color: 'var(--color-muted)', lineHeight: 2, marginTop: 8 }}>
          EACH GROUP IS SIMULATED ONCE ON LOAD. REFRESH FOR A NEW SET OF RESULTS.
        </p>
      </div>

      <div className="fade-in delay-1" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
        {Object.entries(GROUPS).map(([group, teams]) => (
          <GroupCard key={group} group={group} teams={teams} />
        ))}
      </div>
    </div>
  )
}
