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
