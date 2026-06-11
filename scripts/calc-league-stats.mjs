#!/usr/bin/env node
/**
 * Calculates a starter lib/league-data.json from lib/squads-db.json:
 * - players_top5: players whose club is in TOP5_LEAGUES (20 most recognizable
 *   clubs per Premier League / La Liga / Bundesliga / Serie A / Ligue 1 club)
 * - max_same_club: largest number of squad players sharing one club
 * - total_market_value_m: left at 0, filled in manually from Transfermarkt
 */

import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SQUADS_DB_PATH = join(__dirname, '..', 'lib', 'squads-db.json')
const LEAGUE_DATA_PATH = join(__dirname, '..', 'lib', 'league-data.json')

const TOP5_LEAGUES = new Set([
  // Premier League
  'Arsenal', 'Aston Villa', 'Bournemouth', 'Brentford', 'Brighton', 'Burnley',
  'Chelsea', 'Crystal Palace', 'Everton', 'Fulham', 'Leeds United', 'Liverpool',
  'Manchester City', 'Manchester United', 'Newcastle', 'Nottingham Forest',
  'Sunderland', 'Tottenham', 'West Ham', 'Wolves',
  // La Liga
  'Real Madrid', 'Barcelona', 'Atlético Madrid', 'Athletic Club', 'Real Betis',
  'Villarreal', 'Valencia', 'Sevilla', 'Girona', 'Mallorca', 'Rayo Vallecano',
  'Espanyol', 'Elche', 'Levante', 'Granada', 'Real Sociedad', 'Celta Vigo',
  'Getafe', 'Osasuna', 'Las Palmas',
  // Bundesliga
  'Bayern München', 'Borussia Dortmund', 'RB Leipzig', 'Bayer Leverkusen',
  'Eintracht Frankfurt', 'VfB Stuttgart', 'SC Freiburg', 'Werder Bremen',
  'VfL Wolfsburg', 'Mainz', 'Hoffenheim', "M'gladbach", 'FC Augsburg',
  'Hamburger SV', 'Schalke 04', 'St. Pauli', 'Union Berlin', 'Heidenheim',
  'FC Köln', 'Hertha BSC',
  // Serie A
  'Inter', 'Inter Milan', 'AC Milan', 'Juventus', 'Napoli', 'AS Roma', 'Atalanta',
  'Bologna', 'Genoa', 'Sassuolo', 'Hellas Verona', 'Parma', 'Como', 'Venezia',
  'Pisa', 'Torino', 'Fiorentina', 'Lazio', 'Udinese', 'Cagliari',
  // Ligue 1
  'PSG', 'AS Monaco', 'Lyon', 'Olympique Lyon', 'Lille', 'OGC Nice', 'RC Lens',
  'Stade Rennais', 'RC Strasbourg', 'Toulouse', 'Auxerre', 'Angers', 'Le Havre',
  'Marseille', 'Paris FC', 'Brest', 'Nantes', 'Lorient', 'Metz', 'Reims',
])

const db = JSON.parse(readFileSync(SQUADS_DB_PATH, 'utf8'))

const result = Object.values(db.teams).map(team => {
  const clubCounts = new Map()
  let players_top5 = 0

  for (const player of team.squad) {
    if (!player.club) continue
    clubCounts.set(player.club, (clubCounts.get(player.club) ?? 0) + 1)
    if (TOP5_LEAGUES.has(player.club)) players_top5++
  }

  const max_same_club = clubCounts.size > 0 ? Math.max(...clubCounts.values()) : 0

  return {
    team: team.name_en,
    players_top5,
    total_market_value_m: 0,
    max_same_club,
  }
})

writeFileSync(LEAGUE_DATA_PATH, JSON.stringify(result, null, 2) + '\n', 'utf8')
console.log(`Wrote ${result.length} teams to lib/league-data.json`)
