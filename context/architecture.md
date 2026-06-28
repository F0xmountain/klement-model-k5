# Architecture (context)

This is the architectural-level summary. The authoritative, code-linked
breakdown is in [../Architecture.md](../Architecture.md) and the per-module
[Documentation.md](../lib/Documentation.md) files.

## Technology Stack

Next.js 16 (App Router) with React 19 and TypeScript 5. Styling is Tailwind CSS
v4 via the PostCSS plugin, with color tokens in the `@theme` block of
`app/globals.css`. The font is `Press_Start_2P` (pixel/retro), loaded through
`next/font/google`. Testing is Vitest. CI and the refit job run on Node 20. The
forecast model is plain TypeScript with no external math library; weights are fit
offline by a Node pipeline.

## Components

- `lib` - the pure model (`klement.ts`) reading `lib/model/*.json`, generated
  fixtures (`fixtures.ts`), flag mapping (`flags.ts`), and the API-Football
  client.
- `lib/model` - committed fitted artifacts (weights, ratings, bracket, scorers,
  fit summary, live results).
- `lib/sensitivity` - the live weight-sensitivity explorer engine (`sources.ts`
  live fetch, `features.ts` point-in-time assembly, `engine.ts` fit and sweep
  math, `run.ts` streamed orchestrator). Explorer-only: it never touches the
  production model.
- `app` - App Router pages, root layout, global styles, and the revalidate and
  recompute routes.
- `components` - React UI grouped into `ui`, `match`, `team`, `landing`,
  `knockout`.
- `types` - shared interfaces and the `WDL` union.
- `scripts` - the offline model-fitting pipeline and live update.
- `tests` - Vitest model tests.

## Data Flow

`scripts/fit-model.js` fits the model from historical results into
`lib/model/*.json`. The model in `lib/klement.ts` reads those artifacts plus team
attributes from `lib/teams.json`. Group standings render deterministic expected
values from `matchP` (with an on-demand client simulation). Knockout pages are
statically generated from the model-generated `ROUNDS` plus `matchP`. The score
predictor, match predictor, and Monte Carlo run all sampling in the browser. The
write path is the refit job appending finished matches and rewriting
`lib/model/`, after which a webhook triggers revalidation.

The weight-sensitivity explorer is a separate, read-only flow that runs on
demand and writes nothing. When the visitor clicks Start, `/sensitivity` opens a
streamed GET to `/api/sensitivity`, which delegates to `lib/sensitivity/run.ts`
and streams NDJSON progress events back. The orchestrator runs in stages:

1. Live fetch. `sources.ts` GETs the full martj42 `results.csv` and the World
   Bank GDP-per-capita and population indicators (`country/all`, paged) at
   runtime. No key, no committed copy.
2. Build features. `features.ts` runs one chronological pass over every
   international match, building a point-in-time home-grown Elo and the other
   nine features from each team's state before the match, recording a sample
   only for pool World Cup matches. Samples split into train (year <= 2014) and
   validate (2018 / 2022 / 2026); the standardizer is fit on train only.
3. Fit and freeze a baseline. `engine.ts` fits the ten betas by logistic
   regression on train, then calibrates `(scale, dmax, ddecay)` once on train.
   These calibration values are frozen for every sweep.
4. Sweep. For each feature, hold the other nine betas at baseline and vary that
   one coefficient over a sensitivity band, scoring train and out-of-sample
   log-loss at each fine-sweep point.

The final event carries the full `SensitivityResult` (baseline log-losses, the
ten per-feature curves, and the split sizes). The page renders the progress
trace during the run and the ten curves plus a summary table at the end.

## Infrastructure

Hosted on Vercel as static and statically generated pages plus two webhooks
(revalidate, recompute). Two GitHub Actions workflows: a CI gate (`npm test` and
`npm run build` on Node 20) and a refit job that polls API-Football, refits
after each finished match, commits `lib/model/`, and triggers revalidation. No
database, no container, no long-running server process.

## External Integrations

- martj42/international_results - historical training data (CSV via GitHub),
  also fetched live at runtime by the sensitivity explorer.
- World Bank - GDP per capita and population, fetched live at runtime by the
  sensitivity explorer for its `gdp` and `pop` features (no key).
- API-Football - finished matches and live topscorers (key-gated).
- flagcdn.com - flag images, allowlisted in `next.config.ts`.
- Polymarket - outbound market link only.
