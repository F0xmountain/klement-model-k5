export type PlayerStatus = 'fit' | 'doubtful' | 'out'

export interface StarPlayer {
  rank: number
  name: string
  status: string
}

export interface SquadPlayer {
  name: string
  club: string | null
  category: string
}

export interface SquadTeam {
  name_en: string
  captain: string
  star_players: StarPlayer[]
  squad: SquadPlayer[]
}
