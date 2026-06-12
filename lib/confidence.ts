import { teamData, fG, fP, fT, fF } from './klement'
import { fE, latestElo, applyAltitudeFactor, applyTravelFactor, applyLeagueFactor } from './klement-custom'
import { getModelWeights, type ModelWeights } from './model-config'
import formCacheRaw from './form-cache.json'

// Onzekerheidsmarges rond de modelkans via Monte Carlo: de modelparameters worden
// N keer licht verstoord (gewichten ±10%, Elo σ=15, vormcijfer σ=1) en de spreiding
// van de uitkomstkansen geeft een 95%-betrouwbaarheidsinterval.

const formCache = formCacheRaw as Record<string, { formScore: number | null }>

type Probs = { pA: number; dr: number; pB: number }

interface Venue {
  altitude?: number
  lat?: number
  lon?: number
}

const FORM_SCORE_MAX = 30
const SIGMA = 0.28

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v))
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

function sigmoid(x: number) {
  return 1 / (1 + Math.exp(-x))
}

function logit(p: number) {
  return Math.log(p / (1 - p))
}

function shiftPA(probs: Probs, net: number): Probs {
  if (net === 0) return probs
  const { pA, dr, pB } = probs
  const pAadj = sigmoid(logit(pA) + net)
  const scale = (1 - pAadj) / (1 - pA)
  return { pA: pAadj, dr: dr * scale, pB: pB * scale }
}

// Standaard-normaal (Box-Muller met cache van het tweede sample)
let spare: number | null = null
function gauss(): number {
  if (spare !== null) { const s = spare; spare = null; return s }
  let u = 0, v = 0, s = 0
  do { u = Math.random() * 2 - 1; v = Math.random() * 2 - 1; s = u * u + v * v } while (s === 0 || s >= 1)
  const mul = Math.sqrt((-2 * Math.log(s)) / s)
  spare = v * mul
  return u * mul
}

// Teamscore met verstoorde Elo (eloNoise opgeteld bij de Elo-rating)
function perturbedScore(name: string, w: ModelWeights, eloNoise: number): number {
  const t = teamData(name)
  if (!t) return 0
  const elo = latestElo(name)
  const strength = elo !== undefined
    ? (1 - w.eloWeight) * fF(t.fifa) + w.eloWeight * fE(elo + eloNoise)
    : fF(t.fifa)
  return w.gdp * fG(t.gdp) + w.pop * fP(t.pop, t.latam) + w.temp * fT(t.temp) + w.fifa * strength + w.host * (t.host ? 1 : 0)
}

function form01(team: string, noise: number): number | undefined {
  const s = formCache[team]?.formScore
  if (s == null) return undefined
  return clamp((s + noise) / FORM_SCORE_MAX, 0, 1)
}

function perturbedMatchP(
  home: string, away: string, w: ModelWeights,
  eloNH: number, eloNA: number, formNH: number, formNA: number, venue?: Venue
): Probs {
  const sA = perturbedScore(home, w, eloNH)
  const sB = perturbedScore(away, w, eloNA)
  const z = (sA - sB) / SIGMA
  const dr = clamp(0.20 * (1 - 0.3 * Math.abs(z)), 0.05, 0.24)
  let probs: Probs = { pA: phi(z) * (1 - dr), dr, pB: (1 - phi(z)) * (1 - dr) }

  const fa = form01(home, formNH), fb = form01(away, formNA)
  if (fa !== undefined && fb !== undefined) {
    probs = shiftPA(probs, (w.formWeight * (fa - fb)) / SIGMA)
  }
  probs = applyLeagueFactor(probs, home, away, w.leagueWeight)
  probs = applyAltitudeFactor(probs, home, away, venue?.altitude ?? 0)
  probs = applyTravelFactor(probs, home, away, venue?.lat, venue?.lon)
  return probs
}

export interface Bounds {
  mean: number
  low95: number
  high95: number
}

export interface ConfidenceInterval {
  win: Bounds
  draw: Bounds
  loss: Bounds
}

function bounds(xs: number[]): Bounds {
  const sorted = [...xs].sort((a, b) => a - b)
  const mean = xs.reduce((s, x) => s + x, 0) / xs.length
  const lo = sorted[Math.floor(sorted.length * 0.025)]
  const hi = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.975))]
  return { mean, low95: lo, high95: hi }
}

// ±10% multiplicatieve verstoring (σ=0.05 → ~95% binnen ±10%), nooit negatief
function perturbWeight(base: number): number {
  return Math.max(0, base * (1 + gauss() * 0.05))
}

export function calcConfidenceInterval(home: string, away: string, venue?: Venue, n = 500): ConfidenceInterval {
  const base = getModelWeights()
  const wins: number[] = [], draws: number[] = [], losses: number[] = []

  for (let i = 0; i < n; i++) {
    const w: ModelWeights = {
      ...base,
      gdp: perturbWeight(base.gdp),
      pop: perturbWeight(base.pop),
      temp: perturbWeight(base.temp),
      fifa: perturbWeight(base.fifa),
      host: perturbWeight(base.host),
      eloWeight: clamp(base.eloWeight * (1 + gauss() * 0.05), 0, 1),
      formWeight: perturbWeight(base.formWeight),
      leagueWeight: perturbWeight(base.leagueWeight),
    }
    const p = perturbedMatchP(home, away, w, gauss() * 15, gauss() * 15, gauss() * 1, gauss() * 1, venue)
    wins.push(p.pA)
    draws.push(p.dr)
    losses.push(p.pB)
  }

  return { win: bounds(wins), draw: bounds(draws), loss: bounds(losses) }
}
