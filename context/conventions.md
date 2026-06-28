# Conventions

## Style References

The project follows the global standards in the user's `~/.claude` instruction
set (code styling, tone, documentation, context, plan discipline). The
repository's own `../CLAUDE.md` records the binding hard rules and the known
README drift. Lint is ESLint with `eslint-config-next` (flat config in
`eslint.config.mjs`); formatting follows the Next.js and TypeScript defaults.

## Naming

- Components: `PascalCase`, one default export per file, file named after the
  component (for example `WDLBar.tsx`).
- Functions and variables: `camelCase` (`matchP`, `teamData`, `makeSlug`).
- Module-level constant data: `SCREAMING_SNAKE_CASE` or descriptive uppercase
  (`GROUPS`, `ROUNDS`, `ROUND_LABELS`, `FLAG_CODES`, `PM_GAP_THRESHOLD`).
- Model factor helpers use short domain names (`fG`, `fP`, `fT`, `fF`) matching
  the formula in the paper.
- Team names are the canonical string keys throughout; they must match
  `lib/teams.json` exactly (for example `'Bosnia-Herz'`, `'Congo DR'`).
- Knockout round keys are `r32`, `r16`, `qf`, `sf`, `final`.

## Branching and Commits

CI runs on `main`, `master`, `dev`, and `staging` (push) and on pull requests to
`main`, `master`, `dev`. The rankings bot commits as `github-actions[bot]` with
a `chore: update FIFA rankings <date>` message and only when `teams.json`
actually changed.

## Tests

Vitest, one suite file (`tests/klement.test.ts`) covering the model functions
`sc`, `matchP`, `simKO`, `calcStandings`. Tests are pure and self-validating
(F.I.R.S.T.); random functions are checked over a loop of samples for invariants
rather than exact values. `npm test` runs `vitest run` and is a CI gate. UI and
fixtures are not unit tested.

## Project-Specific Patterns

- Win/draw/loss only. Never add a score-prediction path.
- `lib/teams.json` is the single source of truth for team values; never inline
  team attributes.
- Klement's picks stay hand-authored in `lib/fixtures.ts`; never regenerate them
  from model scores.
- Model functions in `lib/klement.ts` stay pure - no I/O, no API calls.
- Any component that calls `simResult` or `simKO` must be a client component
  (`'use client'`).
- Group standings come from simulated results, then `calcStandings`; never sort
  on model score.
- Match URL slugs are built by `makeSlug` as `"{a}-vs-{b}"`, lowercased with
  spaces replaced by hyphens.
- Light mode only.
