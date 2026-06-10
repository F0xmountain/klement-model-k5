import { NextResponse } from 'next/server'
import { teamNames } from '@/lib/klement'
import fallback from '@/lib/polymarket-fallback.json'

export const revalidate = 300 // 5 minutes

const POLYMARKET_EVENT_URL = 'https://gamma-api.polymarket.com/events?slug=world-cup-winner'

// Polymarket team naming differs from teams.json for a few entries
const NAME_MAP: Record<string, string> = {
  'Turkiye': 'Turkey',
  'Curaçao': 'Curacao',
  'Bosnia-Herzegovina': 'Bosnia-Herz',
}

interface PolymarketMarket {
  groupItemTitle?: string
  outcomePrices?: string
}

interface PolymarketEvent {
  updatedAt: string
  markets: PolymarketMarket[]
}

export interface TeamProbability {
  team: string
  probability: number
  updatedAt: string
}

export async function GET() {
  try {
    const res = await fetch(POLYMARKET_EVENT_URL, { next: { revalidate } })
    if (!res.ok) throw new Error('Polymarket request failed')

    const events: PolymarketEvent[] = await res.json()
    const event = events[0]
    if (!event?.markets) throw new Error('No event data')

    const validTeams = new Set(teamNames())

    const teams = event.markets
      .map((m): TeamProbability | null => {
        const rawName = m.groupItemTitle
        if (!rawName || !m.outcomePrices) return null
        const team = NAME_MAP[rawName] ?? rawName
        if (!validTeams.has(team)) return null
        const probability = Number(JSON.parse(m.outcomePrices)[0])
        if (!(probability > 0)) return null
        return { team, probability, updatedAt: event.updatedAt }
      })
      .filter((t): t is TeamProbability => t !== null)
      .sort((a, b) => b.probability - a.probability)

    if (teams.length === 0) throw new Error('No team data')

    return NextResponse.json(teams)
  } catch {
    return NextResponse.json(fallback)
  }
}
