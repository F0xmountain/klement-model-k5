// Officiële FIFA/IOC 3-letter landcodes voor compacte weergave (bv. de impact-
// tijdlijn en de vandaag-widget). Vervangt de naïeve name.slice(0,3), die
// collisions gaf: AUS (Austria/Australia), SOU (South Africa/South Korea) en
// IRA (Iran/Iraq). Sleutels zijn de teams.json-namen.
export const TEAM_CODES: Record<string, string> = {
  // UEFA
  Netherlands: 'NED',
  France: 'FRA',
  England: 'ENG',
  Spain: 'ESP',
  Portugal: 'POR',
  Germany: 'GER',
  Belgium: 'BEL',
  Croatia: 'CRO',
  Switzerland: 'SUI',
  Denmark: 'DEN',
  Serbia: 'SRB',
  Austria: 'AUT',
  Turkey: 'TUR',
  Slovakia: 'SVK',
  Scotland: 'SCO',
  Hungary: 'HUN',
  Czechia: 'CZE',
  'Bosnia-Herz': 'BIH',
  Sweden: 'SWE',
  Norway: 'NOR',
  // CONMEBOL
  Argentina: 'ARG',
  Brazil: 'BRA',
  Uruguay: 'URU',
  Colombia: 'COL',
  Ecuador: 'ECU',
  Venezuela: 'VEN',
  Paraguay: 'PAR',
  // CONCACAF
  USA: 'USA',
  Canada: 'CAN',
  Mexico: 'MEX',
  Jamaica: 'JAM',
  Panama: 'PAN',
  Honduras: 'HON',
  'Costa Rica': 'CRC',
  Haiti: 'HAI',
  Curacao: 'CUW',
  // CAF
  Morocco: 'MAR',
  Senegal: 'SEN',
  Egypt: 'EGY',
  Nigeria: 'NGA',
  'Ivory Coast': 'CIV',
  'South Africa': 'RSA',
  Cameroon: 'CMR',
  Ghana: 'GHA',
  Tunisia: 'TUN',
  Algeria: 'ALG',
  'Cape Verde': 'CPV',
  'Congo DR': 'COD',
  // AFC
  Japan: 'JPN',
  'South Korea': 'KOR',
  Iran: 'IRN',
  Australia: 'AUS',
  'Saudi Arabia': 'KSA',
  Uzbekistan: 'UZB',
  Jordan: 'JOR',
  Qatar: 'QAT',
  Iraq: 'IRQ',
  // OFC
  'New Zealand': 'NZL',
}

// 3-letter code voor een team; valt terug op de eerste 3 letters in hoofdletters
// voor onbekende namen.
export function teamCode(name: string): string {
  return TEAM_CODES[name] ?? name.slice(0, 3).toUpperCase()
}
