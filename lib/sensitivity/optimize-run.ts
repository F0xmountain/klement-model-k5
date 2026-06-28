import { fetchResults, fetchWorldBankBackward } from './sources'
import { buildSamples } from './features'
import { selectOptimal } from './select'
import type { OptimalResult } from './types'

// Backward-only World Bank lookup is mandatory here (spec section 3): a tournament
// year T must never resolve gdp/pop to a series year >= T, which would leak
// post-tournament economics into a pre-tournament feature and contaminate every
// out-of-sample fold and the sealed 2026 number. buildSamples runs exactly once on
// full history; selectOptimal partitions its output by year (spec section 2).
export async function runOptimize(): Promise<OptimalResult> {
  const matches = await fetchResults()
  const wb = await fetchWorldBankBackward()
  const samples = buildSamples(matches, wb)
  return selectOptimal(samples)
}
