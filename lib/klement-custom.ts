import teamsRaw from './teams.json'
import eloHistoryRaw from './elo-history.json'
import formCacheRaw from './form-cache.json'
import type { TeamData, WDL } from '../types'
import { fG, fP, fT, fF } from './klement'
import { applyStarPlayerModifier, toTeamNl } from './squad-modifier'
import { getHomeAltitude, getHomeCoordinates, getWcEditions } from './squad-data'

// Wrapper rond klement.ts's matchP. lib/klement.ts is read-only — modelaanpassingen
// (Elo-weging, sterspeler-blessures) leven hier.

const td = teamsRaw as Record<string, TeamData>
const eloHistory = eloHistoryRaw as Array<Record<string, string | number>>

interface FormCacheEntry {
  formScore: number | null
}
const formCache = formCacheRaw as Record<string, FormCacheEntry>

const W = { gdp: 0.20, pop: 0.15, temp: 0.15, fifa: 0.45, host: 0.05 }

type MatchProbs = { pA: number; dr: number; pB: number }

// Optionele wedstrijdlocatie voor de altitude- en travel-factor. Beide velden
// zijn optioneel — zonder venue-data zijn deze factoren een no-op.
export interface VenueInfo {
  altitude?: number
  lat?: number
  lon?: number
}

// "Teamsterkte" (de 0.45-gewogen factor) is een mix van FIFA-ranking en Elo-rating
export const ELO_WEIGHT = 0.30
export const FIFA_WEIGHT = 0.70

// Elo-normalisatie [1000, 2200] → [0, 1], analoog aan fF's FIFA-normalisatie [1400, 2000]
const ELO_MIN = 1000
const ELO_MAX = 2200

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v))
}

export function fE(elo: number): number {
  return clamp((elo - ELO_MIN) / (ELO_MAX - ELO_MIN), 0, 1)
}

// Meest recente Elo-waarde voor een team (laatste entry in elo-history.json met deze sleutel)
export function latestElo(name: string): number | undefined {
  for (let i = eloHistory.length - 1; i >= 0; i--) {
    const v = eloHistory[i][name]
    if (typeof v === 'number') return v
  }
  return undefined
}

function erf(x: number): number {
  const t = 1 / (1 + 0.3275911 * Math.abs(x))
  const p =
    t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))))
  const r = 1 - p * Math.exp(-x * x)
  return x >= 0 ? r : -r
}

function phi(x: number) {
  return 0.5 * (1 + erf(x / Math.sqrt(2)))
}

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x))
}

function logit(p: number): number {
  return Math.log(p / (1 - p))
}

// Verschuift pA op logit-schaal en herschaalt dr/pB proportioneel zodat de
// som 1 blijft. Zelfde aanpak als applyStarPlayerModifier in squad-modifier.ts.
function shiftPA(probs: MatchProbs, net: number): MatchProbs {
  if (net === 0) return probs
  const { pA, dr, pB } = probs
  const pAadj = sigmoid(logit(pA) + net)
  const scale = (1 - pAadj) / (1 - pA)
  return { pA: pAadj, dr: dr * scale, pB: pB * scale }
}

const EARTH_RADIUS_KM = 6371

function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}

// Boogafstand (great-circle) tussen twee coördinaten in km
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// Teamscore zoals klement.ts's sc(), maar de FIFA-factor is vervangen door een
// FIFA/Elo-mix (FIFA_WEIGHT/ELO_WEIGHT). Zonder Elo-data valt terug op fF alleen.
function sc(name: string): number {
  const t = td[name]
  if (!t) return 0

  const elo = latestElo(name)
  const strength = elo !== undefined
    ? FIFA_WEIGHT * fF(t.fifa) + ELO_WEIGHT * fE(elo)
    : fF(t.fifa)

  return (
    W.gdp * fG(t.gdp) +
    W.pop * fP(t.pop, t.latam) +
    W.temp * fT(t.temp) +
    W.fifa * strength +
    W.host * (t.host ? 1 : 0)
  )
}

function matchPElo(nA: string, nB: string): MatchProbs {
  const sA = sc(nA)
  const sB = sc(nB)
  const z = (sA - sB) / 0.28
  const dr = clamp(0.20 * (1 - 0.3 * Math.abs(z)), 0.05, 0.24)
  const pA = phi(z) * (1 - dr)
  const pB = (1 - phi(z)) * (1 - dr)
  return { pA, dr, pB }
}

// Logit-shift van ~-0.22 ≈ -5%-punt rond p=0.5 (zelfde schaal als STAR_PENALTY
// in squad-modifier.ts)
const ALTITUDE_PENALTY = -0.22
const ALTITUDE_VENUE_THRESHOLD_M = 1500
const SEA_LEVEL_THRESHOLD_M = 500

// Teams uit een land op zeeniveau (gemiddelde hoogte < 500m) leveren ~5%-punt
// winkans in als de wedstrijd op > 1500m hoogte wordt gespeeld (Mexico-Stad,
// Guadalajara). Geldt voor beide teams gelijk, dus als beiden uit een laagland
// komen heffen de verschuivingen elkaar op.
export function applyAltitudeFactor(
  probs: MatchProbs,
  homeTeam: string,
  awayTeam: string,
  venueAltitude: number = 0
): MatchProbs {
  if (venueAltitude <= ALTITUDE_VENUE_THRESHOLD_M) return probs

  const altA = getHomeAltitude(homeTeam)
  const altB = getHomeAltitude(awayTeam)

  let net = 0
  if (altA !== undefined && altA < SEA_LEVEL_THRESHOLD_M) net += ALTITUDE_PENALTY
  if (altB !== undefined && altB < SEA_LEVEL_THRESHOLD_M) net -= ALTITUDE_PENALTY

  return shiftPA(probs, net)
}

// Logit-shift van ~-0.13 ≈ -3%-punt rond p=0.5
const TRAVEL_PENALTY = -0.13
const TRAVEL_DISTANCE_THRESHOLD_KM = 8000

// Teams die > 8000km (boogafstand vanaf het centroid van het thuisland) van
// huis spelen leveren ~3%-punt winkans in.
export function applyTravelFactor(
  probs: MatchProbs,
  homeTeam: string,
  awayTeam: string,
  venueLat?: number,
  venueLon?: number
): MatchProbs {
  if (venueLat === undefined || venueLon === undefined) return probs

  const coordA = getHomeCoordinates(homeTeam)
  const coordB = getHomeCoordinates(awayTeam)

  let net = 0
  if (coordA && haversineKm(coordA.lat, coordA.lon, venueLat, venueLon) > TRAVEL_DISTANCE_THRESHOLD_KM) {
    net += TRAVEL_PENALTY
  }
  if (coordB && haversineKm(coordB.lat, coordB.lon, venueLat, venueLon) > TRAVEL_DISTANCE_THRESHOLD_KM) {
    net -= TRAVEL_PENALTY
  }

  return shiftPA(probs, net)
}

// Logit-shift van +0.08 ≈ +2%-punt rond p=0.5, voor 10+ WK-edities
const EXPERIENCE_BONUS_MAX = 0.08
const EXPERIENCE_EDITIONS_CAP = 10

// Het team met de meeste WK-deelnames krijgt een bonus t.o.v. het minder
// ervaren team, lineair geschaald tot 10 edities (10+ edities = volledige bonus).
export function applyExperienceFactor(probs: MatchProbs, homeTeam: string, awayTeam: string): MatchProbs {
  const bonus = (team: string) =>
    clamp((getWcEditions(team) ?? 0) / EXPERIENCE_EDITIONS_CAP, 0, 1) * EXPERIENCE_BONUS_MAX

  return shiftPA(probs, bonus(homeTeam) - bonus(awayTeam))
}

// Recente vorm telt voor 15% mee in het scoreverschil — formScore (0-30, uit
// lib/form-cache.json) wordt geschaald naar [0,1] en het verschil tussen beide
// teams wordt, net als sA-sB in matchPElo, gedeeld door 0.28 voor een logit-shift.
const FORM_WEIGHT = 0.15
const FORM_SCORE_MAX = 30
const FORM_SIGMA = 0.28

function form01(team: string): number | undefined {
  const score = formCache[team]?.formScore
  return score == null ? undefined : clamp(score / FORM_SCORE_MAX, 0, 1)
}

// Teams zonder vormgegevens (formScore null in form-cache.json, bv. zonder
// API_FOOTBALL_KEY) leveren geen bijdrage — no-op net als de andere
// post-hoc factoren zonder data.
export function applyFormFactor(probs: MatchProbs, homeTeam: string, awayTeam: string): MatchProbs {
  const formA = form01(homeTeam)
  const formB = form01(awayTeam)
  if (formA === undefined || formB === undefined) return probs

  const net = (FORM_WEIGHT * (formA - formB)) / FORM_SIGMA
  return shiftPA(probs, net)
}

// Drop-in vervanging van klement.ts's matchP: zelfde signatuur, nA/nB zijn
// Engelse teamnamen uit lib/teams.json. Past Elo-weging, de altitude/travel/
// experience-factoren en de blessure-status van sterspelers toe op de
// basisberekening. venue is optioneel — zonder venue-data zijn de altitude-
// en travel-factor een no-op.
export function matchP(nA: string, nB: string, venue?: VenueInfo): MatchProbs {
  let probs = matchPElo(nA, nB)
  probs = applyAltitudeFactor(probs, nA, nB, venue?.altitude ?? 0)
  probs = applyTravelFactor(probs, nA, nB, venue?.lat, venue?.lon)
  probs = applyExperienceFactor(probs, nA, nB)
  probs = applyFormFactor(probs, nA, nB)
  const teamNlA = toTeamNl(nA) ?? ''
  const teamNlB = toTeamNl(nB) ?? ''
  return applyStarPlayerModifier(probs, teamNlA, teamNlB)
}

// Drop-in vervanging van klement.ts's simResult, met de matchP hierboven
// (Elo-weging + sterspeler-blessures) in plaats van de basisversie.
export function simResultCustom(nA: string, nB: string): WDL {
  const { pA, dr } = matchP(nA, nB)
  const r = Math.random()
  if (r < pA) return 'A'
  if (r < pA + dr) return 'D'
  return 'B'
}
