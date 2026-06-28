/* eslint-disable */
// API-Football (api-sports.io) live client for the event-driven update job.
// Activates only when API_FOOTBALL_KEY is set. Maps API-Football national-team
// names to teams.json keys; update-live.js converts those to dataset names for
// the results CSV. World Cup is league 1; season defaults to 2026.

const fs = require('fs')
const path = require('path')

const HOST = 'https://v3.football.api-sports.io'
const LEAGUE = process.env.API_FOOTBALL_LEAGUE || '1'
const SEASON = process.env.API_FOOTBALL_SEASON || '2026'
const FINISHED = new Set(['FT', 'AET', 'PEN'])

const teams = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'lib', 'teams.json'), 'utf8'))

function normalize(name) {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

// normalized API-Football name -> teams.json key, for names that differ.
const ALIASES = {
  usa: 'USA',
  unitedstates: 'USA',
  southkorea: 'South Korea',
  korearepublic: 'South Korea',
  ivorycoast: 'Ivory Coast',
  cotedivoire: 'Ivory Coast',
  drcongo: 'Congo DR',
  congodr: 'Congo DR',
  czechrepublic: 'Czechia',
  bosniaandherzegovina: 'Bosnia-Herz',
  bosniaherzegovina: 'Bosnia-Herz',
  curacao: 'Curacao',
  capeverdeislands: 'Cape Verde',
  capeverde: 'Cape Verde',
  turkiye: 'Turkey',
}

const KEY_BY_NORM = {}
for (const key of Object.keys(teams)) KEY_BY_NORM[normalize(key)] = key

function resolveKey(name) {
  if (!name) return null
  const norm = normalize(name)
  return KEY_BY_NORM[norm] || ALIASES[norm] || null
}

async function getJson(pathPart, key) {
  const res = await fetch(`${HOST}${pathPart}`, { headers: { 'x-apisports-key': key } })
  if (!res.ok) throw new Error(`api-football ${pathPart} -> ${res.status}`)
  const data = await res.json()
  // API-Football returns errors as [] when none, or as an object (access, plan,
  // quota, ...) when present. Surface any of them rather than treating as empty.
  const errs = data.errors
  if (errs && !Array.isArray(errs) && Object.keys(errs).length) {
    throw new Error(`api-football: ${Object.values(errs).join('; ')}`)
  }
  return data
}

async function fetchFinishedMatches(key) {
  const data = await getJson(`/fixtures?league=${LEAGUE}&season=${SEASON}`, key)
  const out = []
  const unmatched = new Set()
  for (const f of data.response || []) {
    if (!FINISHED.has(f.fixture?.status?.short)) continue
    const home = resolveKey(f.teams?.home?.name)
    const away = resolveKey(f.teams?.away?.name)
    if (!home) unmatched.add(f.teams?.home?.name)
    if (!away) unmatched.add(f.teams?.away?.name)
    if (!home || !away) continue
    out.push({
      id: f.fixture.id,
      date: (f.fixture.date || '').slice(0, 10),
      home,
      away,
      hs: f.goals?.home,
      as: f.goals?.away,
    })
  }
  if (unmatched.size) console.warn('unmatched team names:', [...unmatched].join(', '))
  return out
}

async function fetchScorers(key) {
  const data = await getJson(`/players/topscorers?league=${LEAGUE}&season=${SEASON}`, key)
  return (data.response || []).map((r) => ({
    player: r.player?.name || '',
    team: resolveKey(r.statistics?.[0]?.team?.name) || r.statistics?.[0]?.team?.name || '',
    goals: r.statistics?.[0]?.goals?.total || 0,
  }))
}

module.exports = { fetchFinishedMatches, fetchScorers, resolveKey }
