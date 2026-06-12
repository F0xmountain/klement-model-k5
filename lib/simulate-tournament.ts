import { GROUPS } from './fixtures'
import { matchP, sc } from './klement-custom'
import stadiumsRaw from './stadiums.json'

// Volledige toernooi-simulator: simuleert de groepsfase (12 groepen × 6
// wedstrijden) + de knockout (R32→finale) met het custom-model, N keer, en geeft
// per ronde de kans per team plus de meest waarschijnlijke bracket terug.
//
// Twee bewuste vereenvoudigingen (geen officiële FIFA-data beschikbaar):
//  1. R32-seeding: een vaste, cross-group bracket-template (zie SEED_TEMPLATE) i.p.v.
//     FIFA's resultaat-afhankelijke best-third-permutatietabel.
//  2. Speelstadion per groep: deterministisch toegewezen uit stadiums.json (er is
//     geen officiële wedstrijd→stadion-mapping in de data).

interface Stadium {
  city: string
  country: string
  stadium: string
  altitude_m: number
  coordinates: { lat: number; lon: number }
}
const stadiums = stadiumsRaw as Stadium[]

type Venue = { altitude: number; lat: number; lon: number }

const GROUP_LETTERS = Object.keys(GROUPS) // A..L

function groupVenue(groupIndex: number): Venue {
  const s = stadiums[groupIndex % stadiums.length]
  return { altitude: s.altitude_m, lat: s.coordinates.lat, lon: s.coordinates.lon }
}

// Eén groepswedstrijd → W/D/L volgens matchP (met venue)
function playMatch(a: string, b: string, venue: Venue): 'A' | 'D' | 'B' {
  const { pA, dr } = matchP(a, b, venue)
  const r = Math.random()
  if (r < pA) return 'A'
  if (r < pA + dr) return 'D'
  return 'B'
}

// Knockout-winnaar: gelijkspelkans weggenormaliseerd zodat er altijd één doorgaat
function koWinner(a: string, b: string): string {
  const { pA, pB } = matchP(a, b)
  return Math.random() < pA / (pA + pB) ? a : b
}

interface GroupStanding {
  team: string
  pts: number
  w: number
}

// Simuleert een groep (round-robin, 6 wedstrijden) → standen gesorteerd op punten,
// dan overwinningen, dan modelsterkte (sc) als deterministische tiebreak (het model
// is W/D/L-only, dus geen doelsaldo beschikbaar).
function simGroup(teams: string[], venue: Venue): GroupStanding[] {
  const table: Record<string, GroupStanding> = {}
  for (const t of teams) table[t] = { team: t, pts: 0, w: 0 }

  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      const r = playMatch(teams[i], teams[j], venue)
      if (r === 'A') { table[teams[i]].pts += 3; table[teams[i]].w++ }
      else if (r === 'B') { table[teams[j]].pts += 3; table[teams[j]].w++ }
      else { table[teams[i]].pts += 1; table[teams[j]].pts += 1 }
    }
  }

  return Object.values(table).sort((a, b) =>
    b.pts !== a.pts ? b.pts - a.pts : b.w !== a.w ? b.w - a.w : sc(b.team) - sc(a.team)
  )
}

// R32-bracket-template: 16 wedstrijden over 12 groepswinnaars (W), 12 nummers-twee
// (R) en de 8 beste nummers-drie (T1..T8), zoveel mogelijk cross-group. Elke entry
// verwijst naar een positie in de winners/runners/thirds-arrays.
type Slot =
  | { kind: 'W'; group: number }
  | { kind: 'R'; group: number }
  | { kind: 'T'; idx: number }
const W = (g: number): Slot => ({ kind: 'W', group: g })
const R = (g: number): Slot => ({ kind: 'R', group: g })
const T = (i: number): Slot => ({ kind: 'T', idx: i })

const SEED_TEMPLATE: [Slot, Slot][] = [
  [W(0), T(0)], [W(1), T(1)], [W(2), T(2)], [W(3), T(3)],
  [W(4), T(4)], [W(5), T(5)], [W(6), T(6)], [W(7), T(7)],
  [W(8), R(0)], [W(9), R(1)], [W(10), R(2)], [W(11), R(3)],
  [R(4), R(9)], [R(5), R(10)], [R(6), R(11)], [R(7), R(8)],
]

function resolveSlot(slot: Slot, winners: string[], runners: string[], thirds: string[]): string {
  if (slot.kind === 'W') return winners[slot.group]
  if (slot.kind === 'R') return runners[slot.group]
  return thirds[slot.idx]
}

export interface SlotTeam {
  team: string
  prob: number
}

export interface BracketMatch {
  home: SlotTeam
  away: SlotTeam
}

export interface SimBracket {
  r32: BracketMatch[]
  r16: BracketMatch[]
  qf: BracketMatch[]
  sf: BracketMatch[]
  final: BracketMatch
  champion: SlotTeam
}

export interface SimResult {
  n: number
  groupWinner: Record<string, number>
  reachR32: Record<string, number>
  reachR16: Record<string, number>
  reachQF: Record<string, number>
  reachSF: Record<string, number>
  reachFinal: Record<string, number>
  champion: Record<string, number>
  bracket: SimBracket
}

// Telt per (bracket-positie) hoe vaak elk team daar voorkomt, voor de
// "meest waarschijnlijke bracket".
type SlotCounter = Record<string, number>[]
function makeCounter(size: number): SlotCounter {
  return Array.from({ length: size }, () => ({}))
}
function tally(counter: SlotCounter, idx: number, team: string) {
  counter[idx][team] = (counter[idx][team] ?? 0) + 1
}
function topSlot(slot: SlotCounter[number], n: number): SlotTeam {
  let best = '', bestC = -1
  for (const [team, c] of Object.entries(slot)) {
    if (c > bestC) { best = team; bestC = c }
  }
  return { team: best, prob: n > 0 ? bestC / n : 0 }
}

export function simulateTournament(n = 10000): SimResult {
  const groupWinner: Record<string, number> = {}
  const reachR32: Record<string, number> = {}
  const reachR16: Record<string, number> = {}
  const reachQF: Record<string, number> = {}
  const reachSF: Record<string, number> = {}
  const reachFinal: Record<string, number> = {}
  const champion: Record<string, number> = {}
  const inc = (m: Record<string, number>, t: string) => { m[t] = (m[t] ?? 0) + 1 }

  // Per-positie tellers voor de meest waarschijnlijke bracket (32+16+8+4+2 = 62 sloten)
  const cR32 = makeCounter(32)
  const cR16 = makeCounter(16)
  const cQF = makeCounter(8)
  const cSF = makeCounter(4)
  const cFinal = makeCounter(2)
  const cChamp = makeCounter(1)

  for (let s = 0; s < n; s++) {
    const winners: string[] = []
    const runners: string[] = []
    const thirdsRaw: GroupStanding[] = []

    GROUP_LETTERS.forEach((g, gi) => {
      const st = simGroup(GROUPS[g], groupVenue(gi))
      winners[gi] = st[0].team
      runners[gi] = st[1].team
      thirdsRaw.push(st[2])
      inc(groupWinner, st[0].team)
    })

    // 8 beste nummers-drie: op punten, dan overwinningen, dan modelsterkte
    thirdsRaw.sort((a, b) =>
      b.pts !== a.pts ? b.pts - a.pts : b.w !== a.w ? b.w - a.w : sc(b.team) - sc(a.team)
    )
    const thirds = thirdsRaw.slice(0, 8).map(t => t.team)

    // R32 vullen via de seeding-template
    const r32: string[] = [] // 32 teams, paarsgewijs (home,away per match)
    SEED_TEMPLATE.forEach(([hs, as], i) => {
      const home = resolveSlot(hs, winners, runners, thirds)
      const away = resolveSlot(as, winners, runners, thirds)
      r32[i * 2] = home
      r32[i * 2 + 1] = away
      tally(cR32, i * 2, home)
      tally(cR32, i * 2 + 1, away)
      inc(reachR32, home)
      inc(reachR32, away)
    })

    // Knockout: paarsgewijze winnaars per ronde
    const advance = (teams: string[], counter: SlotCounter, reach: Record<string, number>): string[] => {
      const next: string[] = []
      for (let i = 0; i < teams.length; i += 2) {
        const wnr = koWinner(teams[i], teams[i + 1])
        next.push(wnr)
        tally(counter, i / 2, wnr)
        inc(reach, wnr)
      }
      return next
    }

    const r16 = advance(r32, cR16, reachR16)    // 32 → 16
    const qf = advance(r16, cQF, reachQF)       // 16 → 8
    const sf = advance(qf, cSF, reachSF)        // 8 → 4
    const fin = advance(sf, cFinal, reachFinal) // 4 → 2
    const champ = koWinner(fin[0], fin[1])
    tally(cChamp, 0, champ)
    inc(champion, champ)
  }

  const toMatches = (counter: SlotCounter): BracketMatch[] => {
    const out: BracketMatch[] = []
    for (let i = 0; i < counter.length; i += 2) {
      out.push({ home: topSlot(counter[i], n), away: topSlot(counter[i + 1], n) })
    }
    return out
  }

  return {
    n,
    groupWinner,
    reachR32,
    reachR16,
    reachQF,
    reachSF,
    reachFinal,
    champion,
    bracket: {
      r32: toMatches(cR32),
      r16: toMatches(cR16),
      qf: toMatches(cQF),
      sf: toMatches(cSF),
      final: toMatches(cFinal)[0],
      champion: topSlot(cChamp[0], n),
    },
  }
}

// Verwacht aantal gespeelde wedstrijden per team: 3 groepswedstrijden + de kans om
// elke knockoutronde te bereiken. Gebruikt door de topscorers-ranking.
export function expectedMatchesFromSim(sim: SimResult): Record<string, number> {
  const out: Record<string, number> = {}
  const teams = new Set<string>([
    ...Object.keys(sim.reachR32),
    ...Object.values(GROUPS).flat(),
  ])
  for (const t of teams) {
    const p = (m: Record<string, number>) => (m[t] ?? 0) / sim.n
    out[t] = 3 + p(sim.reachR32) + p(sim.reachR16) + p(sim.reachQF) + p(sim.reachSF) + p(sim.reachFinal)
  }
  return out
}
