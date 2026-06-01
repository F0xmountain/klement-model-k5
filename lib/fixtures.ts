import type { KnockoutMatch } from '../types'

// Official FIFA World Cup 2026 draw (December 5, 2024, Washington D.C.)
export const GROUPS: Record<string, string[]> = {
  A: ['Mexico',      'South Korea',  'South Africa',       'Czechia'],
  B: ['Canada',      'Switzerland',  'Qatar',              'Bosnia-Herz'],
  C: ['Brazil',      'Morocco',      'Scotland',           'Haiti'],
  D: ['USA',         'Paraguay',     'Australia',          'Turkey'],
  E: ['Germany',     'Curacao',      'Ivory Coast',        'Ecuador'],
  F: ['Netherlands', 'Japan',        'Sweden',             'Tunisia'],
  G: ['Belgium',     'Egypt',        'Iran',               'New Zealand'],
  H: ['Spain',       'Cape Verde',   'Saudi Arabia',       'Uruguay'],
  I: ['France',      'Senegal',      'Iraq',               'Norway'],
  J: ['Argentina',   'Algeria',      'Austria',            'Jordan'],
  K: ['Portugal',    'Congo DR',     'Uzbekistan',         'Colombia'],
  L: ['England',     'Croatia',      'Ghana',              'Panama'],
}

export const ROUNDS: Record<string, KnockoutMatch[]> = {
  r32: [
    { teamA: 'Netherlands',  teamB: 'Morocco',      k: 'Netherlands' },
    { teamA: 'Canada',       teamB: 'Ecuador',      k: 'Canada' },
    { teamA: 'France',       teamB: 'Nigeria',      k: 'France' },
    { teamA: 'Spain',        teamB: 'South Korea',  k: 'Spain' },
    { teamA: 'Argentina',    teamB: 'Jordan',       k: 'Argentina' },
    { teamA: 'Germany',      teamB: 'Australia',    k: 'Germany' },
    { teamA: 'Belgium',      teamB: 'Ghana',        k: 'Belgium' },
    { teamA: 'Croatia',      teamB: 'Tunisia',      k: 'Croatia' },
    { teamA: 'Portugal',     teamB: 'USA',          k: 'Portugal' },
    { teamA: 'England',      teamB: 'Colombia',     k: 'England' },
    { teamA: 'Brazil',       teamB: 'Japan',        k: 'Japan' },
    { teamA: 'Denmark',      teamB: 'South Africa', k: 'Denmark' },
    { teamA: 'Switzerland',  teamB: 'Mexico',       k: 'Switzerland' },
    { teamA: 'Serbia',       teamB: 'Saudi Arabia', k: 'Serbia' },
    { teamA: 'Turkey',       teamB: 'Ivory Coast',  k: 'Turkey' },
    { teamA: 'Uruguay',      teamB: 'Indonesia',    k: 'Uruguay' },
  ],
  r16: [
    { teamA: 'Netherlands',  teamB: 'Canada',       k: 'Netherlands' },
    { teamA: 'France',       teamB: 'Spain',        k: 'France' },
    { teamA: 'Argentina',    teamB: 'Germany',      k: 'Argentina' },
    { teamA: 'Belgium',      teamB: 'Croatia',      k: 'Belgium' },
    { teamA: 'Portugal',     teamB: 'England',      k: 'Portugal' },
    { teamA: 'Japan',        teamB: 'Denmark',      k: 'Denmark' },
    { teamA: 'Switzerland',  teamB: 'Serbia',       k: 'Switzerland' },
    { teamA: 'Turkey',       teamB: 'Uruguay',      k: 'Turkey' },
  ],
  qf: [
    { teamA: 'Netherlands',  teamB: 'France',       k: 'Netherlands' },
    { teamA: 'Argentina',    teamB: 'Belgium',      k: 'Argentina' },
    { teamA: 'Portugal',     teamB: 'Denmark',      k: 'Portugal' },
    { teamA: 'Switzerland',  teamB: 'Turkey',       k: 'Switzerland' },
  ],
  sf: [
    { teamA: 'Netherlands',  teamB: 'Argentina',    k: 'Netherlands' },
    { teamA: 'Portugal',     teamB: 'Switzerland',  k: 'Portugal' },
  ],
  final: [
    { teamA: 'Netherlands',  teamB: 'Portugal',     k: 'Netherlands' },
  ],
}

export const ROUND_LABELS: Record<string, string> = {
  r32: 'Round of 32',
  r16: 'Round of 16',
  qf: 'Quarter-Finals',
  sf: 'Semi-Finals',
  final: 'The Final',
}
