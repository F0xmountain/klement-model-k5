# tests

## Purpose

`tests` holds the Vitest unit tests that lock down the model's invariants. The
suite targets the pure functions in `lib/klement.ts` - the part of the codebase
where a silent change would corrupt every forecast. The UI and fixtures are not
unit tested; their correctness is covered by the build gate and by the model
tests they depend on.

## Public Interface

Not an importable module. The suite runs via the test runner.

| Command | Effect |
|---|---|
| `npm test` | One-shot `vitest run` over the suite (the CI command). |
| `npx vitest run tests/klement.test.ts` | Run this file only. |
| `npx vitest run -t "probabilities sum to 1"` | Run one test by name. |
| `npx vitest` | Watch mode. |

## Internal Structure

| File | Responsibility |
|---|---|
| `klement.test.ts` | 15 tests across 8 suites covering `sc`, `matchP`, `predictScore`, `expectedGoals`, `teamElo`, `modelComponents`, `simKO`, `calcStandings`. |

Coverage by suite:

| Suite | Tests | Invariant checked |
|---|---|---|
| `sc()` | 3 | Finite for known teams; `0` for an unknown team; a strong side scores above a weak one. |
| `matchP()` | 4 | `pA + dr + pB` close to 1; values in range and `dr` within `[0.05, 0.34]`; equal teams near 50/50; the stronger side is favoured. |
| `predictScore()` | 3 | Outcome probabilities cover ~100% of the grid; positive xG and a most-likely scoreline; BTTS and over 2.5 are valid probabilities. |
| `expectedGoals()` | 1 | Stronger side has the higher expected goals. |
| `teamElo()` | 1 | Returns a rating and ranks strong over weak. |
| `modelComponents()` | 1 | Importance percentages sum to ~100. |
| `simKO()` | 1 | Always returns one of the two input teams and a boolean `pen`, across 20 samples. |
| `calcStandings()` | 1 | One entry per team, sorted by points descending, with correct point totals. |

## Dependencies

- `vitest` `^4.1.7` (defined in package.json:27) - `describe`, `it`, `expect`.
- `../lib/klement` - the functions under test.
- `../types` - `MatchResult` for the standings fixture.

## Data Models

Tests construct `MatchResult[]` fixtures inline (tests/klement.test.ts:62-69)
and assert on the `Standing[]` shape returned by `calcStandings`. See
[types/Documentation.md](../types/Documentation.md).

## Error Handling

Failures surface as Vitest assertion errors and fail the CI `Test` job. Random
functions (`simKO`) are tested over a loop of samples rather than a fixed seed,
so the assertions check membership and type invariants that hold for every
sample rather than an exact value.

## Configuration

No test-specific configuration file. Vitest runs with its defaults; there is no
`vitest.config.ts`. Tests must satisfy the F.I.R.S.T. properties: they have no
I/O, no shared state, and are self-validating.

## Usage Examples

```bash
# From kalsh-main/
npm test
npx vitest run -t "probabilities sum to 1"
```
