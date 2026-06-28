# Overview

## Description

WC26 Klement is a Next.js App Router site whose FIFA World Cup 2026 forecast is
fit from real match data. Visitors pick any two teams for win/draw/loss
probabilities and Poisson scoreline predictions, see projected topscorers,
explore each team's fitted factor breakdown, browse the group stage and a
model-generated knockout bracket, and run Monte Carlo simulations. There is no
database and no app-owned backend; the model is a set of pure functions over
committed JSON artifacts, and all randomness runs in the browser.

## Goals

- Determine the model weights from data on a rolling basis, taking past match
  results into account, and refit after each finished match.
- Make the weights visible and proven (fit metrics, calibration) on the About
  page.
- Predict scorelines (Poisson) and project topscorers from real player data.
- Keep the runtime model pure, testable, and dependency-free (it reads committed
  artifacts; fetching lives in `scripts/`).
- Serve fast, mostly static pages on Vercel with only revalidate/recompute
  webhooks.

## Non-Goals

- No betting or trading functionality. Polymarket is an outbound link only.
- No dark mode; the site is light only.
- No user accounts, persistence, or server-stored state.
- No live fetching inside `lib/klement.ts`; the heavy refit runs in CI, not in a
  serverless route.

## Personas

- **Football fan / casual visitor.** Wants a quick, credible read on who beats
  whom and who Klement thinks wins.
- **Curious analyst / bettor.** Wants the factor breakdown, head-to-head
  probabilities, and the value-bet gap against Polymarket markets.
- **Maintainer (Clarion Capital).** Keeps the model and data correct, owns the
  event-driven refit pipeline, and ships changes through the CI gate.

## External References

- Klement, J. (2026). FIFA World Cup 2026 Predictions. Panmure Liberum Research,
  9 April 2026.
- Hoffmann, R., Ging, L.C. and Ramasamy, B. (2002). The socioeconomic
  determinants of international soccer performance. Journal of Applied Economics,
  5(2), 253-272.
- API-Football API: https://www.API-Football/documentation/api
- Historical results dataset: https://github.com/martj42/international_results
- Project README at `../README.md` (note: its tech-stack and structure sections
  are partly stale; trust the code and `../Architecture.md`).
