// Pure fitting math: Elo ratings, logistic weight regression with point-in-time
// Elo features, draw calibration, and a Poisson goals model. No file I/O here.

const FACTOR_KEYS = ['gdp', 'pop', 'temp', 'fifa', 'elo']

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v))
}

function fG(gdp) {
  return clamp(1 - ((gdp - 35) / 35) ** 2, 0, 1)
}
function fP(pop, latam) {
  return clamp((Math.log(pop) / Math.log(200)) * (latam ? 1 : 0.3), 0, 1)
}
function fT(temp) {
  return clamp(1 - Math.abs(temp - 14) / 22, 0, 1)
}
function fF(fifa) {
  return clamp((fifa - 1400) / 600, 0, 1)
}

// Raw (un-standardized) factor vector for a team. elo is supplied separately so
// the same routine serves both current ratings and point-in-time training rows.
function rawFactors(team, elo) {
  return {
    gdp: fG(team.gdp),
    pop: fP(team.pop, team.latam),
    temp: fT(team.temp),
    fifa: fF(team.fifa),
    elo,
  }
}

function sigmoid(x) {
  return 1 / (1 + Math.exp(-x))
}

function tournamentWeight(name) {
  const n = name.toLowerCase()
  if (n === 'fifa world cup') return 60
  if (n.includes('confederations')) return 45
  if (
    n.includes('uefa euro') || n.includes('copa américa') || n.includes('copa america') ||
    n.includes('african cup') || n.includes('africa cup') || n.includes('asian cup') ||
    n.includes('gold cup') || n.includes('oceania nations')
  ) return 40
  if (n.includes('qualification') || n.includes('nations league')) return 25
  if (n.includes('friendly')) return 10
  return 20
}

const HFA = 65
const BASE_INIT = 1500

// Single chronological pass: builds final Elo for every team and records the
// pre-match Elo of both sides for matches that are training-eligible.
function runElo(matches, isTrainTeam, cutoff) {
  const sorted = matches.slice().sort((a, b) => (a.date < b.date ? -1 : 1))
  const r = {}
  const get = (t) => (r[t] === undefined ? (r[t] = BASE_INIT) : r[t])
  const rows = []
  for (const m of sorted) {
    const rh = get(m.home)
    const ra = get(m.away)
    if (
      m.date >= cutoff && isTrainTeam(m.home) && isTrainTeam(m.away)
    ) {
      rows.push({ ...m, eloHome: rh, eloAway: ra })
    }
    const diff = rh - ra + (m.neutral ? 0 : HFA)
    const eHome = 1 / (1 + 10 ** (-diff / 400))
    const sHome = m.hs > m.as ? 1 : m.hs < m.as ? 0 : 0.5
    const gd = Math.abs(m.hs - m.as)
    const g = gd <= 1 ? 1 : gd === 2 ? 1.5 : (11 + gd) / 8
    const k = tournamentWeight(m.tournament)
    const delta = k * g * (sHome - eHome)
    r[m.home] = rh + delta
    r[m.away] = ra - delta
  }
  return { ratings: r, trainRows: rows }
}

// Standardisation stats per factor over the tournament teams.
function standardizer(teamFactors) {
  const stats = {}
  for (const key of FACTOR_KEYS) {
    const vals = teamFactors.map((f) => f[key])
    const mean = vals.reduce((s, v) => s + v, 0) / vals.length
    const variance = vals.reduce((s, v) => s + (v - mean) ** 2, 0) / vals.length
    stats[key] = { mean, std: Math.sqrt(variance) || 1 }
  }
  return stats
}

function standardize(raw, stats) {
  const z = {}
  for (const key of FACTOR_KEYS) z[key] = (raw[key] - stats[key].mean) / stats[key].std
  return z
}

// Logistic regression on decisive matches. Features are per-factor standardized
// differences plus a home-advantage term. Returns beta per factor + homeAdv.
function fitWeights(trainRows, statsByName, mkRaw, stats) {
  const X = []
  const y = []
  const home = []
  for (const row of trainRows) {
    if (row.hs === row.as) continue
    const zh = standardize(mkRaw(row.home, row.eloHome), stats)
    const za = standardize(mkRaw(row.away, row.eloAway), stats)
    X.push(FACTOR_KEYS.map((k) => zh[k] - za[k]))
    home.push(row.neutral ? 0 : 1)
    y.push(row.hs > row.as ? 1 : 0)
  }
  const n = X.length
  const beta = FACTOR_KEYS.map(() => 0)
  let bHome = 0
  const lr = 0.3
  const lambda = 1e-3
  for (let iter = 0; iter < 4000; iter++) {
    const gb = beta.map(() => 0)
    let gh = 0
    for (let i = 0; i < n; i++) {
      let eta = bHome * home[i]
      for (let k = 0; k < beta.length; k++) eta += beta[k] * X[i][k]
      const err = sigmoid(eta) - y[i]
      for (let k = 0; k < beta.length; k++) gb[k] += err * X[i][k]
      gh += err * home[i]
    }
    for (let k = 0; k < beta.length; k++) beta[k] -= lr * (gb[k] / n + lambda * beta[k])
    bHome -= lr * (gh / n)
  }
  return { beta, homeAdv: bHome, nDecisive: n }
}

// Draw probability as a decaying function of |eta|, calibrated to empirical rates.
function fitDraw(trainRows, scoreOf) {
  const etas = []
  const draws = []
  for (const row of trainRows) {
    etas.push(scoreOf(row))
    draws.push(row.hs === row.as ? 1 : 0)
  }
  const drawRate = draws.reduce((s, v) => s + v, 0) / draws.length
  let best = { max: drawRate, decay: 1, err: Infinity }
  for (let max = 0.18; max <= 0.34; max += 0.01) {
    for (let decay = 0.2; decay <= 3; decay += 0.1) {
      let err = 0
      for (let i = 0; i < etas.length; i++) {
        const pred = clamp(max * Math.exp(-decay * Math.abs(etas[i])), 0.05, 0.34)
        err += (pred - draws[i]) ** 2
      }
      if (err < best.err) best = { max, decay, err }
    }
  }
  return { max: best.max, decay: best.decay, drawRate }
}

// Poisson goals: log(lambda) = mu +/- gamma*deltaScore + homeBonus.
function fitPoisson(trainRows, deltaOf, isNeutral) {
  let mu = Math.log(1.3)
  let gamma = 0.3
  let hb = 0.15
  const lr = 0.02
  for (let iter = 0; iter < 3000; iter++) {
    let gMu = 0, gGamma = 0, gHb = 0, n = 0
    for (const row of trainRows) {
      const d = deltaOf(row)
      const h = isNeutral(row) ? 0 : 1
      const logH = mu + gamma * d + hb * h
      const logA = mu - gamma * d
      const lamH = Math.exp(logH)
      const lamA = Math.exp(logA)
      gMu += (lamH - row.hs) + (lamA - row.as)
      gGamma += (lamH - row.hs) * d + (lamA - row.as) * -d
      gHb += (lamH - row.hs) * h
      n += 2
    }
    mu -= lr * (gMu / n)
    gamma -= lr * (gGamma / n)
    hb -= lr * (gHb / n)
  }
  return { mu, gamma, homeBonus: hb, maxGoals: 8 }
}

module.exports = {
  FACTOR_KEYS,
  clamp,
  rawFactors,
  sigmoid,
  runElo,
  standardizer,
  standardize,
  fitWeights,
  fitDraw,
  fitPoisson,
  tournamentWeight,
}
