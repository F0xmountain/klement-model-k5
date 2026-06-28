#!/usr/bin/env node
/* eslint-disable */
// Fits the data-driven forecast model from real international results and writes
// the committed artifacts the app reads. Run by CI after each finished match and
// available locally via `npm run fit`.

const fs = require('fs')
const path = require('path')
const { datasetName, buildDatasetToKey, loadResults, loadGoalscorers } = require('./model/dataset')
const f = require('./model/fit')
const t = require('./model/tournament')
const { buildScorerRates, projectScorers } = require('./model/scorers')

const ROOT = path.join(__dirname, '..')
const OUT = path.join(ROOT, 'lib', 'model')
const TRAIN_CUTOFF = '2014-01-01'
const SCORER_WINDOW = '2022-01-01'
const STAMP = new Date().toISOString()

function parseGroups() {
  const fx = fs.readFileSync(path.join(ROOT, 'lib', 'fixtures.ts'), 'utf8')
  const block = fx.match(/GROUPS[\s\S]*?\n}/)[0]
  const groups = {}
  for (const line of block.split('\n')) {
    const m = line.match(/^\s*([A-L]):\s*\[(.+)\],?/)
    if (!m) continue
    groups[m[1]] = [...m[2].matchAll(/'([^']+)'/g)].map((x) => x[1])
  }
  return groups
}

function calcStandings(teams, results) {
  const map = {}
  for (const tm of teams) map[tm] = { team: tm, pts: 0, w: 0 }
  for (const { teamA, teamB, result } of results) {
    if (result === 'A') { map[teamA].pts += 3; map[teamA].w++ }
    else if (result === 'B') { map[teamB].pts += 3; map[teamB].w++ }
    else { map[teamA].pts++; map[teamB].pts++ }
  }
  return Object.values(map).sort((a, b) => (b.pts !== a.pts ? b.pts - a.pts : b.w - a.w))
}

function buildModel(teams, ratings, stats, beta, homeAdv, draw) {
  const elo = (key) => ratings[datasetName(key)] ?? 1500
  const sc = (key) => {
    const team = teams[key]
    if (!team) return 0
    const z = f.standardize(f.rawFactors(team, elo(key)), stats)
    let s = 0
    for (let k = 0; k < f.FACTOR_KEYS.length; k++) s += beta[k] * z[f.FACTOR_KEYS[k]]
    return s + (team.host ? homeAdv : 0)
  }
  const matchP = (a, b) => {
    const eta = sc(a) - sc(b)
    const dr = f.clamp(draw.max * Math.exp(-draw.decay * Math.abs(eta)), 0.05, 0.34)
    const pA = f.sigmoid(eta) * (1 - dr)
    const pB = (1 - f.sigmoid(eta)) * (1 - dr)
    return { pA, dr, pB }
  }
  const simResult = (a, b) => {
    const { pA, dr } = matchP(a, b)
    const r = Math.random()
    return r < pA ? 'A' : r < pA + dr ? 'D' : 'B'
  }
  return { sc, matchP, simResult }
}

function evaluate(trainRows, teams, stats, beta, homeAdv, draw) {
  const mkEta = (row) => {
    const zh = f.standardize(f.rawFactors(teams[row.keyHome], row.eloHome), stats)
    const za = f.standardize(f.rawFactors(teams[row.keyAway], row.eloAway), stats)
    let eta = homeAdv * (row.neutral ? 0 : 1)
    for (let k = 0; k < f.FACTOR_KEYS.length; k++) eta += beta[k] * (zh[f.FACTOR_KEYS[k]] - za[f.FACTOR_KEYS[k]])
    return eta
  }
  let hit = 0, ll = 0, brier = 0
  const base = { A: 0, D: 0, B: 0 }
  for (const row of trainRows) base[row.hs > row.as ? 'A' : row.hs < row.as ? 'B' : 'D']++
  const n = trainRows.length
  const pBase = { A: base.A / n, D: base.D / n, B: base.B / n }
  let llNull = 0
  const bins = Array.from({ length: 10 }, () => ({ sum: 0, hits: 0, n: 0 }))
  for (const row of trainRows) {
    const eta = mkEta(row)
    const dr = f.clamp(draw.max * Math.exp(-draw.decay * Math.abs(eta)), 0.05, 0.34)
    const pA = f.sigmoid(eta) * (1 - dr)
    const pB = (1 - f.sigmoid(eta)) * (1 - dr)
    const p = { A: pA, D: dr, B: pB }
    const actual = row.hs > row.as ? 'A' : row.hs < row.as ? 'B' : 'D'
    const pred = pA > dr && pA > pB ? 'A' : pB > dr && pB > pA ? 'B' : 'D'
    if (pred === actual) hit++
    ll += -Math.log(Math.max(p[actual], 1e-9))
    llNull += -Math.log(Math.max(pBase[actual], 1e-9))
    for (const c of ['A', 'D', 'B']) brier += (p[c] - (actual === c ? 1 : 0)) ** 2
    const bi = Math.min(9, Math.floor(pA * 10))
    bins[bi].sum += pA
    bins[bi].hits += actual === 'A' ? 1 : 0
    bins[bi].n++
  }
  return {
    nMatches: n,
    accuracy: hit / n,
    logLoss: ll / n,
    brier: brier / n,
    pseudoR2: 1 - ll / llNull,
    drawRate: base.D / n,
    calibration: bins
      .filter((b) => b.n > 0)
      .map((b) => ({ predicted: b.sum / b.n, observed: b.hits / b.n, n: b.n })),
  }
}

async function main() {
  const teams = JSON.parse(fs.readFileSync(path.join(ROOT, 'lib', 'teams.json'), 'utf8'))
  const teamKeys = Object.keys(teams)
  const datasetToKey = buildDatasetToKey(teamKeys)
  const groups = parseGroups()
  const participants = new Set(Object.values(groups).flat())

  console.log('loading datasets...')
  const results = await loadResults()
  const goalscorers = await loadGoalscorers()
  console.log(`results=${results.length} goalscorers=${goalscorers.length}`)

  const isTrainTeam = (ds) => !!datasetToKey[ds]
  const { ratings, trainRows } = f.runElo(results, isTrainTeam, TRAIN_CUTOFF)
  for (const row of trainRows) {
    row.keyHome = datasetToKey[row.home]
    row.keyAway = datasetToKey[row.away]
  }
  console.log(`elo done, train rows=${trainRows.length}`)

  const teamFactors = teamKeys.map((k) => f.rawFactors(teams[k], ratings[datasetName(k)] ?? 1500))
  const stats = f.standardizer(teamFactors)
  const mkRaw = (ds, elo) => f.rawFactors(teams[datasetToKey[ds]], elo)

  const { beta, homeAdv } = f.fitWeights(trainRows, null, mkRaw, stats)
  const scoreOf = (row) => {
    const zh = f.standardize(mkRaw(row.home, row.eloHome), stats)
    const za = f.standardize(mkRaw(row.away, row.eloAway), stats)
    let eta = homeAdv * (row.neutral ? 0 : 1)
    for (let k = 0; k < f.FACTOR_KEYS.length; k++) eta += beta[k] * (zh[f.FACTOR_KEYS[k]] - za[f.FACTOR_KEYS[k]])
    return eta
  }
  const draw = f.fitDraw(trainRows, scoreOf)
  const deltaOf = (row) => {
    const zh = f.standardize(mkRaw(row.home, row.eloHome), stats)
    const za = f.standardize(mkRaw(row.away, row.eloAway), stats)
    let d = 0
    for (let k = 0; k < f.FACTOR_KEYS.length; k++) d += beta[k] * (zh[f.FACTOR_KEYS[k]] - za[f.FACTOR_KEYS[k]])
    return d
  }
  const poisson = f.fitPoisson(trainRows, deltaOf, (row) => row.neutral)

  const metrics = evaluate(trainRows, Object.fromEntries(teamKeys.map((k) => [k, teams[k]])), stats, beta, homeAdv, draw)
  console.log(`accuracy=${metrics.accuracy.toFixed(3)} logLoss=${metrics.logLoss.toFixed(3)} pseudoR2=${metrics.pseudoR2.toFixed(3)}`)

  const model = buildModel(teams, ratings, stats, beta, homeAdv, draw)

  const labels = { gdp: 'National wealth', pop: 'Population base', temp: 'Climate fit', fifa: 'FIFA ranking', elo: 'Elo form (results)' }
  const importanceRaw = f.FACTOR_KEYS.map((k, i) => Math.abs(beta[i]))
  const hostStd = Math.sqrt((3 / teamKeys.length) * (1 - 3 / teamKeys.length))
  const importanceParts = [...importanceRaw, Math.abs(homeAdv) * hostStd]
  const impSum = importanceParts.reduce((s, v) => s + v, 0)
  const components = f.FACTOR_KEYS.map((k, i) => ({
    key: k,
    label: labels[k],
    beta: Number(beta[i].toFixed(4)),
    importancePct: Number(((importanceParts[i] / impSum) * 100).toFixed(1)),
    mean: Number(stats[k].mean.toFixed(4)),
    std: Number(stats[k].std.toFixed(4)),
  }))
  components.push({
    key: 'host', label: 'Home advantage', beta: Number(homeAdv.toFixed(4)),
    importancePct: Number(((importanceParts[5] / impSum) * 100).toFixed(1)), mean: 0, std: 1,
  })

  const weights = {
    generatedAt: STAMP,
    source: 'martj42/international_results (open historical international match data)',
    trainCutoff: TRAIN_CUTOFF,
    components,
    homeAdv: Number(homeAdv.toFixed(4)),
    draw: { max: Number(draw.max.toFixed(4)), decay: Number(draw.decay.toFixed(4)) },
    poisson: {
      mu: Number(poisson.mu.toFixed(4)),
      gamma: Number(poisson.gamma.toFixed(4)),
      homeBonus: Number(poisson.homeBonus.toFixed(4)),
      maxGoals: poisson.maxGoals,
    },
    standardizer: stats,
  }

  const ratingsOut = {}
  for (const k of teamKeys) ratingsOut[k] = Math.round(ratings[datasetName(k)] ?? 1500)

  const standings = t.expectedGroupStandings(groups, model.matchP)
  const qualifiers = t.pickQualifiers(standings)
  const bracket = t.seedBracket(qualifiers, model.sc, model.matchP)

  const mc = t.groupMonteCarlo(groups, model.simResult, calcStandings, 4000)
  const koWin = t.knockoutWinProb([...participants], model.matchP)
  const expMatches = t.expectedMatches([...participants], mc, koWin)

  const rates = buildScorerRates(goalscorers, results, datasetToKey, SCORER_WINDOW, participants)
  const scorers = projectScorers(rates, expMatches, 50)

  const topElo = teamKeys
    .map((k) => ({ team: k, elo: ratingsOut[k] }))
    .sort((a, b) => b.elo - a.elo)
    .slice(0, 12)

  const summary = {
    generatedAt: STAMP,
    dataSource: weights.source,
    datasetUrl: 'https://github.com/martj42/international_results',
    dateRange: `${TRAIN_CUTOFF} to ${results[results.length - 1].date}`,
    totalMatchesScanned: results.length,
    metrics,
    topElo,
    components,
    scorerWindow: SCORER_WINDOW,
    notes: [
      'Elo is computed point-in-time per match across all international results; no lookahead.',
      'Socio-economic factors (GDP, population, climate, FIFA points) use current values as slow-moving team attributes.',
      'Weights are logistic-regression coefficients re-fit from results; importance is the normalized coefficient magnitude.',
      'Refit runs after each finished WC2026 match via the live update job.',
    ],
  }

  fs.mkdirSync(OUT, { recursive: true })
  const write = (name, obj) => fs.writeFileSync(path.join(OUT, name), JSON.stringify(obj, null, 2) + '\n')
  write('weights.json', weights)
  write('ratings.json', { generatedAt: STAMP, ratings: ratingsOut })
  write('bracket.json', { generatedAt: STAMP, standings, qualifiers, rounds: bracket })
  write('scorers.json', { generatedAt: STAMP, window: SCORER_WINDOW, players: scorers })
  write('fit-summary.json', summary)
  console.log('artifacts written to lib/model/')
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e)
    process.exit(1)
  })
}

module.exports = { main }
