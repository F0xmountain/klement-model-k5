#!/usr/bin/env node
/* eslint-disable */
// Walk-forward out-of-sample backtest over World Cups 1994-2026. For each test
// tournament from 2002 on, weights are fit on every prior World Cup and used to
// predict that tournament; all predictions are pooled into one large
// out-of-sample set. Compares fitted vs equal vs Elo-only. Features are
// point-in-time (Elo from results; GDP/population by tournament year from the
// free World Bank API). No lookahead, no paid API.

const fs = require('fs')
const path = require('path')
const { loadResults } = require('./model/dataset')
const { clamp, sigmoid } = require('./model/fit')
const { ensureData, makeLookup } = require('./model/worldbank')
const { NATIONS } = require('./model/wc-nations')
const { FEATURES, FIRST_WC, collectWorldCupRows, buildSamples } = require('./model/wc-features')

const TEST_TOURNAMENTS = [2002, 2006, 2010, 2014, 2018, 2022, 2026]
const STAMP = new Date().toISOString()

function standardizer(rows) {
  const stats = {}
  for (const key of FEATURES) {
    const vals = rows.map((row) => row[key])
    const mean = vals.reduce((s, v) => s + v, 0) / vals.length
    const variance = vals.reduce((s, v) => s + (v - mean) ** 2, 0) / vals.length
    stats[key] = { mean, std: Math.sqrt(variance) || 1 }
  }
  return stats
}

function delta(home, away, stats) {
  return FEATURES.map((k) => (home[k] - stats[k].mean) / stats[k].std - (away[k] - stats[k].mean) / stats[k].std)
}

function fitLogistic(samples) {
  const beta = FEATURES.map(() => 0)
  const decisive = samples.filter((s) => s.label !== 'D')
  for (let iter = 0; iter < 3000; iter++) {
    const grad = beta.map(() => 0)
    for (const s of decisive) {
      let eta = 0
      for (let k = 0; k < beta.length; k++) eta += beta[k] * s.delta[k]
      const err = sigmoid(eta) - (s.label === 'A' ? 1 : 0)
      for (let k = 0; k < beta.length; k++) grad[k] += err * s.delta[k]
    }
    for (let k = 0; k < beta.length; k++) beta[k] -= 0.3 * (grad[k] / decisive.length + 1e-3 * beta[k])
  }
  return beta
}

function predict(eta, dmax, ddecay) {
  const dr = clamp(dmax * Math.exp(-ddecay * Math.abs(eta)), 0.05, 0.34)
  const pHome = sigmoid(eta) * (1 - dr)
  return { A: pHome, D: dr, B: (1 - sigmoid(eta)) * (1 - dr) }
}

function meanLogLoss(samples, weights, scale, dmax, ddecay) {
  let sum = 0
  for (const s of samples) {
    let raw = 0
    for (let k = 0; k < weights.length; k++) raw += weights[k] * s.delta[k]
    sum += -Math.log(Math.max(predict(scale * raw, dmax, ddecay)[s.label], 1e-9))
  }
  return sum / samples.length
}

function calibrate(trainSamples, weights) {
  let best = { scale: 1, dmax: 0.26, ddecay: 1, loss: Infinity }
  for (let scale = 0.1; scale <= 4; scale += 0.1) {
    for (let dmax = 0.16; dmax <= 0.34; dmax += 0.02) {
      for (let ddecay = 0.2; ddecay <= 3; ddecay += 0.2) {
        const loss = meanLogLoss(trainSamples, weights, scale, dmax, ddecay)
        if (loss < best.loss) best = { scale, dmax, ddecay, loss }
      }
    }
  }
  return best
}

function scoreFold(samples, weights, cal, acc) {
  let ll = 0
  for (const s of samples) {
    let raw = 0
    for (let k = 0; k < weights.length; k++) raw += weights[k] * s.delta[k]
    const p = predict(cal.scale * raw, cal.dmax, cal.ddecay)
    const pointLoss = -Math.log(Math.max(p[s.label], 1e-9))
    ll += pointLoss
    acc.ll += pointLoss
    const pred = p.A > p.D && p.A > p.B ? 'A' : p.B > p.D && p.B > p.A ? 'B' : 'D'
    if (pred === s.label) acc.hit++
    for (const c of ['A', 'D', 'B']) acc.brier += (p[c] - (s.label === c ? 1 : 0)) ** 2
    acc.n++
  }
  return ll / samples.length
}

function withDeltas(samples, stats) {
  return samples.map((s) => ({ delta: delta(s.homeRaw, s.awayRaw, stats), label: s.label }))
}

function fullSampleWeights(samples) {
  const stats = standardizer(samples.flatMap((s) => [s.homeRaw, s.awayRaw]))
  const beta = fitLogistic(withDeltas(samples, stats))
  const sumAbs = beta.reduce((s, b) => s + Math.abs(b), 0)
  return FEATURES.map((k, i) => ({ key: k, beta: Number(beta[i].toFixed(4)), importancePct: Number(((Math.abs(beta[i]) / sumAbs) * 100).toFixed(1)) }))
}

async function main() {
  console.log('loading results and building point-in-time Elo...')
  const results = await loadResults()
  const wcRows = collectWorldCupRows(results)

  console.log('fetching World Bank GDP/population (cached after first run)...')
  const cache = await ensureData(Object.values(NATIONS).map((n) => n.iso3))
  const wb = makeLookup(cache)
  const samples = buildSamples(wcRows, wb)

  const MODELS = { fitted: null, equal: FEATURES.map(() => 1), eloOnly: FEATURES.map((k) => (k === 'elo' ? 1 : 0)) }
  const pooled = { fitted: { ll: 0, hit: 0, brier: 0, n: 0 }, equal: { ll: 0, hit: 0, brier: 0, n: 0 }, eloOnly: { ll: 0, hit: 0, brier: 0, n: 0 } }
  const perTournament = []

  for (const T of TEST_TOURNAMENTS) {
    const trainSamples = samples.filter((s) => s.year < T)
    const testSamples = samples.filter((s) => s.year === T)
    if (trainSamples.length < 80 || testSamples.length === 0) continue
    const stats = standardizer(trainSamples.flatMap((s) => [s.homeRaw, s.awayRaw]))
    const trainD = withDeltas(trainSamples, stats)
    const testD = withDeltas(testSamples, stats)
    const fitted = fitLogistic(trainD)
    const vecs = { fitted, equal: MODELS.equal, eloOnly: MODELS.eloOnly }
    const row = { year: T, n: testSamples.length }
    for (const name of Object.keys(vecs)) {
      const cal = calibrate(trainD, vecs[name])
      row[name] = Number(scoreFold(testD, vecs[name], cal, pooled[name]).toFixed(4))
    }
    perTournament.push(row)
    console.log(`fold ${T}: train=${trainSamples.length} test=${testSamples.length}`)
  }

  const results_out = {}
  for (const name of Object.keys(pooled)) {
    const p = pooled[name]
    results_out[name] = { logLoss: p.ll / p.n, accuracy: p.hit / p.n, brier: p.brier / p.n, n: p.n }
  }
  const ranked = Object.entries(results_out).sort((a, b) => a[1].logLoss - b[1].logLoss)

  const summary = {
    generatedAt: STAMP,
    method: 'walk-forward expanding window over World Cups',
    firstTrainYear: FIRST_WC,
    testTournaments: perTournament.map((r) => r.year),
    pooledTestMatches: results_out.fitted.n,
    features: FEATURES,
    fittedWeights: fullSampleWeights(samples),
    results: results_out,
    perTournament,
    uniformLogLoss: Number(Math.log(3).toFixed(4)),
    winner: ranked[0][0],
    notes: [
      'Walk-forward: each tournament is predicted by weights fit only on prior World Cups (strictly out-of-sample).',
      'All out-of-sample predictions are pooled into one set for the metrics below.',
      'Elo is point-in-time; GDP/population are the tournament-year World Bank values; FIFA points omitted (Elo carries strength).',
      'Each model is independently calibrated (scale + draw) on each fold, so the comparison isolates the weight vector.',
    ],
  }
  fs.writeFileSync(path.join(__dirname, '..', 'lib', 'model', 'backtest.json'), JSON.stringify(summary, null, 2) + '\n')

  console.log(`\n=== POOLED OUT-OF-SAMPLE (${results_out.fitted.n} WC matches, ${perTournament.length} tournaments) ===`)
  for (const [name, m] of ranked) {
    console.log(`${name.padEnd(9)} logLoss ${m.logLoss.toFixed(4)}  acc ${(m.accuracy * 100).toFixed(1)}%  brier ${m.brier.toFixed(4)}`)
  }
  console.log(`uniform   logLoss ${Math.log(3).toFixed(4)}`)
  console.log(`\nwinner (lowest pooled log-loss): ${summary.winner}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
