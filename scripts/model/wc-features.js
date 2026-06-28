/* eslint-disable */
// Shared point-in-time World Cup feature builders used by both the walk-forward
// backtest and the sensitivity-data export. Builds the pre-match Elo and the
// five raw factor values (gdp, pop, temp, elo, host) per World Cup match with no
// lookahead. The modeling math (standardize, logistic fit, calibrate) lives with
// each consumer; this module only produces feature rows.

const { clamp, tournamentWeight } = require('./fit')
const { NATIONS, HOSTS } = require('./wc-nations')

const FEATURES = ['gdp', 'pop', 'temp', 'elo', 'host']
const FIRST_WC = 1994
const HFA = 65

function fG(gdp) { return clamp(1 - ((gdp - 35) / 35) ** 2, 0, 1) }
function fP(pop, latam) { return clamp((Math.log(pop) / Math.log(200)) * (latam ? 1 : 0.3), 0, 1) }
function fT(temp) { return clamp(1 - Math.abs(temp - 14) / 22, 0, 1) }

// Single chronological pass over every international result. Records each World
// Cup match (1994-2026, both nations in the pool) with the pre-match Elo of both
// sides, then updates Elo. The Elo update weights matches by competition tier
// and goal difference; that weighting is fixed, not tuned.
function collectWorldCupRows(results) {
  const sorted = results.slice().sort((a, b) => (a.date < b.date ? -1 : 1))
  const r = {}
  const get = (t) => (r[t] === undefined ? (r[t] = 1500) : r[t])
  const rows = []
  for (const m of sorted) {
    const rh = get(m.home)
    const ra = get(m.away)
    const yr = Number(m.date.slice(0, 4))
    if (m.tournament === 'FIFA World Cup' && yr >= FIRST_WC && yr <= 2026 && NATIONS[m.home] && NATIONS[m.away]) {
      rows.push({ year: yr, home: m.home, away: m.away, hs: m.hs, as: m.as, eloHome: rh, eloAway: ra })
    }
    const diff = rh - ra + (m.neutral ? 0 : HFA)
    const eHome = 1 / (1 + 10 ** (-diff / 400))
    const sHome = m.hs > m.as ? 1 : m.hs < m.as ? 0 : 0.5
    const gd = Math.abs(m.hs - m.as)
    const g = gd <= 1 ? 1 : gd === 2 ? 1.5 : (11 + gd) / 8
    const delta = tournamentWeight(m.tournament) * g * (sHome - eHome)
    r[m.home] = rh + delta
    r[m.away] = ra - delta
  }
  return rows
}

function rawFeatures(name, year, elo, wb) {
  const n = NATIONS[name]
  const gdpK = wb.gdpK(n.iso3, year) ?? n.gdp ?? 5
  const popM = wb.popM(n.iso3, year) ?? n.pop ?? 10
  const isHost = (HOSTS[year] || []).includes(name)
  return { gdp: fG(gdpK), pop: fP(popM, n.latam), temp: fT(n.temp), elo, host: isHost ? 1 : 0 }
}

function buildSamples(wcRows, wb) {
  return wcRows.map((row) => ({
    year: row.year,
    home: row.home,
    away: row.away,
    homeRaw: rawFeatures(row.home, row.year, row.eloHome, wb),
    awayRaw: rawFeatures(row.away, row.year, row.eloAway, wb),
    label: row.hs > row.as ? 'A' : row.hs < row.as ? 'B' : 'D',
  }))
}

module.exports = { FEATURES, FIRST_WC, HFA, fG, fP, fT, collectWorldCupRows, rawFeatures, buildSamples }
