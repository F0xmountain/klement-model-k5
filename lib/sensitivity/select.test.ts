import { beforeAll, describe, expect, it } from 'vitest'
import { FEATURES } from './engine'
import { fitRegLogistic } from './regfit'
import { assertDisjoint, buildHoldoutFold, buildSplit, guardSelection, LeakageError, selectOptimal } from './select'
import type { OptimalResult, Sample, SideFactors } from './types'

const WC_YEARS = [1994, 1998, 2002, 2006, 2010, 2014, 2018, 2022, 2026]
const TRAIN_YEARS = [1994, 1998, 2002, 2006, 2010, 2014]
const HOLDOUT_YEARS = [2018, 2022, 2026]
const PER_YEAR = 8
const SELECT_TIMEOUT_MS = 120000

function flatSide(elo: number): SideFactors {
  const side = {} as SideFactors
  for (const key of FEATURES) side[key] = 0
  side.elo = elo
  return side
}

// Outcome is driven ONLY by elo: every other feature is identical on both sides,
// so only feature 0 carries signal. A few draws exercise the calibration path.
function eloOnlySample(year: number, i: number): Sample {
  const homeStrong = i % 2 === 0
  const home = flatSide(homeStrong ? 1700 : 1450)
  const away = flatSide(homeStrong ? 1450 : 1700)
  const label = i % 7 === 0 ? 'D' : homeStrong ? 'A' : 'B'
  return { year, home: `H${i}`, away: `A${i}`, homeRaw: home, awayRaw: away, label }
}

function syntheticSamples(): Sample[] {
  const samples: Sample[] = []
  for (const year of WC_YEARS) {
    for (let i = 0; i < PER_YEAR; i++) samples.push(eloOnlySample(year, i))
  }
  return samples
}

describe('train/holdout split (no lookahead)', () => {
  it('trains strictly on years <= 2014 and standardizes on that band only', () => {
    const split = buildSplit(syntheticSamples())

    expect(split.trainYears).toEqual(TRAIN_YEARS)
    expect(split.trainDeltas.length).toBe(TRAIN_YEARS.length * PER_YEAR)
  })

  it('holds out exactly {2018, 2022, 2026}, each scored on its own rows', () => {
    const split = buildSplit(syntheticSamples())

    expect(split.holdout.map((fold) => fold.year)).toEqual(HOLDOUT_YEARS)
    for (const fold of split.holdout) expect(fold.deltas.length).toBe(PER_YEAR)
  })

  it('refuses to build a holdout fold inside the training band', () => {
    expect(() => buildHoldoutFold(syntheticSamples(), buildSplit(syntheticSamples()).stats, 2014)).toThrow(LeakageError)
  })
})

describe('selectOptimal leak guards', () => {
  it('guardSelection passes on a clean 1994-2026 partition', () => {
    expect(() => guardSelection(syntheticSamples())).not.toThrow()
  })

  it('assertDisjoint throws when a holdout year falls inside the training band', () => {
    expect(() => assertDisjoint(2014, [2018, 2022, 2026])).not.toThrow()
    expect(() => assertDisjoint(2020, [2018, 2022, 2026])).toThrow(LeakageError)
  })
})

// selectOptimal fits 100 regularization configs against the pooled holdout plus a
// forward-backward feature search, so it is the one heavy call in this suite. Run
// it exactly once and assert every property against the shared result.
describe('selectOptimal full protocol', () => {
  let result: OptimalResult

  beforeAll(() => {
    result = selectOptimal(syntheticSamples())
  }, SELECT_TIMEOUT_MS)

  it('reports a finite pooled holdout headline below the uniform 1/3 baseline (ln 3)', () => {
    expect(Number.isFinite(result.headline.pooledLogLoss)).toBe(true)
    expect(result.headline.pooledLogLoss).toBeLessThan(Math.log(3))
  })

  it('selects elo into the chosen config subset when only elo carries signal', () => {
    expect(result.config.featureSubset).toContain('elo')
    expect(result.config.featureSubset.length).toBeLessThanOrEqual(FEATURES.length)
  })

  it('breaks the holdout down per tournament for 2018, 2022 and 2026', () => {
    expect(result.headline.perTournament.map((t) => t.year)).toEqual(HOLDOUT_YEARS)
    for (const tournament of result.headline.perTournament) {
      expect(tournament.n).toBe(PER_YEAR)
      expect(Number.isFinite(tournament.logLoss)).toBe(true)
    }
  })

  it('reports the corrected train/holdout bands and the honest caveat', () => {
    expect(result.trainYears).toEqual(TRAIN_YEARS)
    expect(result.holdoutYears).toEqual(HOLDOUT_YEARS)
    expect(result.caveat).toContain('2018-2026')
  })

  it('selects only feature 0 (elo) when only elo carries signal', () => {
    const elo = result.featureSelection.find((f) => f.feature === 'elo')
    expect(elo?.selectionFrequency).toBe(1)

    const others = result.featureSelection.filter((f) => f.feature !== 'elo')
    for (const step of others) expect(step.selectionFrequency).toBe(0)
  })

  it('scores every baseline on the same 2018-2026 holdout', () => {
    const keys = result.baselines.map((b) => b.key)
    expect(keys).toEqual(['mle', 'equal', 'eloOnly', 'uniform'])

    for (const baseline of result.baselines) {
      expect(baseline.holdout.perTournament.map((t) => t.year)).toEqual(HOLDOUT_YEARS)
    }
    const uniform = result.baselines.find((b) => b.key === 'uniform')
    expect(uniform?.holdout.pooledLogLoss).toBeCloseTo(Math.log(3), 10)
  })
})

// elo separates the label perfectly; gdp carries only a weak partial alignment,
// so the unpenalized fit still hands it a small nonzero beta. A moderate L1 then
// soft-thresholds gdp to exactly zero while the dominant elo beta survives.
function lassoSample(i: number): Sample {
  const home = flatSide(0)
  const away = flatSide(0)
  const aWin = i % 2 === 0
  home.elo = aWin ? 1700 : 1450
  away.elo = aWin ? 1450 : 1700
  home.gdp = i % 3 === 0 ? 60 : 25
  return { year: 2010, home: `H${i}`, away: `A${i}`, homeRaw: home, awayRaw: away, label: aWin ? 'A' : 'B' }
}

describe('lasso path on the <=2014 training deltas', () => {
  it('zeroes more betas at moderate l1 than the unpenalized fit, elo surviving', () => {
    const rows = Array.from({ length: 120 }, (_unused, i) => lassoSample(i))
    const split = buildSplit(rows)
    const unpenalized = fitRegLogistic(split.trainDeltas, { l2: 0, l1: 0 })
    const lasso = fitRegLogistic(split.trainDeltas, { l2: 0, l1: 0.3 })

    expect(lasso.filter((b) => b === 0).length).toBeGreaterThan(unpenalized.filter((b) => b === 0).length)
    expect(lasso[0]).not.toBe(0)
  })
})
