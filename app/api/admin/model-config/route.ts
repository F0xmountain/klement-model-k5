import { writeFileSync } from 'fs'
import { join } from 'path'
import { revalidatePath } from 'next/cache'
import { isAdminAuthed } from '@/lib/admin-auth'
import { DEFAULT_WEIGHTS, baseFactorSum, BASE_SUM_SAVE_MIN, BASE_SUM_SAVE_MAX, type ModelWeights } from '@/lib/model-config'

const WEIGHT_KEYS = Object.keys(DEFAULT_WEIGHTS) as Array<keyof ModelWeights>

export async function POST(req: Request) {
  if (!(await isAdminAuthed())) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()

  const weights: Record<string, number | boolean> = {}
  for (const key of WEIGHT_KEYS) {
    const v = body[key]
    // Boolean schakelaars (altitude/travel) als bool; starPlayerScale in [0.5,2.0];
    // overige gewichten in [0,1].
    if (typeof DEFAULT_WEIGHTS[key] === 'boolean') {
      if (typeof v !== 'boolean') {
        return Response.json({ error: `Invalid toggle: ${key}` }, { status: 400 })
      }
      weights[key] = v
    } else {
      const [lo, hi] = key === 'starPlayerScale' ? [0.5, 2.0] : [0, 1]
      if (typeof v !== 'number' || !Number.isFinite(v) || v < lo || v > hi) {
        return Response.json({ error: `Invalid weight: ${key}` }, { status: 400 })
      }
      weights[key] = v
    }
  }

  // Weiger te ver-van-1.00 basisgewichten (te grote afwijking om zinvol te zijn).
  const sum = baseFactorSum(weights as unknown as ModelWeights)
  if (sum < BASE_SUM_SAVE_MIN || sum > BASE_SUM_SAVE_MAX) {
    return Response.json({ error: `Base weights sum to ${sum.toFixed(2)}; must be within [${BASE_SUM_SAVE_MIN}, ${BASE_SUM_SAVE_MAX}]` }, { status: 400 })
  }

  const configPath = join(process.cwd(), 'lib', 'model-config.json')
  writeFileSync(configPath, JSON.stringify(weights, null, 2) + '\n', 'utf8')

  revalidatePath('/', 'layout')
  return Response.json({ ok: true })
}
