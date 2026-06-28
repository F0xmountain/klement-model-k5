import { runSensitivity } from '@/lib/sensitivity/run'
import type { ProgressEvent } from '@/lib/sensitivity/types'

export const runtime = 'nodejs'
export const maxDuration = 60

const NDJSON_HEADERS = {
  'Content-Type': 'application/x-ndjson',
  'Cache-Control': 'no-store',
}

export async function GET(): Promise<Response> {
  console.log('[sensitivity] request start')
  return new Response(sensitivityStream(), { headers: NDJSON_HEADERS })
}

function sensitivityStream(): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  const events = runSensitivity()
  return new ReadableStream({
    async pull(controller) {
      await pumpNext(events, controller, encoder)
    },
  })
}

async function pumpNext(
  events: AsyncGenerator<ProgressEvent>,
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
): Promise<void> {
  const next = await events.next()
  if (next.done) {
    console.log('[sensitivity] completed')
    controller.close()
    return
  }
  logEvent(next.value)
  controller.enqueue(encoder.encode(JSON.stringify(next.value) + '\n'))
}

function logEvent(event: ProgressEvent): void {
  if (event.type === 'stage') console.log(`[sensitivity] stage ${event.stage}`)
  if (event.type === 'error') console.error(`[sensitivity] error ${event.message}`)
}
