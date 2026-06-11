import squadsDbRaw from './squads-db.json'
import type { SquadTeam } from './types/squads'
import type { McResult, McRoundCounts } from './monte-carlo'

const teamsDb = (squadsDbRaw as unknown as { teams: Record<string, SquadTeam> }).teams

// Positiegewicht: lager = scoort eerder, dus predictedScore = expectedMatches /
// gewicht. Aanvallers het laagst (scoren het vaakst), keepers/verdedigers het hoogst.
export const POSITION_WEIGHT: Record<string, number> = {
  attacker: 8,
  midfielder: 16,
  defender: 32,
  goalkeeper: 32,
}

export interface PredictedScorer {
  name: string
  team: string // name_en
  category: string
  score: number
}

// Verwacht aantal gespeelde wedstrijden = 3 groepswedstrijden + de kans om elke
// knockoutronde (R32..finale) te spelen. Teams zonder MC-data (niet in de bracket)
// spelen alleen de groepsfase.
function expectedMatches(counts: McRoundCounts | undefined, n: number): number {
  if (!counts || n === 0) return 3
  const reach =
    (counts.r32 ?? 0) + (counts.r16 ?? 0) + (counts.qf ?? 0) + (counts.sf ?? 0) + (counts.final ?? 0)
  return 3 + reach / n
}

// Rangschikt alle spelers uit squads-db.json op verwachte scorebijdrage
// (toernooi-kans van het team × inverse positiegewicht) en geeft de top N.
export function predictedTopScorers(mc: McResult, limit = 20): PredictedScorer[] {
  const players: PredictedScorer[] = []
  for (const team of Object.values(teamsDb)) {
    const em = expectedMatches(mc.teams[team.name_en], mc.n)
    for (const p of team.squad) {
      const weight = POSITION_WEIGHT[p.category] ?? POSITION_WEIGHT.midfielder
      players.push({ name: p.name, team: team.name_en, category: p.category, score: em / weight })
    }
  }
  players.sort((a, b) => b.score - a.score)
  return players.slice(0, limit)
}
