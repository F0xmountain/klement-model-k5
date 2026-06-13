import { writeFileSync } from 'fs'
import { join } from 'path'
import { revalidatePath } from 'next/cache'
import { isAdminAuthed } from '@/lib/admin-auth'
import type { PlayerRating } from '@/lib/player-ratings'

// Schrijft de volledige ratings-lijst naar lib/player-ratings.json. De client
// stuurt altijd de complete lijst (bestaande + gewijzigde), zodat dit een
// simpele overschrijf is.
export async function POST(req: Request) {
  if (!(await isAdminAuthed())) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { ratings } = await req.json()
  if (!Array.isArray(ratings)) {
    return Response.json({ error: 'Invalid body' }, { status: 400 })
  }

  const clean: PlayerRating[] = []
  for (const r of ratings as PlayerRating[]) {
    if (
      typeof r?.matchId !== 'string' ||
      typeof r?.teamName !== 'string' ||
      typeof r?.playerName !== 'string' ||
      typeof r?.rating !== 'number' ||
      r.rating < 1 || r.rating > 10
    ) {
      return Response.json({ error: 'Invalid rating entry' }, { status: 400 })
    }
    clean.push({
      matchId: r.matchId,
      teamName: r.teamName,
      playerName: r.playerName,
      rating: Math.round(r.rating * 10) / 10,
    })
  }

  const filePath = join(process.cwd(), 'lib', 'player-ratings.json')
  writeFileSync(filePath, JSON.stringify({ ratings: clean }, null, 2) + '\n', 'utf8')

  revalidatePath('/', 'layout')
  return Response.json({ ok: true })
}
