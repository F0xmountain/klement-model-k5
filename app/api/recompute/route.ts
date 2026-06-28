// Event-driven recompute trigger. An external scheduler or football-data webhook
// POSTs here when a WC2026 match finishes; this dispatches the GitHub Action that
// refits the model and commits the new weights. The heavy refit cannot run on the
// serverless filesystem, so this route only fans the event out to CI.

const GH_API = 'https://api.github.com'

function log(status: number, detail: string): void {
  console.log(`${new Date().toISOString()} | endpoint.recompute | POST /api/recompute | ${status} | ${detail}`)
}

export async function POST(req: Request): Promise<Response> {
  const { searchParams } = new URL(req.url)
  if (searchParams.get('secret') !== process.env.REVALIDATE_TOKEN) {
    log(401, 'unauthorized')
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const token = process.env.GH_DISPATCH_TOKEN
  const repo = process.env.GH_REPO
  if (!token || !repo) {
    log(503, 'dispatch not configured')
    return Response.json(
      { error: 'Recompute dispatch not configured. Set GH_DISPATCH_TOKEN and GH_REPO.' },
      { status: 503 },
    )
  }

  const res = await fetch(`${GH_API}/repos/${repo}/dispatches`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ event_type: 'match-finished' }),
  })

  if (!res.ok) {
    log(502, `github dispatch ${res.status}`)
    return Response.json({ error: `GitHub dispatch failed: ${res.status}` }, { status: 502 })
  }

  log(202, 'dispatched match-finished')
  return Response.json({ dispatched: true, at: new Date().toISOString() }, { status: 202 })
}
