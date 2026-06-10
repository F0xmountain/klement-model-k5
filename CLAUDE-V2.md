# CLAUDE.md — WC26 Klement (jouw fork)

> Lees dit bestand volledig voordat je ook maar één bestand aanraakt.
> Dit is een uitbreiding op de bestaande CLAUDE.md in de repo — beide gelden.

---

## Wat dit project is

Een fork van `x-cookie/klement-model-k5`: een Next.js-app die Klement's econometrisch WK-model
(Panmure Liberum, april 2026) interactief maakt. De fork voegt vier lagen toe:

| Laag | Wat |
|---|---|
| **Eigen voorspellingen** | Alternatief bracket naast Klement's picks |
| **Statistieken & grafieken** | Elo-trend, scorevergelijking, historische WK-data |
| **Meertalig (NL/EN)** | Volledige i18n via `next-intl` |
| **Live data** | Polymarket-kansen + recente nieuws per team |

Het model zelf (`lib/klement.ts`) wordt **niet gewijzigd** — zie harde regels hieronder.

---

## Harde regels (nooit overtreden)

Erft alle harde regels uit de originele `CLAUDE.md`, plus:

1. **Geen scorevoorspelling.** W/D/L only. Altijd.
2. **`lib/klement.ts` is read-only.** Voeg geen logica toe aan het modelbestand.
   Wil je het model aanpassen? Maak `lib/klement-custom.ts` en exporteer daar vanuit.
3. **`lib/teams.json` is de enige bron van teamdata.** Nooit inline hardcoden.
4. **Klement's picks staan in `fixtures.ts`** (`k` veld). Jouw picks komen in een apart veld `myPick`.
5. **Polymarket-data wordt gecached** — nooit rechtstreeks van de client fetchen.
   Gebruik de API-route `/api/polymarket` met een `revalidate` van 300 seconden (5 min).
6. **Nieuws-API-calls gaan via `/api/news/[team]`** — nooit vanuit een client component.
7. **Simulatie is altijd client-side.** `'use client'` op alles wat `simResult`/`simKO` aanroept.
8. **Geen dark mode.** Light only.
9. **i18n via `next-intl`** — nooit strings hardcoden in componenten. Alles via `useTranslations()`.

---

## Mappenstructuur (uitbreidingen op de bestaande structuur)

```
/app
  /[locale]                    ← next-intl locale wrapper
    /page.tsx                  → Landing (meertalig)
    /lookup/page.tsx
    /my-bracket/page.tsx       ← NIEUW: jouw eigen bracket
    /stats/page.tsx            ← NIEUW: statistieken & grafieken
    /live/page.tsx             ← NIEUW: Polymarket + nieuws
    /...rest (bestaande routes)

/components
  /my-bracket
    MyBracketEditor.tsx        ← drag-and-drop bracket invullen
    MyBracketDisplay.tsx       ← readonly weergave van jouw picks
  /stats
    EloTrendChart.tsx          ← recharts lijngrafiek Elo over tijd
    FactorRadar.tsx            ← recharts radardiagram per team
    WCHistoryTable.tsx         ← historische WK-winnaars tabel
    PolymarketBar.tsx          ← horizontale bar: model vs markt
  /live
    PolymarketWidget.tsx       ← kansen per team, live badge
    NewsCard.tsx               ← nieuws snippet per team

/lib
  klement.ts                   ← NIET AANRAKEN
  klement-custom.ts            ← NIEUW: jouw modelaanpassingen (optioneel)
  teams.json                   ← NIET AANRAKEN (alleen GitHub Actions)
  my-picks.ts                  ← NIEUW: jouw bracket picks (zie hieronder)
  elo-history.json             ← NIEUW: Elo-ratings per team over tijd
  wc-history.json              ← NIEUW: historische WK-data

/messages
  en.json                      ← Engelse vertalingen
  nl.json                      ← Nederlandse vertalingen

/app/api
  /polymarket/route.ts         ← NIEUW: Polymarket proxy + cache
  /news/[team]/route.ts        ← NIEUW: nieuws proxy (bijv. NewsAPI)
```

---

## Jouw eigen bracket — `lib/my-picks.ts`

Sla jouw picks op als een apart object, structureel identiek aan de `k`-velden in `fixtures.ts`.
Gebruik het veld `myPick` — nooit het bestaande `k` veld overschrijven.

```typescript
// lib/my-picks.ts
// Jouw persoonlijke WK-bracket. Wijzig dit handmatig of via MyBracketEditor.

export const MY_PICKS: Record<string, string> = {
  // Sleutel = match-id uit fixtures.ts, waarde = teamnaam
  "r32-1":  "Germany",
  "r32-2":  "Japan",
  // ...etc
  "final":  "France",   // jouw kampioen
}

export const MY_CHAMPION = "France"   // prominent weergeven op /my-bracket
```

**Regels voor `MyBracketEditor`:**
- Sla picks op in `localStorage` onder key `wc26-my-picks`
- Exporteer naar `my-picks.ts` via een kopieerknop (JSON in clipboard)
- Toon model-kansen (`matchP`) als hint naast elke keuze
- Markeer afwijkingen van Klement's picks met een oranje badge

---

## Polymarket API-route

```typescript
// app/api/polymarket/route.ts
import { NextResponse } from 'next/server'

export const revalidate = 300   // 5 minuten cache

export async function GET() {
  // Haal WK-kansen op van Polymarket API
  // Endpoint: https://clob.polymarket.com/markets?tag=world-cup-2026
  // Verwerk naar { team: string, probability: number }[]
  // Sorteer op kans descending
  // Return als JSON
}
```

**Foutafhandeling:** Als Polymarket niet bereikbaar is, return de laatste bekende waarden
uit een statisch fallback-bestand `lib/polymarket-fallback.json`.

---

## Nieuws API-route

```typescript
// app/api/news/[team]/route.ts
export const revalidate = 1800   // 30 minuten cache

// Gebruik NewsAPI.org (gratis tier) of GNews API
// Query: "{teamName} FIFA World Cup 2026"
// Return maximaal 3 artikelen: { title, url, publishedAt, source }[]
// Strip alles buiten deze velden — nooit volledige artikeltekst cachen
```

Sla de API-key op in `.env.local` als `NEWS_API_KEY`. Documenteer dit in `.env.local.example`.

---

## Statistieken — `/stats`

### Elo-trendgrafiek (`EloTrendChart.tsx`)

- Data uit `lib/elo-history.json`
- Formaat: `{ team: string, history: { date: string, elo: number }[] }[]`
- Gebruik `recharts` LineChart
- Toon max 6 teams tegelijk (dropdown multiselect)
- Kleur per team: gebruik de teamkleuren uit een lookup-object (handmatig definiëren per team)

### Radardiagram (`FactorRadar.tsx`)

- Vijf assen: GDP, Populatie, Klimaat, FIFA-ranking, Thuisvoordeel
- Data rechtstreeks uit `sc()`-factorfuncties in `klement.ts`
- Toon twee teams naast elkaar (vergelijkingsmodus)
- Gebruik `recharts` RadarChart

### Model vs Markt (`PolymarketBar.tsx`)

- Twee horizontale bars per team: modelkans (uit `matchP`) vs Polymarket-kans
- Sorteer op modelkans
- Highlight teams waar het verschil > 5% is (potentiële waarde-bets — met disclaimer)

### Disclaimer voor kansen

Voeg altijd onderaan de `/stats` en `/live` pagina toe:
> *Dit is geen financieel advies. WK-voorspellingen zijn probabilistisch en inherent onzeker.*

---

## Meertalig — `next-intl`

### Setup

```bash
npm install next-intl
```

Volg de next-intl App Router setup: `middleware.ts` + `i18n.ts` + `[locale]`-wrapper.
Ondersteun twee locales: `en` (default) en `nl`.

### Bestandsstructuur vertalingen

```json
// messages/nl.json
{
  "nav": {
    "lookup": "Wedstrijd",
    "bracket": "Mijn Bracket",
    "stats": "Statistieken",
    "live": "Live",
    "about": "Over het model"
  },
  "hero": {
    "headline": "Wie wint het WK 2026?",
    "sub": "Een econometrisch model dat 2014, 2018 en 2022 correct voorspelde — nu voor alle 48 teams."
  }
  // ...etc
}
```

### Regels

- Gebruik `useTranslations('namespace')` in elk component
- Nooit een Nederlandse of Engelse string hardcoden in JSX
- Datumnotaties via `Intl.DateTimeFormat` met de actieve locale
- De taalwisselaar staat rechtsbovenin de nav (twee knoppen: NL / EN)

---

## Navigatie-uitbreidingen

Voeg toe aan de bestaande `Nav.tsx`:

```
Wedstrijd  |  Teams  |  Groepen  |  Bracket (Klement)  |  Mijn Bracket  |  Statistieken  |  Live  |  Over
```

Op mobiel: hamburger-menu of horizontaal scrollbare nav (kies wat al in de repo zit).

---

## Databestanden aanmaken

### `lib/elo-history.json`

Haal historische Elo-ratings op van `https://www.eloratings.net` (publiek beschikbaar).
Neem minimaal de laatste 10 jaar, per kwartaal. Beperk tot de 48 gekwalificeerde teams.
Formaat:

```json
[
  {
    "team": "Netherlands",
    "history": [
      { "date": "2016-01-01", "elo": 1842 },
      { "date": "2016-04-01", "elo": 1856 }
    ]
  }
]
```

### `lib/wc-history.json`

Historische WK-winnaars en finalisten (1930–2022).
Formaat:

```json
[
  { "year": 2022, "winner": "Argentina", "runnerUp": "France", "host": "Qatar" },
  { "year": 2018, "winner": "France",    "runnerUp": "Croatia", "host": "Russia" }
]
```

---

## Stijl — aanvullingen op Trionda Light

Erft het volledige Trionda Light design system. Aanvullingen:

```css
/* Jouw eigen picks — oranje accent */
--my-pick:       #F5A623;
--my-pick-soft:  #FEF6E9;

/* Live badge */
--live-red:      #E82418;
```

Oranje uitsluitend gebruiken voor "mijn picks" — nergens anders.

---

## Succeskriterium per feature

Definieer per feature wanneer het klaar is voordat je begint:

| Feature | Klaar als |
|---|---|
| Mijn bracket | Ik kan alle 32 KO-wedstrijden invullen, opslaan en de pagina herladen zonder verlies |
| Statistieken | Radardiagram en Elo-grafiek laden voor elk team zonder fouten |
| Polymarket | Kansen worden getoond met timestamp, fallback werkt als API down is |
| Nieuws | Max 3 artikelen per team, ouder dan 7 dagen wordt gefilterd |
| i18n | Alle pagina's volledig vertaald, geen hardcoded strings in JSX |

---

## Eerste stap

Kloon de repo en controleer of de bestaande code werkt:

```bash
git clone https://github.com/x-cookie/klement-model-k5.git
cd klement-model-k5
npm install
npm run dev
```

Bezoek `http://localhost:3000` en controleer: lookup, groepen, bracket, Monte Carlo.
Pas daarna iets aan.
