import teamsRaw from './teams.json'
import eloHistoryRaw from './elo-history.json'
import eloCurrentRaw from './elo-current.json'
import formCacheRaw from './form-cache.json'
import leagueDataRaw from './league-data.json'
import type { TeamData, WDL } from '../types'
import { fG, fP, fT } from './klement'
import { applyStarPlayerModifier, toTeamNl } from './squad-modifier'
import { getHomeAltitude, getWcEditions } from './squad-data'
import { getModelWeights, type ModelWeights } from './model-config'
import { ALTITUDE_FACTOR_ENABLED } from './feature-flags'
import { travelPenalty } from './travel-distance'

// Wrapper rond klement.ts's matchP. lib/klement.ts is read-only — modelaanpassingen
// (Elo-weging, sterspeler-blessures) leven hier.

const td = teamsRaw as Record<string, TeamData>
const eloHistory = eloHistoryRaw as Array<Record<string, string | number>>
const eloCurrent = eloCurrentRaw as Record<string, number>

interface FormCacheEntry {
  formScore: number | null
}
const formCache = formCacheRaw as Record<string, FormCacheEntry>

interface LeagueDataEntry {
  team: string
  players_top5: number
  total_market_value_m: number
  max_same_club: number
}
const leagueData: Record<string, LeagueDataEntry> = Object.fromEntries(
  (leagueDataRaw as LeagueDataEntry[]).map(d => [d.team, d])
)

// Modelgewichten uit lib/model-config.json (defaults in lib/model-config.ts).
// Op module-niveau ingelezen — admin-wijzigingen gelden na revalidatie/herbouw.
// De basisfactoren (gdp/pop/temp/fifa/host) worden per berekening uit `weights`
// gelezen via scWith(), zodat de configurator-preview ze kan overrulen.
const weights = getModelWeights()

type MatchProbs = { pA: number; dr: number; pB: number }

// Optionele wedstrijdlocatie voor de altitude- en travel-factor. Beide velden
// zijn optioneel — zonder venue-data zijn deze factoren een no-op.
export interface VenueInfo {
  altitude?: number
  lat?: number
  lon?: number
}

// "Teamsterkte" (de fifa-gewogen factor) is een mix van FIFA-ranking en Elo-rating.
// eloWeight uit de config bepaalt het Elo-aandeel; FIFA krijgt de rest.
export const ELO_WEIGHT = weights.eloWeight
export const FIFA_WEIGHT = 1 - weights.eloWeight

// Elo-normalisatie [950, 2200] → [0, 1], analoog aan fF hieronder. De werkelijke
// Elo-waarden van de WK-teams lopen van ~978 (Curaçao) tot ~2157 (Spanje); deze
// grenzen bracketen die range met lichte marge zodat geen enkel team naar exact
// 0 of 1 wordt geclipt.
const ELO_MIN = 950
const ELO_MAX = 2200

// FIFA-normalisatie. De basis-fF in klement.ts (read-only) normaliseert over
// [1400, 2000], maar de werkelijke FIFA-punten in teams.json lopen van 1410 tot
// 1880 — met een bovengrens van 2000 bereikt het sterkste team slechts 0.80 en
// wordt het hele veld in de onderste 80% van de schaal samengedrukt. We
// normaliseren daarom op de werkelijke datarange met lichte marge: [1400, 1900].
const FIFA_MIN = 1400
const FIFA_MAX = 1900

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v))
}

export function fE(elo: number): number {
  return clamp((elo - ELO_MIN) / (ELO_MAX - ELO_MIN), 0, 1)
}

export function fF(fifa: number): number {
  return clamp((fifa - FIFA_MIN) / (FIFA_MAX - FIFA_MIN), 0, 1)
}

// Meest recente Elo-waarde voor een team uit elo-history.json (laatste entry met deze sleutel)
export function historicalElo(name: string): number | undefined {
  for (let i = eloHistory.length - 1; i >= 0; i--) {
    const v = eloHistory[i]![name]
    if (typeof v === 'number') return v
  }
  return undefined
}

// Live Elo-waarde voor een team: lib/elo-current.json (bijgewerkt na elke uitslag in
// /admin/results) heeft voorrang op de statische elo-history.json.
export function latestElo(name: string): number | undefined {
  const current = eloCurrent[name]
  return typeof current === 'number' ? current : historicalElo(name)
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

// Optionele Elo-override per team — voor de kampioenskans-tijdlijn, die de
// simulatie met historische Elo-standen (na elke uitslag) opnieuw draait.
export type EloMap = Record<string, number>

// Teamscore zoals klement.ts's sc(), maar de FIFA-factor is vervangen door een
// FIFA/Elo-mix (eloWeight bepaalt het Elo-aandeel). Zonder Elo-data valt terug
// op fF alleen. w is parametriseerbaar voor de live configurator-preview;
// eloOverride vervangt de Elo-rating (anders de actuele waarde uit latestElo).
function scWith(name: string, w: ModelWeights, eloOverride?: EloMap): number {
  const t = td[name]
  if (!t) return 0

  const elo = eloOverride?.[name] ?? latestElo(name)
  const strength = elo !== undefined
    ? (1 - w.eloWeight) * fF(t.fifa) + w.eloWeight * fE(elo)
    : fF(t.fifa)

  return (
    w.gdp * fG(t.gdp) +
    w.pop * fP(t.pop, t.latam) +
    w.temp * fT(t.temp) +
    w.fifa * strength +
    w.host * (t.host ? 1 : 0)
  )
}

// Publieke teamscore (custom-model, opgeslagen gewichten). Wordt o.a. gebruikt
// door de topscorers-ranking als sterktemaat, los van de bracket-fixtures.
export function sc(name: string): number {
  return scWith(name, weights)
}

function matchPEloWith(nA: string, nB: string, w: ModelWeights, eloOverride?: EloMap): MatchProbs {
  const sA = scWith(nA, w, eloOverride)
  const sB = scWith(nB, w, eloOverride)
  const z = (sA - sB) / 0.28
  const dr = clamp(0.20 * (1 - 0.3 * Math.abs(z)), 0.05, 0.24)
  const pA = phi(z) * (1 - dr)
  const pB = (1 - phi(z)) * (1 - dr)
  return { pA, dr, pB }
}

function matchPElo(nA: string, nB: string, eloOverride?: EloMap): MatchProbs {
  return matchPEloWith(nA, nB, weights, eloOverride)
}

// Volledige logit-penalty (~-0.22 ≈ -5%-punt rond p=0.5) bij de bovengrens van de
// hoogte-normalisatie; lineair geschaald naar de genormaliseerde venue-hoogte.
const ALTITUDE_MAX_PENALTY = -0.22
const ALTITUDE_NORM_MAX_M = 2500     // hoogte genormaliseerd naar [0,1] over 0–2500m
const ALTITUDE_VENUE_THRESHOLD_M = 1500   // factor activeert pas boven deze venue-hoogte
const SEA_LEVEL_THRESHOLD_M = 500    // team is "niet gewend aan hoogte" als thuishoogte < dit

// Genormaliseerde venue-hoogte in [0,1] over 0–2500m.
function altitudeNorm(m: number): number {
  return clamp(m / ALTITUDE_NORM_MAX_M, 0, 1)
}

// Logit-penalty voor één team op een venue van venueAltitude meter. Een team uit
// een zeeniveau-land (thuishoogte < SEA_LEVEL_THRESHOLD_M, proxy voor "niet gewend
// aan hoogte") levert winkans in, geschaald naar de genormaliseerde venue-hoogte.
// Teams uit een hooggelegen land (Mexico, Ecuador, Iran, …) krijgen geen penalty.
// 0 als de factor uit staat, het venue onder de drempel ligt, of de thuishoogte
// onbekend is.
export function altitudePenalty(team: string, venueAltitude: number): number {
  if (!ALTITUDE_FACTOR_ENABLED) return 0
  if (venueAltitude <= ALTITUDE_VENUE_THRESHOLD_M) return 0
  const home = getHomeAltitude(team)
  if (home === undefined || home >= SEA_LEVEL_THRESHOLD_M) return 0
  return ALTITUDE_MAX_PENALTY * altitudeNorm(venueAltitude)
}

// Hoogte-bijdrage als ~percentagepunt rond p=0.5 (voor weergave op /versus).
export function altitudePct(team: string, venueAltitude: number): number {
  return (sigmoid(altitudePenalty(team, venueAltitude)) - 0.5) * 100
}

// Past de hoogte-factor toe: het netto logit-verschil tussen beide teams (een
// laagland-team op hoogte verliest, de tegenstander wint relatief). Komen beide
// uit een laagland, dan heffen de verschuivingen elkaar op.
export function applyAltitudeFactor(
  probs: MatchProbs,
  homeTeam: string,
  awayTeam: string,
  venueAltitude: number = 0
): MatchProbs {
  const net = altitudePenalty(homeTeam, venueAltitude) - altitudePenalty(awayTeam, venueAltitude)
  if (net === 0) return probs
  return shiftPA(probs, net)
}

// Zet een penalty van d %-punt (rond p=0.5) om naar een logit-shift, net als de
// sterspeler- en hoogte-factor. d=0 → geen shift; d>0 → negatieve shift.
function pctToLogit(d: number): number {
  return Math.log((0.5 - d) / (0.5 + d))
}

// Reisafstand-factor: elk team krijgt zijn eigen penalty (travelPenalty, lineair
// 3000–8000km → max 4%) op basis van de afstand thuisland→stadion. De penalty
// verlaagt de winkans van het reizende team; netto verschil op logit-schaal zodat
// de kansensom 1 blijft. Zonder venue-coördinaten een no-op.
export function applyTravelFactor(
  probs: MatchProbs,
  homeTeam: string,
  awayTeam: string,
  venueLat?: number,
  venueLon?: number
): MatchProbs {
  if (venueLat === undefined || venueLon === undefined) return probs

  const venue = { lat: venueLat, lon: venueLon }
  const net = pctToLogit(travelPenalty(homeTeam, venue)) - pctToLogit(travelPenalty(awayTeam, venue))
  if (net === 0) return probs

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

// teams.json gebruikt voor enkele landen afwijkende namen t.o.v. squads-db.json's
// name_en (de bron van form-cache.json en league-data.json's "team" veld). Kleine
// alias-map om de lookup te overbruggen.
const LEAGUE_NAME_ALIASES: Record<string, string> = {
  'Bosnia-Herz': 'Bosnia and Herzegovina',
  'Curacao': 'Curaçao',
  'Cape Verde': 'Cape Verde Islands',
  'Congo DR': 'DR Congo',
}

function getLeagueData(team: string): LeagueDataEntry | undefined {
  return leagueData[LEAGUE_NAME_ALIASES[team] ?? team]
}

// Recente vorm telt mee in het scoreverschil (default 15%, instelbaar via config)
// — formScore (0-30, uit lib/form-cache.json) wordt geschaald naar [0,1] en het
// verschil tussen beide teams wordt, net als sA-sB in matchPElo, gedeeld door
// 0.28 voor een logit-shift.
const FORM_SCORE_MAX = 30
const FORM_SIGMA = 0.28

function form01(team: string): number | undefined {
  const score = formCache[LEAGUE_NAME_ALIASES[team] ?? team]?.formScore
  return score == null ? undefined : clamp(score / FORM_SCORE_MAX, 0, 1)
}

// Teams zonder vormgegevens (formScore null in form-cache.json, bv. zonder
// API_FOOTBALL_KEY) leveren geen bijdrage — no-op net als de andere
// post-hoc factoren zonder data.
export function applyFormFactor(
  probs: MatchProbs,
  homeTeam: string,
  awayTeam: string,
  formWeight: number = weights.formWeight
): MatchProbs {
  const formA = form01(homeTeam)
  const formB = form01(awayTeam)
  if (formA === undefined || formB === undefined) return probs

  const net = (formWeight * (formA - formB)) / FORM_SIGMA
  return shiftPA(probs, net)
}

// Competitieniveau: aandeel van de 26-mans selectie dat in een top-5 Europese
// competitie speelt (Premier League, La Liga, Bundesliga, Serie A, Ligue 1),
// genormaliseerd naar [0,1]. Ook gebruikt als 7e as in FactorRadar.
const LEAGUE_SQUAD_SIZE = 26

export function leagueIndex(team: string): number | undefined {
  const data = getLeagueData(team)
  if (!data) return undefined
  return clamp(data.players_top5 / LEAGUE_SQUAD_SIZE, 0, 1)
}

// Competitieniveau telt mee in het scoreverschil (default 10%, instelbaar via
// config) — zelfde logit-schaalbenadering als applyFormFactor, maar lager gewicht
// omdat dit een zachter signaal is dan recente vorm.
const LEAGUE_SIGMA = 0.28

// Logit-shift van +0.04 ≈ +1%-punt rond p=0.5 (zelfde schaal als
// EXPERIENCE_BONUS_MAX), voor 3+ spelers van dezelfde club (synergiebonus).
const CLUB_SYNERGY_BONUS = 0.04
const CLUB_SYNERGY_THRESHOLD = 3

export function applyLeagueFactor(
  probs: MatchProbs,
  homeTeam: string,
  awayTeam: string,
  leagueWeight: number = weights.leagueWeight
): MatchProbs {
  const idxA = leagueIndex(homeTeam)
  const idxB = leagueIndex(awayTeam)
  if (idxA === undefined || idxB === undefined) return probs

  let net = (leagueWeight * (idxA - idxB)) / LEAGUE_SIGMA

  if ((getLeagueData(homeTeam)?.max_same_club ?? 0) >= CLUB_SYNERGY_THRESHOLD) net += CLUB_SYNERGY_BONUS
  if ((getLeagueData(awayTeam)?.max_same_club ?? 0) >= CLUB_SYNERGY_THRESHOLD) net -= CLUB_SYNERGY_BONUS

  return shiftPA(probs, net)
}

// Logit-shift van ~-0.16 ≈ -4%-punt rond p=0.5 (zelfde schaal als de andere
// post-hoc factoren). Een team met < 3 rustdagen levert ~4%-punt winkans in.
const REST_PENALTY = -0.16
const REST_DAYS_THRESHOLD = 3

// Rustdagen-factor: een team dat minder dan REST_DAYS_THRESHOLD dagen geleden
// speelde, raakt vermoeid en levert winkans in. Rustdagen worden meegegeven
// (berekend uit results.json via lib/rest-days.ts); zonder data een no-op.
// homeTeam/awayTeam staan in de signatuur voor symmetrie met de andere factoren.
export function applyRestDaysFactor(
  probs: MatchProbs,
  _homeTeam: string,
  _awayTeam: string,
  homeRestDays?: number,
  awayRestDays?: number
): MatchProbs {
  let net = 0
  if (homeRestDays !== undefined && homeRestDays < REST_DAYS_THRESHOLD) net += REST_PENALTY
  if (awayRestDays !== undefined && awayRestDays < REST_DAYS_THRESHOLD) net -= REST_PENALTY
  return shiftPA(probs, net)
}

// Optionele rustdagen per team voor de rustdagen-factor in matchP.
export interface RestDays {
  home?: number
  away?: number
}

// Polymarket-toernooiodds per team (kans om het WK te winnen), bv. uit /api/polymarket.
export type PolymarketOdds = Record<string, number>

// Blendt de modelkansen met de Polymarket-marktodds (Fase 6). Polymarket geeft de
// kans dat een team het TOERNOOI wint; daaruit leiden we een wedstrijdkans af:
// matchPoly(home) = polyHome / (polyHome + polyAway). De blend per uitkomst:
// finalP = modelP × (1 − marketWeight) + marktP × marketWeight. De markt kent geen
// gelijkspel (marktDraw = 0), dus de gelijkspelkans krimpt evenredig met
// marketWeight; de som blijft 1 omdat mHome + mAway = 1. Zonder marktdata voor
// BEIDE teams een no-op (geen blending).
export function applyPolymarketFactor(
  probs: MatchProbs,
  homeTeam: string,
  awayTeam: string,
  polyOdds?: PolymarketOdds,
  marketWeight: number = weights.marketWeight
): MatchProbs {
  if (!polyOdds || marketWeight <= 0) return probs
  const polyHome = polyOdds[homeTeam]
  const polyAway = polyOdds[awayTeam]
  if (polyHome === undefined || polyAway === undefined || polyHome <= 0 || polyAway <= 0) return probs

  const mHome = polyHome / (polyHome + polyAway)
  const mAway = polyAway / (polyHome + polyAway)
  return {
    pA: probs.pA * (1 - marketWeight) + mHome * marketWeight,
    dr: probs.dr * (1 - marketWeight),
    pB: probs.pB * (1 - marketWeight) + mAway * marketWeight,
  }
}

// Drop-in vervanging van klement.ts's matchP: zelfde signatuur, nA/nB zijn
// Engelse teamnamen uit lib/teams.json. Past Elo-weging, de altitude/travel/
// experience/rustdagen-factoren, de blessure-status van sterspelers en (als
// polyOdds is meegegeven) de Polymarket-marktblend toe op de basisberekening.
// venue, restDays en polyOdds zijn optioneel — zonder die data zijn de
// betreffende factoren een no-op.
export function matchP(
  nA: string,
  nB: string,
  venue?: VenueInfo,
  restDays?: RestDays,
  polyOdds?: PolymarketOdds,
  eloOverride?: EloMap
): MatchProbs {
  let probs = matchPElo(nA, nB, eloOverride)
  probs = applyAltitudeFactor(probs, nA, nB, venue?.altitude ?? 0)
  probs = applyTravelFactor(probs, nA, nB, venue?.lat, venue?.lon)
  probs = applyExperienceFactor(probs, nA, nB)
  probs = applyFormFactor(probs, nA, nB)
  probs = applyLeagueFactor(probs, nA, nB)
  probs = applyRestDaysFactor(probs, nA, nB, restDays?.home, restDays?.away)
  const teamNlA = toTeamNl(nA) ?? ''
  const teamNlB = toTeamNl(nB) ?? ''
  probs = applyStarPlayerModifier(probs, teamNlA, teamNlB)
  return applyPolymarketFactor(probs, nA, nB, polyOdds)
}

// Live-preview voor de modelconfigurator: berekent matchP met expliciet
// meegegeven gewichten in plaats van de opgeslagen config. Past de
// gewichtsgevoelige factoren toe (basisscore, vorm, competitieniveau, sterspeler-
// blessures); venue-gebonden factoren (hoogte/reis) blijven buiten beschouwing
// omdat de preview een neutrale locatie aanneemt.
export function previewMatchP(nA: string, nB: string, w: ModelWeights): MatchProbs {
  let probs = matchPEloWith(nA, nB, w)
  probs = applyFormFactor(probs, nA, nB, w.formWeight)
  probs = applyLeagueFactor(probs, nA, nB, w.leagueWeight)
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
