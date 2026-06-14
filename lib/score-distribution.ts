// Bivariate Poisson score-kansverdeling (Karlis-Ntzoufras 2003).
//
// LET OP: het Klement-model blijft W/D/L-only. Deze module verandert het model
// NIET — ze leidt puur ter illustratie een scoreverdeling af uit de verwachte
// goals (die zelf uit de winkans volgen). De uitkomst voedt niets terug het model
// in; het is een afgeleide weergave, op expliciet verzoek toegevoegd.
//
// Het bivariate Poisson model (Karlis & Ntzoufras, JRSS Series D, 2003) modelleert
// twee gecorreleerde doelpunt-tellingen X (team A) en Y (team B) als:
//   X = X1 + X3,  Y = Y2 + X3
// met X1~Poisson(λ1), Y2~Poisson(λ2), X3~Poisson(λ3) onafhankelijk. λ3 voegt een
// positieve correlatie toe (Cov(X,Y) = λ3), wat empirisch past bij interlands
// (Dixon & Coles 1997, Karlis-Ntzoufras 2003: λ3 ≈ 0.10–0.13).

function fact(n: number): number {
  let f = 1
  for (let i = 2; i <= n; i++) f *= i
  return f
}

// matrix[i][j] = P(team A scoort i, team B scoort j)
export type ScoreMatrix = number[][]

// Gezamenlijke kansmassa van de bivariate Poisson over [0..maxGoals]².
// De marginals zijn E[X]=λ1+λ3=lambdaA en E[Y]=λ2+λ3=lambdaB, dus λ1=lambdaA−λ3
// en λ2=lambdaB−λ3 (geclampt op ≥0.01 zodat ze nooit negatief worden). maxGoals=7
// dekt >99.5% van de massa voor lambda < 4.
export function bivariatePoisson(
  lambdaA: number,
  lambdaB: number,
  lambda3 = 0.11,
  maxGoals = 7,
): ScoreMatrix {
  const l1 = Math.max(0.01, lambdaA - lambda3)
  const l2 = Math.max(0.01, lambdaB - lambda3)
  const base = Math.exp(-(l1 + l2 + lambda3))
  const matrix: ScoreMatrix = []
  for (let x = 0; x <= maxGoals; x++) {
    matrix[x] = []
    for (let y = 0; y <= maxGoals; y++) {
      let sum = 0
      const kmax = Math.min(x, y)
      for (let k = 0; k <= kmax; k++) {
        sum += (l1 ** (x - k) / fact(x - k)) * (l2 ** (y - k) / fact(y - k)) * (lambda3 ** k / fact(k))
      }
      matrix[x]![y] = base * sum
    }
  }
  return matrix
}

export interface TopScore {
  homeGoals: number
  awayGoals: number
  probability: number
}

// De n meest waarschijnlijke exacte uitslagen uit een scorematrix, aflopend op kans.
export function topScoresFromMatrix(matrix: ScoreMatrix, n: number): TopScore[] {
  const scores: TopScore[] = []
  for (let i = 0; i < matrix.length; i++) {
    const row = matrix[i]!
    for (let j = 0; j < row.length; j++) {
      scores.push({ homeGoals: i, awayGoals: j, probability: row[j]! })
    }
  }
  scores.sort((a, b) => b.probability - a.probability)
  return scores.slice(0, n)
}

// P(totaal > line) en P(totaal < line), genormaliseerd zodat ze samen 1.00 zijn
// (gebruik een halve lijn zoals 2.5 zodat er geen gelijkspel-massa op de lijn valt).
export function overUnder(matrix: ScoreMatrix, line: number): { over: number; under: number } {
  let over = 0
  let under = 0
  let total = 0
  for (let i = 0; i < matrix.length; i++) {
    const row = matrix[i]!
    for (let j = 0; j < row.length; j++) {
      const p = row[j]!
      total += p
      if (i + j > line) over += p
      else if (i + j < line) under += p
    }
  }
  return { over: over / total, under: under / total }
}

// P(beide teams scoren) = P(A≥1 en B≥1), genormaliseerd op de totale massa.
export function btts(matrix: ScoreMatrix): number {
  let p = 0
  let total = 0
  for (let i = 0; i < matrix.length; i++) {
    const row = matrix[i]!
    for (let j = 0; j < row.length; j++) {
      total += row[j]!
      if (i >= 1 && j >= 1) p += row[j]!
    }
  }
  return p / total
}

// W/D/L-marginalen uit de scorematrix, genormaliseerd zodat ze exact 1.00 zijn.
export function winDrawLoss(matrix: ScoreMatrix): { pWin: number; pDraw: number; pLoss: number } {
  let w = 0
  let d = 0
  let l = 0
  let total = 0
  for (let i = 0; i < matrix.length; i++) {
    const row = matrix[i]!
    for (let j = 0; j < row.length; j++) {
      const p = row[j]!
      total += p
      if (i > j) w += p
      else if (i === j) d += p
      else l += p
    }
  }
  return { pWin: w / total, pDraw: d / total, pLoss: l / total }
}

export interface ScoreProb {
  a: number
  b: number
  prob: number
}

export interface ScoreDistribution {
  scores: ScoreProb[] // top 10 meest waarschijnlijke uitslagen
  homeWin: number // Σ P(a>b)  — sanity check t.o.v. matchP
  draw: number // Σ P(a=b)
  awayWin: number // Σ P(a<b)
}

// lambdaA/lambdaB = verwachte goals per team (uit de expectedGoals-formule in
// /versus: 1.35 × (0.5 + (p − 0.5) × 0.8)). Bouwt de bivariate scorematrix en geeft
// de top 10 plus de W/D/L-marginalen.
export function calcScoreDistribution(lambdaA: number, lambdaB: number, maxGoals = 6, lambda3 = 0.11): ScoreDistribution {
  const matrix = bivariatePoisson(lambdaA, lambdaB, lambda3, maxGoals)
  const all: ScoreProb[] = []
  let homeWin = 0
  let draw = 0
  let awayWin = 0
  for (let a = 0; a <= maxGoals; a++) {
    for (let b = 0; b <= maxGoals; b++) {
      const prob = matrix[a]![b]!
      all.push({ a, b, prob })
      if (a > b) homeWin += prob
      else if (a === b) draw += prob
      else awayWin += prob
    }
  }

  all.sort((x, y) => y.prob - x.prob)
  return { scores: all.slice(0, 10), homeWin, draw, awayWin }
}

// ── Top-scores rechtstreeks uit de W/D/L-winkansen ───────────────────────────
// Alternatieve ingang die de verwachte goals uit de winkans afleidt (i.p.v. de
// /versus-expectedGoals): λ = BASE_GOALS × (1 + STRENGTH_FACTOR × (p − 1/3)).
// Gebruikt door de groepspagina en de schema-tab.
const BASE_GOALS = 1.18
const STRENGTH_FACTOR = 1.2
const MAX_GOALS = 5

function lambdaFromProb(teamProb: number): number {
  return Math.max(0.05, BASE_GOALS * (1 + STRENGTH_FACTOR * (teamProb - 1 / 3)))
}

// Top-n meest waarschijnlijke uitslagen voor team A (pWin) tegen team B (pLoss),
// over het rooster 0..5 × 0..5. Aflopend op kans. De getoonde kansen tellen niet
// tot 1.00 (afgekapt bij 5-5) — de UI toont het restant als "overige".
export function topScores(pWin: number, pLoss: number, n = 5): TopScore[] {
  const matrix = bivariatePoisson(lambdaFromProb(pWin), lambdaFromProb(pLoss), 0.11, MAX_GOALS)
  return topScoresFromMatrix(matrix, n)
}
