import { describe, it, expect } from 'vitest'

import { fetchResults, fetchWorldBankBackward } from '../lib/sensitivity/sources'
import { buildSamples } from '../lib/sensitivity/features'
import saved from '../lib/sensitivity/optimal-weights.json'
import type { Sample, SideFactors, Label } from '../lib/sensitivity/types'

const HOLDOUT_YEARS = [2018, 2022, 2026] as const
const DRAW_FLOOR = 0.05
const DRAW_CEIL = 0.34
const PROB_FLOOR = 1e-9
const UNIFORM_LOSS = Math.log(3)
const TOLERANCE = 1e-6

// The verification reads ONLY the saved artifact's beta/mean/std/calibration. It
// re-implements standardize, sigmoid, draw and log-loss locally rather than
// importing engine.ts, so a wrong sign or a dropped std in the file cannot be
// masked by the pipeline that produced it.
type SavedFeature = { key: string; beta: number; mean: number; std: number }

const savedFeatures = saved.features as SavedFeature[]
const cal = saved.calibration

function standardize(raw: number, feature: SavedFeature): number {
  return (raw - feature.mean) / feature.std
}

function eta(home: SideFactors, away: SideFactors): number {
  let sum = 0
  for (const feature of savedFeatures) {
    const key = feature.key as keyof SideFactors
    sum += feature.beta * (standardize(home[key], feature) - standardize(away[key], feature))
  }
  return cal.scale * sum
}

function probabilities(e: number): Record<Label, number> {
  const draw = Math.max(DRAW_FLOOR, Math.min(DRAW_CEIL, cal.dmax * Math.exp(-cal.ddecay * Math.abs(e))))
  const s = 1 / (1 + Math.exp(-e))
  return { A: s * (1 - draw), D: draw, B: (1 - s) * (1 - draw) }
}

function foldLogLoss(rows: Sample[]): number {
  if (rows.length === 0) return UNIFORM_LOSS
  let sum = 0
  for (const row of rows) {
    const probs = probabilities(eta(row.homeRaw, row.awayRaw))
    sum += -Math.log(Math.max(probs[row.label], PROB_FLOOR))
  }
  return sum / rows.length
}

describe('saved optimal-weights.json reproduces the reported OOS from its own values', () => {
  it('matches pooled and per-tournament holdout log-loss within rounding', async () => {
    const matches = await fetchResults()
    const wb = await fetchWorldBankBackward()
    const samples = buildSamples(matches, wb)
    console.log(`fetched ${matches.length} matches; built ${samples.length} world-cup samples`)

    const perTournament: Record<string, { logLoss: number; n: number }> = {}
    let totalNll = 0
    let totalCount = 0
    for (const year of HOLDOUT_YEARS) {
      const rows = samples.filter((s) => s.year === year)
      const loss = foldLogLoss(rows)
      perTournament[String(year)] = { logLoss: loss, n: rows.length }
      totalNll += loss * rows.length
      totalCount += rows.length
    }
    const pooled = totalCount === 0 ? UNIFORM_LOSS : totalNll / totalCount

    for (const year of HOLDOUT_YEARS) {
      const reported = saved.oos.perTournament[String(year) as keyof typeof saved.oos.perTournament]
      const recomputed = perTournament[String(year)]
      expect(recomputed.n).toBe(reported.n)
      expect(recomputed.logLoss).toBeCloseTo(reported.logLoss, 6)
    }

    console.log('recomputed perTournament:', JSON.stringify(perTournament))
    console.log('reported   perTournament:', JSON.stringify(saved.oos.perTournament))
    console.log(`recomputed pooled=${pooled} reported pooled=${saved.oos.pooledLogLoss}`)

    expect(pooled).toBeCloseTo(saved.oos.pooledLogLoss, 6)
    expect(Math.abs(pooled - saved.oos.pooledLogLoss)).toBeLessThan(TOLERANCE)
  }, 120000)
})
