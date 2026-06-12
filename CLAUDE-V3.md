# CLAUDE.md — WC26 Klement Fork

> Lees dit bestand volledig voordat je ook maar één bestand aanraakt.
> Dit is een uitbreiding op de bestaande CLAUDE.md in de repo — beide gelden.

---

## Wat dit project is

Een fork van `x-cookie/klement-model-k5`: een Next.js-app die Klement's econometrisch WK-model
(Panmure Liberum, april 2026) interactief maakt en stap voor stap uitbreidt.

| Laag | Wat | Status |
|---|---|---|
| **Eigen voorspellingen** | Alternatief bracket naast Klement's picks | ✅ gebouwd |
| **Statistieken & grafieken** | Elo-trend, radardiagram, historische WK-data | ✅ gebouwd |
| **Meertalig (NL/EN)** | Volledige i18n via `next-intl` | ✅ gebouwd |
| **Live data** | Polymarket-kansen + nieuws per team | ✅ gebouwd |
| **Selectiedatabase** | 48 landen · 26-mans selecties · clubs · FIFA-ranking | ✅ gebouwd |
| **Sterspeler-weging** | Blessures/schorsingen wegen mee in kansen | 🔧 in uitvoering |
| **Elo-integratie** | Elo vervangt ruwe FIFA-ranking als teamsterkte | 📋 gepland |
| **Statische toernooidata** | Stadionhoogte, reisafstand, WK-ervaring | 📋 gepland |
| **Recente vorm** | Laatste 10 interlands meewegen | 📋 gepland |
| **Competitieniveau** | Marktwaarde selectie, top-5 competities | 📋 gepland |
| **Live toernooi** | Uitslagen invoeren, Elo auto-update | 📋 gepland |
| **Polymarket als factor** | Marktodds als modelinput | 📋 gepland |

---

## Harde regels (nooit overtreden)

Erft alle harde regels uit de originele `CLAUDE.md`, plus:

1. **Geen scorevoorspelling in het model.** Het model blijft W/D/L only. Uitzondering
   (op expliciet verzoek, 2026): een Poisson-**scorekansverdeling** als afgeleide
   weergave op `/versus` (`lib/score-distribution.ts`) — afgeleid van de winkans, geen
   modelwijziging. Voeg geen scorevoorspelling toe aan het model zelf.
2. **`lib/klement.ts` is read-only.** Voeg geen logica toe aan het modelbestand.
   Wil je het model aanpassen? Maak `lib/klement-custom.ts` en exporteer daar vanuit.
3. **`lib/teams.json` is de enige bron van teamdata voor de basisapp.** Nooit inline hardcoden.
4. **`lib/squads-db.json` is read-only.** Statuswijzigingen gaan via `lib/player-status.json`.
5. **Klement's picks staan in `fixtures.ts`** (`k` veld). Jouw picks komen in `myPick`.
6. **Polymarket-data wordt gecached** — nooit rechtstreeks van de client fetchen.
   Gebruik `/api/polymarket` met `revalidate = 300`.
7. **Nieuws-API-calls gaan via `/api/news/[team]`** — nooit vanuit een client component.
8. **Simulatie is altijd client-side.** `'use client'` op alles wat `simResult`/`simKO` aanroept.
9. **Geen dark mode.** Light only.
10. **i18n via `next-intl`** — nooit strings hardcoden in componenten. Alles via `useTranslations()`.

---

## Mappenstructuur

```
/app
  /[locale]
    /page.tsx
    /lookup/page.tsx
    /my-bracket/page.tsx
    /stats/page.tsx
    /live/page.tsx
    /admin
      /squads/page.tsx        ← blessure-beheer per speler
      /results/page.tsx       ← uitslagen invoeren (Fase 5)
      /fitness/page.tsx       ← fitness-overzicht tijdens toernooi (Fase 5)

/components
  /my-bracket/
  /stats/
  /live/
  /admin/
    PlayerStatusEditor.tsx    ← per speler fit/twijfelachtig/out instellen
    SquadGrid.tsx             ← overzicht alle spelers per land

/lib
  klement.ts                  ← NIET AANRAKEN
  klement-custom.ts           ← jouw modelaanpassingen
  squads-db.json              ← NIET AANRAKEN (read-only brondata)
  player-status.json          ← statussen per speler (schrijfbaar via admin)
  star-player-status.json     ← sterspeler-statussen (schrijfbaar via admin)
  squad-modifier.ts           ← sterspeler-weging logica
  elo-history.json            ← Elo-ratings over tijd
  wc-history.json             ← historische WK-data
  teams.json                  ← NIET AANRAKEN

/messages
  en.json
  nl.json

/app/api
  /polymarket/route.ts
  /news/[team]/route.ts
  /admin/squads/route.ts      ← schrijft player-status.json
  /admin/results/route.ts     ← schrijft results.json (Fase 5)
```

---

## Selectiedatabase — `lib/squads-db.json`

Bevat alle 48 WK-landen, volledig ingevuld (deadline 2 juni 2026, FIFA-officieel).

```typescript
// Structuur per team
{
  name_nl: string,        // "Nederland"
  name_en: string,        // "Netherlands"
  group: string,          // "F"
  coach: string,
  captain: string,
  fifa_ranking: number,
  confederation: string,  // "UEFA"
  star_players: [         // top-3 sterspelers per team
    { rank: 1, name: string, status: "fit" | "doubtful" | "out" },
    { rank: 2, name: string, status: "fit" | "doubtful" | "out" },
    { rank: 3, name: string, status: "fit" | "doubtful" | "out" },
  ],
  squad: [                // volledige 26-mans selectie
    {
      name: string,
      club: string | null,
      position: string | null,
      category: "goalkeeper" | "defender" | "midfielder" | "attacker",
      status: "fit" | "doubtful" | "out",  // actueel bijgehouden via admin
    }
  ]
}
```

**Sterspelers per land (initiële waarden):**

| Land | Sterspeler 1 | Sterspeler 2 | Sterspeler 3 |
|---|---|---|---|
| Spanje | Lamine Yamal | Rodri | Pedri |
| Frankrijk | Kylian Mbappé | Aurélien Tchouaméni | Bradley Barcola |
| Portugal | Bruno Fernandes | Vitinha | Rafael Leão |
| Duitsland | Jamal Musiala | Florian Wirtz | Joshua Kimmich |
| Brazilië | Vinícius Júnior | Raphinha | Alisson Becker |
| Argentinië | Lionel Messi | Julián Álvarez | Enzo Fernández |
| Engeland | Jude Bellingham | Harry Kane | Bukayo Saka |
| Nederland | Virgil van Dijk | Frenkie de Jong | Cody Gakpo |
| Uruguay | Federico Valverde | Darwin Núñez | Ronald Araújo |
| Marokko | Achraf Hakimi | Sofyan Amrabat | Brahim Díaz |
| Colombia | Luis Díaz | James Rodríguez | Richard Ríos |
| België | Kevin De Bruyne | Romelu Lukaku | Jérémy Doku |
| Japan | Takefusa Kubo | Wataru Endo | Kaoru Mitoma |
| VS | Christian Pulisic | Weston McKennie | Tyler Adams |
| Noorwegen | Erling Haaland | Martin Ødegaard | Alexander Sørloth |
| Zwitserland | Granit Xhaka | Manuel Akanji | Breel Embolo |
| Turkije | Arda Güler | Hakan Çalhanoğlu | Kenan Yıldız |
| Ecuador | Moisés Caicedo | Piero Hincapié | Enner Valencia |
| Oostenrijk | David Alaba | Marcel Sabitzer | Konrad Laimer |
| Zweden | Viktor Gyökeres | Alexander Isak | Lucas Bergvall |

Overige landen: captain = sterspeler 1, volgende 2 bekende namen = 2 en 3.

---

## Blessure-systeem — Fase 2b

### Twee lagen

**Laag 1 — Sterspeler-weging** (`lib/star-player-status.json`)
De top-3 per land. Impact op de modelkansen:
- Sterspeler 1 out: -8% op winkans (logit-schaal)
- Sterspeler 2 out: -5%
- Sterspeler 3 out: -3%
- Twijfelachtig: helft van bovenstaande

**Laag 2 — Volledige selectie** (`lib/player-status.json`)
Elke individuele speler uit de 26-mans selectie kan worden bijgehouden.
Dit is voor de beheerpagina — de modelberekening gebruikt alleen laag 1.

### `lib/player-status.json` — structuur

```json
{
  "lastUpdated": "2026-06-11T00:00:00Z",
  "statuses": {
    "Nederland": {
      "Bart Verbruggen": "fit",
      "Virgil van Dijk": "fit",
      "Frenkie de Jong": "doubtful"
    },
    "Engeland": {
      "Harry Kane": "fit",
      "Jude Bellingham": "fit"
    }
  }
}
```

Status-opties: `"fit"` | `"doubtful"` | `"out"`

### Admin-beheerpagina `/admin/squads`

Wachtwoord-beveiligd (zelfde mechanisme als `/admin/results`).

**Wat de pagina toont:**
- Alle 48 landen gesorteerd op FIFA-ranking
- Per land: groepsletter + naam coach
- Per speler: naam, club, positie-categorie, en een dropdown fit/twijfelachtig/out
- Sterspelers worden apart gemarkeerd (⭐) bovenaan elk team
- "Opslaan" knop schrijft naar `/api/admin/squads` → `lib/player-status.json`
- Timestamp van laatste update bovenaan

**Visuele codering:**
- Groen bolletje = fit
- Oranje bolletje = twijfelachtig
- Rood bolletje = out
- Sterspelers hebben ⭐ voor hun naam

### `lib/squad-modifier.ts`

```typescript
export type PlayerStatus = 'fit' | 'doubtful' | 'out'

// Penalty op logit-schaal per sterspeler-rank
const STAR_PENALTY = { 1: -0.35, 2: -0.22, 3: -0.13 }

// Geeft de actuele status terug (player-status.json overschrijft squads-db.json)
export function getPlayerStatus(teamNl: string, playerName: string): PlayerStatus

// Berekent totale penalty voor een team op basis van sterspeler-statussen
export function calcStarPlayerPenalty(teamNl: string): number

// Past penalty toe op W/D/L kansen (logit-schaal, normaliseert naar 1.0)
export function applyStarPlayerModifier(
  probs: { win: number; draw: number; loss: number },
  homeTeamNl: string,
  awayTeamNl: string
): { win: number; draw: number; loss: number }

// Geeft leesbare samenvatting: "Mbappé out · Tchouaméni twijfelachtig"
export function getStarPlayerSummary(teamNl: string): string

// Geeft volledige spelerslijst met actuele statussen voor de admin-pagina
export function getFullSquadWithStatus(teamNl: string): Array<{
  name: string; club: string | null; category: string;
  isStar: boolean; starRank?: number; status: PlayerStatus
}>
```

### Lookup-pagina — uitbreiding

Toon onder de kansen-display:
```
🇳🇱 Nederland: Virgil van Dijk fit · Frenkie de Jong twijfelachtig (-2.5%)
🏴󠁧󠁢󠁥󠁮󠁧󠁿 Engeland: Harry Kane fit · Jude Bellingham fit
```

---

## Model-uitbreidingen (roadmap)

### Fase 1 — Elo-integratie
> `lib/elo-history.json` is al aanwezig. Sessie-estimate: 1 Claude Code sessie.

- Voeg Elo toe als factor aan `lib/klement-custom.ts`
- Weging: Elo 30%, FIFA-ranking 70% (instelbaar via constante)
- Toon in Lookup welk deel uit Elo vs FIFA-ranking komt
- Monte Carlo simulaties herberekenen met Elo-factor
- Radardiagram uitbreiden met Elo als 6e as

### Fase 2 — Statische toernooidata
> Sessie-estimate: 1 Claude Code sessie + handmatig data invoeren.

**Data nodig (handmatig invoeren):**
- `lib/stadiums.json` — per stadion: stad, land, hoogte in meters (bron: Wikipedia)
- `lib/squad-data.json` — per team: gemiddelde leeftijd, aantal WK-edities

**Modelaanpassingen:**
- Hoogte-factor: -5% winkans bij wedstrijd >1500m voor zeeniveau-teams
- Reisafstand-factor: >8000km reisafstand = -3% winkans
- Ervaringsfactor: aantal WK-edities als lichte bonus

### Fase 3 — Recente vorm
> Sessie-estimate: 1-2 Claude Code sessies.

- Maak `/api/form/[team]` route aan via API-Football
- Berekend vormcijfer: win=3pt, gelijk=1pt, verlies=0pt (gewogen naar recentheid)
- Kwaliteit tegenstander meewegen
- Sla op in `lib/form-cache.json` (dagelijks via GitHub Actions)
- Voeg vormbalk toe aan Teams-pagina
- Weging in model: 15%

### Fase 4 — Competitieniveau & spelersdata
> Sessie-estimate: 1-2 Claude Code sessies.

- `lib/league-data.json` — spelers in top-5 competities, totale marktwaarde
- League-index: % spelers in top-5 × kwaliteitsgewicht
- Clubgenoten-bonus: 3+ spelers van zelfde club = kleine synergiebonus
- Radardiagram 7e as: "Competitieniveau"

### Fase 4b — Model configurator
> Sessie-estimate: 1-2 Claude Code sessies.

- Maak `/admin/model-config` aan — wachtwoord-beveiligd, zelfde auth als `/admin/squads`
- Sla gewichten op in `lib/model-config.json`, uitgelezen via nieuwe `lib/model-config.ts`
  die `getModelWeights()` exporteert met defaults gelijk aan de huidige hardcoded constanten
- `klement-custom.ts` leest gewichten via `getModelWeights()` in plaats van hardcoded waarden
- Sliders voor: GDP-gewicht, bevolkingsgewicht, temperatuurgewicht, FIFA-gewicht, host-bonus,
  `ELO_WEIGHT` (als % van de FIFA-slot), Polymarket-gewicht, en sterspeler-penalty's (rank 1/2/3)
- Live "factoren-som"-indicator — waarschuwt als de basisfactoren afwijken van 100%
- 4 presets: Default, Elo-heavy, Form-heavy (ontgrendelt zodra Fase 3 klaar is), Market-focused
- Instellingen persisteren server-side in `lib/model-config.json` (niet `localStorage`),
  zodat ze voor alle bezoekers gelden, niet alleen de admin-browser

### Fase 5 — Live toernooidata
> Start zodra het toernooi begint. Sessie-estimate: 2-3 Claude Code sessies.

**Uitlagenbeheerpagina `/admin/results`** (wachtwoord-beveiligd):
- Invoerveld per wedstrijd: score team A vs team B
- Opslaan in `lib/results.json`

**Elo auto-update:**
- Na elke ingevoerde uitslag: herbereken Elo met K-factor 32
- Opslaan in `lib/elo-current.json` (apart van historische data)

**Rustdagen-factor:**
- <3 dagen rust = -4% winkans

**Monte Carlo herberekenen na elke uitslag-invoer**

### Fase 6 — Polymarket als modelfactor
> Sessie-estimate: 1 Claude Code sessie.

- Instelbare slider in de app: 0% = puur model, 100% = puur markt
- Gecombineerde kans = (modelkans × gewicht) + (Polymarket × (1-gewicht))
- Default: 20% markt, 80% model
- Sla voorkeur op in `localStorage`

### Fase 7 — xG (na het toernooi)
> Start na het WK (medio juli 2026).

- `lib/xg-data.json` aanmaken
- xG-verschil als bonus: structureel hogere xG = betere kansen
- Bron: FBref.com (handmatig of scrapen)

### Fase 8 — Model kalibratie (na het toernooi)
> Na het WK.

- Bereken Brier Score voor alle voorspellingen
- Vergelijk met Polymarket: wie was nauwkeuriger?
- Vergelijk met Klement's originele voorspelling
- Pas wegingsfactoren aan op basis van wat werkte

---

## Bestaande features (al gebouwd)

### Mijn bracket — `/my-bracket`

```typescript
// lib/my-picks.ts
export const MY_PICKS: Record<string, string> = {
  "r32-1": "Germany",
  "final": "France",
}
export const MY_CHAMPION = "France"
```

- Picks opgeslagen in `localStorage` onder `wc26-my-picks`
- Oranje badge waar jouw pick afwijkt van Klement
- Kopieerknop naar clipboard

### Statistieken — `/stats`

- `EloTrendChart.tsx` — recharts LineChart, multiselect, max 6 teams
- `FactorRadar.tsx` — recharts RadarChart, 5 assen, 2 teams vergelijken
- `PolymarketBar.tsx` — model vs markt, highlight bij >5% verschil
- `WCHistoryTable.tsx` — WK-winnaars 1930–2022

### Live data — `/live`

- `/api/polymarket/route.ts` — revalidate 300s, fallback via `polymarket-fallback.json`
- `/api/news/[team]/route.ts` — revalidate 1800s, max 3 artikelen, <7 dagen oud
- `PolymarketWidget.tsx` — top-10 kansen met live timestamp
- `NewsCard.tsx` — zoekbalk + 3 nieuwskaartjes

---

## Stijl

Erft het volledige Trionda Light design system. Aanvullingen:

```css
--my-pick:        #F5A623;   /* oranje — uitsluitend voor eigen picks */
--my-pick-soft:   #FEF6E9;
--live-red:       #E82418;   /* live badge */
--status-fit:     #22C55E;   /* groen bolletje */
--status-doubtful:#F59E0B;   /* oranje bolletje */
--status-out:     #EF4444;   /* rood bolletje */
```

---

## API-sleutels

```bash
# .env.local
REVALIDATE_TOKEN=...     # bestaand
NEWS_API_KEY=...         # NewsAPI.org
ADMIN_PASSWORD=...       # admin-pagina's (alle admin-routes gebruiken dezelfde)
```

---

## Succeskriterium per feature

| Feature | Klaar als |
|---|---|
| Blessure-beheer | Admin-pagina toont alle 26 spelers per land, status-wijziging is direct zichtbaar in Lookup-kansen |
| Sterspeler-weging | Mbappé op "out" zetten verlaagt Franse winkans meetbaar in alle matches |
| Elo-integratie | Lookup toont gesplitst: "Elo-bijdrage: X%, FIFA-bijdrage: Y%" |
| Statische data | Hoogte-factor werkt voor wedstrijden in Mexico City (>2200m) |
| Recente vorm | Vormbalk zichtbaar op Teams-pagina voor alle 48 landen |
| Live uitslagen | Elo update automatisch na invoer uitslag in `/admin/results` |
