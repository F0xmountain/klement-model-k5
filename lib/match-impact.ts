import snapshotsRaw from './probability-snapshots.json'
import resultsRaw from './results.json'
import scheduleRaw from './schedule.json'

// Wedstrijd-impact: hoeveel verschoof elke gespeelde wedstrijd de kampioenskansen?
// Bouwt voort op de gepubliceerde kansen-momentopnamen (probability-snapshots.json:
// een pre-toernooi-baseline gevolgd door één snapshot per gespeelde wedstrijd, met
// common random numbers gegenereerd zodat de verschillen alleen de echte impact
// tonen) en koppelt ze aan results.json (volledige namen + uitslag) en schedule.json
// (venue + groep, voor de "Predict this match"-link).
//
// Zonder gespeelde wedstrijden valt de tracker terug op een demo-dataset, zodat
// de UI-structuur al zichtbaar is vóór het toernooi.

interface ProbabilitySnapshot {
  timestamp: string
  matchLabel: string
  snapshots: Record<string, number>
}
const snapshots = snapshotsRaw as ProbabilitySnapshot[]

interface ResultEntry {
  teamA: string
  teamB: string
  scoreA: number
  scoreB: number
  playedAt?: string
}
const results = Object.values((resultsRaw as { results?: Record<string, ResultEntry> }).results ?? {})

interface ScheduleEntry {
  matchId: string
  teamA: string
  teamB: string
  group: string
  date: string
  venue: string
}
const schedule = scheduleRaw as ScheduleEntry[]

const scheduleByPair: Record<string, ScheduleEntry> = {}
for (const s of schedule) {
  scheduleByPair[`${s.teamA}__${s.teamB}`] = s
  scheduleByPair[`${s.teamB}__${s.teamA}`] = s
}

export interface ProbMover {
  team: string
  delta: number
}

export interface MatchImpact {
  matchLabel: string
  date: string
  result: string
  teamA?: string
  teamB?: string
  group?: string
  venue?: string
  biggestWinner: ProbMover
  biggestLoser: ProbMover
  totalVolatility: number
  snapshots: {
    before: Record<string, number>
    after: Record<string, number>
  }
}

export interface TimelinePoint {
  label: string
  teams: Record<string, number>
}

export interface ImpactData {
  impacts: MatchImpact[]
  mostImpactful: MatchImpact | null
  timeline: TimelinePoint[]
  topTeams: string[]
  isDemo: boolean
}

const TOP_LINES = 6

function buildImpact(
  before: Record<string, number>,
  after: Record<string, number>,
  snap: ProbabilitySnapshot,
  result?: ResultEntry,
): MatchImpact {
  const teams = new Set<string>([...Object.keys(before), ...Object.keys(after)])
  let biggestWinner: ProbMover = { team: '', delta: 0 }
  let biggestLoser: ProbMover = { team: '', delta: 0 }
  let totalVolatility = 0
  for (const t of teams) {
    const delta = (after[t] ?? 0) - (before[t] ?? 0)
    totalVolatility += Math.abs(delta)
    if (delta > biggestWinner.delta) biggestWinner = { team: t, delta }
    if (delta < biggestLoser.delta) biggestLoser = { team: t, delta }
  }

  const sched = result ? scheduleByPair[`${result.teamA}__${result.teamB}`] : undefined
  return {
    matchLabel: snap.matchLabel,
    date: snap.timestamp || result?.playedAt || '',
    result: result ? `${result.scoreA}-${result.scoreB}` : '',
    teamA: result?.teamA,
    teamB: result?.teamB,
    group: sched?.group,
    venue: sched?.venue,
    biggestWinner,
    biggestLoser,
    totalVolatility,
    // Volledige before/after-maps; de UI kiest hieruit de top-10 actieve teams.
    snapshots: { before: { ...before }, after: { ...after } },
  }
}

function realImpactData(): ImpactData {
  // snapshots[0] = pre-toernooi-baseline; snapshots[1..] = na elke gespeelde
  // wedstrijd. results[i] hoort bij snapshots[i+1].
  const played = snapshots.slice(1)
  const impacts = played.map((snap, i) =>
    buildImpact(snapshots[i]!.snapshots, snapshots[i + 1]!.snapshots, snap, results[i])
  )

  const mostImpactful = impacts.reduce<MatchImpact | null>(
    (best, m) => (best === null || m.totalVolatility > best.totalVolatility ? m : best),
    null
  )

  const lineTeams = Object.entries(snapshots[snapshots.length - 1]!.snapshots)
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_LINES)
    .map(([t]) => t)

  const timeline: TimelinePoint[] = played.map(s => ({
    label: s.matchLabel,
    teams: Object.fromEntries(lineTeams.map(t => [t, s.snapshots[t] ?? 0])),
  }))

  return { impacts, mostImpactful, timeline, topTeams: lineTeams, isDemo: false }
}

// ── Demo-dataset (geen wedstrijden gespeeld) ─────────────────────────────────
// Vaste, plausibele cijfers puur om de UI-structuur te tonen.

const DEMO_TEAMS = ['Netherlands', 'France', 'Argentina', 'Brazil', 'Spain', 'Portugal']

interface DemoMatch {
  label: string
  date: string
  result: string
  teamA: string
  teamB: string
  group: string
  probs: Record<string, number>
}

// Champion-kansen ná elke demo-wedstrijd (de baseline is de eerste rij).
const DEMO_BASELINE: Record<string, number> = {
  Netherlands: 0.14, France: 0.13, Argentina: 0.12, Brazil: 0.15, Spain: 0.11, Portugal: 0.10,
}
const DEMO_MATCHES: DemoMatch[] = [
  { label: 'GRP A: Mexico vs South Africa', date: '2026-06-11', result: '2-1', teamA: 'Mexico', teamB: 'South Africa', group: 'A',
    probs: { Netherlands: 0.145, France: 0.131, Argentina: 0.121, Brazil: 0.150, Spain: 0.112, Portugal: 0.101 } },
  { label: 'GRP C: Brazil vs Cameroon', date: '2026-06-13', result: '0-1', teamA: 'Brazil', teamB: 'Cameroon', group: 'C',
    probs: { Netherlands: 0.158, France: 0.142, Argentina: 0.133, Brazil: 0.108, Spain: 0.120, Portugal: 0.109 } },
  { label: 'GRP D: Argentina vs Japan', date: '2026-06-14', result: '1-2', teamA: 'Argentina', teamB: 'Japan', group: 'D',
    probs: { Netherlands: 0.171, France: 0.151, Argentina: 0.101, Brazil: 0.112, Spain: 0.126, Portugal: 0.118 } },
  { label: 'GRP F: Netherlands vs Senegal', date: '2026-06-15', result: '3-0', teamA: 'Netherlands', teamB: 'Senegal', group: 'F',
    probs: { Netherlands: 0.205, France: 0.148, Argentina: 0.099, Brazil: 0.110, Spain: 0.122, Portugal: 0.115 } },
]

function demoImpactData(): ImpactData {
  const series = [DEMO_BASELINE, ...DEMO_MATCHES.map(m => m.probs)]
  const impacts: MatchImpact[] = DEMO_MATCHES.map((m, i) => {
    const before = series[i]!
    const after = series[i + 1]!
    let biggestWinner: ProbMover = { team: '', delta: 0 }
    let biggestLoser: ProbMover = { team: '', delta: 0 }
    let totalVolatility = 0
    for (const t of DEMO_TEAMS) {
      const delta = (after[t] ?? 0) - (before[t] ?? 0)
      totalVolatility += Math.abs(delta)
      if (delta > biggestWinner.delta) biggestWinner = { team: t, delta }
      if (delta < biggestLoser.delta) biggestLoser = { team: t, delta }
    }
    return {
      matchLabel: m.label,
      date: m.date,
      result: m.result,
      teamA: m.teamA,
      teamB: m.teamB,
      group: m.group,
      venue: undefined,
      biggestWinner,
      biggestLoser,
      totalVolatility,
      snapshots: { before: { ...before }, after: { ...after } },
    }
  })

  const mostImpactful = impacts.reduce<MatchImpact | null>(
    (best, m) => (best === null || m.totalVolatility > best.totalVolatility ? m : best),
    null
  )

  const timeline: TimelinePoint[] = DEMO_MATCHES.map(m => ({
    label: m.label.split(':')[1]?.trim() ?? m.label,
    teams: { ...m.probs },
  }))

  return { impacts, mostImpactful, timeline, topTeams: DEMO_TEAMS, isDemo: true }
}

export function getMatchImpact(): ImpactData {
  return snapshots.length > 0 ? realImpactData() : demoImpactData()
}
