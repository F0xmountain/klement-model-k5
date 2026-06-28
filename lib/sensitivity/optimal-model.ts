import { predict } from './engine'
import optimalWeights from './optimal-weights.json'
import type { Label, OptimalModel, SideFactors } from './types'

// The committed artifact is the single source of truth at inference time; the
// import is typed back to OptimalModel so a schema drift in the JSON surfaces as
// a compile error rather than a silent runtime mismatch.
export const optimalModel: OptimalModel = optimalWeights as OptimalModel

export function scoreMatch(rawA: SideFactors, rawB: SideFactors): Record<Label, number> {
  const eta = optimalModel.calibration.scale * etaSum(rawA, rawB)
  return predict(eta, optimalModel.calibration.dmax, optimalModel.calibration.ddecay)
}

// sum_k beta_k * (standardized rawA_k - standardized rawB_k), matching the saved
// formula. Dropped features carry beta 0, so they contribute nothing here.
function etaSum(rawA: SideFactors, rawB: SideFactors): number {
  let sum = 0
  for (const feature of optimalModel.features) {
    const a = standardize(rawA[feature.key], feature.mean, feature.std)
    const b = standardize(rawB[feature.key], feature.mean, feature.std)
    sum += feature.beta * (a - b)
  }
  return sum
}

function standardize(raw: number, mean: number, std: number): number {
  return (raw - mean) / std
}
