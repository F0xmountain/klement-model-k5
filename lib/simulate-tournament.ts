import { GROUPS } from './fixtures'
import { matchP, sc, type EloMap, type VenueInfo } from './klement-custom'
import { roundMatches } from './wc26-schedule'
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
  const s = stadiums[groupIndex % stadiums.length]!
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

// ── Willekeurigheid ──────────────────────────────────────────────────────────
// Een RngSource levert per "slot" (een stabiele sleutel zoals "g.0.1.2.s5") een
// eigen random-stroom. Twee varianten:
//  • Math.random — alle sloten delen de globale stroom (default, interactieve sims).
//  • Seeded (mulberry32) — elk slot krijgt een onafhankelijke, reproduceerbare
//    stroom op basis van (seed, slotsleutel). Dit geeft "common random numbers":
//    twee tournooi-runs met dezelfde seed gebruiken per slot identieke trekkingen,
//    zodat het verschil tussen de runs ALLEEN de veranderde input (bv. een Elo-
//    update na een wedstrijd) weerspiegelt — niet de Monte-Carlo-ruis. Cruciaal
//    voor de impact-tijdlijn: een wedstrijd in groep A laat een team in een andere
//    groep dan ~0% bewegen i.p.v. een schijnbeweging door ruis.
type RngSource = (slotKey: string) => () => number

function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a += 0x6d2b79f5
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hashStr(s: string): number {
  let h = 2166136261 >>> 0 // FNV-1a
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

const mathRandomSource: RngSource = () => Math.random
function seededSource(seed: number): RngSource {
  return slotKey => mulberry32((Math.imul(seed, 2654435761) ^ hashStr(slotKey)) >>> 0)
}

// Knuth's algoritme voor een Poisson-trekking.
function samplePoisson(lambda: number, rng: () => number): number {
  const L = Math.exp(-lambda)
  let k = 0
  let p = 1
  do {
    k++
    p *= rng()
  } while (p > L)
  return k - 1
}

// Trekt een uitslag (goals home, goals away) die consistent is met het reeds
// getrokken W/D/L-resultaat, zodat de matchP-marginalen exact bewaard blijven en
// het doelsaldo alleen als tiebreaker dient. Begrensde rejection-sampling met een
// minimale fallback-uitslag.
function sampleScore(pA: number, pB: number, result: 'A' | 'D' | 'B', rng: () => number): [number, number] {
  const lambdaA = expectedGoals(pA)
  const lambdaB = expectedGoals(pB)
  for (let tries = 0; tries < 20; tries++) {
    const ga = samplePoisson(lambdaA, rng)
    const gb = samplePoisson(lambdaB, rng)
    if (result === 'A' && ga > gb) return [ga, gb]
    if (result === 'B' && ga < gb) return [ga, gb]
    if (result === 'D' && ga === gb) return [ga, gb]
  }
  if (result === 'A') return [1, 0]
  if (result === 'B') return [0, 1]
  return [1, 1]
}

// Hoogte (m) per KO-wedstrijd uit wc26-schedule.json, per ronde op
// wedstrijdvolgorde (matchNum). Hiermee krijgt matchP ook in de knockout de
// venue-hoogte mee, zodat de hoogte-factor ook in R32→finale werkt. wc26-schedule
// bevat geen coördinaten, dus de reisafstand-factor blijft hier (net als voorheen)
// buiten beschouwing.
const KO_ALTITUDES: Record<string, number[]> = {
  r32: roundMatches('r32').map(m => m.altitudeM),
  r16: roundMatches('r16').map(m => m.altitudeM),
  qf: roundMatches('qf').map(m => m.altitudeM),
  sf: roundMatches('sf').map(m => m.altitudeM),
  final: roundMatches('final').map(m => m.altitudeM),
}

// VenueInfo (alleen hoogte) voor het matchIndex-de duel van een KO-ronde, of
// undefined als er geen schema-wedstrijd voor dat slot is (dan blijft de
// hoogte-factor een no-op).
function koVenue(round: string, matchIndex: number): VenueInfo | undefined {
  const alt = KO_ALTITUDES[round]?.[matchIndex]
  return alt === undefined ? undefined : { altitude: alt }
}

// Knockout-winnaar: bij gelijkspel (verlenging + strafschoppen) wordt de
// gelijkspelkans proportioneel naar beide teams herverdeeld op basis van hun
// relatieve winkans — P(A gaat door) = pA / (pA + pB). Een sterker team wint dus
// vaker de tiebreak dan een 50/50-flip zou geven. venue geeft de hoogte-factor mee.
function koWinner(a: string, b: string, rng: () => number, eloOverride?: EloMap, venue?: VenueInfo): string {
  const { pA, pB } = matchP(a, b, venue, undefined, undefined, eloOverride)
  return rng() < pA / (pA + pB) ? a : b
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
function simGroup(
  teams: string[],
  venue: Venue,
  src: RngSource,
  groupIndex: number,
  simIndex: number,
  eloOverride?: EloMap,
): GroupStanding[] {
  const table: Record<string, GroupStanding> = {}
  for (const t of teams) table[t] = { team: t, pts: 0, w: 0, gf: 0, ga: 0 }

  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      const a = teams[i]!, b = teams[j]!
      const ta = table[a]!, tb = table[b]!
      const { pA, dr, pB } = matchP(a, b, venue, undefined, undefined, eloOverride)
      // Eigen random-stroom per wedstrijdslot (groep.i.j.sim) — zie RngSource.
      const rng = src(`g.${groupIndex}.${i}.${j}.${simIndex}`)
      const rnd = rng()
      const r: 'A' | 'D' | 'B' = rnd < pA ? 'A' : rnd < pA + dr ? 'D' : 'B'
      const [gi, gj] = sampleScore(pA, pB, r, rng)
      ta.gf += gi; ta.ga += gj
      tb.gf += gj; tb.ga += gi
      if (r === 'A') { ta.pts += 3; ta.w++ }
      else if (r === 'B') { tb.pts += 3; tb.w++ }
      else { ta.pts += 1; tb.pts += 1 }
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
  if (slot.kind === 'W') return winners[slot.group] ?? ''
  if (slot.kind === 'R') return runners[slot.group] ?? ''
  return thirds[slot.idx] ?? ''
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
  const slot = counter[idx]!
  slot[team] = (slot[team] ?? 0) + 1
}
function topSlot(slot: SlotCounter[number], n: number): SlotTeam {
  const ranked = Object.entries(slot)
    .map(([team, c]) => ({ team, prob: n > 0 ? c / n : 0 }))
    .sort((a, b) => b.prob - a.prob)
  const top = ranked[0]
  if (!top) return { team: '', prob: 0 }
  return { team: top.team, prob: top.prob, alts: ranked.slice(0, 4) }
}

// Bouwt de "meest waarschijnlijke" wedstrijden uit de per-positie tellers.
function toMatches(counter: SlotCounter, n: number): BracketMatch[] {
  const out: BracketMatch[] = []
  for (let i = 0; i < counter.length; i += 2) {
    out.push({ home: topSlot(counter[i]!, n), away: topSlot(counter[i + 1]!, n) })
  }
  return out
}

// seed (optioneel): activeert per-slot "common random numbers" (zie RngSource).
// Zonder seed gebruikt de simulatie Math.random — ongewijzigd gedrag voor de
// interactieve sims (/mc, model, sim-bracket). De kansen-tijdlijn geeft WEL een
// vaste seed mee zodat opeenvolgende snapshots vergelijkbaar zijn.
export function simulateTournament(n = 10000, eloOverride?: EloMap, seed?: number): SimResult {
  const src: RngSource = seed === undefined ? mathRandomSource : seededSource(seed)
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
      const st = simGroup(GROUPS[g]!, groupVenue(gi), src, gi, s, eloOverride)
      winners[gi] = st[0]!.team
      runners[gi] = st[1]!.team
      thirdsRaw.push(st[2]!)
      inc(groupWinner, st[0]!.team)
    })

    // 8 beste nummers-drie: zelfde FIFA-tiebreakervolgorde als de groepsstand
    // (punten → doelsaldo → gescoorde doelpunten → modelsterkte)
    thirdsRaw.sort(cmpStanding)
    const thirds = thirdsRaw.slice(0, 8).map(t => t.team)

    // R32 vullen via de seeding-template
    const r32 = seedR32(winners, runners, thirds) // 32 teams, paarsgewijs (home,away)
    for (let i = 0; i < r32.length; i++) {
      tally(cR32, i, r32[i]!)
      inc(reachR32, r32[i]!)
    }

    // Knockout: paarsgewijze winnaars per ronde. roundKey + slotindex + sim geven
    // elk KO-duel een eigen random-stroom (common random numbers over snapshots).
    // playedRound is de wc26-schedule-ronde die in deze stap wordt gespeeld (de
    // R32 produceert de teams die R16 bereiken), voor de venue-hoogte per slot.
    const advance = (teams: string[], counter: SlotCounter, reach: Record<string, number>, roundKey: string, playedRound: string): string[] => {
      const next: string[] = []
      for (let i = 0; i < teams.length; i += 2) {
        const wnr = koWinner(teams[i]!, teams[i + 1]!, src(`${roundKey}.${i}.${s}`), eloOverride, koVenue(playedRound, i / 2))
        next.push(wnr)
        tally(counter, i / 2, wnr)
        inc(reach, wnr)
      }
      return next
    }

    const r16 = advance(r32, cR16, reachR16, 'r16', 'r32')   // 32 → 16 (speelt R32)
    const qf = advance(r16, cQF, reachQF, 'qf', 'r16')       // 16 → 8 (speelt R16)
    const sf = advance(qf, cSF, reachSF, 'sf', 'qf')         // 8 → 4 (speelt QF)
    const fin = advance(sf, cFinal, reachFinal, 'fin', 'sf') // 4 → 2 (speelt SF)
    const champ = koWinner(fin[0]!, fin[1]!, src(`champ.${s}`), eloOverride, koVenue('final', 0))
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
      final: toMatches(cFinal, n)[0]!,
      champion: topSlot(cChamp[0]!, n),
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
    const team = r32[i]!
    cR32[i]![team] = n
    reachR32[team] = (reachR32[team] ?? 0) + n
  }

  const advance = (teams: string[], counter: SlotCounter, reach: Record<string, number>, playedRound: string): string[] => {
    const next: string[] = []
    for (let i = 0; i < teams.length; i += 2) {
      const wnr = koWinner(teams[i]!, teams[i + 1]!, Math.random, eloOverride, koVenue(playedRound, i / 2))
      next.push(wnr)
      tally(counter, i / 2, wnr)
      inc(reach, wnr)
    }
    return next
  }

  for (let s = 0; s < n; s++) {
    const r16 = advance(r32, cR16, reachR16, 'r32')   // speelt R32
    const qf = advance(r16, cQF, reachQF, 'r16')      // speelt R16
    const sf = advance(qf, cSF, reachSF, 'qf')        // speelt QF
    const fin = advance(sf, cFinal, reachFinal, 'sf') // speelt SF
    const champ = koWinner(fin[0]!, fin[1]!, Math.random, eloOverride, koVenue('final', 0))
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
      final: toMatches(cFinal, n)[0]!,
      champion: topSlot(cChamp[0]!, n),
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
