import { GROUPS } from './fixtures'
import { matchP } from './klement-custom'
import { teamData } from './klement'

// Verrassings-detector: groepswedstrijden waar de zwakkere ploeg (lagere FIFA-
// ranking) volgens het model een serieuze winkans heeft.

export const UPSET_THRESHOLD = 0.38

export interface UpsetMatch {
  teamA: string
  teamB: string
  group: string
  weakerTeam: string
  upsetProb: number
  matchLabel: string
}

function fifa(team: string): number {
  return teamData(team)?.fifa ?? 0
}

// De zwakkere ploeg (lagere FIFA-ranking) en diens winkans voor één wedstrijd.
export function getMatchUpset(teamA: string, teamB: string): { weakerTeam: string; upsetProb: number } {
  const { pA, pB } = matchP(teamA, teamB)
  return fifa(teamA) <= fifa(teamB)
    ? { weakerTeam: teamA, upsetProb: pA }
    : { weakerTeam: teamB, upsetProb: pB }
}

// Alle groepswedstrijden (72) waar de zwakkere ploeg ≥ threshold winkans heeft,
// gesorteerd op winkans aflopend.
export function getUpsets(threshold = UPSET_THRESHOLD): UpsetMatch[] {
  const upsets: UpsetMatch[] = []
  for (const [group, teams] of Object.entries(GROUPS)) {
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        const teamA = teams[i]
        const teamB = teams[j]
        const { weakerTeam, upsetProb } = getMatchUpset(teamA, teamB)
        if (upsetProb >= threshold) {
          upsets.push({ teamA, teamB, group, weakerTeam, upsetProb, matchLabel: `${group}: ${teamA} vs ${teamB}` })
        }
      }
    }
  }
  return upsets.sort((a, b) => b.upsetProb - a.upsetProb)
}
