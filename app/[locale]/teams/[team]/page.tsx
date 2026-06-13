import { notFound } from 'next/navigation'
import { teamNames } from '@/lib/klement'
import { teamSlug, teamFromSlug } from '@/lib/team-slug'
import TeamProfile from '@/components/team/TeamProfile'

// Pre-render een statische pagina per team (/teams/mexico, /teams/south-korea, …).
export function generateStaticParams() {
  return teamNames().map(name => ({ team: teamSlug(name) }))
}

export default async function TeamPage({ params }: { params: Promise<{ team: string }> }) {
  const { team } = await params
  const name = teamFromSlug(decodeURIComponent(team))
  if (!name) notFound()
  return <TeamProfile initialTeam={name} />
}
