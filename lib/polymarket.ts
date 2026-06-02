// lib/polymarket.ts

export const POLYMARKET_BASE =
  'https://polymarket.com/sports/world-cup/games'

export function pmUrl(_teamName?: string): string {
  return POLYMARKET_BASE
}

export const PM_GAP_THRESHOLD = 0.05
