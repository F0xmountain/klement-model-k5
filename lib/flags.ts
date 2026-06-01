// ISO 3166-1 alpha-2 codes for flagcdn.com
// England and Scotland use CLDR subdivision codes (gb-eng, gb-sct)
export const FLAG_CODES: Record<string, string> = {
  // UEFA
  'Netherlands':   'nl',
  'France':        'fr',
  'England':       'gb-eng',
  'Spain':         'es',
  'Portugal':      'pt',
  'Germany':       'de',
  'Belgium':       'be',
  'Croatia':       'hr',
  'Switzerland':   'ch',
  'Denmark':       'dk',
  'Serbia':        'rs',
  'Austria':       'at',
  'Turkey':        'tr',
  'Slovakia':      'sk',
  'Scotland':      'gb-sct',
  'Hungary':       'hu',
  'Czechia':       'cz',
  'Bosnia-Herz':   'ba',
  'Sweden':        'se',
  'Norway':        'no',
  // CONMEBOL
  'Argentina':     'ar',
  'Brazil':        'br',
  'Uruguay':       'uy',
  'Colombia':      'co',
  'Ecuador':       'ec',
  'Venezuela':     've',
  // CONCACAF
  'USA':           'us',
  'Canada':        'ca',
  'Mexico':        'mx',
  'Jamaica':       'jm',
  'Panama':        'pa',
  'Honduras':      'hn',
  'Costa Rica':    'cr',
  'Haiti':         'ht',
  'Curacao':       'cw',
  // CAF
  'Morocco':       'ma',
  'Senegal':       'sn',
  'Egypt':         'eg',
  'Nigeria':       'ng',
  'Ivory Coast':   'ci',
  'South Africa':  'za',
  'Cameroon':      'cm',
  'Ghana':         'gh',
  'Tunisia':       'tn',
  'Algeria':       'dz',
  'Cape Verde':    'cv',
  'Congo DR':      'cd',
  // AFC
  'Japan':         'jp',
  'South Korea':   'kr',
  'Iran':          'ir',
  'Australia':     'au',
  'Saudi Arabia':  'sa',
  'Uzbekistan':    'uz',
  'Jordan':        'jo',
  'Qatar':         'qa',
  'Indonesia':     'id',
  'Iraq':          'iq',
  // OFC
  'New Zealand':   'nz',
}

export function flagUrl(name: string, w = 40, h = 30): string {
  const code = FLAG_CODES[name]
  if (!code) return ''
  return `https://flagcdn.com/${w}x${h}/${code}.png`
}
