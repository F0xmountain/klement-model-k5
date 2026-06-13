# MASTER PROMPT — WC26 Klement: Academische Correctheid, Design Excellence & Volledige Functionaliteit

> Lees CLAUDE-V3.md en NEW-ITERATION-V3.md volledig voordat je begint.
> Dit is een uitgebreide kwaliteitsaudit en verbeterfase voor de hele app.
> Werk systematisch. Maak per sectie een commit.

---

## CONTEXT

De app is een Next.js-implementatie van Joachim Klement's econometrisch WK-model
(Panmure Liberum, april 2026), uitgebreid met Elo, recente vorm, competitieniveau,
sterspeler-blessures, hoogte/reisafstand/WK-ervaring en Polymarket-integratie.

De drie pijlers van deze sessie:
1. **Academische correctheid** — het model klopt wiskundig en econometrisch
2. **Functionele volledigheid** — groepskeuze → Monte Carlo → bracket werkt end-to-end correct
3. **Visuele kwaliteit** — de app ziet er professioneel uit op desktop én mobiel

---

## DEEL 1: ACADEMISCHE CORRECTHEID VAN HET MODEL

### 1a. Auditeer klement-custom.ts op econometrische fouten

Lees `lib/klement-custom.ts` volledig. Controleer en herstel de volgende punten:

**Normalisatiebereiken:**
- `fF(fifa)`: FIFA-punten lopen van ~1000 tot ~2000 in teams.json.
  Controleer dat de normalisatie `[1400, 2000]` klopt met de werkelijke data.
  Run: `node -e "const t=require('./lib/teams.json'); const vals=Object.values(t).map(x=>x.fifa); console.log(Math.min(...vals), Math.max(...vals))"`
  Pas de grenzen aan op de werkelijke min/max als ze afwijken.

- `fE(elo)`: Elo loopt van ~1000 tot ~2200 in elo-history.json.
  Controleer de werkelijke grenzen. Run:
  `node -e "const h=require('./lib/elo-history.json'); const all=h.flatMap(r=>Object.values(r).filter(v=>typeof v==='number')); console.log(Math.min(...all), Math.max(...all))"`

- `fG(gdp)`: GDP per capita. Controleer min/max in teams.json.
- `fP(pop, latam)`: Populatie. Controleer of de LATAM-bonus econometrisch gerechtvaardigd
  is (Klement's originele paper noemt dit — verifieer of de bonus correct geïmplementeerd is).
- `fT(temp)`: Temperatuur. De WK-gastlanden (VS, Canada, Mexico) hebben sterk verschillende
  klimaten. Controleer dat de temperatuurwaarden in teams.json representatief zijn voor het
  *toernooigemiddelde* en niet de hoofdstad.

**Gewichtensom:**
- Controleer dat de basisgewichten (gdp, pop, temp, fifa, host) optellen tot 1.00.
- Controleer dat de Elo-weging correct is geïmplementeerd: Elo vervangt een *deel* van
  de FIFA-factor, het voegt geen extra gewicht toe. De formule moet zijn:
  ```
  strength = ELO_WEIGHT * fE(elo) + FIFA_WEIGHT * fF(fifa)
  score S = W.gdp*fG + W.pop*fP + W.temp*fT + W.fifa*strength + W.host*host
  ```
  waarbij W.gdp + W.pop + W.temp + W.fifa + W.host = 1.00 (ongeacht ELO_WEIGHT).

**Draw rate formule:**
- Klement's originele formule: `dr = 0.20 * (1 - 0.3 * |z|)`, geclipt op [0.05, 0.24].
  Verifieer dat dit exact zo geïmplementeerd is, inclusief de clip.

**Extension factors — logit-schaal consistentie:**
- Alle extension factors (altitude, travel, experience, form, league, star players)
  gebruiken logit-schaal aanpassingen. Verifieer dat:
  1. Ze worden toegepast NADAT de basisberekening klaar is
  2. Ze correct worden genormaliseerd zodat W + D + L nog steeds optelt tot 1.00
  3. De volgorde is: basis → altitude → travel → experience → form → league → stars → polymarket
  Schrijf een unit test die voor elke factor apart verifieert dat de output kansen optellen tot 1.00.

**Confidence intervals:**
- De huidige CI-berekening in `lib/confidence.ts` pertrubeert gewichten met σ=0.05.
  Dit is te klein — bij basisgewichten van 0.15-0.45 geeft σ=0.05 slechts ±11-33% variatie.
  Verhoog naar σ=0.08 voor basisgewichten en σ=20 voor Elo (in plaats van 15).
  Voer 1000 simulaties uit in plaats van 500 voor betrouwbaardere CI's.

### 1b. Monte Carlo simulator — academische correctheid

Lees `lib/simulate-tournament.ts` volledig. Controleer:

**Gelijkspel-afhandeling:**
- In het WK worden gelijke spelen in de groepsfase toegestaan (1 punt elk).
- In de knock-outfase: bij gelijkstand na 90 min → verlenging → strafschoppen.
  De simulator moet dit modelleren als: bij draw in KO → flip een extra Bernoulli(0.5)
  om te bepalen wie doorgaat (of gebruik matchP voor de herberekening als "verlenging").
  Controleer hoe het nu werkt en herstel indien onjuist.

**Groepsfase ranking:**
- Officiële FIFA-tiebreaker: 1) punten, 2) doelsaldo, 3) gescoorde doelpunten,
  4) onderlinge wedstrijd, 5) loting.
  De simulator moet de puntenstand bijhouden per groep-simulatie.
  Als het nu alleen op punten rangschikt: voeg doelsaldo toe via de Poisson-verdeling
  die al aanwezig is in de Poisson-scoreberekening.

**Beste derde-plaatsen:**
- 8 van de 12 groepen leveren een derde-plaatser die doorgaat naar de R32.
  De selectie van de beste 8 van 12 derde-plaatsen moet op punten (en tiebreakers)
  gebaseerd zijn, consistent met de groepsfase ranking.

**Seeding:**
- Documenteer expliciet in een commentaar welke SEED_TEMPLATE-aanname je maakt
  en waarom het een benadering is. Verwijs naar het officiële FIFA-document.

**Herproduceerbaarheid:**
- Monte Carlo van 10.000 simulaties (niet 1.000 of 2.000 — 10.000 voor statistisch
  betrouwbare kansen). Update de standaard N in alle aanroepen.

### 1c. Groepsfase-picker → bracket simulatie

De gebruiker kan in My Bracket > Groepsfase de teams rangschikken.
Bij "Simuleer mijn bracket →" moet het volgende correct verlopen:

1. Neem de gebruiker's top-2 per groep (zijn/haar keuze, niet het model)
2. Neem de 8 beste derde-plaatsen op basis van het MODEL (want de gebruiker kiest
   geen volgorde voor derde-plaatsen — het model bepaalt wie de beste thirds zijn)
3. Seed 32 teams in de R32 bracket via SEED_TEMPLATE
4. Draai 10.000 Monte Carlo simulaties met `matchP` (inclusief alle extension factors)
5. Toon:
   - De "meest waarschijnlijke" winnaar per slot (hoogste frequentie in de simulaties)
   - De kans per team in elk slot (als je er op hovert)
   - De verwachte kampioen met zijn kans

Zorg dat dit end-to-end werkt en getest is.

---

## DEEL 2: VISUELE KWALITEIT & UX

Lees `/mnt/skills/public/frontend-design/SKILL.md` voordat je begint.

### 2a. Versus pagina — opruimen en verbeteren

De /versus pagina heeft nu veel lagen informatie. Maak het overzichtelijk:

**Volgorde van secties (van boven naar beneden):**
1. Team selectie dropdowns + venue selector
2. WDL-balk (groot, prominent)
3. Kansen met confidence interval: "NED 33% [31–35%] · Draw 15% · POR 53% [51–55%]"
4. Verwachte score: "Verwacht: 0.5 – 0.7" (klein, muted)
5. Polymarket breakdown: "Model: 34% · Markt: 25% · Gecombineerd: 33%" (alleen als data beschikbaar)
6. Team strength info: "Teamsterkte: Elo 30% + FIFA 70%" (klein)
7. Factor breakdown per team (twee kolommen, uitklapbaar — collapsed by default)
8. Sterspeler-summary (alleen als iemand twijfelachtig/out)
9. Rustdagen-waarschuwing (alleen als relevant)
10. Vormindicator (alleen als form data beschikbaar)
11. Scorekansverdeling (uitklapbaar, collapsed by default)
12. H2H historie (uitklapbaar, collapsed by default)
13. Trade on Polymarket knop

Verwijder dubbele informatie. Zorg voor consistente typografie en witruimte.

**Confidence intervals — display fix:**
- Huidige display "33% [33–34%]" is te smal — het interval moet zinvol zijn.
  Als CI < 2% breed is: toon geen CI (te weinig variatie om te tonen).
  Als CI >= 2%: toon "[low–high%]" in muted text onder het percentage.

### 2b. Groepspagina — verwachte scores

Op de groepspagina staat nu "W / L 0.9 – 0.3" naast elke wedstrijd.
Verbeter de weergave:
- Toon de verwachte score als "~1 – 0" (afgerond op gehele getallen, met ~)
- Toon de winkans als kleurgecodeerde tekst: groen voor duidelijke favoriet (>65%),
  oranje voor 50-65%, grijs voor gelijkopgaand (<50% verschil)

### 2c. Teams pagina — sterspelers tonen

Op de teamprofiel-pagina ontbreekt de sterspeler-informatie.
Voeg toe onder "Recent form":
- Top 3 sterspelers met naam + statusbol (groen/oranje/rood)
- "Selectievolledigheid: 100%" score

### 2d. Navigatie — opruimen

De navigatie heeft nu 13 items (VERSUS, TEAMS, MONTE, GROUPS, Topscorers, BRACKET,
SIM, MY BRACKET, STATS, LIVE, MODEL, ABOUT + ⚙). Dat is te vol voor mobiel.

Herorganiseer:
- Primaire nav (altijd zichtbaar): VERSUS | GROUPS | MY BRACKET | LIVE | STATS
- Secundaire nav (dropdown "More"): TEAMS | MONTE | BRACKET | SIM | Topscorers | MODEL | ABOUT
- Admin ⚙ blijft rechts

Zorg dat de hamburger-menu op mobiel alle items toont.

### 2e. Homepage — vandaag-widget verbeteren

De vandaag-widget toont nu matches maar zonder groepscontext.
Voeg toe per wedstrijd:
- Groepslabel (GROUP A) klein boven de wedstrijd
- Na de wedstrijd: een link "→ Predict this match" die naar /versus gaat met de
  teams al vooringevuld via URL-params (?a=Netherlands&b=Japan)

---

## DEEL 3: FUNCTIONELE VOLLEDIGHEID

### 3a. URL-params in /versus

Voeg URL-parameter ondersteuning toe aan /versus:
- `?a=Netherlands&b=Japan&venue=AT%26T+Stadium%2C+Dallas`
- De dropdowns worden vooringevuld op basis van de params
- De teamsnamen worden case-insensitief gematcht aan teams.json
- Zodat de homepage vandaag-widget en de groepspagina kunnen linken naar specifieke wedstrijden

### 3b. Groepspagina → /versus koppeling

Elke wedstrijd op de groepspagina wordt klikbaar:
- Klik op een wedstrijd → ga naar `/versus?a=TeamA&b=TeamB&venue=StadiumName`
- De venue wordt meegestuurd vanuit schedule.json

### 3c. My Bracket — groepspicker correctheid

Verifieer en herstel de volgende problemen in de groepspicker:

**Probleem 1 — Kansen tonen per wedstrijd, niet per groep:**
De kolom "Advances X%" toont nu de kans dat een team de groep wint, niet de kans
dat het doorgaat (top-2). Corrigeer: toon P(top-2 in groep) = P(1e) + P(2e).
Dit is significant anders, want een zwakker team heeft soms 30% kans om 2e te worden
maar slechts 5% kans om 1e te worden.

**Probleem 2 — Monte Carlo na simulatie:**
Na "Simuleer mijn bracket →" moeten de kansen in de bracket-view gebaseerd zijn op
10.000 Monte Carlo simulaties MET de gebruikersinput als startpunt (de gekozen
groepswinnaar staat vast, alleen de KO-fase wordt gesimuleerd).
Dus: als de gebruiker zegt "Nederland wint groep F", dan is P(NED in R32) = 100%,
maar P(NED bereikt finale) komt uit de 10.000 simulaties.

**Probleem 3 — Derde-plaatsen:**
De 8 beste derde-plaatsen worden nu gekozen op basis van model-score, maar zouden
gekozen moeten worden op basis van de Monte Carlo-simulaties van de groepsfase
(gegeven de gebruikersinput voor top-2). De derde-plaatsers zijn de teams die de
gebruiker NIET heeft aangewezen als top-2 in elke groep, en de 8 beste daarvan
gaan door op basis van modelsterkte.

### 3d. Admin pagina's — correctheid

**/admin/squads — speler-status correctheid:**
Verifieer dat wanneer een sterspeler op "out" staat:
1. De matchP() functie dit correct verwerkt
2. De /versus pagina de juiste verlaagde kansen toont
3. De samenvatting "Mbappé out (-8.7%)" correct het procent-impact toont
Schrijf een integratietest die dit verifieert (zet speler op out → bereken matchP →
vergelijk met baseline → delta moet overeenkomen met de logit-penalty).

**/admin/model-config — gewichten-validatie:**
Wanneer de gebruiker de gewichten aanpast zodat ze NIET optellen tot 1.00:
- Toon een duidelijke waarschuwing ("⚠️ Factoren tellen op tot 1.03 — normaliseer")
- Voeg een "Normaliseer" knop toe die automatisch alle gewichten proportioneel aanpast
  zodat ze optellen tot 1.00
- Sla NIET op als de som > 1.05 of < 0.95 (te ver van 1.00 af)

---

## DEEL 4: TECHNISCHE KWALITEIT

### 4a. Test coverage uitbreiden

Schrijf nieuwe Vitest-tests voor:

```typescript
// tests/model-correctness.test.ts
describe('Model correctheid', () => {
  it('basisgewichten tellen op tot 1.00', () => { ... })
  it('matchP kansen tellen op tot 1.00 voor elk teamspaar', () => { ... })
  it('extension factors bewaren de kansensom', () => { ... })
  it('star player penalty is proportioneel aan rank', () => { ... })
  it('logit/sigmoid round-trip is stabiel', () => { ... })
})

// tests/tournament-sim.test.ts
describe('Monte Carlo simulator', () => {
  it('elke groep heeft exact 4 teams', () => { ... })
  it('precies 32 teams bereiken de R32', () => { ... })
  it('champion frequencies sommeren op tot N simulaties', () => { ... })
  it('geen team kan zichzelf ontmoeten', () => { ... })
  it('KO-bracket heeft geen duplicaten', () => { ... })
})
```

### 4b. TypeScript strict mode

Voeg aan tsconfig.json toe:
```json
"strict": true,
"noUncheckedIndexedAccess": true
```
Los alle TypeScript-fouten op die dit veroorzaakt.

### 4c. Lint errors oplossen

Er zijn 8 pre-existerende lint errors/warnings. Los ze allemaal op.
Run `npx eslint . --max-warnings 0` en zorg dat het succesvol afsluit.

### 4d. Performance

- De /sim-bracket pagina en My Bracket groepsfase-simulatie draaien nu 1.000–2.000 simulaties.
  Verhoog dit naar 10.000 maar voeg een loading indicator toe (skeleton of spinner)
  zodat de pagina niet bevroren aanvoelt tijdens de berekening.
- De confidence interval berekening (500 simulaties) is zwaar. Cache het resultaat
  in een React ref per team-combinatie zodat het niet opnieuw berekend wordt bij
  een re-render.

---

## VOLGORDE VAN IMPLEMENTATIE

```
1. Auditeer klement-custom.ts normalisaties + gewichten (1a)
   → commit: "fix: model normalisaties en gewichtensom"

2. Monte Carlo correctheid: gelijkspel in KO, doelsaldo, N=10.000 (1b)
   → commit: "fix: Monte Carlo academische correctheid"

3. Groepspicker → bracket simulatie end-to-end (1c + 3c)
   → commit: "feat: groepspicker Monte Carlo 10k simulaties"

4. URL-params /versus + groepspagina koppeling (3a + 3b)
   → commit: "feat: URL-params versus + klikbare groepswedstrijden"

5. Test coverage (4a)
   → commit: "test: model correctheid + Monte Carlo tests"

6. Versus pagina layout (2a)
   → commit: "ui: versus pagina opgeruimd en geordend"

7. Navigatie herorganisatie (2d)
   → commit: "ui: navigatie primair/secundair"

8. Overige UI fixes (2b, 2c, 2e)
   → commit: "ui: groepspagina scores, teamspagina sterspelers, homepage widget"

9. Admin correctheid (3d)
   → commit: "fix: admin model-config normalisatie + sterspeler integratietest"

10. TypeScript strict + lint (4b, 4c)
    → commit: "chore: TypeScript strict, lint errors opgelost"

11. Performance (4d)
    → commit: "perf: N=10k simulaties + CI caching"
```

---

## VERIFICATIE NA ELKE COMMIT

```bash
npx tsc --noEmit          # geen TypeScript fouten
npx eslint .              # geen nieuwe warnings
npx vitest run            # alle tests slagen
npm run build             # build succesvol
```

Na de laatste commit:
```bash
npx eslint . --max-warnings 0   # nul warnings
```

---

## DEEL 5: MODEL KALIBRATIE, SENSITIVITEIT & WEDSTRIJD-IMPACT

### 5a. Terugrekening op WK 2022 — academische validatie

Maak `lib/wc2022-validation.ts` en een bijbehorende dataset `lib/wc2022-matches.json`.

**Dataset `lib/wc2022-matches.json`:**
Alle 64 wedstrijden van WK 2022 in Qatar met:
```json
[
  {
    "matchId": "WC22-001",
    "round": "group",
    "group": "A",
    "teamA": "Qatar",
    "teamB": "Ecuador",
    "goalsA": 0,
    "goalsB": 2,
    "result": "B",
    "date": "2022-11-20",
    "fifaA": 1472,
    "fifaB": 1508,
    "eloA": 1623,
    "eloB": 1874,
    "gdpA": 61000,
    "gdpB": 6200,
    "popA": 2.9,
    "popB": 18.0,
    "tempA": 28,
    "tempB": 23
  }
]
```
Vul alle 64 wedstrijden in met de FIFA-rankings, Elo-ratings en GDP-waarden van
**november 2022** (gebruik elo-history.json voor historische Elo; FIFA-rankings
van 2022 kun je benaderen met de teams.json waarden minus de trend).

**Berekening in `lib/wc2022-validation.ts`:**
- Gebruik dezelfde `sc()` en `matchP()` logica MAAR met de 2022-data als input
  (niet de huidige 2026 waarden)
- Bereken per wedstrijd: P(A wint), P(gelijkspel), P(B wint)
- Vergelijk met de werkelijke uitkomst
- Bereken Brier Score: BS = (1/N) × Σ [(p_win - outcome_win)² + (p_draw - outcome_draw)² + (p_loss - outcome_loss)²]
  waarbij outcome = 1 als dat de uitkomst was, 0 anders
- Een perfecte voorspeller heeft BS=0, een willekeurige voorspeller BS≈0.67
- Bereken ook: hoeveel % van de favorieten (team met hoogste P) won/gelijkspeelde/verloor

**Pagina `/model/validation`:**
Voeg toe aan de /model pagina als nieuwe sectie "Track record & validatie":
- Tabel: per wedstrijd van WK 2022 — teams, modelkansen, werkelijke uitkomst, correct?
- Samenvatting:
  - Brier Score: X.XX (vergelijk: betting markets hadden ~0.19)
  - Favoriet won: X% van de wedstrijden
  - Groepsfase accuratesse: X/48 (favoriet won)
  - KO-fase accuratesse: X/32
  - Kampioen correct voorspeld: ✅/❌
- Grafiek: gecumuleerde Brier Score over het toernooi (toont of het model beter werd naarmate het toernooi vorderde)
- Filter op ronde (Groep, R32, R16, QF, SF, Finale)

Voeg ook toe: vergelijking met de huidige WK 2026 voorspellingen — "Op basis van WK 2022 validatie verwachten we dat het model X% van de groepswedstrijden correct voorspelt."

i18n:
- model.validation = "Track record & validation" / "Track record & validatie"
- model.brierScore = "Brier Score (lower = better)" / "Brier Score (lager = beter)"
- model.favoritesWon = "Favourites won" / "Favorieten wonnen"

---

### 5b. Sensitiviteitsanalyse van de modelgewichten

Maak `lib/sensitivity.ts` met de volgende logica:

**Partiële afgeleiden berekenen:**
Voor elk gewicht W_i (gdp, pop, temp, fifa, elo, form, league):
1. Bereken de huidige score S voor alle 48 teams
2. Verhoog W_i met +0.05 (5 procentpunt), herbereken alle scores
3. Herbereken Monte Carlo champion probabilities (1000 sims — sneller dan 10k)
4. Delta per team = nieuwe_kans - oude_kans
5. Sla op als: `{ factor: "elo", delta: { "Spain": +0.012, "Japan": +0.008, "Mexico": -0.003, ... } }`

**Pagina — sectie in `/model` of `/admin/model-config`:**
Voeg toe aan `/admin/model-config` een "Sensitivity" tab of uitklapbare sectie:

Voor het geselecteerde teamspaar (bijv. NED vs FRA):
- Tabel: welk gewicht heeft de meeste invloed op de uitkomst?
  | Factor | Huidig gewicht | Impact op NED-kans bij +10% |
  |---|---|---|
  | Elo | 30% | +2.1% |
  | FIFA ranking | 70% (van fifa-slot) | +0.8% |
  | GDP | 20% | -0.3% |
  | Recente vorm | 15% | +1.4% |

Voor de kampioen-kansen:
- Heatmap of bar chart: per factor, de top-5 teams die het meest profiteren/verliezen
  als dat gewicht +10% wordt
- Toon als interactieve sliders: beweeg een slider en zie direct welke teams stijgen/dalen

**Berekening:**
- Voer dit lazy uit (alleen berekenen als de gebruiker de tab opent)
- Cache het resultaat in useState tot de weights veranderen
- Gebruik 500 Monte Carlo simulaties voor de sensitiviteitsberekening (snel genoeg)

i18n: Engelstalig (admin-only pagina)

---

### 5c. Wedstrijd-impact tracker

Maak `lib/match-impact.ts` en een `/impact` pagina (of sectie in /stats).

**Logica:**
De `probability-snapshots.json` bevat al kansen-momentopnamen na elke wedstrijd.
Bouw hier een impact-berekening bovenop:

```typescript
interface MatchImpact {
  matchLabel: string        // "GRP A: Mexico vs South Africa"
  date: string
  result: string            // "2-1"
  biggestWinner: { team: string, delta: number }
  biggestLoser: { team: string, delta: number }
  totalVolatility: number  // som van alle |delta| waarden
  snapshots: {             // top-8 teams voor en na
    before: Record<string, number>
    after: Record<string, number>
  }
}
```

**Pagina `/impact` (of sectie in /stats "Wedstrijd impact"):**

1. **Impact tijdlijn** — lijst van alle gespeelde wedstrijden, gesorteerd op datum:
   Per wedstrijd een kaart:
   - Wedstrijd + uitslag
   - 🔼 Grootste winnaar: Mexico +3.2%
   - 🔽 Grootste verliezer: Brazilië -1.8%
   - Totale volatiliteit: Σ|Δ| = 12.4%
   
2. **Cumulatieve grafiek** — recharts LineChart:
   - X-as: gespeelde wedstrijden (chronologisch)
   - Y-as: kampioen-kans 0-25%
   - Lijnen: top-6 teams
   - Bestaand in /stats — maar nu met wedstrijd-labels op de X-as (klikbaar)
   - Hover op een punt: toont de volledige impact-kaart van die wedstrijd

3. **"Meest impactvolle wedstrijd" badge** — de wedstrijd met de hoogste totale
   volatiliteit wordt bovenaan getoond als "Most impactful so far"

4. **Lege staat (geen wedstrijden gespeeld):**
   "Impact data will appear as matches are played during the tournament."
   Toon een demo-versie met nep-data als placeholder zodat de UI-structuur zichtbaar is.

**Koppeling aan schedule.json:**
- Elke impact-entry wordt gekoppeld aan een wedstrijd in schedule.json
  zodat je ook de venue en groepscontext toont
- Link "→ Predict this match" per wedstrijd-kaart (naar /versus met URL-params)

i18n:
- impact.title = "Match impact" / "Wedstrijd impact"
- impact.biggestWinner = "Biggest winner" / "Grootste winnaar"
- impact.biggestLoser = "Biggest loser" / "Grootste verliezer"
- impact.volatility = "Total volatility" / "Totale volatiliteit"
- impact.mostImpactful = "Most impactful match" / "Meest impactvolle wedstrijd"
- impact.empty = "Updates as matches are played" / "Bijgewerkt na elke wedstrijd"

**Navigatie:**
Voeg "Impact" toe aan de primaire navigatie (vervangt een minder gebruikte pagina
zoals MONTE of SIM).

---

### Volgorde voor Deel 5 (na Deel 4):

```
12. WK 2022 validatie dataset + berekening (5a)
    → commit: "feat: WK 2022 model validatie + Brier Score"

13. Sensitiviteitsanalyse (5b)
    → commit: "feat: gewicht-sensitiviteitsanalyse in model configurator"

14. Wedstrijd-impact tracker (5c)
    → commit: "feat: wedstrijd-impact tracker + cumulatieve grafiek"
```

---

## HARDE REGELS (onveranderd)

1. `lib/klement.ts` is read-only
2. `lib/squads-db.json` is read-only (statussen via player-status.json)
3. `lib/teams.json` is read-only (alleen GitHub Actions mag schrijven)
4. Geen dark mode
5. i18n via next-intl — geen hardcoded strings in componenten
6. Simulaties zijn client-side (`'use client'`)
7. Alle kansen moeten optellen tot 1.00 — altijd controleren

