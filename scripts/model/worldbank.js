/* eslint-disable */
// Free World Bank API client (no key) for point-in-time GDP per capita and
// population by country and year. Results are cached so reruns are instant.

const fs = require('fs')
const path = require('path')

const CACHE = path.join(__dirname, '..', '.cache', 'worldbank.json')
const BASE = 'https://api.worldbank.org/v2'
const GDP = 'NY.GDP.PCAP.CD'
const POP = 'SP.POP.TOTL'
const FROM = 1990
const TO = 2025

function loadCache() {
  if (fs.existsSync(CACHE)) return JSON.parse(fs.readFileSync(CACHE, 'utf8'))
  return {}
}

function saveCache(data) {
  fs.mkdirSync(path.dirname(CACHE), { recursive: true })
  fs.writeFileSync(CACHE, JSON.stringify(data, null, 2) + '\n')
}

async function fetchSeries(iso3, indicator) {
  const url = `${BASE}/country/${iso3}/indicator/${indicator}?date=${FROM}:${TO}&format=json&per_page=500`
  const res = await fetch(url, { signal: AbortSignal.timeout(20000) })
  if (!res.ok) throw new Error(`worldbank ${iso3}/${indicator} -> ${res.status}`)
  const body = await res.json()
  const rows = Array.isArray(body) ? body[1] || [] : []
  const series = {}
  for (const row of rows) {
    if (row.value !== null && row.value !== undefined) series[row.date] = row.value
  }
  return series
}

async function ensureData(iso3List) {
  const cache = loadCache()
  const unique = [...new Set(iso3List)]
  for (const iso3 of unique) {
    const cached = cache[iso3]
    const complete = cached && Object.keys(cached.gdp).length && Object.keys(cached.pop).length
    if (complete) continue
    try {
      const gdp = await fetchSeries(iso3, GDP)
      const pop = await fetchSeries(iso3, POP)
      cache[iso3] = { gdp, pop }
    } catch (err) {
      console.warn(`worldbank fetch failed for ${iso3}: ${err.message}`)
      cache[iso3] = { gdp: {}, pop: {} }
    }
  }
  saveCache(cache)
  return cache
}

function nearest(series, year) {
  if (series[year] !== undefined) return series[year]
  // Ascending scan with strict < so ties resolve toward the earlier year; this
  // is mirrored byte-for-byte by nearestYear() in lib/sensitivity/sources.ts.
  const years = Object.keys(series).map(Number).sort((a, b) => a - b)
  let best = null
  let bestDist = Infinity
  for (const y of years) {
    const dist = Math.abs(y - year)
    if (dist < bestDist) {
      bestDist = dist
      best = series[y]
    }
  }
  return best
}

function makeLookup(cache) {
  return {
    gdpK(iso3, year) {
      const v = cache[iso3] ? nearest(cache[iso3].gdp, year) : null
      return v === null || v === undefined ? null : v / 1000
    },
    popM(iso3, year) {
      const v = cache[iso3] ? nearest(cache[iso3].pop, year) : null
      return v === null || v === undefined ? null : v / 1e6
    },
  }
}

module.exports = { ensureData, makeLookup }
