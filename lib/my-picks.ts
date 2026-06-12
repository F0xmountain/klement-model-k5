export const STORAGE_KEY = 'wc26-my-picks'

export const ROUND_ORDER = ['r32', 'r16', 'qf', 'sf', 'final'] as const
export type Round = typeof ROUND_ORDER[number]

export type MyPicks = Record<Round, (string | null)[]>

export const EMPTY_PICKS: MyPicks = {
  r32: Array(16).fill(null),
  r16: Array(8).fill(null),
  qf: Array(4).fill(null),
  sf: Array(2).fill(null),
  final: Array(1).fill(null),
}

export interface ResolvedMatch {
  teamA: string | null
  teamB: string | null
  pick: string | null
  klementPick: string // leeg in de dynamische bracket (Klement = aparte tab)
  differs: boolean
}

export type ResolvedBracket = Record<Round, ResolvedMatch[]>

// Cascadeert de gebruikerspicks door de bracket. De R32-paringen komen uit de
// dynamische seeding (r32Teams = 32 teams, paarsgewijs home/away) die uit de
// groepsfase-picks volgt; elke verdere ronde wordt bepaald door de picks van de
// vorige ronde. Geen Klement-vergelijking hier (dat is de Klement-tab).
export function resolveBracket(r32Teams: string[], picks: MyPicks): ResolvedBracket {
  const result: ResolvedBracket = { r32: [], r16: [], qf: [], sf: [], final: [] }

  for (let i = 0; i < 16; i++) {
    const teamA = r32Teams[i * 2] ?? null
    const teamB = r32Teams[i * 2 + 1] ?? null
    const pick = picks.r32[i] ?? null
    const valid = pick === teamA || pick === teamB ? pick : null
    result.r32.push({ teamA, teamB, pick: valid, klementPick: '', differs: false })
  }

  for (let r = 1; r < ROUND_ORDER.length; r++) {
    const round = ROUND_ORDER[r]
    const prev = result[ROUND_ORDER[r - 1]]
    const count = prev.length / 2
    for (let i = 0; i < count; i++) {
      const teamA = prev[i * 2]?.pick ?? null
      const teamB = prev[i * 2 + 1]?.pick ?? null
      const pick = picks[round][i] ?? null
      const valid = (teamA !== null && pick === teamA) || (teamB !== null && pick === teamB) ? pick : null
      result[round].push({ teamA, teamB, pick: valid, klementPick: '', differs: false })
    }
  }

  return result
}

const EMPTY_JSON = JSON.stringify(EMPTY_PICKS)
const listeners = new Set<() => void>()

// useSyncExternalStore plumbing: localStorage is the single source of truth,
// avoiding a setState-on-mount effect just to hydrate from it.
export function subscribePicks(callback: () => void): () => void {
  listeners.add(callback)
  return () => listeners.delete(callback)
}

export function getPicksSnapshot(): string {
  return window.localStorage.getItem(STORAGE_KEY) ?? EMPTY_JSON
}

export function getServerPicksSnapshot(): string {
  return EMPTY_JSON
}

export function parsePicks(raw: string): MyPicks {
  try {
    const parsed = JSON.parse(raw)
    return {
      r32: Array.isArray(parsed.r32) ? parsed.r32 : EMPTY_PICKS.r32,
      r16: Array.isArray(parsed.r16) ? parsed.r16 : EMPTY_PICKS.r16,
      qf: Array.isArray(parsed.qf) ? parsed.qf : EMPTY_PICKS.qf,
      sf: Array.isArray(parsed.sf) ? parsed.sf : EMPTY_PICKS.sf,
      final: Array.isArray(parsed.final) ? parsed.final : EMPTY_PICKS.final,
    }
  } catch {
    return EMPTY_PICKS
  }
}

export function savePicks(picks: MyPicks): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(picks))
  listeners.forEach(l => l())
}

// Wist alle picks (verwijdert de localStorage-sleutel) en notificeert de subscribers,
// zodat useSyncExternalStore terugvalt op EMPTY_PICKS.
export function clearPicks(): void {
  window.localStorage.removeItem(STORAGE_KEY)
  listeners.forEach(l => l())
}
