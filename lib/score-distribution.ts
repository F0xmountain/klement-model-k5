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
