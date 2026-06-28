export interface TeamData {
  gdp: number
  pop: number
  temp: number
  fifa: number
  latam: boolean
  host: boolean
  flag: string
  conf: string
}

export type WDL = 'A' | 'D' | 'B'

export interface MatchResult {
  teamA: string
  teamB: string
  result: WDL
}

export interface SimResult {
  winner: string
  pen: boolean
}

export interface Standing {
  team: string
  pts: number
  w: number
  d: number
  l: number
}

export interface KnockoutMatch {
  teamA: string
  teamB: string
  k: string
}

export interface Scoreline {
  a: number
  b: number
  p: number
}

export interface ScorePrediction {
  lambdaA: number
  lambdaB: number
  likely: Scoreline
  topScorelines: Scoreline[]
  pHome: number
  pDraw: number
  pAway: number
  btts: number
  over25: number
}

export interface ModelComponent {
  key: string
  label: string
  beta: number
  importancePct: number
  mean: number
  std: number
}

export interface ScorerProjection {
  player: string
  team: string
  recentGoals: number
  recentTeamMatches: number
  ratePerMatch: number
  expTeamMatches: number
  projGoals: number
}
