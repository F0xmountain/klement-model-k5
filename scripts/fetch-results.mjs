#!/usr/bin/env node
/**
 * Ingests finished FIFA World Cup 2026 results from API-Football into
 * lib/results.json and recomputes lib/elo-current.json (same K-factor logic as
 * app/api/admin/results/route.ts). Run by GitHub Actions during the tournament.
 *
 * Persistence: like the repo's other cron scripts (fetch-form.mjs,
 * fetch-rankings.js) this writes JSON files directly and the workflow git-commits
 * them — the deploy reads the committed files. It deliberately does NOT POST to
 * /api/admin/results: that route is auth-gated and its writeFileSync does not
 * persist on a serverless host, so it can't be the ingestion path. This script
 * therefore replicates the route's results + Elo write.
 */

import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const lib = f => join(__dirname, '..', 'lib', f)

const API_BASE = 'https://v3.football.api-sports.io'
const WC_LEAGUE_ID = 1 // FIFA World Cup — verify against API-Football if no fixtures return
const SEASON = 2026
const ELO_K = 32
const ELO_DEFAULT = 1500

// API-Football national-team name → teams.json key (reverse of the alias map in
// /api/form and /api/h2h). Extend here if a fixture is skipped as "unknown team".
const API_TO_TEAMS = {
  'Bosnia and Herzegovina': 'Bosnia-Herz',
  'DR Congo': 'Congo DR',
  'Cape Verde Islands': 'Cape Verde',
}

// Zelfde slug-vorm als lib/fixtures.ts makeSlug()
const makeSlug = (a, b) => `${a.toLowerCase().replace(/ /g, '-')}-vs-${b.toLowerCase().replace(/ /g, '-')}`

// Volgorde-onafhankelijke identiteit van een wedstrijd (voor dedup, ongeacht
// home/away of welke key-conventie een eerdere bron gebruikte)
const pairKey = (a, b) => [a, b].sort().join('|')

const mapName = n => API_TO_TEAMS[n] ?? n

// Voegt nieuwe FT-uitslagen uit de API-Football fixtures toe aan `results` (in
// plaats). Filtert op status FT met geldige score, mapt teamnamen naar
// teams.json-sleutels, en slaat wedstrijden over die al zijn opgeslagen
// (volgorde-onafhankelijk) of waarvan een team onbekend is. Geeft {added, skipped}.
export function ingestNewResults(fixtures, results, validTeams, log = () => {}) {
  const seenPairs = new Set(Object.values(results).map(r => pairKey(r.teamA, r.teamB)))
  const finished = fixtures
    .filter(f => f.fixture?.status?.short === 'FT' && f.goals?.home != null && f.goals?.away != null)
    .sort((a, b) => new Date(a.fixture.date) - new Date(b.fixture.date))

  let added = 0
  let skipped = 0
  for (const f of finished) {
    const home = mapName(f.teams.home.name)
    const away = mapName(f.teams.away.name)

    if (!validTeams.has(home) || !validTeams.has(away)) {
      log(`Skipping (unknown team): ${f.teams.home.name} vs ${f.teams.away.name}`)
      skipped++
      continue
    }
    if (seenPairs.has(pairKey(home, away))) continue // al opgeslagen → niet opnieuw

    results[makeSlug(home, away)] = {
      teamA: home,
      teamB: away,
      scoreA: f.goals.home,
      scoreB: f.goals.away,
      playedAt: f.fixture.date,
    }
    seenPairs.add(pairKey(home, away))
    added++
  }
  return { added, skipped }
}

// Meest recente numerieke Elo voor een team uit elo-history.json
export function historicalElo(history, name) {
  for (let i = history.length - 1; i >= 0; i--) {
    const v = history[i][name]
    if (typeof v === 'number') return v
  }
  return undefined
}

// Herberekent Elo van scratch over alle uitslagen (idempotent), elo-history als
// startwaarde — identiek aan recomputeElo in app/api/admin/results/route.ts.
export function recomputeElo(results, history) {
  const elo = {}
  for (const { teamA, teamB, scoreA, scoreB } of Object.values(results)) {
    const eloA = elo[teamA] ?? historicalElo(history, teamA) ?? ELO_DEFAULT
    const eloB = elo[teamB] ?? historicalElo(history, teamB) ?? ELO_DEFAULT
    const expA = 1 / (1 + 10 ** ((eloB - eloA) / 400))
    const actA = scoreA > scoreB ? 1 : scoreA < scoreB ? 0 : 0.5
    elo[teamA] = eloA + ELO_K * (actA - expA)
    elo[teamB] = eloB + ELO_K * ((1 - actA) - (1 - expA))
  }
  return elo
}

async function fetchFixtures(apiKey) {
  const res = await fetch(`${API_BASE}/fixtures?league=${WC_LEAGUE_ID}&season=${SEASON}`, {
    headers: { 'x-apisports-key': apiKey },
  })
  if (!res.ok) throw new Error(`API-Football returned ${res.status}`)
  const data = await res.json()
  // API-Football antwoordt met HTTP 200 + een errors-veld bij bv. plan-restricties;
  // surface dat expliciet i.p.v. stilletjes als "0 wedstrijden" te behandelen.
  const errs = data.errors
  if (errs && (Array.isArray(errs) ? errs.length : Object.keys(errs).length)) {
    throw new Error('API-Football error: ' + JSON.stringify(errs))
  }
  return data.response ?? []
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  const apiKey = process.env.API_FOOTBALL_KEY
  if (!apiKey) {
    console.error('API_FOOTBALL_KEY is not set')
    process.exit(1)
  }

  const teams = JSON.parse(readFileSync(lib('teams.json'), 'utf8'))
  const validTeams = new Set(Object.keys(teams))
  const history = JSON.parse(readFileSync(lib('elo-history.json'), 'utf8'))

  const file = JSON.parse(readFileSync(lib('results.json'), 'utf8'))
  if (!file.results) file.results = {}
  if (!file.meta) file.meta = { lastUpdated: null }

  let fixtures
  try {
    fixtures = await fetchFixtures(apiKey)
  } catch (err) {
    console.error('Failed to fetch fixtures:', err.message)
    process.exit(1)
  }

  const ft = fixtures.filter(f => f.fixture?.status?.short === 'FT')
  console.log(`API-Football returned ${fixtures.length} fixture(s) for league ${WC_LEAGUE_ID} season ${SEASON}; ${ft.length} finished (FT).`)

  const before = new Set(Object.keys(file.results))
  const { added, skipped } = ingestNewResults(fixtures, file.results, validTeams, console.error)
  const newKeys = Object.keys(file.results).filter(k => !before.has(k))
  for (const k of newKeys) {
    const r = file.results[k]
    console.log(`  + ${r.teamA} ${r.scoreA}-${r.scoreB} ${r.teamB} (${r.playedAt?.slice(0, 10)})`)
  }

  if (added === 0) {
    console.log(`No new finished results to ingest (${skipped} skipped for unknown teams).`)
    return
  }

  if (dryRun) {
    console.log(`[dry-run] Would ingest ${added} new result(s) and recompute Elo. No files written.`)
    return
  }

  file.meta.lastUpdated = new Date().toISOString()
  writeFileSync(lib('results.json'), JSON.stringify(file, null, 2) + '\n', 'utf8')

  const eloCurrent = recomputeElo(file.results, history)
  writeFileSync(lib('elo-current.json'), JSON.stringify(eloCurrent, null, 2) + '\n', 'utf8')

  console.log(`Ingested ${added} new result(s); recomputed Elo for ${Object.keys(eloCurrent).length} team(s).`)
}

// Alleen draaien wanneer direct aangeroepen (niet bij import vanuit een test)
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main()
}
