import snapshotsRaw from './probability-snapshots.json'
import type { Category } from './squad-utils'

// Fantasy-puntensysteem voor verwachte topscorers. Het Klement-model blijft
// W/D/L-only; dit is een afgeleide illustratie op basis van historische
// WK-doelpuntengemiddelden per positie, niet een modeluitbreiding.

// Punten per goal per positie (verdedigers/keepers scoren zelden → hoger gewogen).
export const POSITION_POINTS: Record<Category, number> = {
  attacker: 8,
  midfielder: 16,
  defender: 32,
  goalkeeper: 32,
}

// Historisch WK-gemiddelde goals per speler per wedstrijd, per positie.
export const GOALS_PER_GAME: Record<Category, number> = {
  attacker: 0.35,
  midfielder: 0.12,
  defender: 0.05,
  goalkeeper: 0.01,
}

// Rondes: multiplier op de punten + aantal wedstrijden in die ronde per team.
interface RoundDef { key: string; mult: number; matches: number }
const ROUNDS: RoundDef[] = [
  { key: 'group', mult: 1.0, matches: 3 },
  { key: 'r32', mult: 1.5, matches: 1 },
  { key: 'r16', mult: 2.0, matches: 1 },
  { key: 'qf', mult: 3.0, matches: 1 },
  { key: 'sf', mult: 4.0, matches: 1 },
  { key: 'final', mult: 5.0, matches: 1 },
]

interface Snapshot { matchLabel: string; snapshots: Record<string, number> }
const snapshots = snapshotsRaw as Snapshot[]

// Meest recente kampioenskans voor dit team (uit probability-snapshots.json),
// of undefined als het team niet wordt gevolgd.
export function championProbFor(teamName: string): number | undefined {
  for (let i = snapshots.length - 1; i >= 0; i--) {
    const p = snapshots[i]!.snapshots[teamName]
    if (typeof p === 'number') return p
  }
  return undefined
}

// Kans dat het team elke ronde speelt. De groepsfase speelt het team zeker (1.0);
// de KO-kansen schalen lineair van 1.0 (na de groep) af naar de kampioenskans in
// de finale. Zonder snapshot-data: 50% per KO-ronde (fallback).
function reachProbs(teamName: string): number[] {
  const pChamp = championProbFor(teamName)
  if (pChamp === undefined) return [1, 0.5, 0.5, 0.5, 0.5, 0.5]
  // i = 0 (group) → 1.0 ; i = 5 (final) → pChamp ; lineair ertussen.
  return ROUNDS.map((_, i) => 1 - (i / (ROUNDS.length - 1)) * (1 - pChamp))
}

// Verwachte goals over het hele toernooi voor een speler van deze positie.
export function calcExpectedGoals(category: Category, teamName: string): number {
  const reach = reachProbs(teamName)
  const gpg = GOALS_PER_GAME[category]
  return ROUNDS.reduce((sum, r, i) => sum + reach[i]! * r.matches * gpg, 0)
}

// Verwachte fantasy-punten over het hele toernooi voor een speler van deze positie.
export function calcExpectedPoints(category: Category, teamName: string): number {
  const reach = reachProbs(teamName)
  const gpg = GOALS_PER_GAME[category]
  const pts = POSITION_POINTS[category]
  return ROUNDS.reduce((sum, r, i) => sum + reach[i]! * r.matches * gpg * pts * r.mult, 0)
}
