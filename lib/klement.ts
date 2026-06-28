import teamsRaw from './teams.json'
import weightsRaw from './model/weights.json'
import ratingsRaw from './model/ratings.json'
import type {
  TeamData,
  WDL,
  SimResult,
  Standing,
  MatchResult,
  ScorePrediction,
  Scoreline,
  ModelComponent,
} from '../types'

const td = teamsRaw as Record<string, TeamData>
const ratings = ratingsRaw.ratings as Record<string, number>

interface Weights {
  generatedAt: string
  source: string
  components: ModelComponent[]
  homeAdv: number
  draw: { max: number; decay: number }
  poisson: { mu: number; gamma: number; homeBonus: number; maxGoals: number }
  standardizer: Record<string, { mean: number; std: number }>
}

const W = weightsRaw as Weights
const FACTOR_KEYS = ['gdp', 'pop', 'temp', 'fifa', 'elo'] as const
const beta: Record<string, number> = Object.fromEntries(W.components.map((c) => [c.key, c.beta]))

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v))
}

function fG(gdp: number): number {
  return clamp(1 - ((gdp - 35) / 35) ** 2, 0, 1)
}

function fP(pop: number, latam: boolean): number {
  return clamp((Math.log(pop) / Math.log(200)) * (latam ? 1 : 0.3), 0, 1)
}

function fT(temp: number): number {
  return clamp(1 - Math.abs(temp - 14) / 22, 0, 1)
}

function fF(fifa: number): number {
  return clamp((fifa - 1400) / 600, 0, 1)
}

function rawFactors(t: TeamData, elo: number): Record<string, number> {
  return { gdp: fG(t.gdp), pop: fP(t.pop, t.latam), temp: fT(t.temp), fifa: fF(t.fifa), elo }
}

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x))
}

export function sc(name: string): number {
  const t = td[name]
  if (!t) return 0
  const raw = rawFactors(t, ratings[name] ?? 1500)
  let s = 0
  for (const key of FACTOR_KEYS) {
    const st = W.standardizer[key]
    s += beta[key] * ((raw[key] - st.mean) / st.std)
  }
  return s + (t.host ? W.homeAdv : 0)
}

export function matchP(nA: string, nB: string): { pA: number; dr: number; pB: number } {
  const eta = sc(nA) - sc(nB)
  const dr = clamp(W.draw.max * Math.exp(-W.draw.decay * Math.abs(eta)), 0.05, 0.34)
  const pA = sigmoid(eta) * (1 - dr)
  const pB = (1 - sigmoid(eta)) * (1 - dr)
  return { pA, dr, pB }
}

function poissonPmf(lambda: number, k: number): number {
  let fact = 1
  for (let i = 2; i <= k; i++) fact *= i
  return (Math.exp(-lambda) * lambda ** k) / fact
}

export function expectedGoals(nA: string, nB: string): { lambdaA: number; lambdaB: number } {
  const delta = sc(nA) - sc(nB)
  return {
    lambdaA: Math.exp(W.poisson.mu + W.poisson.gamma * delta),
    lambdaB: Math.exp(W.poisson.mu - W.poisson.gamma * delta),
  }
}

export function predictScore(nA: string, nB: string): ScorePrediction {
  const { lambdaA, lambdaB } = expectedGoals(nA, nB)
  const max = W.poisson.maxGoals
  const cells: Scoreline[] = []
  let pHome = 0
  let pDraw = 0
  let pAway = 0
  let btts = 0
  let over25 = 0
  for (let a = 0; a <= max; a++) {
    for (let b = 0; b <= max; b++) {
      const p = poissonPmf(lambdaA, a) * poissonPmf(lambdaB, b)
      cells.push({ a, b, p })
      if (a > b) pHome += p
      else if (a < b) pAway += p
      else pDraw += p
      if (a > 0 && b > 0) btts += p
      if (a + b > 2.5) over25 += p
    }
  }
  cells.sort((x, y) => y.p - x.p)
  return {
    lambdaA,
    lambdaB,
    likely: cells[0],
    topScorelines: cells.slice(0, 6),
    pHome,
    pDraw,
    pAway,
    btts,
    over25,
  }
}

export function scoreMatrix(nA: string, nB: string, size = 6): number[][] {
  const { lambdaA, lambdaB } = expectedGoals(nA, nB)
  const grid: number[][] = []
  for (let a = 0; a < size; a++) {
    const row: number[] = []
    for (let b = 0; b < size; b++) row.push(poissonPmf(lambdaA, a) * poissonPmf(lambdaB, b))
    grid.push(row)
  }
  return grid
}

export function simResult(nA: string, nB: string): WDL {
  const { pA, dr } = matchP(nA, nB)
  const r = Math.random()
  if (r < pA) return 'A'
  if (r < pA + dr) return 'D'
  return 'B'
}

export function simKO(nA: string, nB: string): SimResult {
  const result = simResult(nA, nB)
  if (result !== 'D') return { winner: result === 'A' ? nA : nB, pen: false }
  const winner = Math.random() < sigmoid(sc(nA) - sc(nB)) ? nA : nB
  return { winner, pen: true }
}

export function calcStandings(teams: string[], results: MatchResult[]): Standing[] {
  const map: Record<string, Standing> = {}
  for (const t of teams) map[t] = { team: t, pts: 0, w: 0, d: 0, l: 0 }

  for (const { teamA, teamB, result } of results) {
    if (result === 'A') {
      map[teamA].pts += 3; map[teamA].w++; map[teamB].l++
    } else if (result === 'B') {
      map[teamB].pts += 3; map[teamB].w++; map[teamA].l++
    } else {
      map[teamA].pts += 1; map[teamA].d++
      map[teamB].pts += 1; map[teamB].d++
    }
  }

  return Object.values(map).sort((a, b) =>
    b.pts !== a.pts ? b.pts - a.pts : b.w - a.w
  )
}

export function teamNames(): string[] {
  return Object.keys(td)
}

export function teamData(name: string): TeamData | undefined {
  return td[name]
}

export function teamElo(name: string): number {
  return ratings[name] ?? 1500
}

const allScores = Object.keys(td).map((n) => sc(n))
const scMin = Math.min(...allScores)
const scMax = Math.max(...allScores)

// 0..100 composite strength, scaled across the field. Monotonic with sc, so it
// matches the model ranking while being readable (sc itself is a z-score sum).
export function strengthIndex(name: string): number {
  if (!td[name]) return 0
  return Math.round((100 * (sc(name) - scMin)) / (scMax - scMin))
}

export interface FactorView {
  key: string
  label: string
  value: number
  importancePct: number
}

// Per-team normalized factor values (0..1) paired with the fitted importance of
// each factor, for the team breakdown UI. Single source: weights.json.
export function teamFactors(name: string): FactorView[] {
  const t = td[name]
  if (!t) return []
  const value: Record<string, number> = {
    gdp: fG(t.gdp),
    pop: fP(t.pop, t.latam),
    temp: fT(t.temp),
    fifa: fF(t.fifa),
    elo: clamp(((ratings[name] ?? 1500) - 1300) / 800, 0, 1),
    host: t.host ? 1 : 0,
  }
  return W.components.map((c) => ({
    key: c.key,
    label: c.label,
    value: value[c.key] ?? 0,
    importancePct: c.importancePct,
  }))
}

export function modelComponents(): ModelComponent[] {
  return W.components
}

export function modelMeta(): { generatedAt: string; source: string; draw: Weights['draw']; poisson: Weights['poisson'] } {
  return { generatedAt: W.generatedAt, source: W.source, draw: W.draw, poisson: W.poisson }
}
