export type Match = {
  date: string
  home: string
  away: string
  hs: number
  as: number
  tournament: string
  neutral: boolean
  country: string
}

export type WorldBankLookup = {
  gdpK(iso3: string, year: number): number | null
  popM(iso3: string, year: number): number | null
}

export class SourceFetchError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SourceFetchError'
  }
}

const RESULTS_URL =
  'https://raw.githubusercontent.com/martj42/international_results/master/results.csv'
const WORLD_BANK_BASE = 'https://api.worldbank.org/v2/country/all/indicator'
const GDP_INDICATOR = 'NY.GDP.PCAP.CD'
const POP_INDICATOR = 'SP.POP.TOTL'
const FETCH_TIMEOUT_MS = 20000

export async function fetchResults(): Promise<Match[]> {
  const text = await fetchText(RESULTS_URL, 'results.csv')
  return parseResultsCsv(text)
}

async function fetchText(url: string, label: string): Promise<string> {
  const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
  if (!res.ok) {
    throw new SourceFetchError(`${label} fetch failed: ${res.status} ${res.statusText}`)
  }
  return res.text()
}

function parseResultsCsv(text: string): Match[] {
  const lines = text.split('\n')
  const header = splitCsvLine(lines[0])
  const cols = mapColumns(header)
  const matches: Match[] = []
  for (let i = 1; i < lines.length; i++) {
    const match = parseResultRow(lines[i], cols)
    if (match) matches.push(match)
  }
  return matches
}

type ColumnIndex = {
  date: number
  home: number
  away: number
  homeScore: number
  awayScore: number
  tournament: number
  country: number
  neutral: number
}

function mapColumns(header: string[]): ColumnIndex {
  const at = (name: string): number => header.indexOf(name)
  return {
    date: at('date'),
    home: at('home_team'),
    away: at('away_team'),
    homeScore: at('home_score'),
    awayScore: at('away_score'),
    tournament: at('tournament'),
    country: at('country'),
    neutral: at('neutral'),
  }
}

function parseResultRow(line: string, cols: ColumnIndex): Match | null {
  const fields = splitCsvLine(line)
  if (fields.length <= cols.neutral) return null
  const hs = Number(fields[cols.homeScore])
  const as = Number(fields[cols.awayScore])
  // Unplayed fixtures carry empty or non-numeric scores; drop them.
  if (!isPlayedScore(fields[cols.homeScore], hs) || !isPlayedScore(fields[cols.awayScore], as)) {
    return null
  }
  return buildMatch(fields, cols, hs, as)
}

function isPlayedScore(raw: string, parsed: number): boolean {
  return raw.trim() !== '' && Number.isFinite(parsed)
}

function buildMatch(fields: string[], cols: ColumnIndex, hs: number, as: number): Match {
  return {
    date: fields[cols.date],
    home: fields[cols.home],
    away: fields[cols.away],
    hs,
    as,
    tournament: fields[cols.tournament],
    country: fields[cols.country] ?? '',
    neutral: fields[cols.neutral].trim().toUpperCase() === 'TRUE',
  }
}

// Quote-aware split: city and country fields can embed commas inside double
// quotes, so a naive comma split would shift every later column.
function splitCsvLine(line: string): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const result = consumeChar(line, i, current, inQuotes)
    if (result.pushField) {
      fields.push(current)
      current = ''
    } else {
      current = result.current
    }
    inQuotes = result.inQuotes
    i = result.nextIndex
  }
  fields.push(current)
  return fields
}

type ConsumeResult = {
  current: string
  inQuotes: boolean
  pushField: boolean
  nextIndex: number
}

function consumeChar(line: string, i: number, current: string, inQuotes: boolean): ConsumeResult {
  const ch = line[i]
  if (ch === '"') return consumeQuote(line, i, current, inQuotes)
  if (ch === ',' && !inQuotes) {
    return { current, inQuotes, pushField: true, nextIndex: i }
  }
  return { current: current + ch, inQuotes, pushField: false, nextIndex: i }
}

function consumeQuote(line: string, i: number, current: string, inQuotes: boolean): ConsumeResult {
  // A doubled quote inside a quoted field is a literal quote character.
  if (inQuotes && line[i + 1] === '"') {
    return { current: current + '"', inQuotes, pushField: false, nextIndex: i + 1 }
  }
  return { current, inQuotes: !inQuotes, pushField: false, nextIndex: i }
}

type IndicatorSeries = Map<string, Map<number, number>>

export async function fetchWorldBank(): Promise<WorldBankLookup> {
  const gdp = await fetchIndicator(GDP_INDICATOR)
  const pop = await fetchIndicator(POP_INDICATOR)
  return makeLookup(gdp, pop)
}

// Backward-only variant: gdp/pop for tournament year T resolve to the maximal
// series year <= T, never a later value. A nearest-in-either-direction lookup
// would inject post-tournament economic data into a pre-tournament feature, a
// silent lookahead that contaminates every out-of-sample fold and the sealed
// 2026 number. select.ts uses this so the train<=2014 / holdout 2018-2026 split
// stays leak-free.
export async function fetchWorldBankBackward(): Promise<WorldBankLookup> {
  const gdp = await fetchIndicator(GDP_INDICATOR)
  const pop = await fetchIndicator(POP_INDICATOR)
  return makeBackwardLookup(gdp, pop)
}

async function fetchIndicator(indicator: string): Promise<IndicatorSeries> {
  const series: IndicatorSeries = new Map()
  const first = await fetchIndicatorPage(indicator, 1)
  collectRows(first.rows, series)
  for (let page = 2; page <= first.pages; page++) {
    const next = await fetchIndicatorPage(indicator, page)
    collectRows(next.rows, series)
  }
  return series
}

type WorldBankMeta = { pages: number }
type WorldBankRow = { countryiso3code: string; date: string; value: number | null }
type IndicatorPage = { pages: number; rows: WorldBankRow[] }

async function fetchIndicatorPage(indicator: string, page: number): Promise<IndicatorPage> {
  const url = `${WORLD_BANK_BASE}/${indicator}?date=1990:2025&format=json&per_page=25000&page=${page}`
  const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
  if (!res.ok) {
    throw new SourceFetchError(`world bank ${indicator} page ${page} failed: ${res.status}`)
  }
  return parseIndicatorBody(await res.json(), indicator, page)
}

function parseIndicatorBody(body: unknown, indicator: string, page: number): IndicatorPage {
  if (!Array.isArray(body) || body.length < 2) {
    throw new SourceFetchError(`world bank ${indicator} page ${page} malformed response`)
  }
  const meta = body[0] as WorldBankMeta
  const rows = Array.isArray(body[1]) ? (body[1] as WorldBankRow[]) : []
  return { pages: Number(meta.pages) || 1, rows }
}

function collectRows(rows: WorldBankRow[], series: IndicatorSeries): void {
  for (const row of rows) {
    if (row.value === null || row.value === undefined) continue
    const iso3 = row.countryiso3code
    const year = Number(row.date)
    if (!iso3 || !Number.isFinite(year)) continue
    addPoint(series, iso3, year, row.value)
  }
}

function addPoint(series: IndicatorSeries, iso3: string, year: number, value: number): void {
  const existing = series.get(iso3)
  if (existing) {
    existing.set(year, value)
    return
  }
  series.set(iso3, new Map([[year, value]]))
}

function makeLookup(gdp: IndicatorSeries, pop: IndicatorSeries): WorldBankLookup {
  return {
    gdpK(iso3: string, year: number): number | null {
      return scaled(nearestYear(gdp.get(iso3), year), 1000)
    },
    popM(iso3: string, year: number): number | null {
      return scaled(nearestYear(pop.get(iso3), year), 1e6)
    },
  }
}

function makeBackwardLookup(gdp: IndicatorSeries, pop: IndicatorSeries): WorldBankLookup {
  return {
    gdpK(iso3: string, year: number): number | null {
      return scaled(nearestPriorYear(gdp.get(iso3), year), 1000)
    },
    popM(iso3: string, year: number): number | null {
      return scaled(nearestPriorYear(pop.get(iso3), year), 1e6)
    },
  }
}

function scaled(value: number | null, divisor: number): number | null {
  return value === null ? null : value / divisor
}

// Backward-restricted resolve: exact query year wins, else the maximal series
// year <= year, else null. closestByDistance limited to the prior direction.
function nearestPriorYear(series: Map<number, number> | undefined, year: number): number | null {
  if (!series || series.size === 0) return null
  const exact = series.get(year)
  if (exact !== undefined) return exact
  return maxPriorValue(series, year)
}

function maxPriorValue(series: Map<number, number>, year: number): number | null {
  let bestYear = -Infinity
  for (const candidate of series.keys()) {
    if (candidate <= year && candidate > bestYear) bestYear = candidate
  }
  return bestYear === -Infinity ? null : (series.get(bestYear) as number)
}

// Mirror of nearest() in scripts/model/worldbank.js: exact year wins, else the
// minimal absolute year distance, ties resolved toward the earlier year.
function nearestYear(series: Map<number, number> | undefined, year: number): number | null {
  if (!series || series.size === 0) return null
  const exact = series.get(year)
  if (exact !== undefined) return exact
  return closestByDistance(series, year)
}

function closestByDistance(series: Map<number, number>, year: number): number {
  const years = [...series.keys()].sort((a, b) => a - b)
  let best = years[0]
  let bestDist = Infinity
  for (const candidate of years) {
    const dist = Math.abs(candidate - year)
    if (dist < bestDist) {
      bestDist = dist
      best = candidate
    }
  }
  return series.get(best) as number
}
