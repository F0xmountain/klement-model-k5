import { FEATURES, sigmoid } from './engine'
import type { SampleDelta } from './types'

const FIT_LR = 0.3
const FIT_ITERATIONS = 3000

export function fitRegLogistic(
  samples: SampleDelta[],
  opts: { l2: number; l1: number; iters?: number },
): number[] {
  const beta = FEATURES.map(() => 0)
  const decisive = samples.filter((s) => s.label !== 'D')
  const iters = opts.iters ?? FIT_ITERATIONS
  for (let iter = 0; iter < iters; iter++) {
    applyRegStep(beta, decisive, opts)
  }
  return beta
}

// The ridge term is applied as a proximal (implicit) shrink 1/(1 + FIT_LR*l2)
// rather than the explicit factor (1 - FIT_LR*l2). The explicit form oscillates
// once FIT_LR*l2 > 1 (l2 > 3.33) and diverges past FIT_LR*l2 > 2 (l2 > 6.67),
// which corrupted the top of the lambda grid and defeated the 1-SE rule. The
// proximal factor is in (0,1) for every l2 >= 0, so high-lambda fits stay
// convergent. The two forms agree to first order in l2, so low-lambda fits and
// the chosen-config betas are unchanged.
function applyRegStep(beta: number[], decisive: SampleDelta[], opts: { l2: number; l1: number }): void {
  const grad = accumulateGradient(beta, decisive)
  const n = decisive.length
  const shrink = 1 / (1 + FIT_LR * opts.l2)
  for (let k = 0; k < beta.length; k++) {
    beta[k] = (beta[k] - (FIT_LR * grad[k]) / n) * shrink
    if (opts.l1 > 0) beta[k] = softThreshold(beta[k], FIT_LR * opts.l1)
  }
}

function accumulateGradient(beta: number[], decisive: SampleDelta[]): number[] {
  const grad = beta.map(() => 0)
  for (const sample of decisive) {
    const err = sigmoid(dot(beta, sample.delta)) - (sample.label === 'A' ? 1 : 0)
    for (let k = 0; k < beta.length; k++) grad[k] += err * sample.delta[k]
  }
  return grad
}

function softThreshold(value: number, amount: number): number {
  return Math.sign(value) * Math.max(0, Math.abs(value) - amount)
}

function dot(weights: number[], features: number[]): number {
  let sum = 0
  for (let k = 0; k < weights.length; k++) sum += weights[k] * features[k]
  return sum
}
