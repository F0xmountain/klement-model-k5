import { notFound } from 'next/navigation'
import { teamFromSlug } from '@/lib/team-slug'
import VersusClient from '@/components/versus/VersusClient'

// Deelbare slug-route: /versus/spain/netherlands. Rendert dezelfde VersusClient
// als de query-param-pagina, maar met de teams uit de slug-params.
export default async function VersusSlugPage({
  params,
}: {
  params: Promise<{ teamA: string; teamB: string }>
}) {
  const { teamA, teamB } = await params
  const a = teamFromSlug(decodeURIComponent(teamA))
  const b = teamFromSlug(decodeURIComponent(teamB))
  if (!a || !b) notFound()
  return <VersusClient initialA={a} initialB={b} />
}
