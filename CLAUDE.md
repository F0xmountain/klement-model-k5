# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.


# CLAUDE.md — WC26 Klement

> Project context for Claude Code. Read this before touching any file.

---

## What This Project Is

A Next.js web app that surfaces Joachim Klement's econometric World Cup forecast
(Panmure Liberum, April 2026) as an interactive match predictor.

**Model output: W/D/L probability only. No score prediction.**
The model explains R²≈0.55 of variance. The remaining 45% is noise, encoded in σ=0.28.
Never add score prediction (e.g. Poisson) without an explicit request — it was tried and removed.

> **Exception (explicit request, 2026):** a Poisson **score-probability distribution**
> was re-added on `/versus` (`lib/score-distribution.ts`) at the user's explicit request.
> It does NOT change the model — it's a derived display transformed from the win
> probability (via the expected-goals formula); nothing feeds back into the W/D/L model.
> The model output itself remains W/D/L only. Don't add score prediction *to the model*.

**Klement's 2026 prediction:** Netherlands win (first ever), final vs Portugal,
biggest upset = Japan beat Brazil in R32.

**Source paper:** Klement, J. (2026). FIFA World Cup 2026 Predictions.
Panmure Liberum Research, 9 April 2026.
Original framework: Hoffmann, Ging & Ramasamy (2002), Journal of Applied Economics 5(2).

---

## Tech Stack

```
Next.js (App Router)
TypeScript
Tailwind CSS (core utilities only)
Framer Motion         ← page transitions + section animations
next/image            ← photos (direction TBD, not yet implemented)
```

---

## Folder Structure

```
/app
  /page.tsx                    → redirect to /lookup
  /lookup/page.tsx             → Match Lookup (default landing)
  /teams/page.tsx              → Team Profile
  /mc/page.tsx                 → Monte Carlo Simulator
  /groups/page.tsx             → Group Stage
  /knockout/[round]/page.tsx   → r32 | r16 | qf | sf | final
  /about/page.tsx              → Model Explainer

/components
  /ui
    WDLBar.tsx                 → Win/Draw/Loss probability bar
    Tag.tsx                    → Pill label (blue / red / green / gray)
    Btn.tsx                    → Button (primary | green | default | ghost)
    SectionLabel.tsx           → Uppercase section header
    HeroBanner.tsx             → Landing hero (photo goes here when ready)
    PageTransition.tsx         → Framer Motion page wrapper
  /match
    MatchCard.tsx              → Knockout match card
    GroupMatchRow.tsx          → Inline group match row
    GroupCard.tsx              → Group standings + collapsible matches
  /team
    TeamHeroCard.tsx           → Flag, score, rank, FIFA pts
    FactorBreakdown.tsx        → 5-factor bar chart
    H2HList.tsx                → Head-to-head vs top opponents

/lib
  klement.ts                   → Pure model functions (sc, matchP, phi, simResult, simKO, calcStandings)
  teams.json                   → Static team data (see Data section below)
  fixtures.ts                  → GROUPS and ROUNDS constants

/types
  index.ts                     → TeamData, MatchResult, SimResult, GroupResult

/scripts
  fetch-rankings.js            → GitHub Actions script: fetches FIFA ranking → patches teams.json

/.github/workflows
  update-rankings.yml          → Weekly cron to update teams.json + revalidate
```

---

## Pure Model — `/lib/klement.ts`

All functions are pure (no side effects, no imports from outside lib). Copy exactly from the artifact.

```ts
// Weights
const W = { gdp: 0.20, pop: 0.15, temp: 0.15, fifa: 0.45, host: 0.05 }

// Factor functions — each returns value in [0, 1]
fG(gdp)          // inverted-U, peak at $35k, spread 35
fP(pop, latam)   // log-scale; multiplied by 0.3 if not LatAm
fT(temp)         // linear decay from optimal 14°C, range 22
fF(fifa)         // linear normalisation [1400, 2000]

// Team score
sc(name)         // weighted sum of 5 factors → S_i ∈ [0, 1]

// Match probability
matchP(nA, nB)   // returns { pA, pB, dr }
                 // P(A wins) = Φ((S_A − S_B) / 0.28) × (1 − draw)
                 // draw = clip(0.20 × (1 − 0.3 × |Δ|), 0.05, 0.24)

// Simulation
simResult(nA, nB)  // samples W/D/L from matchP probabilities → "A" | "D" | "B"
simKO(nA, nB)      // knockout only: resolves draw via penalty tiebreak (∝ sc)
                   // returns { winner, pen: boolean }

// Standings
calcStandings(teams, results)
  // W/D/L points table, sorted by pts then wins
  // called per group; input is the 6 simulated match results
```

---

## Data — `/lib/teams.json`

Static JSON, frozen at Klement's April 2026 values.
**Do not fetch this at runtime.** Import directly as a module.

```ts
// Shape of each entry
{
  "Belanda": {
    "gdp":   57,       // GDP per capita (USD thousands)
    "pop":   17.9,     // Population (millions)
    "temp":  10.5,     // Average annual temperature (°C)
    "fifa":  1770,     // FIFA ranking points (April 2026)
    "latam": false,    // LatAm population bonus applies
    "host":  false,    // Host nation bonus applies
    "flag":  "🇳🇱",
    "conf":  "UEFA"
  }
  // ...47 more teams
}
```

### Extraction from artifact

The `TD` object inside `worldcup2026.jsx` is the source.
Extract it verbatim to `/lib/teams.json`. Remove the JS variable wrapper, keep the object as valid JSON.

---

## FIFA Rankings Update — GitHub Actions + ISR

FIFA publishes updated rankings every Thursday.
The cron runs weekly, patches `teams.json`, and triggers Next.js ISR revalidation.

```yaml
# .github/workflows/update-rankings.yml
name: Update FIFA Rankings
on:
  schedule:
    - cron: '0 6 * * 4'     # Every Thursday 06:00 UTC
  workflow_dispatch:          # Allow manual trigger anytime

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Fetch latest FIFA rankings
        run: node scripts/fetch-rankings.js
        # Script reads current teams.json, patches fifa: values, writes back

      - name: Commit if changed
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add lib/teams.json
          git diff --staged --quiet || git commit -m "chore: update FIFA rankings $(date +%Y-%m-%d)"
          git push

      - name: Trigger Next.js on-demand revalidation
        run: |
          curl -X POST \
            "${{ secrets.NEXT_PUBLIC_APP_URL }}/api/revalidate?secret=${{ secrets.REVALIDATE_TOKEN }}"
```

```ts
// app/api/revalidate/route.ts
import { revalidatePath } from 'next/cache'

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url)
  if (searchParams.get('secret') !== process.env.REVALIDATE_TOKEN) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  revalidatePath('/', 'layout')
  return Response.json({ revalidated: true, at: new Date().toISOString() })
}

// Add to any page that reads teams.json:
export const revalidate = 604800   // 7 days ISR fallback
```

**Required secrets in GitHub repo settings:**
- `NEXT_PUBLIC_APP_URL` — production URL
- `REVALIDATE_TOKEN` — random secret string, also in `.env.local`

---

## Design System — Trionda Light

Inspired by the Adidas Trionda FIFA WC 2026 official ball:
white base, FIFA blue panel, red panel, green Trionda panel.

**Light mode only. No dark mode.**

### Color Tokens

```ts
// Define as CSS custom properties in globals.css
// or as a tokens object imported wherever needed

bgBase:        '#FFFFFF'   // page background
bgSurface:     '#F4F6F9'   // nav, card backgrounds, section fills
bgCard:        '#FFFFFF'   // elevated card surface
bgMuted:       '#EFF1F5'   // inputs, code blocks, progress track
border:        '#E2E6EC'   // default borders
borderMid:     '#C8CDD6'   // focused inputs, mid-emphasis borders
textPrimary:   '#0D1117'
textSecondary: '#4A5260'
textTertiary:  '#8892A0'

// Trionda accents — from ball panels
blue:          '#1A5FE8'   // FIFA blue → primary, Team A, links
blueLight:     '#4D87F5'
blueSoft:      '#EEF3FE'   // blue tinted card background
red:           '#E82418'   // ball red → danger, Team B
redLight:      '#FF5247'
redSoft:       '#FEF0EF'
green:         '#18A84A'   // Trionda green → success, winner, Klement pick
greenLight:    '#2EC468'
greenSoft:     '#EDFBF2'
```

### Typography

```
DM Serif Display  — all headings (h1–h3), large numbers, hero text
Inter             — body copy, labels, UI text, nav
```

Import in `app/layout.tsx`:
```ts
import { DM_Serif_Display, Inter } from 'next/font/google'

const dmSerif = DM_Serif_Display({ weight: ['400'], subsets: ['latin'], variable: '--font-serif' })
const inter   = Inter({ subsets: ['latin'], variable: '--font-sans' })
```

### Highlighted / Gradient Text

**Never use a flat color for highlighted text.** Always use a CSS gradient clip.

```css
/* globals.css */
.hl {
  background: linear-gradient(135deg, #1A5FE8, #4D87F5);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.hl-red {
  background: linear-gradient(135deg, #E82418, #FF5247);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.hl-green {
  background: linear-gradient(135deg, #18A84A, #2EC468);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
```

---

## Animations

### Section Fade-In

Apply to every major content block on a page.
Use staggered `animation-delay` for sequential reveal from top to bottom.

```css
/* globals.css */
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(14px); }
  to   { opacity: 1; transform: translateY(0); }
}

.fade-section  { animation: fadeUp .35s ease forwards; }
.fade-delay-1  { animation-delay: .06s; opacity: 0; }
.fade-delay-2  { animation-delay: .12s; opacity: 0; }
.fade-delay-3  { animation-delay: .18s; opacity: 0; }
```

Usage pattern in JSX (Claude Code: apply this to every page):
```tsx
<div className="fade-section">                {/* visible immediately */}
<h1 className="fade-section fade-delay-1">    {/* 60ms delay */}
<p  className="fade-section fade-delay-2">    {/* 120ms delay */}
<div className="fade-section fade-delay-3">   {/* 180ms delay */}
```

### Page Transitions — Framer Motion

Wrap every page's content (not layout) with `<PageTransition>`.

```tsx
// components/ui/PageTransition.tsx
'use client'
import { motion, AnimatePresence } from 'framer-motion'

export default function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  )
}
```

```tsx
// app/layout.tsx — enable exit animations
import { AnimatePresence } from 'framer-motion'

// Wrap {children} with AnimatePresence:
<AnimatePresence mode="wait">
  {children}
</AnimatePresence>
```

Every `page.tsx`:
```tsx
import PageTransition from '@/components/ui/PageTransition'

export default function SomePage() {
  return (
    <PageTransition>
      {/* page content */}
    </PageTransition>
  )
}
```

---

## Pages Reference

| Route | Page | Key behaviour |
|---|---|---|
| `/` | Landing Page | Marketing homepage — see Landing Page section below |
| `/lookup` | Match Lookup | `HeroBanner` + team selectors + W/D/L cards + factor breakdown |
| `/teams` | Team Profile | Dropdown select team → hero card, 5-factor bars, H2H vs top 6 |
| `/mc` | Monte Carlo | 100–5000 full tournament sims → sorted champion distribution |
| `/groups` | Group Stage | 12 groups, round-robin, W/D/L standings from simulated results |
| `/knockout/r32` | Round of 32 | 16 matches, Klement picks highlighted |
| `/knockout/r16` | Round of 16 | 8 matches |
| `/knockout/qf` | Quarter-Finals | 4 matches |
| `/knockout/sf` | Semi-Finals | 2 matches |
| `/knockout/final` | The Final | 1 match, gold border treatment |
| `/about` | Model Explainer | Formula, 5 factors, luck component, Klement's call, references |

---

## Photos

**Direction TBD. Not yet implemented.**

When the direction is confirmed:
- Use `next/image` with `fill` prop inside a `position: relative` wrapper
- Add to `HeroBanner.tsx` on `/lookup` only (do not add to other pages without instruction)
- Use `priority` prop — it is above the fold
- `alt` must describe the scene, never "hero image" or "decorative"
- Current placeholder: CSS conic-gradient ball graphic in `HeroBanner.tsx`

---

## Landing Page (Marketing) — `app/page.tsx`

Route `/` replaces the old redirect. This is the public-facing marketing homepage.
It must work for two audiences simultaneously:
- **Casual football fans** — hook with the narrative, Klement's track record, the Netherlands call
- **Data / analytics crowd** — surface the model logic early, show real numbers, don't hide the math

### Goal

Get visitors to click **"Predict a Match"** → `/lookup`. That is the only primary CTA.
No email capture, no waitlist, no secondary CTA on the hero.

### Sections (in order)

Implement each section as its own component under `/components/landing/`.
Every section gets `.fade-section` + staggered `.fade-delay-*` for scroll-triggered reveal.
Use Framer Motion `whileInView` for sections below the fold — not just on mount.

```
/components/landing/
  HeroSection.tsx         ← above the fold
  TrackRecordSection.tsx  ← social proof / credibility
  HowItWorksSection.tsx   ← model explainer, non-technical
  LivePreviewSection.tsx  ← interactive teaser
  KlementCallSection.tsx  ← his 2026 prediction
  FooterCTA.tsx           ← final push before footer
```

---

### Section 1 — Hero (`HeroSection.tsx`)

Above the fold. Must load instantly — no lazy loading here.

**Layout:** Two-column on desktop (text left, visual right), stacked on mobile.

**Headline (DM Serif Display, large):**
> Who wins the 2026 World Cup?

Subheadline (Inter, textSecondary):
> An econometric model that called 2014, 2018 and 2022 correctly — now running on all 48 teams.

**Visual (right column):**
- Photo placeholder for now (see Photos section)
- Until photo confirmed: animated ball graphic using CSS conic-gradient (already in HeroBanner.tsx — reuse)

**CTA button (primary blue, large):**
> Predict a Match →
Links to `/lookup`. No secondary CTA on the hero.

**Below CTA — trust bar (small, textTertiary):**
```
✓ 3 correct predictions   ✓ 48 teams   ✓ R²≈0.55   ✓ No score guessing
```

**Animations:**
```
headline      → fade-section (immediate)
subheadline   → fade-delay-1
CTA           → fade-delay-2
trust bar     → fade-delay-3
visual        → fade from right, fade-delay-1
```

---

### Section 2 — Track Record (`TrackRecordSection.tsx`)

**Goal:** Establish credibility before explaining the model.
Audience: both. Fans care about "got it right 3 times". Data crowd cares about methodology.

**Layout:** Section label + 3 stat cards in a row.

**Section label:** `KLEMENT'S TRACK RECORD`

**3 cards:**
```
2014          2018          2022
Germany 🇩🇪   France 🇫🇷    Argentina 🇦🇷
Predicted ✓   Predicted ✓   Predicted ✓
```
Each card: flag emoji large, year small, team name, green checkmark tag.

**Below cards — single line (textSecondary, italic, DM Serif):**
> *"I built this model to prove econometrics can't predict football. Then it did."*
> — Joachim Klement, Panmure Liberum

**Animations:** whileInView fadeUp, stagger per card.

---

### Section 3 — How It Works (`HowItWorksSection.tsx`)

**Goal:** Explain the 5-factor model without losing casual fans.
Keep it visual. No formulas on this page — that lives on `/about`.

**Layout:** Section label + 5 horizontal factor rows with icon, name, one-line plain-English description.

**Section label:** `HOW THE MODEL WORKS`

**Subheading (DM Serif):**
> Five factors. One number. One prediction.

**5 factors — plain English copy:**
```
💰  Wealth          Richer nations build better football infrastructure
👥  Population      More players only matters where football is the religion
🌡️  Climate         The best football nations share a climate — around 14°C
📊  FIFA Ranking    The most direct signal of current squad strength (45% weight)
🏟️  Home Advantage  Hosting helps — but less so when the tournament spans a continent
```

Each row: icon · bold label · description · thin progress bar showing relative weight.

**Bottom note (textTertiary, 11px):**
> Model explains 55% of variance between teams. The other 45% is luck — and it's built in.

**Animations:** whileInView, stagger per row, 0.08s between each.

---

### Section 4 — Live Preview (`LivePreviewSection.tsx`)

**Goal:** Let visitors interact before committing to navigating away.
Embed a minimal version of Match Lookup inline — two team dropdowns + W/D/L result only.
No factor breakdown here (that's on `/lookup`). Just enough to create the "oh this is fun" moment.

**Layout:** Contained card, max-width 560px, centered.

**Section label:** `TRY IT NOW`

**Heading (DM Serif):**
> Pick any two teams.

**Content:**
- Two `<select>` dropdowns (same team list as `/lookup`)
- W/D/L probability bar (reuse `WDLBar.tsx`)
- Three percentage cards (Win A / Draw / Win B)
- Small link below: `See full breakdown →` links to `/lookup`

**State:** `'use client'` component. Default teams: Netherlands vs Portugal (Klement's predicted final).

**Note for Claude Code:**
Do not duplicate model logic here. Import `matchP` and `sc` from `/lib/klement.ts`.
Do not import the full MatchLookupPage — build a thin wrapper around the shared primitives only.

**Animations:** whileInView fadeUp on the card. Dropdowns respond immediately on change (no animation needed on result update — keep it snappy).

---

### Section 5 — Klement's Call (`KlementCallSection.tsx`)

**Goal:** Reveal the headline prediction. Creates shareable moment.
Tone: slightly dramatic. This is the payoff section.

**Layout:** Full-width dark-surface card (bgSurface, not bgBase), centered content.

**Section label:** `THE 2026 PREDICTION`

**Heading (DM Serif, large):**
> The model says: Netherlands.

**Subtext:**
> For the first time in their history, the Netherlands are projected to lift the trophy.
> The model gives them a path through Morocco, Canada, France, and — in the final — Portugal.

**Upset callout (red soft card):**
> ⚡ Biggest upset: Japan defeat Brazil in the Round of 32 — one of the most shocking results in World Cup history, according to the model.

**Below — small disclaimer (textTertiary):**
> This is a probabilistic forecast, not a guarantee. With 45% randomness built in,
> every simulation can produce a different winner. Try the Monte Carlo simulator to see the full distribution.

**Link:** `Run 1,000 simulations →` → `/mc`

**Animations:** whileInView fadeUp. Upset callout fades in 200ms after heading.

---

### Section 6 — Footer CTA (`FooterCTA.tsx`)

Last thing before the site footer. One job: convert.

**Layout:** Centered, generous padding, no card border.

**Heading (DM Serif):**
> Ready to run your own prediction?

**Subtext:**
> Pick any matchup from all 48 teams. The model runs in your browser — no data sent anywhere.

**CTA button (primary, large):** `Predict a Match →` → `/lookup`

**Animations:** whileInView fadeUp.

---

### Scroll Animation Pattern (Framer Motion)

For all sections below the fold, use `whileInView` instead of mount-only `animate`:

```tsx
// Standard pattern for landing sections
import { motion } from 'framer-motion'

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } }
}

// Single element
<motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }}>

// Staggered children — wrap parent with staggerChildren
const stagger = {
  visible: { transition: { staggerChildren: 0.08 } }
}
<motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }}>
  <motion.div variants={fadeUp}>Item 1</motion.div>
  <motion.div variants={fadeUp}>Item 2</motion.div>
  <motion.div variants={fadeUp}>Item 3</motion.div>
</motion.div>
```

`viewport={{ once: true }}` — animate once on first scroll into view, never re-trigger.

---

### Nav Behaviour on Landing Page

The top nav is the same component as all other pages.
On `/`, the active state highlights nothing (no nav item is "Landing").
The logo `WC26 Klement` links back to `/`.

---

## Hard Rules

These must never be violated without an explicit instruction to change them:

1. **No score prediction in the model.** The model stays W/D/L only. A Poisson
   score-probability *display* was re-added on `/versus` at explicit request
   (`lib/score-distribution.ts`) — it's a derived view of the win probability, not a
   model change. Don't add score prediction to the model itself.
2. **No dark mode.** Light only. Do not add a theme toggle.
3. **`teams.json` is the single source of truth.** Never hardcode team values inline in components.
4. **Klement picks are hardcoded in `fixtures.ts`** (`k` field per match). They are his published predictions, not auto-generated from model scores.
5. **All model functions are pure.** No API calls inside `klement.ts`. No side effects.
6. **Simulation is client-side only.** Add `'use client'` to any component that calls `simResult` or `simKO`.
7. **Group standings come from simulated W/D/L results**, not sorted by model score. This was a bug in an earlier version — do not repeat it.