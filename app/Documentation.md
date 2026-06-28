# app

## Purpose

`app` is the Next.js App Router tree: the root layout, the page routes, the
global stylesheet, and the single API route. Pages are thin - they read from
`lib` and compose `components`. Interactive pages that run randomness are client
components; everything else renders statically or is statically generated at
build time.

## Public Interface

### Page routes

| Route | Default export | Rendering | Exports / props |
|---|---|---|---|
| `/` | `LandingPage` | Server | none |
| `/about` | `AboutPage` | Server | none |
| `/groups` | `GroupsPage` | Server | none |
| `/versus` | `VersusPage` | Client (`'use client'`) | none |
| `/score` | `ScorePage` | Client (`'use client'`) | none |
| `/topscorers` | `TopscorersPage` | Server | none |
| `/lookup` | `LookupRedirect` | Server | redirects to `/versus` |
| `/teams` | `TeamsPage` | Client (`'use client'`) | none |
| `/mc` | `MCPage` | Client (`'use client'`) | none |
| `/knockout/[round]` | `KnockoutPage` (async) | Statically generated | `generateStaticParams(): { round: string }[]`; props `params: Promise<{ round: string }>` |
| `/knockout/[round]/[match]` | `MatchPage` (async) | Statically generated | `generateStaticParams(): { round: string; match: string }[]`; props `params: Promise<{ round: string; match: string }>` |
| `/knockout/bracket` | `BracketPage` | Server | none |

### Root layout

`app/layout.tsx` default export `RootLayout({ children }: { children:
React.ReactNode })`. It also exports `metadata: Metadata` (title and
description) and loads `Press_Start_2P` as the `--font-pixel` CSS variable.

### API routes

`app/api/revalidate/route.ts` exports `POST(req: Request)`. It compares the
`secret` query parameter against `REVALIDATE_TOKEN`, returns `401` on mismatch,
otherwise calls `revalidatePath('/', 'layout')` and returns
`{ revalidated: true, at: <ISO timestamp> }`.

`app/api/recompute/route.ts` exports `POST(req: Request)`. Token-guarded like
revalidate; when `GH_DISPATCH_TOKEN` and `GH_REPO` are set it sends a
`repository_dispatch` (`match-finished`) to trigger the refit Action and returns
`202`, otherwise `503`. It logs each request to the console (file-based endpoint
logging is not used on the read-only serverless host).

## Internal Structure

| File | Responsibility |
|---|---|
| `layout.tsx` | Root HTML, `Nav`, footer, pixel font, page metadata. |
| `globals.css` | Tailwind v4 `@theme` color tokens and the `px-*` / `.fade-in` utility styles. |
| `page.tsx` | Landing page: model champion + path, self-determined weights, stats bar (all from the fit). |
| `about/page.tsx` | Model explainer: fitted weights, proof metrics, calibration, top Elo, provenance. |
| `groups/page.tsx` | 12-group grid; renders `GroupCard` per group from `GROUPS`. |
| `versus/page.tsx` | Match predictor: two-team select, WDL bar, upset simulation, dual factor breakdowns. |
| `score/page.tsx` | Poisson score predictor: most-likely scoreline, heatmap, xG, BTTS, over/under. |
| `topscorers/page.tsx` | Golden Boot projection from `scorers.json`; live leaders from `live-scorers.json`. |
| `lookup/page.tsx` | Server redirect to `/versus`. |
| `teams/page.tsx` | Tabbed team profile (strength index, Elo) and ranking view. |
| `mc/page.tsx` | Monte Carlo full-tournament simulations, champion distribution. |
| `knockout/[round]/page.tsx` | One round of matches as a grid. |
| `knockout/[round]/[match]/page.tsx` | A single matchup detail page. |
| `knockout/bracket/page.tsx` | Full visual bracket via `BracketView`. |
| `api/revalidate/route.ts` | ISR revalidation webhook. |
| `api/recompute/route.ts` | Webhook that dispatches the refit GitHub Action. |

## Dependencies

- `next` - App Router, `next/font/google`, `next/cache` (`revalidatePath`),
  `next/navigation` (`redirect`), `Metadata`.
- `react` - client hooks on the interactive pages.
- `@/lib/klement`, `@/lib/fixtures`, `@/lib/polymarket` - model and fixtures.
- `@/components/*` - all rendered UI.

Library imports by page:
- `/` (landing): `modelComponents`, `teamData`, `ROUNDS`, `fit-summary.json`.
- `/about`: `modelComponents`, `modelMeta`, `fit-summary.json`.
- `/groups`: `GROUPS`.
- `/versus`: `matchP`, `teamNames`, `teamData`, `simResult`, `PM_GAP_THRESHOLD`.
- `/score`: `predictScore`, `scoreMatrix`, `teamNames`, `teamData`.
- `/topscorers`: `teamData`, `scorers.json`, `live-scorers.json`.
- `/teams`: `teamNames`, `teamData`, `sc`, `strengthIndex`, `teamElo`.
- `/mc`: `simKO`, `teamData`, `ROUNDS`.
- `/knockout/[round]` and `/knockout/[round]/[match]`: `matchP`, `teamData`,
  `ROUNDS`, `ROUND_LABELS`, `makeSlug`.

## Data Models

`app` owns no data models. It consumes the shared types from `types` and the
fixtures and model from `lib`. See [lib/Documentation.md](../lib/Documentation.md)
and [types/Documentation.md](../types/Documentation.md).

## Error Handling

- `POST /api/revalidate` returns `Response.json({ error: 'Unauthorized' }, {
  status: 401 })` when the `secret` query parameter does not match
  `REVALIDATE_TOKEN` (route.ts:5-7). There is no other error path; a valid call
  always succeeds.
- Knockout pages are constrained to the param sets returned by
  `generateStaticParams`, so unknown rounds and matches are not generated.
- Client pages handle "unknown team" gracefully via the model's sentinel returns
  (`sc` returns `0`, `teamData` returns `undefined`); they do not throw.

## Configuration

| Name | Type | Default | Purpose | Source |
|---|---|---|---|---|
| `REVALIDATE_TOKEN` | env string | unset | Shared secret for `/api/revalidate` and `/api/recompute` | route.ts |
| `GH_DISPATCH_TOKEN` / `GH_REPO` | env string | unset | Optional. Let `/api/recompute` dispatch the refit Action | api/recompute/route.ts |
| `metadata` | const Metadata | title and description | Document head | layout.tsx:12 |
| `--font-pixel` | CSS variable | `Press_Start_2P` 400 | Site font | layout.tsx:6-10 |

Color tokens are defined in the `@theme` block of `globals.css`. The image host
`flagcdn.com` is allowlisted in `next.config.ts` for `next/image`.

## Usage Examples

```bash
npm run dev        # http://localhost:3000
```

```bash
# Trigger ISR revalidation (matches the GitHub Actions step)
curl -X POST "https://<app-url>/api/revalidate?secret=$REVALIDATE_TOKEN"
# -> { "revalidated": true, "at": "2026-..." }
```
