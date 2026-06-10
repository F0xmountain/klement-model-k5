# NEW-ITERATION.md — Fork-uitbreidingen

> Geordende takenlijst voor Claude Code. Werk van boven naar beneden.
> Markeer taken als [x] zodra ze klaar zijn en getest.

---

## 0. Voorbereiding (doe dit eerst)

- [ ] Kloon `x-cookie/klement-model-k5` en push naar jouw eigen repo
- [ ] `npm install && npm run dev` — verifieer dat de bestaande app werkt
- [ ] Zet `.env.local` op (kopieer `.env.local.example`, vul `REVALIDATE_TOKEN` in)
- [ ] Maak een branch `feature/my-extensions` aan

---

## 1. i18n — Meertalig (NL/EN)

Doe dit als eerste — het raakt alle pagina's en is moeilijker toe te voegen achteraf.

- [ ] `npm install next-intl`
- [ ] Maak `i18n.ts` aan in de root (next-intl configuratie)
- [ ] Maak `middleware.ts` aan voor locale-routing
- [ ] Verplaats `/app/*` naar `/app/[locale]/*`
- [ ] Maak `messages/en.json` aan met alle bestaande teksten
- [ ] Maak `messages/nl.json` aan met Nederlandse vertalingen
- [ ] Voeg taalwisselaar toe aan `Nav.tsx` (NL / EN knoppen rechtsboven)
- [ ] Vervang alle hardcoded strings in alle componenten door `useTranslations()`

**Verifieer:** Schakel tussen NL en EN — alle pagina's vertalen volledig, URL-pad wisselt van `/en/` naar `/nl/`.

---

## 2. Mijn eigen bracket — `/my-bracket`

- [ ] Maak `lib/my-picks.ts` aan met lege picks-structuur
- [ ] Maak `app/[locale]/my-bracket/page.tsx` aan
- [ ] Bouw `components/my-bracket/MyBracketEditor.tsx`:
  - [ ] Toon alle KO-rondes (R32 t/m finale) op volgorde
  - [ ] Per wedstrijd: toon de twee teams, model W/D/L kansen als hint
  - [ ] Klik op een team om het als winnaar te kiezen (oranje highlight)
  - [ ] Sla picks op in `localStorage` (`wc26-my-picks`)
  - [ ] Toon oranje badge als jouw pick afwijkt van Klement's pick
  - [ ] Kopieerknop: zet picks als JSON in clipboard
- [ ] Bouw `components/my-bracket/MyBracketDisplay.tsx`:
  - [ ] Readonly weergave van ingevulde picks
  - [ ] Vergelijkingstabel: jouw picks vs Klement's picks, kolom per ronde
  - [ ] Prominente weergave van jouw kampioen bovenaan
- [ ] Voeg "Mijn Bracket" toe aan de navigatie

**Verifieer:** Vul het hele bracket in, herlaad de pagina — alle picks zijn bewaard. Klement-afwijkingen zijn oranje gemarkeerd.

---

## 3. Statistieken — `/stats`

### 3a. Databestanden

- [ ] Maak `lib/elo-history.json` aan (48 teams, Elo per kwartaal, laatste 10 jaar)
  - Bron: https://www.eloratings.net — kopieer handmatig of schrijf een fetch-script
- [ ] Maak `lib/wc-history.json` aan (WK-winnaars 1930–2022)

### 3b. Pagina en componenten

- [ ] Maak `app/[locale]/stats/page.tsx` aan
- [ ] Bouw `components/stats/EloTrendChart.tsx`:
  - [ ] `recharts` LineChart
  - [ ] Multiselect dropdown: kies 1–6 teams
  - [ ] Default: toon de 4 WK-favorieten (Nederland, Portugal, Spanje, Frankrijk)
  - [ ] X-as: datum, Y-as: Elo-rating
- [ ] Bouw `components/stats/FactorRadar.tsx`:
  - [ ] `recharts` RadarChart
  - [ ] Vergelijk twee teams naast elkaar
  - [ ] Vijf assen: GDP, Populatie, Klimaat, FIFA-ranking, Thuisvoordeel
  - [ ] Factorwaarden berekenen via de bestaande functies in `klement.ts`
- [ ] Bouw `components/stats/PolymarketBar.tsx`:
  - [ ] Horizontale bar per team: modelkans vs Polymarket-kans
  - [ ] Data uit `/api/polymarket` (zie stap 4)
  - [ ] Highlight teams met verschil > 5%
  - [ ] Disclaimer onderaan
- [ ] Bouw `components/stats/WCHistoryTable.tsx`:
  - [ ] Tabel met jaar, winnaar, finalist, gastland
  - [ ] Markeer teams die ook in dit WK meedoen
- [ ] Voeg "Statistieken" toe aan de navigatie

**Verifieer:** Alle grafieken laden zonder fouten voor alle 48 teams. Radargrafiek toont correcte factorwaarden.

---

## 4. Live data — `/live`

### 4a. Polymarket API-route

- [ ] Maak `app/api/polymarket/route.ts` aan
  - [ ] Fetch van Polymarket CLOB API
  - [ ] `export const revalidate = 300`
  - [ ] Return: `{ team: string, probability: number, updatedAt: string }[]`
  - [ ] Sorteer op kans descending
- [ ] Maak `lib/polymarket-fallback.json` aan (handmatig ingevulde fallback-kansen)
- [ ] Foutafhandeling: als Polymarket down is, gebruik fallback

### 4b. Nieuws API-route

- [ ] Kies een nieuws-API (NewsAPI.org gratis tier of GNews)
- [ ] Voeg `NEWS_API_KEY` toe aan `.env.local.example`
- [ ] Maak `app/api/news/[team]/route.ts` aan
  - [ ] `export const revalidate = 1800` (30 min)
  - [ ] Query: `"{team} FIFA World Cup 2026"`
  - [ ] Return: max 3 artikelen, `{ title, url, publishedAt, source }`
  - [ ] Filter artikelen ouder dan 7 dagen

### 4c. Pagina en componenten

- [ ] Maak `app/[locale]/live/page.tsx` aan
- [ ] Bouw `components/live/PolymarketWidget.tsx`:
  - [ ] Toon top-10 kansen als kaarten
  - [ ] Live badge met timestamp van laatste update
  - [ ] Vergelijk met modelkansen (kleine indicator: hoger/lager dan model)
- [ ] Bouw `components/live/NewsCard.tsx`:
  - [ ] Zoekbalk: selecteer een team
  - [ ] Toon 3 nieuwsitems als klikbare kaartjes
  - [ ] Toon publicatiedatum relatief ("2 uur geleden")
  - [ ] Disclaimer: links openen op externe site
- [ ] Voeg "Live" toe aan de navigatie

**Verifieer:** Polymarket-kansen laden en tonen een timestamp. Als je de API-key verwijdert, toont nieuws een nette foutmelding.

---

## 5. Afwerking en integratie

- [ ] Controleer alle pagina's op volledigheid van vertalingen (NL/EN)
- [ ] Voeg de disclaimer over kansen toe aan `/stats` en `/live`
- [ ] Test de volledige app op mobiel (responsive)
- [ ] Verifieer dat `npm run build` slaagt zonder fouten
- [ ] Zet `lib/my-picks.ts` bij met jouw echte bracket
- [ ] Update de README met de nieuwe features en jouw naam als contributor

---

## Volgorde-advies

```
1 → i18n (raakt alles)
2 → Mijn bracket (puur frontend, geen externe APIs nodig)
3a → Databestanden aanmaken
3b → Statistieken bouwen
4a+b → API-routes bouwen
4c → Live-pagina bouwen
5 → Afwerking
```

Sla stap 4 over als je geen API-keys wilt aanvragen — de rest werkt volledig zonder.
