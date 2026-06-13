// Poisson score-kansverdeling.
//
// LET OP: het Klement-model blijft W/D/L-only. Deze module verandert het model
// NIET — ze leidt puur ter illustratie een scoreverdeling af uit de verwachte
// goals (die zelf uit de winkans volgen). De uitkomst voedt niets terug het model
// in; het is een afgeleide weergave, op expliciet verzoek toegevoegd.

function poisson(k: number, lambda: number): number {
  // P(k goals) = (λ^k · e^-λ) / k!
  let factorial = 1
  for (let i = 2; i <= k; i++) factorial *= i
  return (lambda ** k * Math.exp(-lambda)) / factorial
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
// /versus: 1.35 × (0.5 + (p − 0.5) × 0.8)). Berekent P(a-b) voor alle combinaties
// 0-0 t/m maxGoals-maxGoals en geeft de top 10 plus de W/D/L-marginalen.
export function calcScoreDistribution(lambdaA: number, lambdaB: number, maxGoals = 6): ScoreDistribution {
  const pa: number[] = []
  const pb: number[] = []
  for (let k = 0; k <= maxGoals; k++) {
    pa[k] = poisson(k, lambdaA)
    pb[k] = poisson(k, lambdaB)
  }

  const all: ScoreProb[] = []
  let homeWin = 0
  let draw = 0
  let awayWin = 0
  for (let a = 0; a <= maxGoals; a++) {
    for (let b = 0; b <= maxGoals; b++) {
      const prob = pa[a]! * pb[b]!
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

export interface TopScore {
  homeGoals: number
  awayGoals: number
  probability: number
}

// Top-n meest waarschijnlijke uitslagen voor team A (pWin) tegen team B (pLoss),
// over het rooster 0..5 × 0..5. Aflopend op kans. De getoonde kansen tellen niet
// tot 1.00 (afgekapt bij 5-5) — de UI toont het restant als "overige".
export function topScores(pWin: number, pLoss: number, n = 5): TopScore[] {
  const lambdaA = lambdaFromProb(pWin)
  const lambdaB = lambdaFromProb(pLoss)
  const scores: TopScore[] = []
  for (let i = 0; i <= MAX_GOALS; i++) {
    for (let j = 0; j <= MAX_GOALS; j++) {
      scores.push({ homeGoals: i, awayGoals: j, probability: poisson(i, lambdaA) * poisson(j, lambdaB) })
    }
  }
  scores.sort((a, b) => b.probability - a.probability)
  return scores.slice(0, n)
}
