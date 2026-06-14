# HANDOFF — Sessie 15 (WC26 Klement Model)

> Handoff voor de volgende Claude Code sessie. Lees eerst `CLAUDE-V3.md` + `CLAUDE.md`.
> Datum: 2026-06-14. Sessie 15 = UI/UX-revisie & herstructurering.
> Vorige handoff: `HANDOFF_DEEL11.md` (sessie 13).

---

## 1. Status na sessie 15

Alle checks groen na elke stap:

| Check | Status |
|---|---|
| `npx tsc --noEmit` | ✅ |
| `npx eslint . --max-warnings 0` | ✅ 0 warnings |
| `npx vitest run` | ✅ 49/49 (8 files) |
| `npm run build` | ✅ Compiled successfully (243 static pages) |

**Commits sessie 15** (op `main`, gepusht):

| Hash | Bericht |
|---|---|
| `38b8c7e` | refactor(nav): 14 platte nav-items → 4 scanbare hubs |
| `e44784c` | fix(mobile): stapel breekpunt-grids netjes op <768px |
| `8594a99` | refactor(bracket): triplicaat → één canonieke surface + redirects |
| `aee68f2` | refactor(model): /about + /mc folden in /model-hub + redirects |
| _(volgt)_ | docs: handoff sessie 15 |

---

## 2. Wat sessie 15 heeft gedaan

Sessie 15 begon met een volledige Fase-1 UI/UX-analyse (zie de overlap-bevindingen
hieronder onder §5). Daarna, in iteraties:

### Stap 1 — Nav 14 → 4 hubs (`38b8c7e`)
- `components/ui/Nav.tsx` herstructureerd van 6 primaire + 8 "More"-items (14 platte
  bestemmingen) naar **4 hubs**: `VERSUS · MY BRACKET · TOURNAMENT ▾ · INSIGHTS ▾`.
- Twee directe kernacties (Versus, My Bracket) + twee gegroepeerde dropdowns.
  **Live** is onder Tournament geplaatst (nav-niveau).
- Tournament-groep: Groups · Schedule · Knockout (`/knockout/r32`) · Teams ·
  Topscorers · Live. Insights-groep: Model · Stats · Impact *(later: zonder mc/about)*.
- Mobiel: groepen worden sectiekoppen met ingesprongen links i.p.v. één lange lijst.
- i18n: `nav.tournament` (EN "TOURNAMENT" / NL "TOERNOOI") + `nav.insights` toegevoegd.
- **Geen routes gewijzigd** — puur hergroepering.

### Stap 2 — Mobiele grid-fixes (`e44784c`)
Inline-grids → CSS-classes met `@media (max-width:768px)` in `app/globals.css`
(blok "Responsieve layout-fixes (sessie 15, stap 2)"). **Desktop ≥768px ongewijzigd.**
- Home-hero `1fr 220px` → `.hero-grid`, stapelt 1-koloms.
- `/groups` `1fr 1fr` → `.groups-grid`, 1-koloms.
- `/knockout/[round]/[match]` `1fr 1fr` → `.match-split`, 1-koloms.
- `/model` factor-tabel `minWidth:520` weg → `.model-table-head`/`.model-table-row`;
  op mobiel reflow via `grid-template-areas` (omschrijving 2e regel), geen scroll.
- `.sec` horizontale padding 28→16px op mobiel.
- `stat-cell`/`record-card` padding getrimd zodat de 3-koloms home-rasters ademen.

### Stap 3 — Bracket-triplicaat → 1 canonieke surface (`8594a99`)
- `SimBracketView` (model-projectie zonder props) stond op 3 routes; nu **alleen** in
  de **klement-tab van `/my-bracket`**.
- Die tab kreeg er de **upsets-lijst** + **"laatst bijgewerkt"** bij (stonden op
  `/sim-bracket`) zodat geen context wegviel.
- `/my-bracket` leest de begin-tab nu uit `?tab=` (Suspense-grens voor
  `useSearchParams`), zodat de redirects direct op de bracket landen.
- `/sim-bracket` + `/knockout/bracket` → redirects naar `/my-bracket?tab=klement`.
- Knockout round/match "Bracket"-tabs herwijzen naar de canonieke surface.
- **localStorage ongemoeid**: `my-picks.ts` / `group-picks.ts` + het
  `useSyncExternalStore`-contract niet aangeraakt.

### Stap 5 — `/about` + `/mc` folden in `/model` (`aee68f2`)
- `/model` is nu de canonieke Insights/model-hub.
- Unieke `/about`-content overgenomen naar `/model`: **formule** (S = 0.45·FIFA…,
  P(WIN)=Φ(…)), **paper-herkomst** (Hoffmann, Ging & Ramasamy 2002 + 55/45/σ=0.28),
  en de **Klement-quote**. De factor-bars van `/about` waren dubbel met de rijkere
  factor-tabel op `/model` → niet overgenomen.
- `/mc` (inline 178-regels `simulateTournament`) verdwijnt. De canonieke MC =
  `ModelMonteCarlo` op `/model`, die via **`lib/simulate-tournament.ts`** loopt en
  rijker is (top-10 × R32→kampioen progressie). De inline N-slider + fake
  loading-fases waren theater zonder modelwaarde → niet overgenomen (de
  kampioensverdeling zit al in de progressietabel).
- `/about` + `/mc` → redirects naar `/model`. Home "how it works"-CTA → `/model`.
  Nav-Insights: `/about` + `/mc` verwijderd.
- i18n toegevoegd: `model.formulaLabel`, `model.paperRef`, `model.variance`,
  `model.quoteLine1`, `model.quoteLine2` (EN + NL).

### ⚠️ Stap 4 (team-merge) — NIET GEDAAN
De geplande samenvoeging van `/teams` (`TeamProfile`, tabs profile/ranking) en
`/teams/[team]` (`TeamDetail`, tabs squad/scorers/schedule/path) is in sessie 15
**niet uitgevoerd**. Beide team-pagina's bestaan nog naast elkaar. Zie §5.

---

## 3. Alle actieve redirects

| Oude route | → Nieuwe route | Sinds |
|---|---|---|
| `/lookup` | `/versus` | vóór sessie 15 |
| `/sim-bracket` | `/my-bracket?tab=klement` | sessie 15, stap 3 |
| `/knockout/bracket` | `/my-bracket?tab=klement` | sessie 15, stap 3 |
| `/about` | `/model` | sessie 15, stap 5 |
| `/mc` | `/model` | sessie 15, stap 5 |

Alle redirects gebruiken `redirect({ href, locale })` uit `@/i18n/navigation`
(locale-correct, `/en/…` en `/nl/…` werken). Patroon: zie `app/[locale]/lookup/page.tsx`.

---

## 4. Orphan i18n-keys (kandidaat voor opruiming — NIET verwijderd)

Deze keys zijn na de consolidatie nergens meer gerefereerd. Bewust laten staan om
vertaalruis te vermijden; verwijder pas na akkoord. In zowel `messages/en.json`
als `messages/nl.json`:

| Key / namespace | Reden wees |
|---|---|
| Hele `about`-namespace | `/about` is nu redirect; unieke content verhuisd naar `model.*` |
| Hele `mc`-namespace | `/mc` is nu redirect; MC leeft op `/model` |
| `simBracket.title` | enkel de oude `/sim-bracket`-pagina gebruikte 'm (rest van `simBracket.*` is nog in gebruik) |
| `knockout.bracketLegendTitle` | enkel de oude `/knockout/bracket`-pagina gebruikte 'm |
| `model.paperLink` | de uitlink naar `/about` is verwijderd |
| `nav.about`, `nav.mc`, `nav.simBracket` | niet meer in de nav gerenderd |

> Let op: `factors`-namespace (top-level: fifa/wealth/climate/population/homeEdge)
> is **nog in gebruik** op de homepage — niet verwijderen.

---

## 5. Resterend UX-werk (uit Fase-1-rapport)

### a. Team-merge (stap 4 — overgeslagen, midden risico)
`/teams` (`components/team/TeamProfile.tsx`) en `/teams/[team]`
(`components/teams/TeamDetail.tsx`) zijn twee verschillende componenten met
verschillende tabs voor hetzelfde concept. Plan: `/teams/[team]` (TeamDetail, nieuwste/
rijkste) als canoniek; `/teams` → redirect of dropdown-instap. **Let op deep-links**
(`teamSlug`/`teamFromSlug`) en de `?tab=`-param van TeamDetail.

### b. Designtokens / kaart-knop-vlag uniformeren (midden-hoog inspanning)
Het rapport signaleerde inconsistente stijlen voor vergelijkbare elementen
(kaarten, knoppen, kansen-weergave, vlaggen, venue-info) en **drie radar-
implementaties** (`VersusRadar`, `stats/FactorRadar`, factor-breakdown in TeamProfile).
Nog te doen: gedeelde designtokens + één kaart/knop-primitief, radar dedupliceren.

### c. probability-snapshots op 3 plekken
`probability-snapshots.json` voedt de Today-widget (home), `ProbabilityTimeline`
(`/stats`) én `MatchImpactView` (`/impact`). Nog te overwegen: of `/impact` als
aparte route blijft of als sub-view onder Insights/Stats wordt gefold.

### d. Fixture-kaarten uniformeren
`/schedule`, `/groups` en `/knockout/[round]` tonen elk wedstrijden met
venue/vlaggen/predict-links in licht verschillende kaartstijlen. Eén gedeelde
match-row zou de boel consistenter maken.

---

## 6. Belangrijke aandachtspunten voor de volgende sessie

- **Nav-bestemmingen** zitten nu in `components/ui/Nav.tsx` (`PRIMARY` + `GROUPS`).
  Nieuwe pagina's hierin opnemen, niet als losse platte items.
- **Mobiele layout**: gebruik de bestaande responsive-classes/het `@media`-blok in
  `globals.css`; vermijd nieuwe inline multi-koloms grids zonder breekpunt.
- **Redirects**: bij verder consolideren altijd `redirect({ href, locale })` +
  alle inkomende `<Link>`s mee-verhuizen (grep vóór en ná).
- Harde regels blijven: `lib/klement.ts`, `lib/squads-db.json`, `lib/teams.json`
  read-only; geen scorevoorspelling in het model; simulaties client-side;
  alle UI-strings via `useTranslations()`.
