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
