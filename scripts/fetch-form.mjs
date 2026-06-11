#!/usr/bin/env node
/**
 * Fetches recent-form data for all 48 World Cup teams from this app's own
 * /api/form/[team] route (which itself talks to API-Football) and writes the
 * combined results to lib/form-cache.json — used as a fallback whenever the
 * live API or API_FOOTBALL_KEY is unavailable.
 *
 * Run by GitHub Actions daily at 03:00 UTC.
 */

import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SQUADS_DB_PATH = join(__dirname, '..', 'lib', 'squads-db.json')
const FORM_CACHE_PATH = join(__dirname, '..', 'lib', 'form-cache.json')

const DELAY_MS = 2000

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function main() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (!appUrl) {
    console.error('NEXT_PUBLIC_APP_URL is not set')
    process.exit(1)
  }

  const squadsDb = JSON.parse(readFileSync(SQUADS_DB_PATH, 'utf8'))
  const teamNames = Object.values(squadsDb.teams).map(t => t.name_en)

  const cache = JSON.parse(readFileSync(FORM_CACHE_PATH, 'utf8'))

  let updated = 0
  for (const team of teamNames) {
    try {
      const res = await fetch(`${appUrl}/api/form/${encodeURIComponent(team)}`)
      if (res.ok) {
        const data = await res.json()
        if (data.formScore !== null) {
          cache[team] = data
          updated++
        }
      } else {
        console.error(`${team}: HTTP ${res.status}`)
      }
    } catch (err) {
      console.error(`${team}: ${err.message}`)
    }
    await sleep(DELAY_MS)
  }

  writeFileSync(FORM_CACHE_PATH, JSON.stringify(cache, null, 2) + '\n', 'utf8')
  console.log(`Updated form data for ${updated}/${teamNames.length} team(s).`)
}

main()
