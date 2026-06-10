import { ROUNDS } from './fixtures'

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
  klementPick: string
  differs: boolean
}

export type ResolvedBracket = Record<Round, ResolvedMatch[]>

// Cascades user picks through the bracket: a round's matchup is determined by
// the picks made in the previous round, mirroring how ROUNDS.k cascades for Klement.
export function resolveBracket(picks: MyPicks): ResolvedBracket {
  const result: ResolvedBracket = { r32: [], r16: [], qf: [], sf: [], final: [] }

  ROUNDS.r32.forEach((m, i) => {
    const pick = picks.r32[i] ?? null
    const valid = pick === m.teamA || pick === m.teamB ? pick : null
    result.r32.push({ teamA: m.teamA, teamB: m.teamB, pick: valid, klementPick: m.k, differs: valid !== null && valid !== m.k })
  })

  for (let r = 1; r < ROUND_ORDER.length; r++) {
    const round = ROUND_ORDER[r]
    const prev = result[ROUND_ORDER[r - 1]]
    ROUNDS[round].forEach((m, i) => {
      const teamA = prev[i * 2]?.pick ?? null
      const teamB = prev[i * 2 + 1]?.pick ?? null
      const pick = picks[round][i] ?? null
      const valid = (teamA !== null && pick === teamA) || (teamB !== null && pick === teamB) ? pick : null
      result[round].push({ teamA, teamB, pick: valid, klementPick: m.k, differs: valid !== null && valid !== m.k })
    })
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
