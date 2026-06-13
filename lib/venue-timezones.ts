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

// Datum + tijd van een UTC-instant in een willekeurige IANA-tijdzone. Basis voor
// zowel de stadiontijd (localKickoff) als de bezoeker-tijd (useViewerKickoff).
// Geeft lege strings bij een ongeldige datum, zodat aanroepers veilig kunnen
// renderen zonder te crashen op Intl.format(Invalid Date).
export function formatKickoff(dateUtc: string, timeZone: string, locale: string): { date: string; time: string } {
  const d = new Date(dateUtc)
  if (Number.isNaN(d.getTime())) return { date: '', time: '' }
  const intlLocale = LOCALES[locale] ?? 'en-GB'
  const date = new Intl.DateTimeFormat(intlLocale, { day: 'numeric', month: 'long', year: 'numeric', timeZone }).format(d)
  const time = new Intl.DateTimeFormat(intlLocale, { hour: '2-digit', minute: '2-digit', hour12: false, timeZone }).format(d)
  return { date, time }
}

// Kalenderdatum (YYYY-MM-DD, sorteerbaar) van een instant in een gegeven tijdzone.
export function dateKeyInTz(dateUtc: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric', month: '2-digit', day: '2-digit', timeZone,
  }).format(new Date(dateUtc))
}

// Datum + tijd van de aftrap in de lokale tijdzone van het stadion. Valt terug op
// UTC als de venue onbekend is. Behouden voor backward compat.
export function localKickoff(dateUtc: string, venue: string, locale: string): { date: string; time: string } {
  return formatKickoff(dateUtc, VENUE_TIMEZONES[venue] ?? 'UTC', locale)
}

// Kalenderdatum in de lokale tijdzone van het stadion. Behouden voor backward compat.
export function localDateKey(dateUtc: string, venue: string): string {
  return dateKeyInTz(dateUtc, VENUE_TIMEZONES[venue] ?? 'UTC')
}
