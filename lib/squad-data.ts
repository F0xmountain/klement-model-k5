import squadDataRaw from './squad-data.json'
import squadsDbRaw from './squads-db.json'
import { toTeamNl } from './squad-modifier'
import type { SquadTeam } from './types/squads'

interface SquadDataEntry {
  avg_age: number
  home_altitude_m: number
  coordinates: { lat: number; lon: number }
}

const squadData = squadDataRaw as Record<string, SquadDataEntry>
const teamsDb = (squadsDbRaw as unknown as { teams: Record<string, SquadTeam> }).teams

// Gemiddelde leeftijd van de selectie (lib/squad-data.json)
export function getAvgAge(nameEn: string): number | undefined {
  return squadData[nameEn]?.avg_age
}

// Gemiddelde hoogte (m) van het thuisland — voor de altitude factor
export function getHomeAltitude(nameEn: string): number | undefined {
  return squadData[nameEn]?.home_altitude_m
}

// Centroid-coordinaten van het thuisland — voor de travel distance factor
export function getHomeCoordinates(nameEn: string): { lat: number; lon: number } | undefined {
  return squadData[nameEn]?.coordinates
}

// Aantal WK-deelnames — uit squads-db.json's wc_appearances, niet gedupliceerd
// in squad-data.json. Undefined voor teams die niet in squads-db.json staan
// (de 10 niet voor WK2026 geplaatste landen in teams.json).
export function getWcEditions(nameEn: string): number | undefined {
  const nameNl = toTeamNl(nameEn)
  if (!nameNl) return undefined
  return teamsDb[nameNl]?.wc_appearances
}
