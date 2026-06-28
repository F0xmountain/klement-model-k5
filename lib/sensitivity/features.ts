import type { Match, WorldBankLookup } from './sources'
import type { Sample, SideFactors, Label } from './types'
import nationsData from '../model/wc-nations.json'

interface Nation {
  iso3: string
  latam: boolean
  temp: number
  conf: string
  continent: string
  gdp?: number
  pop?: number
}

interface Venue {
  continent: string
}

const NATIONS = nationsData.nations as Record<string, Nation>
const HOSTS = nationsData.hosts as Record<string, string[]>
const VENUES = nationsData.venues as Record<string, Venue>

const ELO_INIT = 1500
const HFA = 65
const FIRST_WC = 1994
const LAST_WC = 2026
const FORM_WINDOW_MS = 365 * 24 * 60 * 60 * 1000
const REST_CAP_DAYS = 14
const GOALS_FORM_WINDOW = 10
const GLOBAL_MEAN_TEMP = 14

function clamp(value: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, value))
}

function fG(gdpK: number): number {
  return clamp(1 - ((gdpK - 35) / 35) ** 2, 0, 1)
}

function fP(popM: number): number {
  return clamp(Math.log(popM) / Math.log(200), 0, 1)
}

function tournamentWeight(tournament: string): number {
  const name = tournament.toLowerCase()
  if (name === 'fifa world cup') return 60
  if (name.includes('confederations')) return 45
  if (isContinentalCup(name)) return 40
  if (name.includes('qualification') || name.includes('nations league')) return 25
  if (name.includes('friendly')) return 10
  return 20
}

function isContinentalCup(name: string): boolean {
  return (
    name.includes('uefa euro') ||
    name.includes('copa américa') ||
    name.includes('copa america') ||
    name.includes('african cup') ||
    name.includes('africa cup') ||
    name.includes('asian cup') ||
    name.includes('gold cup') ||
    name.includes('oceania nations')
  )
}

interface FormSnapshot {
  time: number
  elo: number
}

interface GoalRecord {
  scored: number
  conceded: number
}

// Mutable per-team accumulator advanced in date order. All feature reads happen
// against this state BEFORE the current match is applied, so there is no lookahead.
class TeamState {
  elo = ELO_INIT
  lastMatchTime: number | null = null
  private readonly snapshots: FormSnapshot[] = []
  private readonly goals: GoalRecord[] = []

  formAt(asOfTime: number): number {
    const cutoff = asOfTime - FORM_WINDOW_MS
    const past = this.latestSnapshotElo(cutoff)
    return past === null ? 0 : this.elo - past
  }

  restFactor(matchTime: number): number {
    if (this.lastMatchTime === null) return 0
    const days = (matchTime - this.lastMatchTime) / (24 * 60 * 60 * 1000)
    return clamp(days / REST_CAP_DAYS, 0, 1)
  }

  goalsForm(): number {
    if (this.goals.length === 0) return 0
    const total = this.goals.reduce((sum, g) => sum + (g.scored - g.conceded), 0)
    return total / this.goals.length
  }

  apply(scored: number, conceded: number, deltaElo: number, matchTime: number): void {
    this.elo += deltaElo
    this.lastMatchTime = matchTime
    this.snapshots.push({ time: matchTime, elo: this.elo })
    this.recordGoals(scored, conceded)
  }

  private latestSnapshotElo(cutoff: number): number | null {
    let best: number | null = null
    for (const snap of this.snapshots) {
      if (snap.time <= cutoff) best = snap.elo
    }
    return best
  }

  private recordGoals(scored: number, conceded: number): void {
    this.goals.push({ scored, conceded })
    if (this.goals.length > GOALS_FORM_WINDOW) this.goals.shift()
  }
}

function getState(states: Map<string, TeamState>, team: string): TeamState {
  const existing = states.get(team)
  if (existing) return existing
  const created = new TeamState()
  states.set(team, created)
  return created
}

function eloDelta(rh: number, ra: number, m: Match): number {
  const adjusted = rh - ra + (m.neutral ? 0 : HFA)
  const eHome = 1 / (1 + 10 ** (-adjusted / 400))
  const sHome = m.hs > m.as ? 1 : m.hs < m.as ? 0 : 0.5
  const gd = Math.abs(m.hs - m.as)
  const goalMult = gd <= 1 ? 1 : gd === 2 ? 1.5 : (11 + gd) / 8
  return tournamentWeight(m.tournament) * goalMult * (sHome - eHome)
}

function confedMeanElo(eloSnapshot: Map<string, number>, conf: string): number {
  const values: number[] = []
  for (const [name, nation] of Object.entries(NATIONS)) {
    if (nation.conf !== conf) continue
    values.push(eloSnapshot.get(name) ?? ELO_INIT)
  }
  if (values.length === 0) return ELO_INIT
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

function venueTemp(country: string, year: number): number {
  const venueNation = NATIONS[country]
  if (venueNation) return venueNation.temp
  return hostTemp(year)
}

// Co-hosted World Cups list several host nations; their mean temperature stands in
// when the results.csv venue country is absent from the pool. The 14C fallback is
// the rough global land-surface mean used when even the host list is empty.
function hostTemp(year: number): number {
  const hosts = HOSTS[String(year)] ?? []
  const temps = hosts.map((h) => NATIONS[h]?.temp).filter((t): t is number => t !== undefined)
  if (temps.length === 0) return GLOBAL_MEAN_TEMP
  return temps.reduce((sum, t) => sum + t, 0) / temps.length
}

function continentOfVenue(country: string): string {
  const venue = VENUES[country]
  if (venue) return venue.continent
  return NATIONS[country]?.continent ?? ''
}

function climateGap(name: string, country: string, year: number): number {
  const home = NATIONS[name].temp
  const venue = venueTemp(country, year)
  return 1 - clamp(Math.abs(home - venue) / 22, 0, 1)
}

function sideFactors(
  name: string,
  state: TeamState,
  m: Match,
  year: number,
  eloSnapshot: Map<string, number>,
  wb: WorldBankLookup,
): SideFactors {
  const nation = NATIONS[name]
  const matchTime = matchTimeOf(m)
  return {
    elo: state.elo,
    form: state.formAt(matchTime),
    gdp: fG(wb.gdpK(nation.iso3, year) ?? nation.gdp ?? 5),
    pop: fP(wb.popM(nation.iso3, year) ?? nation.pop ?? 10),
    confed: confedMeanElo(eloSnapshot, nation.conf),
    climateGap: climateGap(name, m.country, year),
    host: (HOSTS[String(year)] ?? []).includes(name) ? 1 : 0,
    continental: nation.continent === continentOfVenue(m.country) ? 1 : 0,
    rest: state.restFactor(matchTime),
    goalsForm: state.goalsForm(),
  }
}

function matchTimeOf(m: Match): number {
  return Date.parse(m.date)
}

function labelOf(m: Match): Label {
  return m.hs > m.as ? 'A' : m.hs < m.as ? 'B' : 'D'
}

function isWorldCupSample(m: Match, year: number): boolean {
  if (m.tournament !== 'FIFA World Cup') return false
  if (year < FIRST_WC || year > LAST_WC) return false
  return Boolean(NATIONS[m.home]) && Boolean(NATIONS[m.away])
}

function sampleFor(
  m: Match,
  year: number,
  home: TeamState,
  away: TeamState,
  eloSnapshot: Map<string, number>,
  wb: WorldBankLookup,
): Sample {
  return {
    year,
    home: m.home,
    away: m.away,
    homeRaw: sideFactors(m.home, home, m, year, eloSnapshot, wb),
    awayRaw: sideFactors(m.away, away, m, year, eloSnapshot, wb),
    label: labelOf(m),
  }
}

function advance(m: Match, home: TeamState, away: TeamState): void {
  const delta = eloDelta(home.elo, away.elo, m)
  const matchTime = matchTimeOf(m)
  home.apply(m.hs, m.as, delta, matchTime)
  away.apply(m.as, m.hs, -delta, matchTime)
}

function sortByDate(matches: Match[]): Match[] {
  return matches.slice().sort((a, b) => (a.date < b.date ? -1 : 1))
}

function snapshotElo(states: Map<string, TeamState>): Map<string, number> {
  const snapshot = new Map<string, number>()
  for (const [name, state] of states) snapshot.set(name, state.elo)
  return snapshot
}

// Single chronological pass over every international result. Elo, form, rest and
// goalsForm accumulate from all games; a Sample is recorded only for World Cup
// matches with both teams in the pool, read BEFORE the match updates state.
//
// confed is a confederation-wide aggregate over the shared Elo table, so reading
// it live would let a same-date peer that sorts earlier leak its post-match Elo
// into a simultaneous match. eloSnapshot freezes the table at each day boundary
// (end of the previous date), making confed strictly point-in-time; the other
// nine features read each team's own pre-match state, which advance() updates
// only after the read, so they are already clean.
export function buildSamples(matches: Match[], wb: WorldBankLookup): Sample[] {
  const states = new Map<string, TeamState>()
  const samples: Sample[] = []
  let currentDate: string | null = null
  let eloSnapshot = new Map<string, number>()
  for (const m of sortByDate(matches)) {
    if (m.date !== currentDate) {
      eloSnapshot = snapshotElo(states)
      currentDate = m.date
    }
    const home = getState(states, m.home)
    const away = getState(states, m.away)
    const year = Number(m.date.slice(0, 4))
    if (isWorldCupSample(m, year)) samples.push(sampleFor(m, year, home, away, eloSnapshot, wb))
    advance(m, home, away)
  }
  return samples
}
