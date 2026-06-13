# NEW-ITERATION-V4.md — WC26 Klement Fork

> Geordende takenlijst voor Claude Code. Werk van boven naar beneden.
> Status-legenda: [x] = klaar · [ ] = nog te doen · [~] = deels klaar
> Commit na elke afgeronde taak. Ga direct door zonder te wachten op bevestiging.

---

## ✅ Volledig afgerond (niet aanraken)

### Fase 0 — Basis
- [x] Fork aangemaakt, i18n via `next-intl` (NL/EN)
- [x] `/my-bracket` — eigen bracket editor met localStorage
- [x] `/stats` — Elo-trendgrafiek, radardiagram, WK-historietabel, Polymarket-bar
- [x] `/live` — Polymarket-widget + nieuws per team
- [x] Hamburger-menu mobiel, responsive navigatie

### Fase 0b — Selectiedatabase
- [x] `lib/squads-db.json` — 48 landen · 26-mans selecties · clubs · coaches · groepen · FIFA-ranking
- [x] `lib/talents.json` — grootste talent per land
- [x] `lib/topscorers.json` — tracker-structuur

### MASTER-PROMPT commits 1–11
- [x] Academische correctheid model (normalisatiebereiken, gewichtensom, draw-rate)
- [x] Monte Carlo academisch correct (gelijkspel KO, derde-plaats-routing, seeding)
- [x] Unit tests 22/22 groen
- [x] TypeScript strict: `npx tsc --noEmit` → 0 fouten
- [x] ESLint: `npx eslint . --max-warnings 0` slaagt

### Sessie 6 — Live toernooidata
- [x] GitHub Actions workflows met `permissions: contents: write` + `git pull --rebase && git push`
- [x] `lib/results.json` — echte WK 2026 resultaten (ingest elke 6u via football-data.org)
- [x] `lib/elo-current.json` + `lib/probability-snapshots.json` + `lib/match-stats.json`
- [x] Groups pagina: gespeelde wedstrijden tonen als definitief (FT marker + 🏟 stadion)
- [x] 🎲-knop verdwijnt als alle wedstrijden in een groep gespeeld zijn
- [x] Monte Carlo noise fix: per-slot seeding, deltas 0.1–1.0%, unrelated teams ≈ 0.00%
- [x] Top-10 actieve teams in MatchImpactView
- [x] Klikbare teamnamen op groups pagina → `/teams/[slug]`
- [x] FIFA 3-letter codes voor alle 58 teams in `lib/team-codes.ts` (geen collision meer)
- [x] Slug-helper `lib/team-slug.ts`
- [x] Nieuwe route `app/[locale]/teams/[team]/page.tsx` (statisch pre-rendered per team)

---

## 🔧 Nu uitvoeren — Teams pagina uitbreiden

> De route `/teams/[slug]` bestaat al maar toont minimale info.
> Dit blok voegt drie tabs toe: Selectie, Topscorers (fantasy punten) en Toernooischema.
> **Uitvoervolgorde:** A → B → C → D → E → F → G → H → I → dan J t/m N naar keuze

### Taak A — Tabs-structuur op de teams pagina

- [ ] Voeg een tab-navigatie toe aan `app/[locale]/teams/[team]/page.tsx`
  - Drie tabs: **Selectie** | **Topscorers** | **Schema**
  - Tab-state via URL-searchparam `?tab=squad|scorers|schedule` (deelbare links)
  - Actieve tab: zichtbaar gemarkeerd in de bestaande Trionda Light stijl
  - Fallback: als geen param → Selectie is default

### Taak B — Tab 1: Volledige selectie

- [ ] Maak `components/teams/SquadTab.tsx` aan
  - Data komt uit `lib/squads-db.json` voor het betreffende team
  - Gegroepeerd in vier secties: **Keepers** · **Verdedigers** · **Middenvelders** · **Aanvallers**
  - Per speler een rij met: naam · club · leeftijd (indien beschikbaar) · status-indicator
  - Status-indicator: 🟢 fit · 🟡 twijfelachtig · 🔴 out (uit `lib/player-status.json`)
  - Sterspelers (rank 1/2/3 uit `star_players` array) krijgen ⭐ + vetgedrukte naam
  - Coach en kapitein bovenaan als aparte "header-kaart"
  - Totaal spelersaantal onderaan: "26 spelers geselecteerd"

**Posities mappen naar categorie:**
```typescript
// lib/squad-utils.ts (nieuw bestand)
export const POSITION_ORDER = ['goalkeeper', 'defender', 'midfielder', 'attacker'] as const
export const POSITION_LABELS: Record<string, { nl: string; en: string }> = {
  goalkeeper: { nl: 'Keepers', en: 'Goalkeepers' },
  defender:   { nl: 'Verdedigers', en: 'Defenders' },
  midfielder: { nl: 'Middenvelders', en: 'Midfielders' },
  attacker:   { nl: 'Aanvallers', en: 'Forwards' },
}
```

### Taak C — Tab 2: Topscorers (fantasy puntensysteem)

- [ ] Maak `components/teams/ScorersTab.tsx` aan

**Puntensysteem per goal:**
| Positie | Punten per goal |
|---|---|
| Aanvaller (attacker) | 8 |
| Middenvelder (midfielder) | 16 |
| Verdediger (defender) | 32 |
| Keeper (goalkeeper) | 32 |

**Rondemultiplier:**
| Ronde | Multiplier |
|---|---|
| Groepsfase (3 wedstrijden) | × 1.0 |
| Ronde van 32 | × 1.5 |
| Ronde van 16 | × 2.0 |
| Kwartfinale | × 3.0 |
| Halve finale | × 4.0 |
| Finale | × 5.0 |

**Verwachte punten berekening:**
```typescript
// lib/fantasy-points.ts (nieuw bestand)

// Doelpunten per wedstrijd historisch gemiddelde WK per positie:
const GOALS_PER_GAME: Record<Category, number> = {
  attacker:   0.35,   // ± 1 goal per 3 wedstrijden
  midfielder: 0.12,
  defender:   0.05,
  goalkeeper: 0.01,
}

// Voor elke speler: expectedGoals = goalsPerGame × aantalVerwachteWedstrijden
// aantalVerwachteWedstrijden = Σ (rondeKans × wedstrijdenInRonde)
// rondeKans komt uit lib/probability-snapshots.json voor dit team

// Verwachte punten per speler:
// Σ over alle rondes: (rondeKans × goalsPerGame × positionWeight × roundMultiplier)

export function calcExpectedPoints(
  playerCategory: Category,
  teamName: string,           // gebruikt snapshots voor kampioenskansen per ronde
): number
```

**Weergave:**
- Positie-tabs bovenaan de Topscorers-tab: **Totaal** | **Aanvallers** | **Middenvelders** | **Verdedigers** | **Keepers**
- Per speler: rang · naam · club · ⭐ indien sterspeler · verwachte punten (groot) · verwachte goals (klein)
- Gesorteerd op verwachte punten descending
- Toon een legenda onderaan: "Punten = goals × positiemultiplicator × rondemultiplicator"
- Disclaimer: "Verwachte waarden op basis van historische doelpuntengemiddelden per positie"

**Opmerking voor Claude Code:** als `probability-snapshots.json` geen per-ronde kansen bevat voor dit team, gebruik dan de kampioenskans als proxy en schaal lineair over de rondes. Val terug op gelijke kansen (elke ronde 50%) als data ontbreekt.

### Taak G — Scoreverwachting per wedstrijd (Poisson-verdeling)

> Toepasbaar op: Groups-pagina (per wedstrijd-rij) én Schema-tab (per kaart).
> Het model geeft W/D/L kansen — hieruit leiden we verwachte doelpunten af via Poisson.

- [ ] Maak `lib/score-distribution.ts` aan

**Wiskunde:**

Het model geeft `pWin` voor team A. Uit historische WK-data:
- Gemiddeld 1.18 goals per team per wedstrijd (WK 1998–2022)
- Bij hogere winkans scoort team A meer, bij lagere minder

```typescript
// lib/score-distribution.ts

// Schaal verwachte goals op basis van winkans:
// λ_A = BASE_GOALS * (1 + STRENGTH_FACTOR * (pWin - 0.33))
// λ_B = BASE_GOALS * (1 + STRENGTH_FACTOR * (pLoss - 0.33))
// waarbij BASE_GOALS = 1.18, STRENGTH_FACTOR = 1.2

const BASE_GOALS = 1.18
const STRENGTH_FACTOR = 1.2

function lambdaFromProb(teamProb: number): number {
  return BASE_GOALS * (1 + STRENGTH_FACTOR * (teamProb - 1/3))
}

// Poisson kans: P(X = k) = (λ^k * e^-λ) / k!
function poisson(lambda: number, k: number): number

// Genereer top-N meest waarschijnlijke scores:
export function topScores(
  pWin: number,   // kans dat team A wint
  pLoss: number,  // kans dat team B wint
  n: number = 5   // aantal scores teruggeven
): Array<{ homeGoals: number; awayGoals: number; probability: number }>
// Berekent P(i-j) = poisson(λ_A, i) * poisson(λ_B, j) voor i,j in 0..5
// Sorteert descending op probability
// Normaliseert zodat de getoonde scores optellen tot ~1.0 (of toont "overige X%")

// Let op: kansen kunnen niet optellen tot exact 100% omdat we afkappen bij score 5-5
// Toon "overige X%" als de top-N < 95% dekt
```

**Integratie op Groups-pagina (`GroupMatchRow.tsx`):**
- Voeg een uitklapbaar "Score kansen" blok toe onder elke ongespeelde wedstrijd-rij
- Trigger: kleine knop "🎯 Scores" naast de bestaande kansen-tekst (of inline als er ruimte is)
- Toon top-5 scores als pill-rij: `1-0  31%` · `0-0  18%` · `2-1  14%` · `1-1  12%` · `2-0  11%` · `overige 14%`
- Pills: achtergrond wit, rand grijs, kans in rood als ≥20%, groen als ≤5%
- **Gespeelde wedstrijden:** toon de werkelijke score gemarkeerd in de lijst (als die score in de top-5 zat) of voeg toe als aparte pill met ✓ marker
- Mobile: pills wrappen naar meerdere rijen

**Integratie op Schema-tab (Taak D):**
- Per ongespeelde wedstrijd-kaart: toon top-3 scores compact onder de W/D/L balk
- Formaat: `Meest waarschijnlijk: 1-0 (29%) · 0-0 (17%) · 2-0 (15%)`

**i18n strings toevoegen:**
```json
{
  "match": {
    "scoreOdds": "Scorekansen",
    "mostLikely": "Meest waarschijnlijk",
    "other": "overige"
  }
}
```

**Nieuwe unit test:**
- `topScores(0.6, 0.25)` → eerste score is 1-0 of 2-1 (niet 0-0)
- `topScores(0.33, 0.33)` → eerste score is 0-0 (gelijke teams)
- Som van alle P(i-j) voor i,j in 0..5 is ≥ 0.95

---

### Taak H — Impact-pagina: rijkere uitleg bij kansen-veranderingen

> De huidige MatchImpactView toont "+0.3% Spain" maar geeft geen context.
> Dit blok maakt de impact leesbaar en begrijpelijk.

- [ ] Breid `components/impact/MatchImpactView.tsx` uit

**Wat er nu staat (per team-rij):**
```
🟢 Spain  +0.3%    🔴 Argentina  −0.2%
```

**Wat er moet komen:**

**1. Verklarende tekst per team**

Genereer automatisch een zin op basis van grootte en richting van de delta:

```typescript
// lib/impact-narrative.ts (nieuw bestand)

export function impactNarrative(
  teamName: string,
  delta: number,          // bijv. +0.034 = +3.4%
  locale: 'nl' | 'en'
): string

// Drempelwaarden en bijbehorende teksten (NL):
// delta > +3%:   "{team} profiteert sterk — een concurrent viel vroeg af"
// delta +1..3%:  "{team} heeft iets meer ruimte gekregen in het schema"
// delta +0.3..1%:"{team} wint licht aan kans door de uitslag in Groep X"
// delta 0..0.3%: "(verwaarloosbaar effect)"
// delta -0.3..0%:"(verwaarloosbaar effect)"  
// delta -0.3..-1%:"{team} verliest licht terrein door een sterkere concurrent"
// delta -1..-3%: "{team} krijgt een zwaarder pad door de doorgang van {matchWinner}"
// delta < -3%:   "{team} heeft een stuk moeilijker schema gekregen"

// Als |delta| < 0.3%: toon de team-rij grijs en inklapbaar (standaard ingeklapt)
```

**2. Context-kaartje bovenaan de impact-weergave**

Boven de team-lijst: een kort samenvattings-kaartje per wedstrijd:

```
┌─────────────────────────────────────────────────────┐
│ MEX 2–0 RSA · Groep A · Estadio Azteca              │
│                                                     │
│ Mexico kwalificeert zich voor de R32 — dit          │
│ versterkt de linkerhelft van het bracket en         │
│ heeft kleine gevolgen voor de kampioenskansen       │
│ van teams die Mexico kunnen treffen.                │
│                                                     │
│ Totale volatiliteit: Σ|Δ| = 0.8%                   │
│ Grootste winnaar: Japan +0.2%                       │
│ Grootste verliezer: Argentina −0.2%                 │
└─────────────────────────────────────────────────────┘
```

```typescript
// lib/impact-narrative.ts — extra export:

export function matchSummaryNarrative(
  homeTeam: string,
  awayTeam: string,
  homeScore: number,
  awayScore: number,
  group: string,
  biggestWinner: { team: string; delta: number },
  biggestLoser: { team: string; delta: number },
  locale: 'nl' | 'en'
): string
// Genereert 1-2 zinnen over wat deze uitslag betekent voor het toernooi
// Combineert: wie won/verloor, welke groep, bracket-implicatie
```

**3. Visuele verbeteringen aan de team-rijen**

- Voeg een horizontale micrometer-balk toe per team (klein, 60px breed):
  - Middelpunt = 0%, links = negatief (rood), rechts = positief (groen)
  - Balk-breedte schaalt naar de grootste delta in de lijst (relatief)
- Teams met |delta| < 0.3% worden grijs weergegeven en staan onderaan
- Klapknop "Toon ook verwaarloosbare effecten (N teams)" om ze te onthullen

**4. i18n strings toevoegen:**
```json
{
  "impact": {
    "strongGain": "{team} profiteert sterk — een concurrent viel vroeg af",
    "moderateGain": "{team} heeft iets meer ruimte gekregen in het schema",
    "slightGain": "{team} wint licht aan kans door de uitslag in Groep {group}",
    "negligible": "Verwaarloosbaar effect",
    "slightLoss": "{team} verliest licht terrein door een sterkere concurrent",
    "moderateLoss": "{team} krijgt een zwaarder pad door de doorgang van {winner}",
    "strongLoss": "{team} heeft een stuk moeilijker schema gekregen",
    "showMore": "Toon ook verwaarloosbare effecten ({n} teams)",
    "hideMore": "Verberg verwaarloosbare effecten",
    "summaryCard": "Wedstrijdsamenvatting",
    "totalVolatility": "Totale volatiliteit"
  }
}
```

**Verificatie:**
- Open de impact-weergave voor MEX 2-0 RSA → context-kaartje zichtbaar bovenaan
- Spain heeft een verklarende tekst, niet alleen "+0.1%"
- Teams met delta < 0.3% staan grijs onderaan, ingeklapt
- "Toon meer" onthult ze

---

### Taak D — Tab 3: Toernooischema

- [ ] Maak `components/teams/ScheduleTab.tsx` aan
  - Toon alle wedstrijden van dit team in het toernooi, chronologisch
  - **Groepsfase:** alle drie groepswedstrijden met tegenstander, datum, stadion
    - Data uit `lib/fixtures.ts` of de bestaande groepsdata
    - Gespeelde wedstrijden: toon echte score (uit `lib/results.json`) + FT marker
    - Ongespeelde wedstrijden: toon modelkans (W/D/L % via `matchP`)
  - **Knockoutfase (indien doorgegaan):** toon Klement's voorspelde pad
    - Per ronde: tegenstander (of "TBD"), datum, modelkans indien bekend
    - Highlight de ronde waar Klement dit team uit het toernooi stuurt
  - Visueel: verticale tijdlijn, elke wedstrijd als kaart
    - Winst = groene rand · Verlies = rode rand · Nog te spelen = neutrale rand

**Data-combinatie:**
```typescript
// Per wedstrijd kaart toont:
// - Datum + tijd (lokale tijd)
// - Tegenstander (vlag + naam)
// - Stadion + stad
// - Status: FT [score] | Live | [W% D% L%]
// - Doorgaan → volgende ronde (pijl)
```

### Taak E — i18n strings toevoegen

- [ ] Voeg toe aan `messages/nl.json` en `messages/en.json`:
```json
{
  "teams": {
    "tabs": {
      "squad": "Selectie",
      "scorers": "Topscorers",
      "schedule": "Schema"
    },
    "squad": {
      "coach": "Coach",
      "captain": "Aanvoerder",
      "players": "spelers geselecteerd",
      "goalkeeper": "Keepers",
      "defender": "Verdedigers",
      "midfielder": "Middenvelders",
      "attacker": "Aanvallers"
    },
    "scorers": {
      "all": "Totaal",
      "expectedPoints": "Verwachte punten",
      "expectedGoals": "Verwachte goals",
      "legend": "Punten = goals × positiemultiplicator × rondemultiplicator",
      "disclaimer": "Verwachte waarden o.b.v. historische WK-doelpuntengemiddelden"
    },
    "schedule": {
      "group": "Groepsfase",
      "knockout": "Knockoutfase",
      "predicted": "Klement's voorspelling",
      "eliminated": "Uitgeschakeld"
    }
  }
}
```

### Taak F — Nieuwe lib-bestanden aanmaken

- [ ] `lib/squad-utils.ts` — positie-constanten en helper functies (zie Taak B)
- [ ] `lib/fantasy-points.ts` — `calcExpectedPoints()` (zie Taak C)
- [ ] `lib/score-distribution.ts` — `topScores()` via Poisson (zie Taak G)
- [ ] `lib/impact-narrative.ts` — `impactNarrative()` en `matchSummaryNarrative()` (zie Taak H)
- [ ] `lib/wc26-schedule.json` — alle 104 wedstrijden met datum/tijd/venue/hoogte (zie Taak I)
- [ ] `lib/venue-timezones.ts` — IANA-tijdzone per venue (zie Taak I)

### Verificatie na alle taken

```bash
npx tsc --noEmit          # 0 fouten inclusief noUncheckedIndexedAccess
npx eslint . --max-warnings 0
npx vitest run            # alle bestaande tests nog groen
npm run build             # slaagt
```

**Functionele checks:**
- Ga naar `/teams/spain` → drie tabs zichtbaar → klikken wisselt tab → URL updated
- Selectie-tab: 26 spelers gegroepeerd per positie, Yamal heeft ⭐ en is vetgedrukt
- Topscorers-tab: aanvallers-tab toont alleen aanvallers, gesorteerd op punten
- Schema-tab: groepswedstrijden zichtbaar, gespeelde wedstrijd heeft echte score
- Mobiel: tabs scrollen horizontaal als ze niet passen

---



### Taak I — Datum, tijd en venue op de bracket-pagina

> De bracket toont nu alleen teams en W/D/L kansen.
> Elke wedstrijd heeft een officieel speeltijdstip en een venue — dit is ook modelrelevant
> (hoogte-factor bij stadions op >1500m, reisafstand). Toon dit expliciet zodat de gebruiker
> begrijpt waarom bepaalde teams hogere of lagere kansen krijgen.

**Data-situatie:**
- Groepsfase: datum, tijd en venue zijn volledig bekend → hard in te vullen in `lib/fixtures.ts`
- Knockoutfase: venues zijn vooraf toegewezen per ronde (FIFA heeft dit gepubliceerd), maar
  de tegenstanders zijn pas bekend na de groepsfase. Datum en venue zijn dus WEL bekend,
  tegenstander nog niet (TBD). Dit is precies het punt: het model kan al rekening houden
  met de venue van de volgende ronde, zelfs als de tegenstander nog onbekend is.

**Stap 1 — Maak `lib/wc26-schedule.json` aan (handmatig invullen)**

Bevat alle 104 WK-wedstrijden met datum, tijd (UTC), venue en stad.
Bronnen: officieel FIFA-speelschema (gepubliceerd februari 2026).

```typescript
// Structuur per wedstrijd:
interface ScheduledMatch {
  matchId: string          // bijv. "GRP-A1", "R32-1", "R16-1", "QF-1", "SF-1", "FINAL"
  round: 'group' | 'r32' | 'r16' | 'qf' | 'sf' | 'final'
  group?: string           // "A" t/m "L" (alleen groepsfase)
  dateUtc: string          // ISO 8601, bijv. "2026-06-11T20:00:00Z"
  venue: string            // "Estadio Azteca"
  city: string             // "Mexico City"
  country: string          // "Mexico"
  altitudeM: number        // hoogte in meters — koppelt aan het model
  homeTeam?: string        // bekend bij groepswedstrijden, undefined bij KO
  awayTeam?: string        // bekend bij groepswedstrijden, undefined bij KO
}
```

De 16 WK-venues met hoogte (invullen bij aanmaken):
| Venue | Stad | Hoogte (m) |
|---|---|---|
| Estadio Azteca | Mexico City | 2240 |
| Estadio BBVA | Monterrey | 538 |
| Estadio Akron | Guadalajara | 1566 |
| SoFi Stadium | Los Angeles | 88 |
| Rose Bowl | Pasadena | 247 |
| Levi's Stadium | Santa Clara | 17 |
| MetLife Stadium | East Rutherford | 3 |
| AT&T Stadium | Arlington | 198 |
| Hard Rock Stadium | Miami | 2 |
| NRG Stadium | Houston | 15 |
| Arrowhead Stadium | Kansas City | 320 |
| Empower Field | Denver | 1609 |
| Geodis Park | Nashville | 182 |
| Lincoln Financial Field | Philadelphia | 12 |
| BC Place | Vancouver | 4 |
| BMO Field | Toronto | 76 |

> **Hoge-hoogte venues die het model beïnvloeden:** Mexico City (2240m), Guadalajara (1566m),
> Denver (1609m) activeren de hoogte-penalty voor zeeniveau-teams (zie Fase 2).

**Stap 2 — Integreer venue-data in de bracket-weergave**

- [ ] Breid `components/match/MatchCard.tsx` uit met een venue-rij
- [ ] Breid `components/match/GroupMatchRow.tsx` uit met datum + venue (zie screenshots — dit werkt al voor gespeelde wedstrijden, uitbreiden naar alle wedstrijden)

**Per wedstrijd-kaart toont:**
```
┌───────────────────────────────────────────────────────┐
│  R16 · 29 juni 2026 · 21:00 lokale tijd               │
│  🏟  MetLife Stadium · East Rutherford, NJ            │
│                                                       │
│  [🇩🇪 Germany]   45%  35%  20%   [🇫🇷 France]         │
│                  W    D    L                          │
└───────────────────────────────────────────────────────┘
```

Als het stadion een hoogte-penalty activeert (>1500m):
```
│  🏟  Estadio Azteca · Mexico City  ⚠️ 2240m hoogte    │
```
Met tooltip/hover: "Teams uit zeeniveau-landen krijgen hier een kleine kanspenalty door de dunne lucht."

**Stap 3 — Tijdzone-weergave**

- [ ] Toon tijd in de lokale tijdzone van het stadion (niet UTC)
- [ ] Voeg een klein tooltip toe met UTC-tijd voor internationale bezoekers
- [ ] Gebruik `Intl.DateTimeFormat` met de juiste IANA-tijdzone per venue:

```typescript
// lib/venue-timezones.ts (nieuw klein bestand)
export const VENUE_TIMEZONES: Record<string, string> = {
  "Estadio Azteca":          "America/Mexico_City",   // UTC-6
  "Estadio BBVA":            "America/Monterrey",     // UTC-6
  "Estadio Akron":           "America/Mexico_City",   // UTC-6
  "SoFi Stadium":            "America/Los_Angeles",   // UTC-7
  "Rose Bowl":               "America/Los_Angeles",   // UTC-7
  "Levi's Stadium":          "America/Los_Angeles",   // UTC-7
  "MetLife Stadium":         "America/New_York",      // UTC-4
  "AT&T Stadium":            "America/Chicago",       // UTC-5
  "Hard Rock Stadium":       "America/New_York",      // UTC-4
  "NRG Stadium":             "America/Chicago",       // UTC-5
  "Arrowhead Stadium":       "America/Chicago",       // UTC-5
  "Empower Field":           "America/Denver",        // UTC-6
  "Geodis Park":             "America/Chicago",       // UTC-5
  "Lincoln Financial Field": "America/New_York",      // UTC-4
  "BC Place":                "America/Vancouver",     // UTC-7
  "BMO Field":               "America/Toronto",       // UTC-4
}
```

**Stap 4 — Schema-tab (Taak D) uitbreiden**

De Schema-tab op de teams-pagina toont al wedstrijdkaarten — voeg nu venue + datum toe:

Per wedstrijd-kaart in de tijdlijn:
```
📅  12 juni 2026 · 18:00 lokale tijd
🏟  Estadio Akron · Guadalajara  ⚠️ 1566m
vs  [vlag] Mexico
    W 44%  ·  D 28%  ·  L 28%
    Meest waarschijnlijk: 1-0 (28%) · 0-0 (16%) · 2-1 (13%)
```

**Stap 5 — Model-link zichtbaar maken**

Op de Lookup-pagina: als een wedstrijd op een hoge-hoogte venue gespeeld wordt,
toon een klein badge naast de W/D/L balk:
```
[⚠️ Hoge hoogte: +hoogte-factor actief voor dit duel]
```
Dit is pas relevant zodra Fase 2 (hoogte-factor) geïmplementeerd is — zet de badge
nu alvast neer maar verberg hem met een feature-flag (`ALTITUDE_FACTOR_ENABLED = false`)
totdat Fase 2 klaar is.

**i18n strings toevoegen:**
```json
{
  "match": {
    "venue": "Stadion",
    "altitude": "{m}m hoogte",
    "altitudeWarning": "Hoge hoogte — zeeniveau-teams krijgen een kleine kanspenalty",
    "localTime": "lokale tijd",
    "utcTime": "UTC"
  }
}
```

**Nieuwe lib-bestanden:**
- [ ] `lib/wc26-schedule.json` — alle 104 wedstrijden met datum/tijd/venue/hoogte
- [ ] `lib/venue-timezones.ts` — IANA-tijdzone per venue

**Verificatie:**
- Bracket R16: elke wedstrijd-kaart toont datum, tijd (lokaal) en venue
- MetLife Stadium: geen hoogte-warning. Estadio Azteca: ⚠️ 2240m zichtbaar
- Schema-tab voor Spain: groepswedstrijden tonen correcte venues
- Tijdzone klopt: Azteca-wedstrijd toont bijv. "21:00 Mexico City" bij UTC+0 datumstring van 03:00


---


### Taak J — "Vandaag gespeeld" widget op de homepage

> Kleine maar zichtbare toevoeging: bezoekers zien direct welke wedstrijden er vandaag zijn.

- [ ] Maak `components/today/TodayMatches.tsx` aan
  - Lees `lib/wc26-schedule.json` — filter op datum = vandaag (UTC)
  - Per wedstrijd: vlaggen · teams · tijd (lokaal) · venue · live scorebalk indien gespeeld
  - Als geen wedstrijden vandaag: toon "Volgende wedstrijd: [datum] — [teams]"
  - Koppel aan `lib/results.json` voor live score als wedstrijd al gespeeld is
- [ ] Voeg widget toe aan de homepage (`app/[locale]/page.tsx`) als eerste sectie na de hero
- [ ] Voeg toe aan de navigatie als een kleine badge: "LIVE" (rood) als er een wedstrijd bezig is

**i18n:**
```json
{ "today": { "title": "Vandaag", "next": "Volgende wedstrijd", "noMatches": "Geen wedstrijden vandaag" } }
```

---

### Taak K — Reistijd-indicator per wedstrijd op het schema

> Het model rekent al met reisafstand als factor (Fase 2). Maak dit zichtbaar.

- [ ] Bereken voor elke wedstrijd: hoeveel dagen rust heeft elk team?
  - Uit `lib/wc26-schedule.json`: vorige wedstrijd van dit team → verschil in dagen
  - <3 dagen rust → ⚠️ weinig rust (geel) · 3–5 dagen → normaal (grijs) · >5 dagen → ✅ uitgerust (groen)
- [ ] Toon rust-indicator op:
  - Schema-tab teams-pagina: naast elke wedstrijd-kaart
  - Lookup-pagina: "🕐 Nederland speelt over 2 dagen (4 dagen rust)"
  - GroupMatchRow: klein icoon bij wedstrijden <3 dagen na vorige

**Logica (client-side, geen API nodig):**
```typescript
// lib/rest-days.ts
export function restDaysBefore(teamName: string, matchId: string): number | null
// Zoekt in wc26-schedule de vorige wedstrijd van dit team
// Geeft null als dit de eerste wedstrijd is
```

---

### Taak L — Bracket-pad visualisatie per team

> Op de teams-pagina: toon niet alleen het schema maar ook het mogelijke pad door het bracket.

- [ ] Maak `components/teams/BracketPathTab.tsx` aan (of integreer in Schema-tab)
  - Toon het volledige bracket als vereenvoudigde boom: Groep → R32 → R16 → QF → SF → Finale
  - Markeer: waar staat dit team nu? Welk pad voorspelt Klement?
  - Toon per ronde: de waarschijnlijke tegenstander + modelkans op doorgang
  - Grijze branches = paden die Klement niet voorspelt maar mogelijk zijn
  - Groene branch = Klement's voorspeld pad
- [ ] Voeg toe als vierde tab op teams-pagina: **Pad** (naast Selectie / Topscorers / Schema)

**Visueel:**
```
Groep H (1e) → R32 vs #3 uit E/H/I/J/K → R16 vs Winnaar R32-73 → QF → SF → Finale
     ✅ Spain      TBD (waarsch. ~30% kans op Mexico)   TBD
```

---

### Taak M — Vergelijkingspagina twee teams head-to-head

> Uitbreiding op de bestaande Lookup: een rijkere head-to-head vergelijkingspagina.

- [ ] Maak `app/[locale]/versus/[teamA]/[teamB]/page.tsx` aan
  - URL: `/versus/spain/netherlands`
  - Toon naast W/D/L kansen ook:
    - **Radar**: beide teams op dezelfde 5-assige radar (GDP, pop, temp, FIFA, Elo)
    - **Scoreverdeling**: top-8 meest waarschijnlijke scores (Taak G)
    - **Historische ontmoetingen**: indien beschikbaar uit een kleine `lib/h2h-history.json`
    - **Sterspeler vergelijking**: top-3 sterspelers van beide teams naast elkaar
    - **Venue-context**: als de twee teams elkaar zouden treffen, op welk stadion? (Klement's bracket-pad)
  - Deelbare URL: `klement-model-k5.vercel.app/versus/spain/netherlands`
- [ ] Voeg "Vergelijk →" knop toe op de teams-pagina die naar `/versus/[slug]/[opponent]` linkt
- [ ] Voeg "Volledige vergelijking" link toe op de Lookup-pagina

---

### Taak N — Kansgeschiedenisgraaf per team

> De `lib/probability-snapshots.json` houdt bij hoe de kampioenskansen per wedstrijd verschuiven.
> Maak dit zichtbaar als een kleine tijdlijn op de teams-pagina.

- [ ] Maak `components/teams/ProbabilityHistoryChart.tsx` aan
  - Kleine recharts LineChart: X-as = gespeelde wedstrijden (MEX-RSA, MEX-KOR, ...), Y-as = kampioenskans %
  - Groen als kans stijgt, rood als kans daalt na een wedstrijd
  - Toon als sub-sectie bovenaan de Schema-tab (boven de wedstrijd-kaarten)
  - Tooltip: "Na MEX 2-0 RSA: kans steeg van 4.1% → 4.3%"
- [ ] Toon ook op de homepage in de "Vandaag" widget voor de teams die vandaag spelen

---


---

## 📋 Fase 2b — Sterspeler-weging (volgende prioriteit na teams pagina)

> `squads-db.json` is klaar — nu koppelen aan het model.

- [ ] Maak `lib/star-player-status.json` en `lib/player-status.json` aan
- [ ] Maak `lib/squad-modifier.ts` aan met `calcStarPlayerPenalty`, `applyStarPlayerModifier`, `getStarPlayerSummary`
- [ ] Integreer in `lib/klement-custom.ts`
- [ ] Admin-pagina `/admin/squads` — status per speler instellen
- [ ] Lookup-pagina: toon sterspeler-samenvatting onder kansen

**Penalty-waarden (logit-schaal):**
- Sterspeler 1 out: −0.35
- Sterspeler 2 out: −0.22
- Sterspeler 3 out: −0.13
- Twijfelachtig: helft van bovenstaande

**Verificatie:** Mbappé op "out" → Franse winkans meetbaar lager in Lookup.

---

## 📋 Fase 1 — Elo-integratie

- [ ] Elo toevoegen als factor in `klement-custom.ts` (ELO_WEIGHT 30%, FIFA_WEIGHT 70%)
- [ ] Lookup: "Elo-bijdrage: X% | FIFA-bijdrage: Y%"
- [ ] Monte Carlo herberekenen met Elo
- [ ] Radardiagram: Elo als 6e as

---

## 📋 Fase 2 — Statische toernooidata

- [ ] `lib/stadiums.json` — 16 WK-stadions met hoogte in meters
- [ ] Hoogte-factor in model: zeeniveau-teams −5% bij >1500m
- [ ] Reisafstand-factor: >8000km = −3%
- [ ] Ervaringsfactor: WK-edities als lichte bonus

---

## 📋 Fase 3 — Recente vorm

- [ ] `/api/form/[team]` via API-Football
- [ ] `lib/form-cache.json` + dagelijkse GitHub Actions update
- [ ] Vormbalk op Teams-pagina (10 bolletjes groen/grijs/rood)
- [ ] Vormfactor in model: weging 15%

---

## 📋 Fase 4 — Competitieniveau

- [ ] `lib/league-data.json` — spelers top-5 competities, marktwaarde
- [ ] League-index in model
- [ ] Clubgenoten-bonus

---

## 📋 Fase 4b — Model configurator

- [ ] `/admin/model-config` — sliders voor alle gewichten
- [ ] `lib/model-config.json` + `lib/model-config.ts` met `getModelWeights()`
- [ ] 4 presets: Default · Elo-heavy · Form-heavy · Market-focused

---

## 📋 Fase 5 — Polymarket als modelfactor

- [ ] Instelbare slider 0–100% (model vs markt)
- [ ] Gecombineerde kans: `(modelkans × w) + (Polymarket × (1-w))`
- [ ] Default: 20% markt, 80% model
- [ ] Voorkeur opslaan in `localStorage`

---

## 📋 Fase 6 & 7 — Na het toernooi (medio juli 2026)

- [ ] `lib/xg-data.json` aanmaken (FBref.com)
- [ ] xG-verschil als bonus in model
- [ ] Brier Score berekenen voor alle voorspellingen
- [ ] Model vs Polymarket: wie was nauwkeuriger?
- [ ] Vergelijk met Klement's originele voorspelling
- [ ] Resultaten op `/about` publiceren

---

## Harde regels (samenvatting)

1. `lib/klement.ts` → **READ-ONLY**
2. `lib/squads-db.json` → **READ-ONLY**
3. `lib/teams.json` → **READ-ONLY**
4. Geen dark mode
5. i18n via `next-intl` — geen hardcoded strings in JSX
6. Simulaties zijn client-side (`'use client'`)
7. Alle kansen optellen tot 1.00
8. Commit na elke taak, direct doorgaan
9. `git pull --rebase && git push` — nooit bare `git push` in workflows

---

## Checks na elke fase

```bash
npx tsc --noEmit
npx eslint . --max-warnings 0
npx vitest run
npm run build
```
