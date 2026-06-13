import { GROUPS } from './fixtures'
import { matchP, sc, type EloMap } from './klement-custom'
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

// Verwachte goals per team uit de winkans — dezelfde formule als /versus en
// GroupMatchRow (lib/score-distribution.ts). Het Klement-model blijft W/D/L-only:
// een uitslag is een afgeleide illustratie, puur om een doelsaldo te genereren
// voor de officiële FIFA-groepstiebreakers (doelsaldo, dan gescoorde doelpunten).
const BASE_SCORING_RATE = 1.35
function expectedGoals(p: number): number {
  return BASE_SCORING_RATE * (0.5 + (p - 0.5) * 0.8)
}

// Knuth's algoritme voor een Poisson-trekking.
function samplePoisson(lambda: number): number {
  const L = Math.exp(-lambda)
  let k = 0
  let p = 1
  do {
    k++
    p *= Math.random()
  } while (p > L)
  return k - 1
}

// Trekt een uitslag (goals home, goals away) die consistent is met het reeds
// getrokken W/D/L-resultaat, zodat de matchP-marginalen exact bewaard blijven en
// het doelsaldo alleen als tiebreaker dient. Begrensde rejection-sampling met een
// minimale fallback-uitslag.
function sampleScore(pA: number, pB: number, result: 'A' | 'D' | 'B'): [number, number] {
  const lambdaA = expectedGoals(pA)
  const lambdaB = expectedGoals(pB)
  for (let tries = 0; tries < 20; tries++) {
    const ga = samplePoisson(lambdaA)
    const gb = samplePoisson(lambdaB)
    if (result === 'A' && ga > gb) return [ga, gb]
    if (result === 'B' && ga < gb) return [ga, gb]
    if (result === 'D' && ga === gb) return [ga, gb]
  }
  if (result === 'A') return [1, 0]
  if (result === 'B') return [0, 1]
  return [1, 1]
}

// Knockout-winnaar: bij gelijkspel (verlenging + strafschoppen) wordt de
// gelijkspelkans proportioneel naar beide teams herverdeeld op basis van hun
// relatieve winkans — P(A gaat door) = pA / (pA + pB). Een sterker team wint dus
// vaker de tiebreak dan een 50/50-flip zou geven.
function koWinner(a: string, b: string, eloOverride?: EloMap): string {
  const { pA, pB } = matchP(a, b, undefined, undefined, undefined, eloOverride)
  return Math.random() < pA / (pA + pB) ? a : b
}

interface GroupStanding {
  team: string
  pts: number
  w: number
  gf: number // gescoorde doelpunten
  ga: number // tegendoelpunten
}

// Simuleert een groep (round-robin, 6 wedstrijden) → standen gesorteerd volgens de
// FIFA-tiebreakervolgorde: punten, dan doelsaldo, dan gescoorde doelpunten, met
// modelsterkte (sc) als laatste deterministische fallback (vervangt onderlinge
// resultaten/loting). W/D/L komt uit matchP (model blijft W/D/L-only); het
// doelsaldo is een afgeleide Poisson-illustratie consistent met die uitslag.
function simGroup(teams: string[], venue: Venue, eloOverride?: EloMap): GroupStanding[] {
  const table: Record<string, GroupStanding> = {}
  for (const t of teams) table[t] = { team: t, pts: 0, w: 0, gf: 0, ga: 0 }

  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      const { pA, dr, pB } = matchP(teams[i], teams[j], venue, undefined, undefined, eloOverride)
      const rnd = Math.random()
      const r: 'A' | 'D' | 'B' = rnd < pA ? 'A' : rnd < pA + dr ? 'D' : 'B'
      const [gi, gj] = sampleScore(pA, pB, r)
      table[teams[i]].gf += gi; table[teams[i]].ga += gj
      table[teams[j]].gf += gj; table[teams[j]].ga += gi
      if (r === 'A') { table[teams[i]].pts += 3; table[teams[i]].w++ }
      else if (r === 'B') { table[teams[j]].pts += 3; table[teams[j]].w++ }
      else { table[teams[i]].pts += 1; table[teams[j]].pts += 1 }
    }
  }

  return Object.values(table).sort(cmpStanding)
}

// FIFA-tiebreakervolgorde: punten → doelsaldo → gescoorde doelpunten → modelsterkte.
function cmpStanding(a: GroupStanding, b: GroupStanding): number {
  if (b.pts !== a.pts) return b.pts - a.pts
  const gdA = a.gf - a.ga
  const gdB = b.gf - b.ga
  if (gdB !== gdA) return gdB - gdA
  if (b.gf !== a.gf) return b.gf - a.gf
  return sc(b.team) - sc(a.team)
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

// ─────────────────────────────────────────────────────────────────────────────
// OFFICIËLE FIFA WK 2026 R32-SEEDING — bron & status
//
// Bron: FIFA WK 2026 lotingsuitslag (5 december 2024, Washington D.C.) +
//       het officiële wedstrijdschema (wedstrijden 73–88 = de Round of 32),
//       te verifiëren op fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026.
//
// Officiële opzet: 48 teams, 12 groepen A–L. De nummers 1 en 2 van elke groep
// (24) plus de 8 beste nummers-drie plaatsen zich voor de R32. De R32-sloten van
// de groepswinnaars en nummers-twee liggen vast door de loting; de 8 beste
// nummers-drie worden via een gepubliceerde PERMUTATIETABEL aan winnaar-sloten
// gekoppeld. Welke 8 van de 12 nummers-drie zich plaatsen is resultaatafhankelijk
// (C(12,8) = 495 combinaties), dus de exacte derde-naar-slot-routing kan pas worden
// vastgelegd zodra de groepsfase is gespeeld — vergelijkbaar met (maar groter dan)
// de "best third-placed" tabel van het EK. Voorbeeld uit de gepubliceerde opzet:
// de beste nummers-drie uit groepen A/B/C/D/E/F stromen naar specifieke R32-sloten
// (de volledige tabel staat in het officiële schema en moet daar worden overgenomen).
//
// SWAP-IN: vervang SEED_TEMPLATE hieronder door de officiële 16 matchups zodra de
// tabel is overgenomen. De Slot/resolveSlot-machinerie ondersteunt al W(groep),
// R(groep) en T(idx) referenties, dus alleen de 16 [home, away]-paren hoeven te
// worden aangepast (idx 0–7 = nummers-drie op aflopende ranking).
//
// LET OP — APPROXIMATIE: SEED_TEMPLATE hieronder is NIET de officiële tabel, maar
// een deterministische cross-group benadering (winnaars vs. nummers-drie, en
// nummers-twee onderling kruislings gepaard zodat geen twee teams uit dezelfde
// groep elkaar in de R32 treffen). Dit houdt de simulatie coherent en zonder
// fantoomteams; alleen de exacte tegenstander-paring wijkt af van het officiële schema.
// ─────────────────────────────────────────────────────────────────────────────
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

// Past SEED_TEMPLATE toe op de groepsstanden → 32 R32-teams in seed-volgorde
// (16 wedstrijden × [home, away]). winners[gi]/runners[gi] per groep-index 0..11
// (A..L), thirds[0..7] = de 8 beste nummers-drie op ranking. Geëxporteerd voor de
// "Simuleer mijn bracket"-functie van /my-bracket.
export function seedR32(winners: string[], runners: string[], thirds: string[]): string[] {
  const r32: string[] = []
  SEED_TEMPLATE.forEach(([hs, as], i) => {
    r32[i * 2] = resolveSlot(hs, winners, runners, thirds)
    r32[i * 2 + 1] = resolveSlot(as, winners, runners, thirds)
  })
  return r32
}

export interface SlotTeam {
  team: string
  prob: number
  alts?: { team: string; prob: number }[] // top-alternatieven in dit slot (voor hover)
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
  const ranked = Object.entries(slot)
    .map(([team, c]) => ({ team, prob: n > 0 ? c / n : 0 }))
    .sort((a, b) => b.prob - a.prob)
  if (ranked.length === 0) return { team: '', prob: 0 }
  return { team: ranked[0].team, prob: ranked[0].prob, alts: ranked.slice(0, 4) }
}

// Bouwt de "meest waarschijnlijke" wedstrijden uit de per-positie tellers.
function toMatches(counter: SlotCounter, n: number): BracketMatch[] {
  const out: BracketMatch[] = []
  for (let i = 0; i < counter.length; i += 2) {
    out.push({ home: topSlot(counter[i], n), away: topSlot(counter[i + 1], n) })
  }
  return out
}

export function simulateTournament(n = 10000, eloOverride?: EloMap): SimResult {
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
      const st = simGroup(GROUPS[g], groupVenue(gi), eloOverride)
      winners[gi] = st[0].team
      runners[gi] = st[1].team
      thirdsRaw.push(st[2])
      inc(groupWinner, st[0].team)
    })

    // 8 beste nummers-drie: zelfde FIFA-tiebreakervolgorde als de groepsstand
    // (punten → doelsaldo → gescoorde doelpunten → modelsterkte)
    thirdsRaw.sort(cmpStanding)
    const thirds = thirdsRaw.slice(0, 8).map(t => t.team)

    // R32 vullen via de seeding-template
    const r32 = seedR32(winners, runners, thirds) // 32 teams, paarsgewijs (home,away)
    for (let i = 0; i < r32.length; i++) {
      tally(cR32, i, r32[i])
      inc(reachR32, r32[i])
    }

    // Knockout: paarsgewijze winnaars per ronde
    const advance = (teams: string[], counter: SlotCounter, reach: Record<string, number>): string[] => {
      const next: string[] = []
      for (let i = 0; i < teams.length; i += 2) {
        const wnr = koWinner(teams[i], teams[i + 1], eloOverride)
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
    const champ = koWinner(fin[0], fin[1], eloOverride)
    tally(cChamp, 0, champ)
    inc(champion, champ)
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
      r32: toMatches(cR32, n),
      r16: toMatches(cR16, n),
      qf: toMatches(cQF, n),
      sf: toMatches(cSF, n),
      final: toMatches(cFinal, n)[0],
      champion: topSlot(cChamp[0], n),
    },
  }
}

// Monte Carlo vanaf een VASTE R32-seeding (32 teams in seed-volgorde, paarsgewijs
// home/away). De groepsfase is door de gebruiker bepaald (vaste top-2 + de 8 beste
// nummers-drie op modelsterkte), dus alleen de knockout wordt n keer gesimuleerd.
// Gebruikt door /my-bracket's "Simuleer mijn bracket". reachR32 = n per geseed
// team (kans 100%); de latere rondes komen volledig uit de simulatie.
export function simulateBracket(r32: string[], n = 10000, eloOverride?: EloMap): SimResult {
  const reachR32: Record<string, number> = {}
  const reachR16: Record<string, number> = {}
  const reachQF: Record<string, number> = {}
  const reachSF: Record<string, number> = {}
  const reachFinal: Record<string, number> = {}
  const champion: Record<string, number> = {}
  const inc = (m: Record<string, number>, t: string) => { m[t] = (m[t] ?? 0) + 1 }

  const cR32 = makeCounter(32)
  const cR16 = makeCounter(16)
  const cQF = makeCounter(8)
  const cSF = makeCounter(4)
  const cFinal = makeCounter(2)
  const cChamp = makeCounter(1)

  // R32-sloten liggen vast: elk geseed team staat met 100% in zijn slot.
  for (let i = 0; i < r32.length; i++) {
    cR32[i][r32[i]] = n
    reachR32[r32[i]] = (reachR32[r32[i]] ?? 0) + n
  }

  const advance = (teams: string[], counter: SlotCounter, reach: Record<string, number>): string[] => {
    const next: string[] = []
    for (let i = 0; i < teams.length; i += 2) {
      const wnr = koWinner(teams[i], teams[i + 1], eloOverride)
      next.push(wnr)
      tally(counter, i / 2, wnr)
      inc(reach, wnr)
    }
    return next
  }

  for (let s = 0; s < n; s++) {
    const r16 = advance(r32, cR16, reachR16)
    const qf = advance(r16, cQF, reachQF)
    const sf = advance(qf, cSF, reachSF)
    const fin = advance(sf, cFinal, reachFinal)
    const champ = koWinner(fin[0], fin[1], eloOverride)
    tally(cChamp, 0, champ)
    inc(champion, champ)
  }

  return {
    n,
    groupWinner: {},
    reachR32,
    reachR16,
    reachQF,
    reachSF,
    reachFinal,
    champion,
    bracket: {
      r32: toMatches(cR32, n),
      r16: toMatches(cR16, n),
      qf: toMatches(cQF, n),
      sf: toMatches(cSF, n),
      final: toMatches(cFinal, n)[0],
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
