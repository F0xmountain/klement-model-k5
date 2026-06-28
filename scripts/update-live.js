#!/usr/bin/env node
/* eslint-disable */
// Event-driven update: pulls newly finished WC2026 matches from football-data.org,
// appends them to the committed live-results file, refreshes live topscorer
// standings, then refits the whole model so weights move after every match.
// Safe to run with no API key (it simply refits from the historical dataset).

const fs = require('fs')
const path = require('path')
const { fetchFinishedMatches, fetchScorers } = require('./model/live')
const { datasetName } = require('./model/dataset')
const { main: refit } = require('./fit-model')

const MODEL_DIR = path.join(__dirname, '..', 'lib', 'model')
const LIVE_RESULTS = path.join(MODEL_DIR, 'live-results.csv')
const PROCESSED = path.join(MODEL_DIR, 'processed-matches.json')
const LIVE_SCORERS = path.join(MODEL_DIR, 'live-scorers.json')
const HEADER = 'date,home_team,away_team,home_score,away_score,tournament,city,country,neutral'

function readProcessed() {
  if (!fs.existsSync(PROCESSED)) return new Set()
  return new Set(JSON.parse(fs.readFileSync(PROCESSED, 'utf8')).ids || [])
}

function appendLiveResult(m) {
  if (!fs.existsSync(LIVE_RESULTS)) fs.writeFileSync(LIVE_RESULTS, HEADER + '\n')
  // live.js returns teams.json keys; the results CSV uses dataset names.
  const row = [m.date, datasetName(m.home), datasetName(m.away), m.hs, m.as, 'FIFA World Cup', '', 'United States', 'TRUE']
  fs.appendFileSync(LIVE_RESULTS, row.join(',') + '\n')
}

async function syncLive() {
  const key = process.env.API_FOOTBALL_KEY
  if (!key) {
    console.log('no API_FOOTBALL_KEY set; refitting from historical dataset only.')
    return 0
  }
  const processed = readProcessed()
  let added = 0
  try {
    const finished = await fetchFinishedMatches(key)
    for (const m of finished) {
      if (processed.has(m.id)) continue
      appendLiveResult(m)
      processed.add(m.id)
      added++
      console.log(`new result: ${m.home} ${m.hs}-${m.as} ${m.away} (${m.date})`)
    }
    fs.writeFileSync(PROCESSED, JSON.stringify({ ids: [...processed] }, null, 2) + '\n')
  } catch (err) {
    console.error('match sync failed:', err.message)
  }
  try {
    const scorers = await fetchScorers(key)
    fs.writeFileSync(LIVE_SCORERS, JSON.stringify({ generatedAt: new Date().toISOString(), scorers }, null, 2) + '\n')
  } catch (err) {
    console.error('scorer sync failed:', err.message)
  }
  return added
}

async function main() {
  const added = await syncLive()
  console.log(`synced ${added} new finished match(es); refitting model...`)
  await refit()
  console.log('update-live complete.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
