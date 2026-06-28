# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Location

The app lives in the `kalsh-main/` subdirectory, not the repository root (`KlementWC2026/`). Run every command below from inside `kalsh-main/`.

## Commands

```bash
npm run dev      # Next.js dev server -> http://localhost:3000
npm run build    # production build (CI gate)
npm run lint     # eslint (flat config, eslint.config.mjs)
npm test         # vitest run (one-shot, used by CI)
```

Run a single test by name or file:

```bash
npx vitest run tests/klement.test.ts
npx vitest run -t "probabilities sum to 1"
npx vitest            # watch mode
```

CI (`.github/workflows/ci.yml`) runs `npm test` and `npm run build` on push and PR. A separate weekly cron (`update-rankings.yml`) runs `scripts/fetch-rankings.js`.

## Architecture

This is a static, client-simulated forecast site for Joachim Klement's econometric World Cup model. There is no database and no app-owned backend; the only server route is an ISR revalidation webhook.

**The model is the core.** `lib/klement.ts` holds every pure function: `sc` (team score), `matchP` (W/D/L probabilities), `simResult` / `simKO` (random sampling), `calcStandings`. These have no side effects and no I/O. The model reads team attributes from `lib/teams.json`, the single source of truth for all 48 teams. Match probability is a normal-CDF model: `z = (sc(A) - sc(B)) / 0.28`, then `P(A) = Φ(z)·(1 - draw)`. The `0.28` sigma and the `W` factor weights at the top of `klement.ts` are the model constants.

**Fixtures are hardcoded, not derived.** `lib/fixtures.ts` holds the official group draw (`GROUPS`) and Klement's predicted bracket (`ROUNDS`, with `k` = his pick per match). The bracket and picks are authored by hand, deliberately not generated from model scores.

**Data flow split:**
- Group standings (`app/groups`) are produced by simulating round-robin results client-side, then `calcStandings`, not by sorting on model score.
- Knockout pages (`app/knockout/[round]`) are server-rendered from `ROUNDS` + `matchP`, statically generated via `generateStaticParams`. Klement's pick is shown from the fixture, not simulated.
- Monte Carlo (`app/mc`) runs full-tournament simulations entirely in the browser.

Any component that calls `simResult` / `simKO` (randomness) must be a client component (`'use client'`).

**Live-data libs.** `lib/api-football.ts` (API-Football, gated on `API_FOOTBALL_KEY`) and the Node client `scripts/model/live.js` feed the event-driven refit; `lib/polymarket.ts` is an outbound link. `lib/flags.ts` maps team names to flag assets. NOTE: the model is now data-driven (weights fit from results into `lib/model/*.json`, score prediction and topscorers added). The ADRs in `context/decisions.md` (008-013) are the source of truth where this file's older "frozen weights / W-D-L only" description disagrees.

**Rankings update loop.** `scripts/fetch-rankings.js` pulls FIFA API points and patches the `fifa` field in `teams.json` in place (name-matched; unmatched teams untouched). The GitHub Action then POSTs to `app/api/revalidate/route.ts` (guarded by `REVALIDATE_TOKEN`) to trigger `revalidatePath('/', 'layout')`.

## Hard rules (from README, do not violate)

1. W/D/L only, never score prediction.
2. Light mode only.
3. `teams.json` is the only place team values live; never inline them.
4. Klement picks stay hardcoded in `fixtures.ts`.
5. Model functions in `klement.ts` stay pure (no API calls).
6. Simulation is client-side only.
7. Group standings come from simulated results, not model-score sorting.

## README drift to be aware of

The README's "Tech stack" and "Project structure" sections are partly stale. The actual UI is a pixel/retro design, not the described "Trionda Light glass" system:
- Font is `Press_Start_2P` (`--font-pixel`) loaded in `app/layout.tsx`, not Plus Jakarta Sans or Inter.
- There is no Framer Motion dependency. Page transitions are a plain CSS `.fade-in` in `components/ui/PageTransition.tsx`; the visual language is `px-border` / `px-shadow` classes and `PixelParticles`.
- Routes `app/versus` / `app/lookup` / `app/score` / `app/topscorers` and libs `polymarket.ts` / `api-football.ts` / `flags.ts` exist but are not listed in the README structure.

Trust the code over the README on stack and styling. Color tokens are the `@theme` block in `app/globals.css`.
