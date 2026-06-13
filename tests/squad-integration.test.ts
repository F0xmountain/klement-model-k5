import { describe, it, expect, vi, afterEach } from 'vitest'

// Integratietest: een sterspeler op "out" zetten moet matchP's winkans verlagen
// met exact de geconfigureerde logit-penalty. We mocken de status-JSON's en laden
// de modelmodule opnieuw, zodat we baseline (alles fit) en geblesseerd vergelijken.

const HOME = 'France' // squads-db sleutel "Frankrijk", sterspeler 1 = Kylian Mbappé
const AWAY = 'Mexico'
const STAR1_PCT = 0.08 // default rank-1 penalty (lib/model-config DEFAULT_WEIGHTS)

const logit = (p: number) => Math.log(p / (1 - p))
// Logit-shift van een penalty van d %-punt rond p=0.5 (zie squad-modifier pctToLogit).
const pctToLogit = (d: number) => Math.log((0.5 - d) / (0.5 + d))

async function matchPWith(statuses: Record<string, Record<string, string>>) {
  vi.resetModules()
  vi.doMock('../lib/player-status.json', () => ({ default: { lastUpdated: '', statuses } }))
  vi.doMock('../lib/star-player-status.json', () => ({ default: { lastUpdated: '', overrides: {} } }))
  const { matchP } = await import('../lib/klement-custom')
  return matchP(HOME, AWAY)
}

describe('Sterspeler-blessure integratie (admin/squads → matchP)', () => {
  afterEach(() => {
    vi.resetModules()
    vi.doUnmock('../lib/player-status.json')
    vi.doUnmock('../lib/star-player-status.json')
  })

  it('rank-1 sterspeler op "out" verlaagt de winkans met de logit-penalty', async () => {
    const base = await matchPWith({})
    const injured = await matchPWith({ Frankrijk: { 'Kylian Mbappé': 'out' } })

    // Winkans daalt, kansen blijven optellen tot 1.
    expect(injured.pA).toBeLessThan(base.pA)
    expect(injured.pA + injured.dr + injured.pB).toBeCloseTo(1, 6)

    // Het verschil op logit-schaal is precies de rank-1 penalty.
    expect(logit(injured.pA) - logit(base.pA)).toBeCloseTo(pctToLogit(STAR1_PCT), 4)
  })

  it('"twijfelachtig" geeft de helft van de out-penalty', async () => {
    const base = await matchPWith({})
    const doubtful = await matchPWith({ Frankrijk: { 'Kylian Mbappé': 'doubtful' } })

    expect(doubtful.pA).toBeLessThan(base.pA)
    expect(logit(doubtful.pA) - logit(base.pA)).toBeCloseTo(pctToLogit(STAR1_PCT) / 2, 4)
  })
})
