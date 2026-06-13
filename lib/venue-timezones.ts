// IANA-tijdzone per WK 2026-venue, voor weergave van de aftrap in lokale
// stadiontijd via Intl.DateTimeFormat.
export const VENUE_TIMEZONES: Record<string, string> = {
  'Estadio Azteca': 'America/Mexico_City',
  'Estadio Akron': 'America/Mexico_City',
  'Estadio BBVA': 'America/Monterrey',
  'Rose Bowl': 'America/Los_Angeles',
  "Levi's Stadium": 'America/Los_Angeles',
  'AT&T Stadium': 'America/Chicago',
  'MetLife Stadium': 'America/New_York',
  'Gillette Stadium': 'America/New_York',
  'Lincoln Financial Field': 'America/New_York',
  'NRG Stadium': 'America/Chicago',
  'Arrowhead Stadium': 'America/Chicago',
  'Hard Rock Stadium': 'America/New_York',
  'Mercedes-Benz Stadium': 'America/New_York',
  'Lumen Field': 'America/Los_Angeles',
  'BC Place': 'America/Vancouver',
  'BMO Field': 'America/Toronto',
}

const LOCALES: Record<string, string> = { nl: 'nl-NL', en: 'en-GB' }

// Datum + tijd van de aftrap in de lokale tijdzone van het stadion. Valt terug op
// UTC als de venue onbekend is.
export function localKickoff(dateUtc: string, venue: string, locale: string): { date: string; time: string } {
  const tz = VENUE_TIMEZONES[venue] ?? 'UTC'
  const d = new Date(dateUtc)
  const intlLocale = LOCALES[locale] ?? 'en-GB'
  const date = new Intl.DateTimeFormat(intlLocale, { day: 'numeric', month: 'long', year: 'numeric', timeZone: tz }).format(d)
  const time = new Intl.DateTimeFormat(intlLocale, { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz }).format(d)
  return { date, time }
}

// Kalenderdatum (YYYY-MM-DD) van de aftrap in de lokale tijdzone van het stadion.
// Sorteerbare sleutel om wedstrijden onder de juiste lokale dag te groeperen —
// anders belandt een wedstrijd na middernacht UTC (maar overdag lokaal) onder de
// verkeerde dag-kop op de schema-pagina.
export function localDateKey(dateUtc: string, venue: string): string {
  const tz = VENUE_TIMEZONES[venue] ?? 'UTC'
  const d = new Date(dateUtc)
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric', month: '2-digit', day: '2-digit', timeZone: tz,
  }).format(d)
}
