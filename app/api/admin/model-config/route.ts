import { writeFileSync } from 'fs'
import { join } from 'path'
import { revalidatePath } from 'next/cache'
import { isAdminAuthed } from '@/lib/admin-auth'
import { DEFAULT_WEIGHTS, type ModelWeights } from '@/lib/model-config'

const WEIGHT_KEYS = Object.keys(DEFAULT_WEIGHTS) as Array<keyof ModelWeights>

export async function POST(req: Request) {
  if (!(await isAdminAuthed())) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()

  const weights: Partial<ModelWeights> = {}
  for (const key of WEIGHT_KEYS) {
    const v = body[key]
    if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > 1) {
      return Response.json({ error: `Invalid weight: ${key}` }, { status: 400 })
    }
    weights[key] = v
  }

  const configPath = join(process.cwd(), 'lib', 'model-config.json')
  writeFileSync(configPath, JSON.stringify(weights, null, 2) + '\n', 'utf8')

  revalidatePath('/', 'layout')
  return Response.json({ ok: true })
}
