import squadsDbRaw from './squads-db.json'
import playerStatusRaw from './player-status.json'
import starPlayerStatusRaw from './star-player-status.json'
import type { matchP } from './klement'
import type { PlayerStatus, SquadTeam } from './types/squads'
import { getModelWeights } from './model-config'

export type { PlayerStatus } from './types/squads'

type MatchProbs = ReturnType<typeof matchP>

interface StatusFile {
  statuses?: Record<string, Record<string, string>>
  overrides?: Record<string, Record<string, string>>
}

const teamsDb = (squadsDbRaw as unknown as { teams: Record<string, SquadTeam> }).teams
const playerStatusDb = (playerStatusRaw as unknown as StatusFile).statuses ?? {}
const starPlayerStatusDb = (starPlayerStatusRaw as unknown as StatusFile).overrides ?? {}

// lib/teams.json gebruikt Engelse namen (bv. "Netherlands"), squads-db.json
// gebruikt Nederlandse sleutels (bv. "Nederland") met een name_en veld.
const EN_TO_NL: Record<string, string> = {}
for (const [nl, team] of Object.entries(teamsDb)) {
  EN_TO_NL[team.name_en] = nl
}

// Spelling in teams.json wijkt af van name_en in squads-db.json voor deze 4 landen
const EN_NAME_ALIASES: Record<string, string> = {
  'Bosnia-Herz': 'Bosnia and Herzegovina',
  'Cape Verde': 'Cape Verde Islands',
  'Congo DR': 'DR Congo',
  'Curacao': 'Curaçao',
}

// Zet een Engelse teamnaam (lib/teams.json) om naar de Nederlandse sleutel
// in squads-db.json. Geeft undefined als het team geen squad-data heeft.
export function toTeamNl(nameEn: string): string | undefined {
  return EN_TO_NL[nameEn] ?? EN_TO_NL[EN_NAME_ALIASES[nameEn] ?? '']
}

// Sterspeler-penalty's komen uit de modelconfig als positieve %-punt-waarden
// (default 0.08/0.05/0.03) en worden omgezet naar een negatieve logit-shift:
// een penalty van d %-punt rond p=0.5 is logit-shift log((0.5−d)/(0.5+d)).
function pctToLogit(d: number): number {
  return Math.log((0.5 - d) / (0.5 + d))
}

const starWeights = getModelWeights()
const STAR_PENALTY: Record<number, number> = {
  1: pctToLogit(starWeights.starPenalty1),
  2: pctToLogit(starWeights.starPenalty2),
  3: pctToLogit(starWeights.starPenalty3),
}

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x))
}

function logit(p: number): number {
  return Math.log(p / (1 - p))
}

// player-status.json overschrijft star-player-status.json overschrijft "fit"
export function getPlayerStatus(teamNl: string, playerName: string): PlayerStatus {
  const fromPlayerStatus = playerStatusDb[teamNl]?.[playerName]
  if (fromPlayerStatus) return fromPlayerStatus as PlayerStatus

  const fromStarStatus = starPlayerStatusDb[teamNl]?.[playerName]
  if (fromStarStatus) return fromStarStatus as PlayerStatus

  return 'fit'
}

export function calcStarPlayerPenalty(teamNl: string): number {
  const team = teamsDb[teamNl]
  if (!team) return 0

  return team.star_players.reduce((penalty, star) => {
    const status = getPlayerStatus(teamNl, star.name)
    const base = STAR_PENALTY[star.rank] ?? 0
    if (status === 'out') return penalty + base
    if (status === 'doubtful') return penalty + base / 2
    return penalty
  }, 0)
}

export function applyStarPlayerModifier(
  probs: MatchProbs,
  homeTeamNl: string,
  awayTeamNl: string
): MatchProbs {
  const net = calcStarPlayerPenalty(homeTeamNl) - calcStarPlayerPenalty(awayTeamNl)
  if (net === 0) return probs

  const { pA, dr, pB } = probs
  const pAadj = sigmoid(logit(pA) + net)
  const scale = (1 - pAadj) / (1 - pA)

  return { pA: pAadj, dr: dr * scale, pB: pB * scale }
}

export interface StarPlayerStatus {
  name: string
  status: PlayerStatus
  pct: number | null
}

// Geeft per sterspeler de actuele status + impact op de winkans (logit-schaal,
// percentagepunten). pct is null bij "fit" (geen afwijking om te tonen).
// Lege array als alle sterspelers fit zijn.
export function getStarPlayerSummary(teamNl: string): StarPlayerStatus[] {
  const team = teamsDb[teamNl]
  if (!team) return []

  const allFit = team.star_players.every(star => getPlayerStatus(teamNl, star.name) === 'fit')
  if (allFit) return []

  return team.star_players.map(star => {
    const status = getPlayerStatus(teamNl, star.name)
    if (status === 'fit') return { name: star.name, status, pct: null }

    const base = STAR_PENALTY[star.rank] ?? 0
    const individual = status === 'out' ? base : base / 2
    const pct = (sigmoid(individual) - 0.5) * 100
    return { name: star.name, status, pct }
  })
}

export function getFullSquadWithStatus(teamNl: string): Array<{
  name: string
  club: string | null
  category: string
  isStar: boolean
  starRank?: number
  status: PlayerStatus
}> {
  const team = teamsDb[teamNl]
  if (!team) return []

  const starRanks = new Map(team.star_players.map(star => [star.name, star.rank]))

  return team.squad.map(player => ({
    name: player.name,
    club: player.club,
    category: player.category,
    isStar: starRanks.has(player.name),
    starRank: starRanks.get(player.name),
    status: getPlayerStatus(teamNl, player.name),
  }))
}
