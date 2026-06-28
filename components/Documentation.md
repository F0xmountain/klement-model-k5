# components

## Purpose

`components` holds the React UI, grouped by domain: `ui` (shared primitives),
`match` (group and knockout match views), `team` (team profile widgets),
`landing` (marketing sections), and `knockout` (the full bracket). Components
read from the model and fixtures in `lib` and render; they hold no business
logic of their own. Components that read randomness or use browser state are
client components.

## Public Interface

Every component is a default export. Props are listed verbatim.

### ui

| Component | Client | Props |
|---|---|---|
| `Btn` | Server | `ButtonProps \| LinkProps`. Shared: `variant?: 'red' \| 'blue' \| 'green' \| 'outline-blue' \| 'primary' \| 'default' \| 'ghost'`, `size?: 'sm' \| 'md' \| 'lg'`, `className?: string`, `children: React.ReactNode`, `style?: CSSProperties`. Button branch adds `onClick?`, `type?: 'button' \| 'submit'`, `disabled?`; Link branch adds `href: string`. |
| `ClientLayout` | Server | `{ children: React.ReactNode }` |
| `DecoBalls` | Server | `{ variant?: 'blue' \| 'red' \| 'green' \| 'mix', intensity?: 'soft' \| 'medium' }` |
| `FlagImg` | Client | `{ name: string, h?: number, emoji?: string }` |
| `HeroBanner` | Server | none (stub, returns `null`) |
| `Nav` | Client | none |
| `PageTransition` | Server | `{ children: React.ReactNode }` |
| `PixelBar` | Server | `{ value: number, color?: string }` |
| `PixelParticles` | Client | `{ variant?: 'red' \| 'green' \| 'blue' \| 'mix' }` |
| `PolymarketBtn` | Server | `{ teamName?: string, variant?: 'champion' \| 'match' }` |
| `SectionLabel` | Server | `{ children: React.ReactNode }` |
| `Tag` | Server | `{ variant?: 'blue' \| 'red' \| 'green' \| 'gray', children: React.ReactNode }` |
| `TeamSelect` | Client | `{ teams: string[], value: string, onChange: (v: string) => void, style?: React.CSSProperties }` |
| `WDLBar` | Server | `{ pA: number, dr: number, pB: number, labelA?: string, labelB?: string }` |

### match

| Component | Client | Props |
|---|---|---|
| `GroupCard` | Client | `{ group: string, teams: string[] }` |
| `GroupMatchRow` | Server | `{ teamA: string, teamB: string, result?: WDL }` |
| `MatchCard` | Server | `{ teamA: string, teamB: string, k?: string, isFinal?: boolean }` |

### team

| Component | Client | Props |
|---|---|---|
| `FactorBreakdown` | Server | `{ name: string }` |
| `H2HList` | Server | `{ name: string }` |

### landing

All six are server components that currently return `null` (stubs). The landing
page content lives inline in `app/page.tsx`; these section components are not
imported anywhere.

| Component | Props | State |
|---|---|---|
| `FooterCTA` | none | stub, returns `null` |
| `HeroSection` | none | stub, returns `null` |
| `HowItWorksSection` | none | stub, returns `null` |
| `KlementCallSection` | none | stub, returns `null` |
| `LivePreviewSection` | none | stub, returns `null` |
| `TrackRecordSection` | none | stub, returns `null` |

### knockout

| Component | Client | Props |
|---|---|---|
| `BracketView` | Client | none |

## Internal Structure

| Subfolder | Files | Responsibility |
|---|---|---|
| `ui` | 14 | Shared primitives: buttons, tags, bars, flags, nav, particles, selects. |
| `match` | 3 | Group standings card, group match row, knockout match card. |
| `team` | 2 | Factor breakdown, head-to-head list. |
| `landing` | 6 | Marketing section stubs (all return `null`, unused). |
| `knockout` | 1 | Full SVG bracket view. |

Library usage by component:
- `FlagImg`: `FLAG_CODES`.
- `PolymarketBtn`: `pmUrl`.
- `TeamSelect`: `teamData`.
- `GroupCard`: `simResult`, `matchP`, `calcStandings`, `teamData` (deterministic expected standings by default; random sim on click).
- `GroupMatchRow`: `matchP`, `teamData`.
- `MatchCard`: `matchP`, `teamData`.
- `FactorBreakdown`: `teamFactors`, `teamData`, `teamElo`.
- `H2HList`: `matchP`, `teamNames`, `sc`, `teamData`.
- `BracketView`: `ROUNDS`, `makeSlug`, `teamData`.

## Dependencies

- `react` - all components.
- `next/link`, `next/image`, `next/navigation` (`usePathname` in `Nav`) - Next.js
  primitives.
- `@/lib/klement`, `@/lib/fixtures`, `@/lib/flags`, `@/lib/polymarket` - see
  usage table above.
- `@/types` - `WDL` in `GroupMatchRow`.

`lucide-react` is declared in `package.json` (^1.17.0) but is not imported by any
component or page; social icons in `Nav` are inline markup. It is an unused
runtime dependency. See [../context/dependencies.md](../context/dependencies.md).

## Data Models

`components` owns no data models. It consumes `WDL` and the model return shapes
(`{ pA, dr, pB }` from `matchP`, `Standing` from `calcStandings`) from `lib` and
`types`. See [lib/Documentation.md](../lib/Documentation.md).

## Error Handling

Components do not throw. They rely on the model's sentinel returns: an unknown
team yields `sc` of `0` and `teamData` of `undefined`, and `FlagImg` renders the
country code text when `flagUrl` returns `''`. `TeamSelect` and `Nav` register
document-level click and route listeners and clean them up on unmount.

## Configuration

No component reads environment variables. Visual variants are controlled by the
`variant` / `intensity` / `size` props enumerated above; colors resolve to the
CSS custom properties defined in `app/globals.css`.

## Usage Examples

```tsx
import WDLBar from '@/components/ui/WDLBar'
import { matchP } from '@/lib/klement'

const { pA, dr, pB } = matchP('Netherlands', 'Morocco')
// <WDLBar pA={pA} dr={dr} pB={pB} labelA="NED" labelB="MAR" />
```

```tsx
import TeamSelect from '@/components/ui/TeamSelect'
import { teamNames } from '@/lib/klement'

// <TeamSelect teams={teamNames()} value={team} onChange={setTeam} />
```
