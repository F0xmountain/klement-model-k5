# HANDOFF — Sessie 13 (WC26 Klement Model)

> Handoff voor de volgende Claude Code sessie. Lees eerst `CLAUDE-V3.md` + `CLAUDE.md`.
> Datum: 2026-06-14.

---

## 1. Status na sessie 13

Alle checks groen:

| Check | Status |
|---|---|
| `npx tsc --noEmit` | ✅ |
| `npx eslint . --max-warnings 0` | ✅ |
| `npx vitest run` | ✅ 49/49 (8 files) |
| `npm run build` | ✅ Compiled successfully |

**Commits sessie 13** (op `main`, gepusht):

| Hash | Bericht |
|---|---|
| `3de1f86` | fix: teamnaam-normalisatie in getModelAccuracy |
| `7ec578c` | feat: opponent-strength gewogen xG factor (Dixon-Coles) |
| _(volgt)_ | docs: handoff sessie 13 |

Sessie 12 leverde (context): bivariate Poisson scoreverdeling, O/U 2.5 + BTTS op
`/versus`, en de model-accuracy tracker (`/admin/model-accuracy`).

---

## 2. Wat is gedaan in sessie 13

### Taak 1 — Bugfix teamnaam-normalisatie in `getModelAccuracy()`
- **Bug:** `getModelAccuracy()` in `lib/model-accuracy.ts` gaf ruwe teamnamen door aan
  `matchP()` en de Elo-lookup. "Bosnia and Herzegovina" (results.json-spelling) werd niet
  herkend in teams.json ("Bosnia-Herz") → `sc()` viel terug op 0 → Canada kreeg foutief
  **p≈0.92** i.p.v. ~0.71.
- **Fix:** Dezelfde `canonTeam()`-normalisatie toegepast als in `predictionsFromResults()`:
  een `canonResults`-array gebouwd en die namen gebruikt voor `eloAfter()` én `matchP()`.
  Labels in de UI blijven de originele results.json-namen.
- **Tests:** 3 nieuwe in `tests/model-accuracy.test.ts` — Canada-confidence valt nu in
  0.65–0.75, en de log loss voor die 1-1 daalt t.o.v. de buggy waarde.

### Taak 2 — Opponent-strength gewogen xG (Dixon-Coles)
- **Nieuw in `lib/klement-custom.ts`:**
  - Types `MatchStat` en `OpponentAdjustedStats`.
  - `getOpponentAdjustedStrength(teamName, matchStats)` — weegt doelpunten per wedstrijd
    met een sterkte-tier afgeleid van de FIFA-punten van de tegenstander
    (≥1800→3.0, ≥1700→2.0, ≥1600→1.5, ≥1500→1.0, <1500→0.6, proxy voor de
    rang-banden top-10/11-25/26-50/51-100/101+). `null` bij <3 wedstrijden;
    `confidence = n/10`.
  - `applyOpponentAdjustFactor(...)` — past het verschil in `adjustedAttack` toe als
    **logit-shift** (`shiftPA`), net als de vorm-/competitiefactor, zodat de kansensom 1
    blijft. Gated: alleen actief als `opponentAdjustmentEnabled` aan staat, `formWeight>0`,
    en beide teams `confidence>0.4` (≥5 wedstrijden) hebben.
  - `resultsMatchStats()` — bouwt (gememoïseerd) per-team statistieken uit `results.json`.
- **`lib/model-config.ts`:** `opponentAdjustmentEnabled: boolean` toegevoegd, **default `false`**.
- **`/admin/model-config`:** toggle "Tegenstander-gecorrigeerde sterkte" + tooltip/hint
  (i18n: `modelConfig.opponentAdjustToggle` / `opponentAdjustHint`).
- **Tests:** `tests/opponent-adjusted.test.ts` (5).

> **Belangrijke afwijking van de taakopdracht (bewust):** de opdracht schreef
> `scWith += formWeight × (adjustedAttack − 1.0) × 50`. Dat zou rechtstreeks de teamscore
> (range ~[0,1]) met grote waarden ophogen en de z-score in `matchPElo` laten exploderen →
> kansen niet meer geldig. In plaats daarvan is het geïntegreerd als post-hoc **logit-shift**
> (zelfde patroon als alle andere uitbreidingsfactoren), wat de harde regel "alle kansen
> tellen op tot 1.00" respecteert. Functioneel hetzelfde signaal, veilig geschaald.

> **Databeperking:** `lib/match-stats.json` bevat (nog) geen tegenstander/team-velden en
> `xg` is overal `null`. De factor gebruikt daarom doelpunten uit `results.json` als
> `raw_xG`-proxy. Zolang de toggle uit staat (default) is dit een volledige no-op.

---

## 3. Modelstatus — factoren & gewichten

Alle gewichten staan in `lib/model-config.ts` (`DEFAULT_WEIGHTS`), instelbaar via
`/admin/model-config` (persisteert in `lib/model-config.json`). Het model leeft in
`lib/klement-custom.ts` (`lib/klement.ts` is read-only).

| Factor | Gewicht (default) | Hoe | Status |
|---|---|---|---|
| GDP per capita | `gdp` 0.20 | basisscore `scWith` | ✅ actief |
| Bevolking | `pop` 0.15 | basisscore | ✅ actief |
| Temperatuur | `temp` 0.15 | basisscore | ✅ actief |
| Teamsterkte (FIFA+Elo) | `fifa` 0.45 | basisscore; Elo-aandeel = `eloWeight` 0.30 | ✅ actief |
| Host-bonus | `host` 0.05 | basisscore | ✅ actief |
| Hoogte (altitude) | — | post-hoc logit, `altitudeEnabled` true | ✅ actief |
| Reisafstand | — | post-hoc logit, `travelEnabled` true | ✅ actief |
| WK-ervaring | — | post-hoc logit (max +2%) | ✅ actief |
| Recente vorm | `formWeight` 0.15 | post-hoc logit (form-cache.json) | ✅ actief (data-afhankelijk) |
| Competitieniveau | `leagueWeight` 0.10 | post-hoc logit (league-data.json) | ✅ actief |
| **Tegenstander-gecorr. sterkte** | hergebruikt `formWeight` | post-hoc logit | 🔧 **gebouwd, default UIT** |
| Rustdagen | — | post-hoc logit (−4% bij <3 dagen) | ✅ actief |
| Sterspeler-blessures | `starPenalty1/2/3` 0.08/0.05/0.03 ×`starPlayerScale` | post-hoc logit | ✅ actief |
| Polymarket-blend | `marketWeight` 0.20 | blend met marktodds | ✅ actief (bij marktdata) |
| Bivariate-correlatie (score) | `bivariateCorrelation` 0.11 | scoreverdeling /versus (geen modelwijziging) | ✅ actief |

**Afgeleide weergaves (geen modelinput):** bivariate-Poisson scoreverdeling + O/U 2.5 +
BTTS op `/versus`; model-accuracy tracker (log loss / Brier) op `/admin/model-accuracy`.

---

## 4. Bekende beperkingen

1. **`match-stats.json` is leeg qua xG/possession** (`null`) en heeft geen team/opponent-
   velden. De opponent-adjustment draait daarom op goals uit `results.json`. Pas
   `getOpponentAdjustedStrength` aan zodra GitHub Actions echte xG vult.
2. **Opponent-adjustment triggert pas vanaf 5 wedstrijden/team** (`confidence>0.4`). In de
   groepsfase speelt elk team er 3 — de factor is dus pas relevant in de knock-out.
3. **Opponent-tier gebruikt FIFA-punten i.p.v. echte rang-positie** (teams.json heeft geen
   rang). Drempels benaderen de banden; goed genoeg, niet exact.
4. **Model-accuracy is admin-only.** De log loss/Brier-cijfers (model verslaat momenteel de
   33%-baseline licht) zijn niet publiek zichtbaar.
5. **`getModelAccuracy()` vs `predictionsFromResults()`** zijn twee paden naast elkaar (auto-
   herberekening vs. snapshot-log). Beide nu correct genormaliseerd, maar conceptueel dubbel.

---

## 5. Volgende prioriteit — kant-en-klare instructies

> **LET OP — afwijking van de sessie-opdracht (bewust gesignaleerd):** de opdracht vroeg
> om Taak J (TodayMatches-widget) en Taak N (kansgeschiedenisgraaf) uit
> `NEW-ITERATION-V4.md` als next-priority te beschrijven. Bij verificatie blijken **beide al
> gebouwd**:
> - **Taak J = klaar:** `components/today/TodayMatches.tsx` staat op de homepage
>   (`app/[locale]/page.tsx`), incl. de rode **LIVE**-badge in de nav (`components/ui/Nav.tsx`
>   via `liveMatchNow`). i18n `today.*` aanwezig.
> - **Taak N = grotendeels klaar:** `components/teams/ProbabilityHistoryChart.tsx` wordt
>   getoond in `components/teams/ScheduleTab.tsx`.
>
> Hieronder daarom de **échte resterende** brokken (klein, zelfstandig, direct zichtbaar).

### Next J/N-1 — Champion-kanstrend in de "Vandaag"-widget  *(de enige onafgemaakte N-subtaak)*

Taak N, bullet 2 ("Toon ook op de homepage in de Vandaag-widget voor de teams die vandaag
spelen") is nog niet gedaan.

- [ ] In `components/today/TodayMatches.tsx`: render per wedstrijd, naast de twee teams, een
      compacte kampioenskans + pijl (↑groen / ↓rood / →grijs) op basis van de laatste twee
      entries in `lib/probability-snapshots.json`.
- [ ] Hergebruik de richting-/kleurlogica uit `ProbabilityHistoryChart.tsx` (`direction()`,
      `colorFor()`) — overweeg die naar `lib/probability-history.ts` te tillen zodat zowel de
      chart als de widget ze delen (DRY).
- [ ] Teamnaam-matching: `probability-snapshots.json` gebruikt teams.json-namen; de
      widget-teams komen uit `today-schedule` — normaliseer met `canonTeam()` waar nodig.
- [ ] i18n: voeg `today.championChance` toe ("Kampioenskans: {pct}%") in `nl.json` + `en.json`.
- [ ] **Verify:** op een dag met wedstrijden tonen de spelende teams hun kans + pijl; geen
      hydration-mismatch (widget bepaalt "vandaag" pas ná mount — volg het bestaande patroon).

### Next J/N-2 — Publieke "model vs. baseline"-badge  *(klein, hoge zichtbaarheid)*

De model-accuracy-data (sessie 12/13) is admin-only. Maak één publiek cijfer zichtbaar.

- [ ] Maak `components/live/AccuracyBadge.tsx` (server component): roep `getModelAccuracy()`
      aan, toon "Model: X/N correct · log loss Y.YY (baseline 1.10)" met groen/rood t.o.v.
      baseline (hergebruik `BASELINE_LOG_LOSS`).
- [ ] Plaats op `/live` (of als kleine strook onder de hero). Geen nieuwe API nodig — pure
      server render uit `results.json`.
- [ ] i18n onder een nieuwe `accuracyBadge.*` namespace (nl + en).
- [ ] **Verify:** badge toont actuele cijfers; `tsc`/`eslint`/`vitest`/`build` groen.

**Daarna (groter, uit roadmap):** Fase 7 (xG-data zodra FBref beschikbaar is) en Fase 8
(model-kalibratie na het toernooi) — zie `CLAUDE-V3.md`.
