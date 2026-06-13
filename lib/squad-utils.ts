import squadsDbRaw from './squads-db.json'
import playerStatusRaw from './player-status.json'

// Posities en hun volgorde/labels. squads-db.json categoriseert elke speler als
// goalkeeper | defender | midfielder | attacker.
export const POSITION_ORDER = ['goalkeeper', 'defender', 'midfielder', 'attacker'] as const
export type Category = (typeof POSITION_ORDER)[number]

export const POSITION_LABELS: Record<string, { nl: string; en: string }> = {
  goalkeeper: { nl: 'Keepers', en: 'Goalkeepers' },
  defender: { nl: 'Verdedigers', en: 'Defenders' },
  midfielder: { nl: 'Middenvelders', en: 'Midfielders' },
  attacker: { nl: 'Aanvallers', en: 'Forwards' },
}

export type PlayerStatus = 'fit' | 'doubtful' | 'out'

export interface SquadPlayer {
  name: string
  club: string | null
  position: string | null
  category: Category
  status: PlayerStatus
}

export interface StarPlayer {
  rank: number
  name: string
  status: PlayerStatus
}

export interface SquadTeam {
  nameNl: string
  nameEn: string
  group: string
  coach: string
  captain: string
  starPlayers: StarPlayer[]
  squad: SquadPlayer[]
}

interface SquadsDb {
  teams: Record<string, {
    name_nl: string
    name_en: string
    group: string
    coach: string
    captain: string
    star_players: StarPlayer[]
    squad: SquadPlayer[]
  }>
}
interface PlayerStatusFile {
  statuses: Record<string, Record<string, PlayerStatus>>
}

const db = (squadsDbRaw as SquadsDb).teams
const playerStatus = (playerStatusRaw as PlayerStatusFile).statuses ?? {}

// Lookup van de teams.json-Engelse naam → squads-db-entry (gekeyd op Nederlandse naam).
const byEnglish = new Map<string, SquadTeam>()
for (const entry of Object.values(db)) {
  byEnglish.set(entry.name_en, {
    nameNl: entry.name_nl,
    nameEn: entry.name_en,
    group: entry.group,
    coach: entry.coach,
    captain: entry.captain,
    starPlayers: entry.star_players ?? [],
    squad: entry.squad ?? [],
  })
}

export function getSquadTeam(englishName: string): SquadTeam | undefined {
  return byEnglish.get(englishName)
}

// Actuele status: player-status.json (admin-bijgehouden) overschrijft de
// squads-db.json-status; valt terug op de squad-status.
export function resolveStatus(teamNl: string, playerName: string, fallback: PlayerStatus): PlayerStatus {
  return playerStatus[teamNl]?.[playerName] ?? fallback
}

// Sterspeler-rang (1/2/3) van een speler binnen zijn team, of undefined.
export function starRankOf(team: SquadTeam, playerName: string): number | undefined {
  return team.starPlayers.find(s => s.name === playerName)?.rank
}
