import { matchP as matchPBase } from './klement'
import { applyStarPlayerModifier, toTeamNl } from './squad-modifier'

// Wrapper rond klement.ts's matchP die de blessure-status van sterspelers
// verrekent. Drop-in vervanging: zelfde signatuur, nA/nB zijn Engelse
// teamnamen uit lib/teams.json.
export function matchP(nA: string, nB: string): { pA: number; dr: number; pB: number } {
  const probs = matchPBase(nA, nB)
  const teamNlA = toTeamNl(nA) ?? ''
  const teamNlB = toTeamNl(nB) ?? ''
  return applyStarPlayerModifier(probs, teamNlA, teamNlB)
}
