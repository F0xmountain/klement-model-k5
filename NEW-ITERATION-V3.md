# NEW-ITERATION.md — Fork-uitbreidingen

> Geordende takenlijst voor Claude Code. Werk van boven naar beneden.
> Markeer taken als [x] zodra ze klaar zijn en getest.
> Status-legenda: [x] = klaar · [ ] = nog te doen · [~] = deels klaar

---

## ✅ Fase 0 — Basis (klaar)

- [x] Fork van `x-cookie/klement-model-k5` aangemaakt
- [x] `npm install && npm run dev` werkt
- [x] i18n via `next-intl` (NL/EN)
- [x] `/my-bracket` — eigen bracket editor
- [x] `/stats` — Elo-trendgrafiek, radardiagram, WK-historietabel, Polymarket-bar
- [x] `/live` — Polymarket-widget + nieuws per team
- [x] Hamburger-menu mobiel, responsive navigatie

---

## ✅ Fase 0b — Selectiedatabase (klaar)

- [x] `lib/squads-db.json` aangemaakt — 48 landen · 26-mans selecties · clubs · coaches · groepen · FIFA-ranking
- [x] `lib/talents.json` aangemaakt — grootste talent per land
- [x] `lib/topscorers.json` aangemaakt — tracker-structuur voor tijdens het toernooi

---

## 🔧 Fase 2b — Sterspeler-weging & blessure-beheer (nu doen)

> Dit is de hoogste prioriteit. squads-db.json is klaar — nu koppelen aan het model.

### 2b-1. Voeg star_players toe aan squads-db.json

- [ ] Voeg `star_players` array toe aan elk team in `lib/squads-db.json`
  - Gebruik de tabel uit `CLAUDE.md` voor de top-20 landen
  - Overige landen: captain = rank 1, volgende 2 bekende namen = rank 2/3
  - Alle statussen beginnen als `"fit"`

### 2b-2. Maak statusbestanden aan

- [ ] Maak `lib/star-player-status.json` aan
  - Structuur: `{ lastUpdated, overrides: { "Nederland": { "Virgil van Dijk": "fit" } } }`
  - Gegenereerd uit star_players in squads-db.json, allemaal "fit"
- [ ] Maak `lib/player-status.json` aan
  - Structuur: `{ lastUpdated, statuses: { "Nederland": { "Bart Verbruggen": "fit" } } }`
  - Bevat ALLE 26 spelers per land, allemaal "fit" als initiële waarde
  - Dit bestand wordt bijgehouden via de admin-pagina

### 2b-3. Maak `lib/squad-modifier.ts` aan

- [ ] Exporteer `getPlayerStatus(teamNl, playerName): PlayerStatus`
- [ ] Exporteer `calcStarPlayerPenalty(teamNl): number` — logit-schaal penalty
- [ ] Exporteer `applyStarPlayerModifier(probs, homeTeamNl, awayTeamNl)` — past kansen aan
- [ ] Exporteer `getStarPlayerSummary(teamNl): string` — leesbare samenvatting
- [ ] Exporteer `getFullSquadWithStatus(teamNl)` — voor de admin-pagina

Penalty-waarden (logit-schaal, zie CLAUDE.md voor uitleg):
- Sterspeler 1 out: -0.35 (≈ -8% bij 50% basiskans)
- Sterspeler 2 out: -0.22 (≈ -5%)
- Sterspeler 3 out: -0.13 (≈ -3%)
- Twijfelachtig: helft van bovenstaande

### 2b-4. Integreer in `lib/klement-custom.ts`

- [ ] Importeer `applyStarPlayerModifier` uit `squad-modifier.ts`
- [ ] Wikkel de return van de kansen-berekening in `applyStarPlayerModifier`
- [ ] Als `klement-custom.ts` nog niet bestaat: maak het als wrapper aan

### 2b-5. Admin-pagina `/admin/squads`

- [ ] Maak `app/[locale]/admin/squads/page.tsx` aan
- [ ] Zelfde wachtwoord-mechanisme als bestaande admin-pagina
- [ ] Toon alle 48 landen gesorteerd op FIFA-ranking
- [ ] Per land: groepsletter + coach
- [ ] Per speler: naam, club, positie-categorie, status-dropdown (fit/twijfelachtig/out)
- [ ] Sterspelers gemarkeerd met ⭐ en bovenaan elk team geplaatst
- [ ] Visuele status-indicatoren: 🟢 fit · 🟡 twijfelachtig · 🔴 out
- [ ] "Opslaan" schrijft naar `/api/admin/squads`
- [ ] Timestamp van laatste update bovenaan
- [ ] Maak `app/api/admin/squads/route.ts` aan (POST → schrijft `player-status.json`)

### 2b-6. Lookup-pagina uitbreiden

- [ ] Importeer `getStarPlayerSummary` en toon onder de kansen:
  ```
  🇳🇱 Nederland: Virgil van Dijk fit · Frenkie de Jong twijfelachtig (-2.5%)
  ```
- [ ] Toon alleen als er een afwijking is (niet bij alle "fit")

### 2b-7. Types

- [ ] Maak `lib/types/squads.ts` aan met `PlayerStatus`, `StarPlayer`, `SquadTeam`

**Verifieer Fase 2b:**
- Zet Mbappé op "out" in `/admin/squads`
- Ga naar Lookup, kies een wedstrijd met Frankrijk
- Franse winkans is meetbaar lager, summary toont "Mbappé out"
- Zet Mbappé terug op "fit" — kansen normaliseren

---

## 📋 Fase 1 — Elo-integratie

> `lib/elo-history.json` is al aanwezig.

- [ ] Voeg Elo toe als factor aan `lib/klement-custom.ts`
  - Weging: `ELO_WEIGHT = 0.30`, `FIFA_WEIGHT = 0.70` (als exporteerbare constanten)
  - Gebruik de meest recente waarde uit `elo-history.json` per team
- [ ] Monte Carlo simulaties herberekenen met Elo-factor
- [ ] Lookup-pagina: toon gesplitst "Elo-bijdrage: X% | FIFA-bijdrage: Y%"
- [ ] Radardiagram uitbreiden met Elo als 6e as

**Verifieer:**
- Lookup toont een extra rij: "Teamsterkte: Elo 30% + FIFA 70%"
- `npm run build` slaagt

---

## 📋 Fase 2 — Statische toernooidata

> Eenmalig handmatig invoeren — data verandert niet tijdens het toernooi.

### Data aanmaken (handmatig invoeren)

- [ ] Maak `lib/stadiums.json` aan:
  ```json
  [{ "city": "Mexico City", "country": "Mexico", "altitude_m": 2240 }]
  ```
  Bron: Wikipedia — voer in voor alle 16 WK-stadions

- [ ] Voeg aan `lib/squads-db.json` per team toe:
  - `avg_age: number` — gemiddelde leeftijd selectie (Transfermarkt)
  - `wc_editions: number` — aantal WK-deelnames (al aanwezig als `wc_appearances`)

### Modelaanpassingen

- [ ] Hoogte-factor in `klement-custom.ts`:
  - Teams van zeeniveau (<500m) krijgen -5% winkans bij wedstrijd op >1500m
- [ ] Reisafstand-factor:
  - Bereken reisafstand via coördinaten thuisland → speelstad
  - >8000km reisafstand = -3% winkans
- [ ] Ervaringsfactor:
  - Meer WK-edities = kleine bonus (max +2%)

**Verifieer:**
- Lookup wedstrijd in Mexico City: zeeniveau-teams hebben lagere kans
- `npm run build` slaagt

---

## 📋 Fase 3 — Recente vorm

- [ ] Maak `app/api/form/[team]/route.ts` aan via API-Football
  - Laatste 10 interlands ophalen
  - Bereken: win=3pt, gelijk=1pt, verlies=0pt, gewogen naar recentheid
  - Kwaliteit tegenstander meewegen (hogere Elo tegenstander = zwaarder gewogen)
  - `revalidate = 86400` (1x per dag)
- [ ] Sla op in `lib/form-cache.json`
- [ ] Voeg vormbalk toe aan Teams-pagina (10 bolletjes: groen/grijs/rood)
- [ ] Voeg vormfactor toe aan modelberekening: weging 15%
- [ ] Lookup: toon "Nederland in goede vorm (8/10)" als indicator
- [ ] Maak GitHub Actions workflow aan voor dagelijkse update

**Verifieer:**
- Vormbalk zichtbaar op Teams-pagina voor alle 48 landen
- Lookup toont vormcijfer naast de kansen

---

## 📋 Fase 4 — Competitieniveau & spelersdata

- [ ] Maak `lib/league-data.json` aan per team:
  ```json
  { "team": "Nederland", "players_top5": 18, "total_market_value_m": 820, "max_same_club": 4 }
  ```
  Bron: Transfermarkt (handmatig scrapen voor de 48 landen)

- [ ] League-index berekenen: `% spelers in top-5 competitie × kwaliteitsgewicht`
- [ ] Clubgenoten-bonus: 3+ spelers van zelfde club = +1% synergiebonus
- [ ] Radardiagram: voeg "Competitieniveau" toe als 7e as
- [ ] Teams-pagina: toon marktwaarde als context (niet direct in model)

**Verifieer:**
- Landen met veel Premier League-spelers scoren hoger op competitieniveau-as

---

## 📋 Fase 5 — Live toernooidata

> Start zodra het toernooi begint.

### Uitslagenbeheerpagina

- [ ] Maak `app/[locale]/admin/results/page.tsx` aan (al deels aanwezig?)
- [ ] Invoerveld per wedstrijd: score team A vs team B
- [ ] Opslaan in `lib/results.json`
- [ ] Maak `app/api/admin/results/route.ts` aan

### Blessure-/schorsings-tracker

- [ ] Maak `app/[locale]/admin/fitness/page.tsx` aan
  - Combineer met de bestaande `/admin/squads` of maak aparte pagina
  - Toon per wedstrijd-dag welke spelers twijfelachtig/out zijn
  - Automatisch aan de hand van `player-status.json`

### Elo auto-update

- [ ] Na elke ingevoerde uitslag: herbereken Elo met K-factor 32
  - Formule: `newElo = oldElo + 32 × (actualScore - expectedScore)`
  - Sla op in `lib/elo-current.json` (apart van historische data)

### Rustdagen-factor

- [ ] Bereken rustdagen automatisch uit het speelschema
- [ ] <3 dagen rust = -4% winkans
- [ ] Lookup toont: "⚠️ Nederland speelde 2 dagen geleden"

### Monte Carlo

- [ ] Herbereken Monte Carlo simulaties na elke uitslag-invoer
- [ ] Toon "Laatste update: X minuten geleden" op alle pagina's

**Verifieer:**
- Voer een uitslag in → Monte Carlo kansen updaten → Elo verschuift

---

## 📋 Fase 6 — Polymarket als modelfactor

- [ ] Voeg instelbare slider toe in de app (bijv. in de header of /stats)
  - 0% = puur model, 100% = puur markt
  - Default: 20% markt, 80% model
- [ ] Gecombineerde kans = `(modelkans × gewicht) + (Polymarket × (1 - gewicht))`
- [ ] Sla voorkeur op in `localStorage` onder `wc26-market-weight`
- [ ] Lookup: toon opgesplitst model vs markt vs gecombineerd
  ```
  Model: 45% · Markt: 52% · Gecombineerd (20% markt): 46%
  ```

**Verifieer:**
- Slider op 100% toont exact de Polymarket-kansen
- Slider op 0% toont exact de modelkansen

---

## 📋 Fase 7 & 8 — Na het toernooi (medio juli 2026)

- [ ] Fase 7: `lib/xg-data.json` aanmaken (FBref.com)
- [ ] Fase 7: xG-verschil als bonus in model
- [ ] Fase 8: Brier Score berekenen voor alle voorspellingen
- [ ] Fase 8: Vergelijk model vs Polymarket — wie was nauwkeuriger?
- [ ] Fase 8: Vergelijk met Klement's originele voorspelling
- [ ] Fase 8: Publiceer resultaten op `/about` pagina
- [ ] Fase 8: Pas wegingsfactoren aan op basis van wat werkte

---

## Aanbevolen volgorde

```
Nu (toernooi is begonnen op 11 juni):
  Fase 2b → Fase 1 → Fase 2 → Fase 3

Tijdens toernooi:
  Fase 5 → Fase 4 → Fase 6

Na toernooi:
  Fase 7 → Fase 8
```

---

## Checks na elke fase

```bash
npx tsc --noEmit    # geen TypeScript fouten
npx next build      # build slaagt zonder fouten
```
