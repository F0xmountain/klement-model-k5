// Topscorer projection from real per-player international goals.
// Rate = recent goals / recent team matches; projection = rate * expected
// matches the team plays in the tournament (from the model's own bracket run).

function buildScorerRates(goalscorers, results, datasetToKey, since, participants) {
  const teamMatches = {}
  for (const m of results) {
    if (m.date < since) continue
    for (const ds of [m.home, m.away]) {
      const key = datasetToKey[ds]
      if (key && participants.has(key)) teamMatches[key] = (teamMatches[key] || 0) + 1
    }
  }

  const tally = {}
  for (const g of goalscorers) {
    if (g.date < since || g.ownGoal || !g.scorer) continue
    const key = datasetToKey[g.team]
    if (!key || !participants.has(key)) continue
    const id = `${g.scorer}@@${key}`
    if (!tally[id]) tally[id] = { player: g.scorer, team: key, goals: 0 }
    tally[id].goals++
  }

  const rates = []
  for (const id of Object.keys(tally)) {
    const t = tally[id]
    const matches = teamMatches[t.team] || 0
    if (matches < 5 || t.goals < 2) continue
    rates.push({ ...t, teamMatches: matches, ratePerMatch: t.goals / matches })
  }
  return rates
}

function projectScorers(rates, expMatchesByTeam, topN) {
  const projected = rates.map((r) => {
    const expMatches = expMatchesByTeam[r.team] || 3
    return {
      player: r.player,
      team: r.team,
      recentGoals: r.goals,
      recentTeamMatches: r.teamMatches,
      ratePerMatch: Number(r.ratePerMatch.toFixed(3)),
      expTeamMatches: Number(expMatches.toFixed(2)),
      projGoals: Number((r.ratePerMatch * expMatches).toFixed(2)),
    }
  })
  projected.sort((a, b) => b.projGoals - a.projGoals)
  return projected.slice(0, topN)
}

module.exports = { buildScorerRates, projectScorers }
