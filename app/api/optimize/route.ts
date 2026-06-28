import { runOptimize } from '@/lib/sensitivity/optimize-run'

export const runtime = 'nodejs'
export const maxDuration = 60

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
}

export async function GET(): Promise<Response> {
  console.log('[optimize] request start')
  try {
    const result = await runOptimize()
    const pooled = result.headline.pooledLogLoss.toFixed(4)
    console.log(`[optimize] completed: family=${result.config.family} lambda=${result.config.lambda} pooledHoldout=${pooled}`)
    return new Response(JSON.stringify(result), { headers: JSON_HEADERS })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`[optimize] error ${message}`)
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: JSON_HEADERS })
  }
}
