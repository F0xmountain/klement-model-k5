import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { revalidatePath } from 'next/cache'
import { isAdminAuthed } from '@/lib/admin-auth'
import type { MatchPrediction } from '@/lib/model-accuracy'

const LOG_PATH = join(process.cwd(), 'lib', 'prediction-log.json')

function readLog(): MatchPrediction[] {
  return JSON.parse(readFileSync(LOG_PATH, 'utf8')) as MatchPrediction[]
}

function writeLog(log: MatchPrediction[]): void {
  writeFileSync(LOG_PATH, JSON.stringify(log, null, 2) + '\n', 'utf8')
}

const isProb = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1
const isGoals = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0

export async function GET() {
  return Response.json(readLog())
}

export async function POST(req: Request) {
  if (!(await isAdminAuthed())) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const b = await req.json()
  if (
    typeof b.matchId !== 'string' || !b.matchId ||
    typeof b.homeTeam !== 'string' || typeof b.awayTeam !== 'string' ||
    typeof b.matchDate !== 'string' ||
    !isProb(b.predictedHome) || !isProb(b.predictedDraw) || !isProb(b.predictedAway) ||
    !isGoals(b.actualHome) || !isGoals(b.actualAway)
  ) {
    return Response.json({ error: 'Invalid body' }, { status: 400 })
  }

  const log = readLog()
  if (log.some(e => e.matchId === b.matchId)) {
    return Response.json({ error: 'Duplicate matchId' }, { status: 409 })
  }

  const entry: MatchPrediction = {
    matchId: b.matchId,
    homeTeam: b.homeTeam,
    awayTeam: b.awayTeam,
    matchDate: b.matchDate,
    predictedHome: b.predictedHome,
    predictedDraw: b.predictedDraw,
    predictedAway: b.predictedAway,
    actualHome: b.actualHome,
    actualAway: b.actualAway,
  }
  log.push(entry)
  writeLog(log)

  revalidatePath('/', 'layout')
  return Response.json({ ok: true })
}

export async function DELETE(req: Request) {
  if (!(await isAdminAuthed())) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { matchId } = await req.json()
  if (typeof matchId !== 'string') {
    return Response.json({ error: 'Invalid body' }, { status: 400 })
  }

  const log = readLog()
  const next = log.filter(e => e.matchId !== matchId)
  writeLog(next)

  revalidatePath('/', 'layout')
  return Response.json({ ok: true, removed: log.length - next.length })
}
