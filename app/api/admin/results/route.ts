import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { revalidatePath } from 'next/cache'
import { isAdminAuthed } from '@/lib/admin-auth'
import { historicalElo } from '@/lib/klement-custom'

interface ResultEntry {
  teamA: string
  teamB: string
  scoreA: number
  scoreB: number
  playedAt?: string
}

interface ResultsFile {
  meta: { lastUpdated: string | null }
  results: Record<string, ResultEntry>
}

const ELO_K = 32
const ELO_DEFAULT = 1500

function expectedScore(eloA: number, eloB: number): number {
  return 1 / (1 + 10 ** ((eloB - eloA) / 400))
}

function actualScore(scoreA: number, scoreB: number): number {
  if (scoreA > scoreB) return 1
  if (scoreA < scoreB) return 0
  return 0.5
}

// Herberekent elo-current.json van scratch op basis van alle opgeslagen
// uitslagen, met elo-history.json als startwaarde per team. Idempotent —
// het corrigeren van een eerder ingevoerde uitslag geeft zo altijd de
// juiste eindstand, zonder een aparte "ongedaan maken"-stap.
function recomputeElo(results: Record<string, ResultEntry>): Record<string, number> {
  const elo: Record<string, number> = {}
  for (const { teamA, teamB, scoreA, scoreB } of Object.values(results)) {
    const eloA = elo[teamA] ?? historicalElo(teamA) ?? ELO_DEFAULT
    const eloB = elo[teamB] ?? historicalElo(teamB) ?? ELO_DEFAULT
    const expA = expectedScore(eloA, eloB)
    const actA = actualScore(scoreA, scoreB)
    elo[teamA] = eloA + ELO_K * (actA - expA)
    elo[teamB] = eloB + ELO_K * ((1 - actA) - (1 - expA))
  }
  return elo
}

export async function POST(req: Request) {
  if (!(await isAdminAuthed())) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { matchKey, teamA, teamB, scoreA, scoreB } = await req.json()
  if (
    typeof matchKey !== 'string' || typeof teamA !== 'string' || typeof teamB !== 'string' ||
    typeof scoreA !== 'number' || typeof scoreB !== 'number' ||
    scoreA < 0 || scoreB < 0
  ) {
    return Response.json({ error: 'Invalid body' }, { status: 400 })
  }

  const now = new Date().toISOString()

  const resultsPath = join(process.cwd(), 'lib', 'results.json')
  const file = JSON.parse(readFileSync(resultsPath, 'utf8')) as ResultsFile
  file.results[matchKey] = { teamA, teamB, scoreA, scoreB, playedAt: now }
  file.meta.lastUpdated = now
  writeFileSync(resultsPath, JSON.stringify(file, null, 2) + '\n', 'utf8')

  const eloCurrent = recomputeElo(file.results)
  const eloPath = join(process.cwd(), 'lib', 'elo-current.json')
  writeFileSync(eloPath, JSON.stringify(eloCurrent, null, 2) + '\n', 'utf8')

  revalidatePath('/', 'layout')
  return Response.json({ ok: true })
}
