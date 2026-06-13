// Type voor lib/wc26-schedule.json — alle 104 WK 2026-wedstrijden met exacte
// UTC-tijd, venue, stad en hoogte. Groepswedstrijden hebben teams; KO-wedstrijden
// hebben slots (de tegenstander is pas bekend na de groepsfase).
export type ScheduleRound = 'group' | 'r32' | 'r16' | 'qf' | 'sf' | '3rd' | 'final'

export interface ScheduledMatch {
  matchId: string        // "GRP-A1", "R32-M73", "R16-M89", "QF-M97", "SF-M101", "FINAL"
  round: ScheduleRound
  group?: string         // alleen groepsfase
  matchNum?: number      // FIFA-wedstrijdnummer (73–104 voor KO)
  dateUtc: string        // ISO 8601
  venue: string
  city: string
  country: string
  altitudeM: number
  homeTeam?: string      // alleen groepsfase (FIFA-spelling, zie WC26_NAME_MAP)
  awayTeam?: string      // alleen groepsfase
  homeSlot?: string      // alleen KO, bijv. "1A", "W73"
  awaySlot?: string      // alleen KO
}
