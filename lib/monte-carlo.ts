import { simResultCustom } from './klement-custom'
import { ROUNDS } from './fixtures'

// Gedeelde Monte Carlo-engine: gebruikt door zowel de cache-herberekening na een
// uitslag-invoer (app/api/admin/results) als de live-fallback op de /model-pagina,
// zodat cache en live-resultaat exact dezelfde methode gebruiken.

export interface McRoundCounts {
  qf: number
  sf: number
  final: number
  champ: number
}

export interface McResult {
  n: number
  teams: Record<string, McRoundCounts>
}

// Knockout-winnaar volgens het custom-model. simResultCustom geeft W/D/L; een
// gelijkspel wordt opnieuw bemonsterd tot er een winnaar is (penalty-resolutie).
function koWinner(a: string, b: string): string {
  let r = simResultCustom(a, b)
  while (r === 'D') r = simResultCustom(a, b)
  return r === 'A' ? a : b
}

export function runMonteCarlo(n: number): McResult {
  const teams: Record<string, McRoundCounts> = {}
  const bump = (team: string, key: keyof McRoundCounts) => {
    const c = teams[team] ?? (teams[team] = { qf: 0, sf: 0, final: 0, champ: 0 })
    c[key]++
  }

  for (let i = 0; i < n; i++) {
    const r16 = ROUNDS.r32.map(m => koWinner(m.teamA, m.teamB))
    const qf: string[] = []
    for (let j = 0; j < r16.length; j += 2) qf.push(koWinner(r16[j], r16[j + 1]))
    qf.forEach(t => bump(t, 'qf'))
    const sf: string[] = []
    for (let j = 0; j < qf.length; j += 2) sf.push(koWinner(qf[j], qf[j + 1]))
    sf.forEach(t => bump(t, 'sf'))
    const finalists: string[] = []
    for (let j = 0; j < sf.length; j += 2) finalists.push(koWinner(sf[j], sf[j + 1]))
    finalists.forEach(t => bump(t, 'final'))
    bump(koWinner(finalists[0], finalists[1]), 'champ')
  }

  return { n, teams }
}
