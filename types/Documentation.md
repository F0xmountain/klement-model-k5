# types

## Purpose

`types` defines the shared TypeScript shapes used by the model, the fixtures,
and the UI. It is the single declaration site for the domain vocabulary -
team attributes, match results, standings, and the `WDL` outcome union - so the
same types flow through `lib`, `app`, and `components` without redefinition.

## Public Interface

This module exports types only; it has no runtime values. All exports live in
`types/index.ts`.

| Type | Kind | Shape |
|---|---|---|
| `TeamData` | interface | `gdp: number`, `pop: number`, `temp: number`, `fifa: number`, `latam: boolean`, `host: boolean`, `flag: string`, `conf: string` |
| `WDL` | union | `'A' \| 'D' \| 'B'` (home win, draw, away win) |
| `MatchResult` | interface | `teamA: string`, `teamB: string`, `result: WDL` |
| `SimResult` | interface | `winner: string`, `pen: boolean` |
| `Standing` | interface | `team: string`, `pts: number`, `w: number`, `d: number`, `l: number` |
| `KnockoutMatch` | interface | `teamA: string`, `teamB: string`, `k: string` |
| `Scoreline` | interface | `a: number`, `b: number`, `p: number` |
| `ScorePrediction` | interface | `lambdaA`, `lambdaB`, `likely: Scoreline`, `topScorelines: Scoreline[]`, `pHome`, `pDraw`, `pAway`, `btts`, `over25` |
| `ModelComponent` | interface | `key: string`, `label: string`, `beta: number`, `importancePct: number`, `mean: number`, `std: number` |
| `ScorerProjection` | interface | `player`, `team`, `recentGoals`, `recentTeamMatches`, `ratePerMatch`, `expTeamMatches`, `projGoals` |

`k` in `KnockoutMatch` is the model's pick for that match (the higher
win-probability side), written by the bracket generator.

## Internal Structure

| File | Responsibility |
|---|---|
| `index.ts` | All shared interfaces and the `WDL` union (10 exports). |

## Dependencies

None. This module imports nothing and has no external dependencies.

## Data Models

The exported types listed under Public Interface are themselves the data models.
They are the canonical shapes for:

- A team's frozen attributes (`TeamData`), matching the per-team object in
  `lib/teams.json`.
- A single match outcome (`WDL`) and a recorded result (`MatchResult`).
- A simulated knockout outcome (`SimResult`).
- A group-table row (`Standing`).
- A bracket fixture with Klement's pick (`KnockoutMatch`).

## Error Handling

Not applicable. This module contains no runtime code and raises no errors.

## Configuration

None.

## Usage Examples

```ts
import type { TeamData, WDL, MatchResult } from '@/types'

const result: WDL = 'A'
const match: MatchResult = { teamA: 'Netherlands', teamB: 'Morocco', result }
```
