import baseCampsRaw from './team-base-camps.json'

// Reisafstand-factor (Fase 2): teams reizen vanaf hun WK 2026-BASE CAMP naar het
// stadion (nauwkeuriger dan vanaf het thuisland — alle teams zitten al in
// Noord-Amerika). Base camps in lib/team-base-camps.json; venue-coördinaten uit
// stadiums.json (door /versus en de simulator als coords meegegeven aan matchP).

interface BaseCamp { city: string; lat: number; lon: number }
const baseCamps = baseCampsRaw as Record<string, BaseCamp>

// Geografisch centrum van de VS — fallback voor teams zonder bevestigde base camp
// (conservatieve schatting).
const USA_CENTER = { lat: 39.5, lon: -98.35 }

// team-base-camps.json gebruikt de officiële FIFA-spelling; matchP/teamData werken
// met de teams.json-naam. Brug voor de paar landen die afwijken.
const BASE_CAMP_ALIASES: Record<string, string> = {
  'Bosnia-Herz': 'Bosnia and Herzegovina',
  'Iran': 'IR Iran',
  'South Korea': 'Korea Republic',
  'USA': 'United States',
}

// Base camp van een team (teams.json-naam). Valt terug op het VS-centrum als er
// geen bevestigde base camp is.
function baseCampOf(teamName: string): { lat: number; lon: number } {
  const bc = baseCamps[BASE_CAMP_ALIASES[teamName] ?? teamName]
  return bc ? { lat: bc.lat, lon: bc.lon } : USA_CENTER
}

const EARTH_RADIUS_KM = 6371
const toRad = (deg: number): number => (deg * Math.PI) / 180

// Great-circle (boog)afstand in km tussen twee coördinaten.
export function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export interface VenueCoord {
  lat: number
  lon: number
}

// Afstand (km) van het base camp van een team naar het stadion.
export function travelDistance(teamName: string, venue: VenueCoord): number {
  const bc = baseCampOf(teamName)
  return haversine(bc.lat, bc.lon, venue.lat, venue.lon)
}

// Maximale penalty op de winkans (3%-punt). Lager dan de thuisland-aanpak omdat
// alle teams al in Noord-Amerika zitten — afstanden zijn nu max ~4000km.
export const MAX_TRAVEL_PENALTY = 0.03
const TRAVEL_MIN_KM = 500
const TRAVEL_MAX_KM = 4000

// Penalty-factor in [0, MAX_TRAVEL_PENALTY]: 0 onder 500km (base camp dichtbij),
// lineair geschaald tussen 500–4000km, en vol vanaf 4000km.
export function travelPenalty(teamName: string, venue: VenueCoord): number {
  const km = travelDistance(teamName, venue)
  if (km <= TRAVEL_MIN_KM) return 0
  if (km >= TRAVEL_MAX_KM) return MAX_TRAVEL_PENALTY
  return (MAX_TRAVEL_PENALTY * (km - TRAVEL_MIN_KM)) / (TRAVEL_MAX_KM - TRAVEL_MIN_KM)
}
