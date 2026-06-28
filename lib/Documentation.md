# lib

## Purpose

`lib` holds the forecast model and tournament data. The model functions are
pure: they read the committed fitted artifacts in `lib/model/` (produced by
`scripts/fit-model.js`), take strings/arrays, return numbers and plain objects,
and perform no I/O. `GROUPS` is the real group draw; `ROUNDS` is read from the
generated `lib/model/bracket.json`. `api-football.ts` is the live client used by
the app/CI; `polymarket.ts` is an outbound link helper. The `sensitivity/`
subfolder is a self-contained experiment package that does live network I/O and
is intentionally separate from the pure production model.

## Public Interface

### klement.ts - the model

| Symbol | Signature | Behaviour |
|---|---|---|
| `sc` | `sc(name: string): number` | Latent model strength: sum of fitted `beta_k` times standardized factors plus a host bonus. Unbounded (a z-score sum), can be negative. `0` for an unknown team. |
| `matchP` | `matchP(nA, nB): { pA; dr; pB }` | Win/draw/loss probabilities via `sigmoid(sc(A)-sc(B))` and a decaying draw term. The three values sum to 1. |
| `predictScore` | `predictScore(nA, nB): ScorePrediction` | Poisson scoreline distribution: most-likely score, top 6 scorelines, pHome/pDraw/pAway, BTTS, over 2.5, expected goals. |
| `expectedGoals` | `expectedGoals(nA, nB): { lambdaA; lambdaB }` | Poisson means for each side. |
| `scoreMatrix` | `scoreMatrix(nA, nB, size=6): number[][]` | `size x size` grid of scoreline probabilities, for the heatmap. |
| `simResult` | `simResult(nA, nB): WDL` | One random outcome (`'A'`/`'D'`/`'B'`) from `matchP`. Impure (`Math.random`). |
| `simKO` | `simKO(nA, nB): SimResult` | One random knockout result; a draw is resolved by a strength-weighted shootout. Impure. |
| `calcStandings` | `calcStandings(teams, results): Standing[]` | Points table, sorted by points then wins. 3 for a win, 1 each for a draw. |
| `teamNames` | `teamNames(): string[]` | All team keys in `teams.json`. |
| `teamData` | `teamData(name): TeamData \| undefined` | Raw attributes, or `undefined`. |
| `teamElo` | `teamElo(name): number` | Fitted Elo rating from `ratings.json` (1500 default). |
| `strengthIndex` | `strengthIndex(name): number` | 0-100 strength scaled across the field; monotonic with `sc`. |
| `teamFactors` | `teamFactors(name): FactorView[]` | Per-team normalized factor values paired with fitted importance, for the breakdown UI. |
| `modelComponents` | `modelComponents(): ModelComponent[]` | The fitted weights (key, label, beta, importancePct). |
| `modelMeta` | `modelMeta(): {...}` | Fit timestamp, data source, draw and Poisson params. |

### fixtures.ts - hand-authored tournament structure

| Symbol | Signature | Behaviour |
|---|---|---|
| `makeSlug` | `makeSlug(a: string, b: string): string` | URL slug `"{a}-vs-{b}"`, lowercased with spaces replaced by hyphens. |
| `GROUPS` | `GROUPS: Record<string, string[]>` | The 12 group-draw groups, each a 4-team array. |
| `ROUNDS` | `ROUNDS: Record<string, KnockoutMatch[]>` | Model-generated bracket (`r32`..`final`), read from `lib/model/bracket.json`. |
| `BRACKET_GENERATED_AT` | `string` | Timestamp the bracket was last fit. |
| `ROUND_LABELS` | `ROUND_LABELS: Record<string, string>` | Display labels for each round key. |

### flags.ts - flag asset mapping

| Symbol | Signature | Behaviour |
|---|---|---|
| `FLAG_CODES` | `FLAG_CODES: Record<string, string>` | Team name to flagcdn country code (ISO 3166-1 alpha-2, plus `gb-eng` / `gb-sct`). |
| `flagUrl` | `flagUrl(name: string, w = 40, h = 30): string` | flagcdn PNG URL at the requested size. Returns `''` for an unmapped team. |

### api-football.ts - live-data client (API-Football)

| Symbol | Signature | Behaviour |
|---|---|---|
| `isTournamentLive` | `isTournamentLive(): boolean` | `true` once the current date reaches 2026-06-11 UTC. |
| `fetchWCFixtures` | `fetchWCFixtures(): Promise<AFFixture[] \| null>` | World Cup fixtures (league 1, season 2026) from API-Football. `null` without a key or on any API error. |
| `fetchWCScorers` | `fetchWCScorers(): Promise<AFScorer[] \| null>` | World Cup topscorers from API-Football. `null` without a key or on any API error. |

### polymarket.ts - outbound market link

| Symbol | Signature | Behaviour |
|---|---|---|
| `POLYMARKET_BASE` | `POLYMARKET_BASE: string` | Base Polymarket World Cup games URL. |
| `pmUrl` | `pmUrl(_teamName?: string): string` | Returns `POLYMARKET_BASE`; the team argument is currently ignored. |
| `PM_GAP_THRESHOLD` | `PM_GAP_THRESHOLD = 0.05` | Probability gap above which the UI flags a possible value bet. |

### sensitivity/ - live weight-sensitivity experiment

A separate package with its own docs; `runSensitivity()` is its entry point. The
sole consumer is the streaming route `app/api/sensitivity/route.ts`, which calls
`runSensitivity()` and forwards each yielded `ProgressEvent` as one NDJSON line.
See [sensitivity/Documentation.md](./sensitivity/Documentation.md) for the full
interface (`fetchResults`, `fetchWorldBank`, `buildSamples`, the `engine` math,
and the shared `types`).

## Internal Structure

| File | Responsibility |
|---|---|
| `klement.ts` | The model. Factor functions `fG`/`fP`/`fT`/`fF`, `sigmoid`, and the public scoring, score-prediction, and simulation functions. Reads `model/weights.json` and `model/ratings.json`. |
| `fixtures.ts` | `GROUPS` (real draw), `ROUNDS`/`BRACKET_GENERATED_AT` from `model/bracket.json`, `ROUND_LABELS`, `makeSlug`. |
| `flags.ts` | `FLAG_CODES` lookup and the `flagUrl` builder. |
| `api-football.ts` | API-Football client (fixtures, scorers), gated on `API_FOOTBALL_KEY`. |
| `polymarket.ts` | Static Polymarket URL and the value-bet gap threshold. |
| `teams.json` | Team attribute values. 58 entries. |
| `model/*.json` | Fitted artifacts produced by `scripts/fit-model.js`: `weights.json`, `ratings.json`, `bracket.json`, `scorers.json`, `fit-summary.json`, plus the live loop's `live-results.csv`, `processed-matches.json`, `live-scorers.json`. |
| `sensitivity/` | Live weight-sensitivity experiment (sources, features, engine, run, types). Separate from the pure model; documented in `sensitivity/Documentation.md`. Consumed by `app/api/sensitivity/route.ts`. |

`klement.ts` private internals: `beta` is built from `weights.json` components;
`sc` standardizes each factor with the committed `standardizer` (mean/std) and
adds `homeAdv` for host teams; `matchP` uses `sigmoid` of the score difference
with a draw term `clip(draw.max * exp(-draw.decay * |eta|), 0.05, 0.34)`; the
Poisson layer uses `mu`, `gamma`, `homeBonus` from `weights.json`. The old
hardcoded `W` weights and the local `erf`/`phi` normal CDF were removed (ADR-008).

## Dependencies

- `../types` - `TeamData`, `WDL`, `SimResult`, `Standing`, `MatchResult`,
  `KnockoutMatch`. Internal, no version.
- `./teams.json`, `./model/weights.json`, `./model/ratings.json`,
  `./model/bracket.json` - imported by `klement.ts` / `fixtures.ts`.
- No external npm packages. The model uses only `Math` built-ins (logistic
  `sigmoid` and a small Poisson PMF), keeping the runtime dependency-free. The
  `sensitivity/` package adds live source fetches via the global `fetch` but no
  npm packages either; see its own Dependencies section.

## Data Models

The shared record types (`TeamData`, `WDL`, `MatchResult`, `SimResult`,
`Standing`, `KnockoutMatch`) are owned by the `types` module; see
[types/Documentation.md](../types/Documentation.md).

Data models owned by this module:

- `teams.json` shape: `Record<string, TeamData>` - team name to attributes
  (`gdp`, `pop`, `temp`, `fifa`, `latam`, `host`, `flag`, `conf`).
- `AFFixture` (api-football.ts): `fixture: { id; date; status: { short } }`,
  `teams: { home: { name }; away: { name } }`, `goals: { home; away }`.
- `AFScorer` (api-football.ts): `player: { name }`,
  `statistics: { team: { name }; goals: { total } }[]`.

Note on counts: `teams.json` holds 58 entries, the model's full team universe
returned by `teamNames()`. `GROUPS` covers the 48 group-stage qualifiers
(defined in fixtures.ts:8); the remaining `teams.json` entries are teams that
appear only in the hand-authored knockout `ROUNDS` or as reserve attribute rows.
The "48 teams" figure shown in the UI refers to the qualifiers, not the size of
`teams.json`.

## Error Handling

This module signals "no data" with sentinel return values rather than thrown
exceptions, because all callers are render paths that must not crash:

- `sc` returns `0` for an unknown team name (klement.ts:42).
- `teamData` returns `undefined` for an unknown team name (klement.ts:105).
- `flagUrl` returns `''` for an unmapped team name (flags.ts:72).
- `fetchWCFixtures` / `fetchWCScorers` return `null` for every failure mode -
  missing key, non-ok HTTP status, an API error object (access/plan/quota), or a
  caught network error (api-football.ts).

No function in this module throws.

## Configuration

| Name | Type | Default | Purpose | Source |
|---|---|---|---|---|
| `API_FOOTBALL_KEY` | env string | `''` | API-Football `x-apisports-key`; absent disables the live client | api-football.ts |
| `API_FOOTBALL_LEAGUE` / `API_FOOTBALL_SEASON` | env string | `1` / `2026` | World Cup league id and season | api-football.ts |
| `TOURNAMENT_START` | const Date | `2026-06-11T00:00:00Z` | Gate for `isTournamentLive` | api-football.ts |
| `weights.json` | committed JSON | fitted | Factor betas, standardizer, draw and Poisson params | lib/model/weights.json |
| `ratings.json` | committed JSON | fitted | Elo rating per team | lib/model/ratings.json |
| `PM_GAP_THRESHOLD` | const number | `0.05` | Value-bet gap threshold | polymarket.ts:10 |

## Usage Examples

```ts
import { matchP, simKO, calcStandings } from '@/lib/klement'
import type { MatchResult } from '@/types'

// Win/draw/loss probabilities (sum to 1)
const { pA, dr, pB } = matchP('Netherlands', 'Morocco')

// One random knockout result, draws resolved by penalties
const { winner, pen } = simKO('Netherlands', 'Portugal')

// Points table from simulated results
const results: MatchResult[] = [{ teamA: 'A', teamB: 'B', result: 'A' }]
const table = calcStandings(['A', 'B'], results)
```
