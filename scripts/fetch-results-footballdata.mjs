#!/usr/bin/env node
/**
 * Ingests finished FIFA World Cup 2026 results from football-data.org into
 * lib/results.json and recomputes lib/elo-current.json (same K-factor logic as
 * fetch-results.mjs). Also fetches per-match detail into lib/match-stats.json.
 *
 * IMPORTANT — football-data.org is a scores/fixtures API and does NOT provide xG or
 * possession. match-stats.json stores what IS available (full-time + half-time
 * score, and bookings/cards when the plan returns them); xg and possession are kept
 * null so the schema is stable if you later switch to a provider that has them.
 *
 * Persistence: writes JSON files + git commit via the workflow (like the other cron
 * scripts) — NOT a POST to the auth-gated admin route.
 *
 * Usage:
 *   FOOTBALL_DATA_KEY=... node scripts/fetch-results-footballdata.mjs            # ingest + write
 *   FOOTBALL_DATA_KEY=... node scripts/fetch-results-footballdata.mjs --dry-run  # report only
 */

import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const lib = f => join(__dirname, '..', 'lib', f)

const API_BASE = 'https://api.football-data.org/v4'
const COMPETITION = 'WC'
const ELO_K = 32
const ELO_DEFAULT = 1500
const RATE_LIMIT_MS = 6500 // free tier ≈ 10 requests/minute

// football-data.org teamnaam → teams.json-sleutel. Alleen de afwijkende namen;
// breid uit zodra een wedstrijd wordt overgeslagen als "unknown team".
const FD_NAME_MAP = {
  'Bosnia and Herzegovina': 'Bosnia-Herz',
  'Cabo Verde': 'Cape Verde',
  'Curaçao': 'Curacao',
  'DR Congo': 'Congo DR',
  'Côte d’Ivoire': 'Ivory Coast',
  "Côte d'Ivoire": 'Ivory Coast',
  'IR Iran': 'Iran',
  'Korea Republic': 'South Korea',
  'United States': 'USA',
  'Türkiye': 'Turkey',
}
const canon = n => FD_NAME_MAP[n] ?? n

const makeSlug = (a, b) => `${a.toLowerCase().replace(/ /g, '-')}-vs-${b.toLowerCase().replace(/ /g, '-')}`
const pairKey = (a, b) => [a, b].sort().join('|')
const sleep = ms => new Promise(r => setTimeout(r, ms))

function historicalElo(history, name) {
  for (let i = history.length - 1; i >= 0; i--) {
    const v = history[i][name]
    if (typeof v === 'number') return v
  }
  return undefined
}

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

// Voegt nieuwe afgeronde football-data.org-wedstrijden toe aan `results` (in plaats).
// Geeft { added, skipped, matchIds } — matchIds koppelt slug → football-data match-id
// voor de optionele stats-ophaling.
export function ingestNewResults(matches, results, validTeams, log = () => {}) {
  const seenPairs = new Set(Object.values(results).map(r => pairKey(r.teamA, r.teamB)))
  const finished = matches
    .filter(m => m.status === 'FINISHED' && m.score?.fullTime?.home != null && m.score?.fullTime?.away != null)
    .sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate))

  let added = 0
  let skipped = 0
  const matchIds = {}
  for (const m of finished) {
    const teamA = canon(m.homeTeam?.name ?? '')
    const teamB = canon(m.awayTeam?.name ?? '')
    if (!validTeams.has(teamA) || !validTeams.has(teamB)) {
      log(`Skipping (unknown team): ${m.homeTeam?.name} vs ${m.awayTeam?.name}`)
      skipped++
      continue
    }
    if (seenPairs.has(pairKey(teamA, teamB))) continue

    const slug = makeSlug(teamA, teamB)
    results[slug] = {
      teamA,
      teamB,
      scoreA: m.score.fullTime.home,
      scoreB: m.score.fullTime.away,
      playedAt: m.utcDate,
    }
    matchIds[slug] = m.id
    seenPairs.add(pairKey(teamA, teamB))
    added++
  }
  return { added, skipped, matchIds }
}

// Stats uit het football-data.org match-detail. xG/possession bestaan niet in deze
// API → null; we bewaren wel score, rust en (indien beschikbaar) kaarten.
export function extractStats(detail) {
  return {
    date: detail.utcDate ?? null,
    score: { home: detail.score?.fullTime?.home ?? null, away: detail.score?.fullTime?.away ?? null },
    halfTime: { home: detail.score?.halfTime?.home ?? null, away: detail.score?.halfTime?.away ?? null },
    cards: Array.isArray(detail.bookings)
      ? detail.bookings.map(b => ({ team: b.team?.name ?? null, player: b.player?.name ?? null, card: b.card ?? null, minute: b.minute ?? null }))
      : null,
    xg: null, // niet geleverd door football-data.org
    possession: null, // niet geleverd door football-data.org
  }
}

async function fdGet(path, key) {
  const res = await fetch(`${API_BASE}${path}`, { headers: { 'X-Auth-Token': key } })
  if (res.status === 429) throw new Error('football-data.org rate limit (429) — verlaag de frequentie')
  if (!res.ok) throw new Error(`football-data.org returned ${res.status} for ${path}`)
  return res.json()
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  const key = process.env.FOOTBALL_DATA_KEY
  if (!key) {
    // Geen sleutel → niets te doen; sla netjes over zodat de workflow niet faalt.
    console.log('FOOTBALL_DATA_KEY not set — skipping result ingestion.')
    return
  }

  const teams = JSON.parse(readFileSync(lib('teams.json'), 'utf8'))
  const validTeams = new Set(Object.keys(teams))
  const history = JSON.parse(readFileSync(lib('elo-history.json'), 'utf8'))

  const file = JSON.parse(readFileSync(lib('results.json'), 'utf8'))
  if (!file.results) file.results = {}
  if (!file.meta) file.meta = { lastUpdated: null }

  let data
  try {
    data = await fdGet(`/competitions/${COMPETITION}/matches?status=FINISHED`, key)
  } catch (err) {
    console.error('Failed to fetch matches:', err.message)
    process.exit(1)
  }
  const matches = data.matches ?? []
  console.log(`football-data.org returned ${matches.length} finished WC match(es).`)

  const before = new Set(Object.keys(file.results))
  const { added, skipped, matchIds } = ingestNewResults(matches, file.results, validTeams, console.error)
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
    console.log(`[dry-run] Would ingest ${added} new result(s), recompute Elo and fetch ${newKeys.length} match-stat detail(s). No files written.`)
    return
  }

  file.meta.lastUpdated = new Date().toISOString()
  writeFileSync(lib('results.json'), JSON.stringify(file, null, 2) + '\n', 'utf8')

  const eloCurrent = recomputeElo(file.results, history)
  writeFileSync(lib('elo-current.json'), JSON.stringify(eloCurrent, null, 2) + '\n', 'utf8')

  // Per nieuwe wedstrijd het detail ophalen voor lib/match-stats.json (rate-limited).
  const stats = JSON.parse(readFileSync(lib('match-stats.json'), 'utf8'))
  for (const slug of newKeys) {
    try {
      await sleep(RATE_LIMIT_MS)
      const detail = await fdGet(`/matches/${matchIds[slug]}`, key)
      stats[slug] = extractStats(detail)
    } catch (err) {
      console.error(`stats ${slug}: ${err.message}`)
    }
  }
  writeFileSync(lib('match-stats.json'), JSON.stringify(stats, null, 2) + '\n', 'utf8')

  console.log(`Ingested ${added} new result(s); recomputed Elo for ${Object.keys(eloCurrent).length} team(s); stored ${newKeys.length} match-stat record(s).`)
}

// Alleen draaien wanneer direct aangeroepen (niet bij import vanuit een test)
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main()
}
