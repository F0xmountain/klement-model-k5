// Tournament structure derived from the model: expected group standings,
// qualifier selection (top 2 + 8 best thirds), a seeded knockout bracket, and
// expected matches per team (used by the topscorer projection).

function expectedGroupStandings(groups, matchP) {
  const out = {}
  for (const g of Object.keys(groups)) {
    const teams = groups[g]
    const xpts = {}
    for (const t of teams) xpts[t] = 0
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        const { pA, dr, pB } = matchP(teams[i], teams[j])
        xpts[teams[i]] += 3 * pA + dr
        xpts[teams[j]] += 3 * pB + dr
      }
    }
    out[g] = teams
      .map((t) => ({ team: t, xpts: xpts[t], group: g }))
      .sort((a, b) => b.xpts - a.xpts)
  }
  return out
}

function pickQualifiers(standings) {
  const winners = []
  const runners = []
  const thirds = []
  for (const g of Object.keys(standings)) {
    winners.push({ ...standings[g][0], slot: `${g}1` })
    runners.push({ ...standings[g][1], slot: `${g}2` })
    thirds.push({ ...standings[g][2], slot: `${g}3` })
  }
  thirds.sort((a, b) => b.xpts - a.xpts)
  const bestThirds = thirds.slice(0, 8)
  return [...winners, ...runners, ...bestThirds]
}

function seedBracket(qualifiers, sc, matchP) {
  const seeded = qualifiers.slice().sort((a, b) => sc(b.team) - sc(a.team))
  let pairs = []
  for (let i = 0; i < seeded.length / 2; i++) {
    pairs.push([seeded[i].team, seeded[seeded.length - 1 - i].team])
  }
  const roundNames = ['r32', 'r16', 'qf', 'sf', 'final']
  const rounds = {}
  for (const name of roundNames) {
    const matches = pairs.map(([a, b]) => {
      const { pA, pB } = matchP(a, b)
      return { teamA: a, teamB: b, k: pA >= pB ? a : b }
    })
    rounds[name] = matches
    pairs = []
    for (let i = 0; i < matches.length; i += 2) {
      if (matches[i + 1]) pairs.push([matches[i].k, matches[i + 1].k])
    }
  }
  return rounds
}

function groupMonteCarlo(groups, simResult, calcStandings, n) {
  const top2 = {}
  const third = {}
  for (const g of Object.keys(groups)) {
    for (const t of groups[g]) {
      top2[t] = 0
      third[t] = 0
    }
  }
  for (let s = 0; s < n; s++) {
    for (const g of Object.keys(groups)) {
      const teams = groups[g]
      const results = []
      for (let i = 0; i < teams.length; i++) {
        for (let j = i + 1; j < teams.length; j++) {
          results.push({ teamA: teams[i], teamB: teams[j], result: simResult(teams[i], teams[j]) })
        }
      }
      const table = calcStandings(teams, results)
      top2[table[0].team]++
      top2[table[1].team]++
      third[table[2].team]++
    }
  }
  const pTop2 = {}
  const pThird = {}
  for (const t of Object.keys(top2)) {
    pTop2[t] = top2[t] / n
    pThird[t] = third[t] / n
  }
  return { pTop2, pThird }
}

// Expected matches a team plays: 3 group games plus a geometric knockout run.
// pReachKO blends a top-2 finish with the chance of being a best third (~8/12).
function expectedMatches(participants, mc, koWinProb) {
  const out = {}
  for (const t of participants) {
    const pReachKO = Math.min(1, mc.pTop2[t] + 0.67 * mc.pThird[t])
    const q = koWinProb[t]
    const koMatches = pReachKO * (1 + q + q ** 2 + q ** 3 + q ** 4)
    out[t] = 3 + koMatches
  }
  return out
}

function knockoutWinProb(participants, matchP) {
  const out = {}
  for (const t of participants) {
    let sum = 0
    let count = 0
    for (const o of participants) {
      if (o === t) continue
      const { pA, pB } = matchP(t, o)
      sum += pA + pB > 0 ? pA / (pA + pB) : 0.5
      count++
    }
    out[t] = count ? sum / count : 0.5
  }
  return out
}

module.exports = {
  expectedGroupStandings,
  pickQualifiers,
  seedBracket,
  groupMonteCarlo,
  expectedMatches,
  knockoutWinProb,
}
