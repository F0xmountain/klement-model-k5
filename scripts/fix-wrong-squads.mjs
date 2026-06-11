import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const filePath = join(__dirname, '..', 'lib', 'squads-db.json')
const db = JSON.parse(readFileSync(filePath, 'utf8'))

// These 12 teams' `squad` arrays were filled with another nation's roster
// (e.g. Egypt's squad is Denmark's). captain + star_players are correct;
// only the full 26-man squad listing is wrong. Flag for /admin/squads.
const AFFECTED = [
  'Egypte',
  'Iran',
  'Saoedi-Arabië',
  'Nieuw-Zeeland',
  'Tunesië',
  'Kaapverdië',
  'Irak',
  'Jordanië',
  'DR Congo',
  'Oezbekistan',
  'Ghana',
  'Panama',
]

for (const key of AFFECTED) {
  const team = db.teams[key]
  if (!team) throw new Error(`Unknown team: ${key}`)

  // Insert squad_data_error right after squad_complete
  const rebuilt = {}
  for (const k of Object.keys(team)) {
    rebuilt[k] = team[k]
    if (k === 'squad_complete') rebuilt.squad_data_error = true
  }
  db.teams[key] = rebuilt
}

writeFileSync(filePath, JSON.stringify(db, null, 2) + '\n', 'utf8')
console.log(`squad_data_error flagged on ${AFFECTED.length} teams`)
