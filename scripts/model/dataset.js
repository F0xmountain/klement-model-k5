/* eslint-disable */
const fs = require('fs')
const path = require('path')

const CACHE = path.join(__dirname, '..', '.cache')
const BASE = 'https://raw.githubusercontent.com/martj42/international_results/master'

// teams.json uses short labels; the historical dataset uses these full names.
const NAME_TO_DATASET = {
  USA: 'United States',
  'Congo DR': 'DR Congo',
  'Bosnia-Herz': 'Bosnia and Herzegovina',
  Czechia: 'Czech Republic',
  Curacao: 'Curaçao',
}

function datasetName(teamKey) {
  return NAME_TO_DATASET[teamKey] || teamKey
}

function buildDatasetToKey(teamKeys) {
  const inv = {}
  for (const key of teamKeys) inv[datasetName(key)] = key
  return inv
}

async function ensureFile(name) {
  const dest = path.join(CACHE, name)
  if (fs.existsSync(dest) && fs.statSync(dest).size > 0) return dest
  fs.mkdirSync(CACHE, { recursive: true })
  const res = await fetch(`${BASE}/${name}`)
  if (!res.ok) throw new Error(`download ${name} failed: ${res.status}`)
  fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()))
  return dest
}

function splitCsvLine(line) {
  return line.split(',')
}

// Committed accumulating file of finished WC2026 matches, appended by the live
// update job so each refit folds the newest real results into training.
const LIVE_RESULTS = path.join(__dirname, '..', '..', 'lib', 'model', 'live-results.csv')

function parseResultLines(text, out) {
  const lines = text.split('\n')
  for (let i = 1; i < lines.length; i++) {
    const c = splitCsvLine(lines[i])
    if (c.length < 9) continue
    const hs = Number(c[3])
    const as = Number(c[4])
    if (!Number.isFinite(hs) || !Number.isFinite(as)) continue
    out.push({
      date: c[0], home: c[1], away: c[2], hs, as,
      tournament: c[5], neutral: c[8].trim().toUpperCase() === 'TRUE',
    })
  }
}

async function loadResults() {
  const file = await ensureFile('results.csv')
  const out = []
  parseResultLines(fs.readFileSync(file, 'utf8'), out)
  if (fs.existsSync(LIVE_RESULTS)) parseResultLines(fs.readFileSync(LIVE_RESULTS, 'utf8'), out)
  return out
}

async function loadGoalscorers() {
  const file = await ensureFile('goalscorers.csv')
  const lines = fs.readFileSync(file, 'utf8').split('\n')
  const out = []
  for (let i = 1; i < lines.length; i++) {
    const c = splitCsvLine(lines[i])
    if (c.length < 8) continue
    out.push({
      date: c[0],
      team: c[3],
      scorer: c[4],
      ownGoal: c[6].trim().toUpperCase() === 'TRUE',
    })
  }
  return out
}

module.exports = { datasetName, buildDatasetToKey, loadResults, loadGoalscorers, CACHE }
