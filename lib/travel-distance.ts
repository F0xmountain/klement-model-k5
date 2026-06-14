import { getHomeCoordinates } from './squad-data'

// Reisafstand-factor (Fase 2): teams die ver van huis spelen leveren winkans in.
// Thuiscoördinaten komen uit squad-data.json (via getHomeCoordinates) — één bron
// van waarheid, geen aparte team-locations.json. Venue-coördinaten uit
// stadiums.json (lib/simulate-tournament + /versus geven die mee).

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

// Afstand (km) van het thuisland van een team naar het stadion. undefined als de
// thuiscoördinaten onbekend zijn (team niet in squad-data.json).
export function travelDistance(teamName: string, venue: VenueCoord): number | undefined {
  const home = getHomeCoordinates(teamName)
  if (!home) return undefined
  return haversine(home.lat, home.lon, venue.lat, venue.lon)
}

// Maximale penalty op de winkans (4%-punt) bij de grootste reisafstand.
export const MAX_TRAVEL_PENALTY = 0.04
const TRAVEL_MIN_KM = 3000
const TRAVEL_MAX_KM = 8000

// Penalty-factor in [0, MAX_TRAVEL_PENALTY]: 0 onder 3000km, lineair geschaald
// tussen 3000–8000km, en vol vanaf 8000km. 0 als de afstand onbekend is.
export function travelPenalty(teamName: string, venue: VenueCoord): number {
  const km = travelDistance(teamName, venue)
  if (km === undefined || km <= TRAVEL_MIN_KM) return 0
  if (km >= TRAVEL_MAX_KM) return MAX_TRAVEL_PENALTY
  return (MAX_TRAVEL_PENALTY * (km - TRAVEL_MIN_KM)) / (TRAVEL_MAX_KM - TRAVEL_MIN_KM)
}
