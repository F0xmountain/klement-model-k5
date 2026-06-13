import squadsDbRaw from './squads-db.json'
import type { SquadTeam } from './types/squads'
import { simulateTournament, expectedMatchesFromSim } from './simulate-tournament'

const teamsDb = (squadsDbRaw as unknown as { teams: Record<string, SquadTeam> }).teams

// Positiegewicht: lager = scoort eerder, dus predictedScore = expectedMatches /
// gewicht. Aanvallers het laagst (scoren het vaakst), keepers/verdedigers het hoogst.
export const POSITION_WEIGHT: Record<string, number> = {
  attacker: 8,
  midfielder: 16,
  defender: 32,
  goalkeeper: 32,
}

// Sterspeler-multiplier (rang uit squads-db.json's star_players): de sterspeler is
// veel meer dan een bankzitter een doelpuntenmaker, dus zijn score wordt opgeschaald.
// Geen sterspeler → ×1.0 (ongewijzigd).
const STAR_MULTIPLIER: Record<number, number> = { 1: 3.0, 2: 2.0, 3: 1.5 }

export interface PredictedScorer {
  name: string
  team: string // name_en
  category: string
  score: number
}

// Rangschikt alle spelers uit squads-db.json op verwachte scorebijdrage:
// verwacht aantal gespeelde wedstrijden (uit de volledige toernooi-simulatie,
// inclusief groepsfase) × inverse positiegewicht. Geeft de top N.
export function predictedTopScorers(limit = 20, sims = 2000): PredictedScorer[] {
  const sim = simulateTournament(sims)
  const expected = expectedMatchesFromSim(sim)

  const players: PredictedScorer[] = []
  for (const team of Object.values(teamsDb)) {
    const em = expected[team.name_en] ?? 3
    const starRank = new Map(team.star_players.map(s => [s.name, s.rank]))
    for (const p of team.squad) {
      const weight = POSITION_WEIGHT[p.category] ?? POSITION_WEIGHT.midfielder ?? 1
      const starMult = STAR_MULTIPLIER[starRank.get(p.name) ?? 0] ?? 1.0
      players.push({ name: p.name, team: team.name_en, category: p.category, score: (em / weight) * starMult })
    }
  }
  players.sort((a, b) => b.score - a.score)
  return players.slice(0, limit)
}
