import { writeFileSync } from 'fs'
import { join } from 'path'
import { revalidatePath } from 'next/cache'
import { isAdminAuthed } from '@/lib/admin-auth'

export async function POST(req: Request) {
  if (!(await isAdminAuthed())) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { statuses } = await req.json()
  if (typeof statuses !== 'object' || statuses === null) {
    return Response.json({ error: 'Invalid body' }, { status: 400 })
  }

  const lastUpdated = new Date().toISOString()
  const filePath = join(process.cwd(), 'lib', 'player-status.json')
  writeFileSync(filePath, JSON.stringify({ lastUpdated, statuses }, null, 2) + '\n', 'utf8')

  revalidatePath('/', 'layout')
  return Response.json({ ok: true, lastUpdated })
}
