import { teamData, fG, fP, fT, fF } from './klement'
import {
  sc, fE, latestElo,
  applyAltitudeFactor, applyTravelFactor, applyExperienceFactor,
  applyFormFactor, applyLeagueFactor, applyPolymarketFactor, leagueIndex,
  type PolymarketOdds,
} from './klement-custom'
import { applyStarPlayerModifier, toTeamNl, getStarPlayerSummary } from './squad-modifier'
import { getWcEditions, getHomeAltitude } from './squad-data'
import { getModelWeights } from './model-config'
import formCacheRaw from './form-cache.json'

// Volledige, stap-voor-stap doorrekening van één wedstrijd voor /admin/model-explain.
// Reconstrueert exact wat matchP intern doet, met alle tussenwaarden zichtbaar.

const formCache = formCacheRaw as Record<string, { formScore: number | null }>
const SIGMA = 0.28

type Probs = { pA: number; dr: number; pB: number }
interface Venue { altitude?: number; lat?: number; lon?: number }

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)) }
function erf(x: number): number {
  const t = 1 / (1 + 0.3275911 * Math.abs(x))
  const p = t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))))
  const r = 1 - p * Math.exp(-x * x)
  return x >= 0 ? r : -r
}
function phi(x: number) { return 0.5 * (1 + erf(x / Math.sqrt(2))) }

export interface TeamFactor {
  key: string
  raw: string
  norm: number
  contrib: number
}
export interface ExplainTeam {
  factors: TeamFactor[]
  score: number
}
export interface ModifierStep {
  key: string
  label: string
  deltaA: number // procentpunt-verschuiving in pA
  note: string
}
export interface ExplainResult {
  weights: { fifa: number; elo: number; gdp: number; pop: number; temp: number; host: number }
  teamA: ExplainTeam
  teamB: ExplainTeam
  z: number
  phiZ: number
  baseDr: number
  basePA: number
  basePB: number
  modifiers: ModifierStep[]
  finalPA: number
  finalDr: number
  finalPB: number
  poly?: { modelPA: number; marketPA: number; marketWeight: number; combinedPA: number }
}

function teamFactors(name: string): ExplainTeam {
  const w = getModelWeights()
  const t = teamData(name)
  const elo = latestElo(name)
  const hasElo = elo !== undefined

  const fifaW = w.fifa * (hasElo ? 1 - w.eloWeight : 1)
  const eloW = hasElo ? w.fifa * w.eloWeight : 0
  const fifaNorm = t ? fF(t.fifa) : 0
  const eloNorm = hasElo ? fE(elo) : 0
  const gdpNorm = t ? fG(t.gdp) : 0
  const popNorm = t ? fP(t.pop, t.latam) : 0
  const tempNorm = t ? fT(t.temp) : 0
  const hostNorm = t?.host ? 1 : 0

  const factors: TeamFactor[] = [
    { key: 'fifa', raw: `${t?.fifa ?? '—'} pts`, norm: fifaNorm, contrib: fifaW * fifaNorm },
    { key: 'elo', raw: hasElo ? `${Math.round(elo)}` : 'n/a', norm: eloNorm, contrib: eloW * eloNorm },
    { key: 'gdp', raw: `$${t?.gdp ?? '—'}k`, norm: gdpNorm, contrib: w.gdp * gdpNorm },
    { key: 'pop', raw: `${t?.pop ?? '—'}M`, norm: popNorm, contrib: w.pop * popNorm },
    { key: 'temp', raw: `${t?.temp ?? '—'}°C`, norm: tempNorm, contrib: w.temp * tempNorm },
    { key: 'host', raw: t?.host ? 'Yes' : 'No', norm: hostNorm, contrib: w.host * hostNorm },
  ]
  return { factors, score: sc(name) }
}

export function explainMatch(
  teamA: string,
  teamB: string,
  venue?: Venue,
  polyOdds?: PolymarketOdds
): ExplainResult {
  const w = getModelWeights()

  const A = teamFactors(teamA)
  const B = teamFactors(teamB)

  // Stap 2 — scoreverschil → basiskansen (zoals matchPElo)
  const z = (A.score - B.score) / SIGMA
  const phiZ = phi(z)
  const baseDr = clamp(0.20 * (1 - 0.3 * Math.abs(z)), 0.05, 0.24)
  const base: Probs = { pA: phiZ * (1 - baseDr), dr: baseDr, pB: (1 - phiZ) * (1 - baseDr) }

  // Stap 3 — uitbreidingsfactoren, elk als delta op pA (zelfde volgorde als matchP)
  const nlA = toTeamNl(teamA) ?? ''
  const nlB = toTeamNl(teamB) ?? ''
  const formA = formCache[teamA]?.formScore
  const formB = formCache[teamB]?.formScore
  const idxA = leagueIndex(teamA)
  const idxB = leagueIndex(teamB)
  const starsInjured = getStarPlayerSummary(nlA).length + getStarPlayerSummary(nlB).length > 0

  let probs = base
  const modifiers: ModifierStep[] = []
  const step = (key: string, label: string, fn: (p: Probs) => Probs, note: string) => {
    const before = probs.pA
    probs = fn(probs)
    modifiers.push({ key, label, deltaA: (probs.pA - before) * 100, note })
  }

  step('altitude', 'Altitude', p => applyAltitudeFactor(p, teamA, teamB, venue?.altitude ?? 0),
    `venue ${venue?.altitude ?? 0}m · home ${getHomeAltitude(teamA) ?? '?'}m / ${getHomeAltitude(teamB) ?? '?'}m`)
  step('travel', 'Travel', p => applyTravelFactor(p, teamA, teamB, venue?.lat, venue?.lon),
    venue?.lat !== undefined ? 'distance vs 8,000km threshold' : 'no venue → no travel effect')
  step('experience', 'WC experience', p => applyExperienceFactor(p, teamA, teamB),
    `${getWcEditions(teamA) ?? 0} vs ${getWcEditions(teamB) ?? 0} editions`)
  step('form', 'Recent form', p => applyFormFactor(p, teamA, teamB),
    formA != null && formB != null ? `${formA}/30 vs ${formB}/30` : 'no form data')
  step('league', 'League quality', p => applyLeagueFactor(p, teamA, teamB),
    idxA !== undefined && idxB !== undefined ? `${Math.round(idxA * 26)}/26 vs ${Math.round(idxB * 26)}/26 in top-5` : 'no league data')
  step('star', 'Star players', p => applyStarPlayerModifier(p, nlA, nlB),
    starsInjured ? 'injuries weighted in' : 'all fit → no adjustment')

  const finalPA = probs.pA
  const finalDr = probs.dr
  const finalPB = probs.pB

  // Stap 5 — Polymarket-blend (indien beschikbaar voor beide teams)
  let poly: ExplainResult['poly']
  const polyHome = polyOdds?.[teamA]
  const polyAway = polyOdds?.[teamB]
  if (polyHome && polyAway && polyHome > 0 && polyAway > 0) {
    const combined = applyPolymarketFactor(probs, teamA, teamB, polyOdds, w.marketWeight)
    poly = {
      modelPA: finalPA,
      marketPA: polyHome / (polyHome + polyAway),
      marketWeight: w.marketWeight,
      combinedPA: combined.pA,
    }
  }

  return {
    weights: {
      fifa: w.fifa * (1 - w.eloWeight),
      elo: w.fifa * w.eloWeight,
      gdp: w.gdp, pop: w.pop, temp: w.temp, host: w.host,
    },
    teamA: A,
    teamB: B,
    z, phiZ, baseDr,
    basePA: base.pA,
    basePB: base.pB,
    modifiers,
    finalPA, finalDr, finalPB,
    poly,
  }
}
