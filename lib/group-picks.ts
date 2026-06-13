import { GROUPS } from './fixtures'
import { matchP, sc } from './klement-custom'
import { seedR32 } from './simulate-tournament'

// Groepsfase-voorspellingen voor /my-bracket: per groep een rangschikking 1-4.
// Opgeslagen in localStorage onder wc26-my-group-picks.

export const GROUP_PICKS_KEY = 'wc26-my-group-picks'

export type GroupPicks = Record<string, string[]> // groepletter → 4 teams (1e..4e)

export const GROUP_LETTERS = Object.keys(GROUPS) // A..L

// Deterministische "win-de-groep"-kans per team: softmax over het verwachte aantal
// groepsoverwinningen (som van matchP-winkansen tegen de 3 andere teams). Geen Monte
// Carlo → hydration-veilig en bruikbaar als standaardrangschikking én weergave.
const SOFTMAX_TEMP = 2.2

export function groupWinProbs(teams: string[]): Record<string, number> {
  const strength = teams.map(t =>
    teams.filter(o => o !== t).reduce((s, o) => s + matchP(t, o).pA, 0)
  )
  const exps = strength.map(s => Math.exp(s * SOFTMAX_TEMP))
  const total = exps.reduce((a, b) => a + b, 0)
  return Object.fromEntries(teams.map((t, i) => [t, exps[i] / total]))
}

// Exacte plaatsingskansen via volledige enumeratie van de 6 groepswedstrijden
// (3^6 = 729 uitkomsten). Geeft per team P(top-2) — de kans om door te gaan naar
// de R32 — én P(groepswinst). Een team kan 2e worden zonder groepswinst, dus
// top2 > win; dit is de juiste "Advances %"-maat (P(1e) + P(2e)). Tiebreak op
// punten → overwinningen → modelsterkte (sc), consistent met de simulator.
export interface GroupOutcomeProbs {
  win: Record<string, number>
  top2: Record<string, number>
}

const outcomeCache = new Map<string, GroupOutcomeProbs>()

export function groupOutcomeProbs(teams: string[]): GroupOutcomeProbs {
  const key = teams.join('|')
  const cached = outcomeCache.get(key)
  if (cached) return cached

  const pairs: [number, number][] = []
  for (let i = 0; i < teams.length; i++)
    for (let j = i + 1; j < teams.length; j++) pairs.push([i, j])

  const mp = pairs.map(([i, j]) => matchP(teams[i], teams[j]))
  const win: Record<string, number> = Object.fromEntries(teams.map(t => [t, 0]))
  const top2: Record<string, number> = Object.fromEntries(teams.map(t => [t, 0]))
  const M = pairs.length // 6
  const combos = 3 ** M

  for (let combo = 0; combo < combos; combo++) {
    let c = combo
    let prob = 1
    const pts = teams.map(() => 0)
    const wins = teams.map(() => 0)
    for (let m = 0; m < M; m++) {
      const outcome = c % 3
      c = Math.floor(c / 3)
      const [i, j] = pairs[m]
      const { pA, dr, pB } = mp[m]
      if (outcome === 0) { prob *= pA; pts[i] += 3; wins[i]++ }
      else if (outcome === 1) { prob *= dr; pts[i] += 1; pts[j] += 1 }
      else { prob *= pB; pts[j] += 3; wins[j]++ }
    }
    const order = teams.map((_, idx) => idx).sort((a, b) =>
      pts[b] !== pts[a] ? pts[b] - pts[a] : wins[b] !== wins[a] ? wins[b] - wins[a] : sc(teams[b]) - sc(teams[a])
    )
    win[teams[order[0]]] += prob
    top2[teams[order[0]]] += prob
    top2[teams[order[1]]] += prob
  }

  const result = { win, top2 }
  outcomeCache.set(key, result)
  return result
}

// P(top-2) per team — de kans om de groep te overleven (door naar R32).
export function groupAdvanceProbs(teams: string[]): Record<string, number> {
  return groupOutcomeProbs(teams).top2
}

// Standaardvolgorde van een groep: op win-de-groep-kans aflopend (model-voorspelling).
export function defaultGroupOrder(letter: string): string[] {
  const probs = groupWinProbs(GROUPS[letter])
  return [...GROUPS[letter]].sort((a, b) => probs[b] - probs[a])
}

export function defaultGroupPicks(): GroupPicks {
  return Object.fromEntries(GROUP_LETTERS.map(l => [l, defaultGroupOrder(l)]))
}

// Seedt de R32 uit de groepsvolgordes: nr.1 = winnaar, nr.2 = runner-up per groep,
// + de 8 beste nummers-drie (op modelsterkte sc). Geeft 32 teams in seed-volgorde.
export function seedR32FromGroups(picks: GroupPicks): string[] {
  const winners: string[] = []
  const runners: string[] = []
  const thirdsAll: string[] = []
  GROUP_LETTERS.forEach((l, gi) => {
    const order = picks[l] ?? defaultGroupOrder(l)
    winners[gi] = order[0]
    runners[gi] = order[1]
    thirdsAll.push(order[2])
  })
  const thirds = [...thirdsAll].sort((a, b) => sc(b) - sc(a)).slice(0, 8)
  return seedR32(winners, runners, thirds)
}

// ── localStorage-plumbing (useSyncExternalStore) ──
const listeners = new Set<() => void>()
let defaultJson: string | null = null
function defaultJsonStr(): string {
  return (defaultJson ??= JSON.stringify(defaultGroupPicks()))
}

export function subscribeGroupPicks(cb: () => void): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}
export function getGroupPicksSnapshot(): string {
  return window.localStorage.getItem(GROUP_PICKS_KEY) ?? defaultJsonStr()
}
export function getServerGroupPicksSnapshot(): string {
  return defaultJsonStr()
}

export function parseGroupPicks(raw: string): GroupPicks {
  try {
    const parsed = JSON.parse(raw)
    const result: GroupPicks = {}
    for (const l of GROUP_LETTERS) {
      const arr = parsed[l]
      // alleen geldig als het een permutatie van de 4 groepsteams is
      result[l] = Array.isArray(arr) && arr.length === 4 && GROUPS[l].every(t => arr.includes(t))
        ? arr
        : defaultGroupOrder(l)
    }
    return result
  } catch {
    return defaultGroupPicks()
  }
}

export function saveGroupPicks(picks: GroupPicks): void {
  window.localStorage.setItem(GROUP_PICKS_KEY, JSON.stringify(picks))
  listeners.forEach(l => l())
}

// True als de gebruiker de groepsfase daadwerkelijk heeft ingevuld (key bestaat).
export function hasGroupPicks(): boolean {
  return window.localStorage.getItem(GROUP_PICKS_KEY) !== null
}
