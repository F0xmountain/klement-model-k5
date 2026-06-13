import { teamNames } from './klement'

// URL-slug voor een team: kleine letters, spaties → koppeltekens
// (bv. "South Korea" → "south-korea", "Bosnia-Herz" → "bosnia-herz").
// Gebruikt voor /teams/[team]-links vanaf o.a. de groepspagina.
export function teamSlug(name: string): string {
  return name.toLowerCase().replace(/ /g, '-')
}

// Zoekt de teams.json-naam die bij een slug hoort (hoofdletter-ongevoelig).
// Undefined als er geen team op past.
export function teamFromSlug(slug: string): string | undefined {
  const target = slug.toLowerCase()
  return teamNames().find(name => teamSlug(name) === target)
}
