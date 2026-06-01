# CLAUDE.md — WC26 Klement (8-Bit UI Redesign)

> **IMPORTANT:** This file extends and partially overrides the existing CLAUDE.md.
> Rules marked `[KEEP]` are unchanged from the original. Rules marked `[OVERRIDE]` replace the original. Rules marked `[NEW]` are additions.

---

## What This Project Is [KEEP]

A Next.js web app that surfaces Joachim Klement's econometric World Cup forecast
(Panmure Liberum, April 2026) as an interactive match predictor.

**Model output: W/D/L probability only. No score prediction.**
**Klement's 2026 prediction:** Netherlands win (first ever), final vs Portugal,
biggest upset = Japan beat Brazil in R32.

---

## Active Task [NEW]

**Redesign the entire UI to a retro 8-bit pixel art aesthetic.**

The reference design was prototyped as a single-file HTML widget. All 6 pages
(Home, Lookup, Teams, Monte Carlo, Groups, Knockout/Bracket) must be
reimplemented in the existing Next.js + Tailwind v4 stack using this new design
system. Model logic (`lib/klement.ts`) and data (`lib/teams.json`) are
**untouched** — only the visual layer changes.

---

## Design System — 8-Bit Retro [OVERRIDE replaces "Trionda Light"]

### Philosophy

The UI must feel like a retro arcade game or NES-era sports title — but
rendered cleanly on a white background. Every design decision should reinforce
this aesthetic. When in doubt, ask: "Would this look at home on a Game Boy?"

### Color Palette

Three accent colors only. No additional colors. No gradients. No opacity tricks.

```css
/* globals.css — add to @theme {} block */
--color-r:       #A32D2D;   /* Red — hero titles, CTA buttons, Team A bars */
--color-r-bg:    #FCEBEB;   /* Red tint — button hover fill, tag backgrounds */
--color-r-sh:    #F7C1C1;   /* Red shadow — pixel shadow offset */

--color-g:       #3B6D11;   /* Green — primary text color, active nav, winner */
--color-g-mid:   #639922;   /* Green mid — bar fills, marching animation */
--color-g-bg:    #EAF3DE;   /* Green tint — prediction banner background */
--color-g-sh:    #C0DD97;   /* Green shadow — pixel shadow offset */

--color-b:       #185FA5;   /* Blue — section titles, outline buttons, Team B bars */
--color-b-bg:    #E6F1FB;   /* Blue tint — active nav, factor card accents */
--color-b-sh:    #B5D4F4;   /* Blue shadow — pixel shadow offset */

/* Base */
--color-bg:      #FFFFFF;   /* Page background — white only */
--color-surf:    #F5F5F0;   /* Surface — stats bar, nav bg, footer */
--color-brd:     #D0D0C8;   /* Border default */
--color-brd2:    #B0B0A8;   /* Border emphasis */
--color-txt:     #1A1A1A;   /* Primary text */
--color-muted:   #888880;   /* Secondary text */
```

### Typography

**One font only: `Press Start 2P` (Google Fonts).** No other fonts.

```tsx
// app/layout.tsx
import { Press_Start_2P } from 'next/font/google'

const pixelFont = Press_Start_2P({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-pixel',
})
```

```css
/* globals.css */
body {
  font-family: var(--font-pixel), monospace;
  font-size: 10px;
  line-height: 1.8;
  background: var(--color-bg);
  color: var(--color-txt);
}
```

**Font size scale:**

| Token      | Size  | Usage                               |
|------------|-------|-------------------------------------|
| `text-2xl` | 18px  | Hero title                          |
| `text-xl`  | 14px  | Prediction winner name, section H2  |
| `text-base`| 10px  | Body default                        |
| `text-sm`  | 8px   | Buttons, nav links, labels          |
| `text-xs`  | 7px   | Factor names, team names, data      |
| `text-2xs` | 6px   | Captions, badges, timestamps        |
| `text-3xs` | 5px   | Fine print, kbd hints               |

Add custom sizes to `tailwind.config.ts` if not present:
```ts
fontSize: { '2xs': '6px', '3xs': '5px' }
```

### Pixel Border Utility [NEW]

The signature visual element. Replaces `rounded-*` and `shadow-*` everywhere.

```css
/* globals.css */

/* Standard pixel border — green */
.px-border {
  border: 2px solid var(--color-g);
  box-shadow: 0 0 0 2px var(--color-bg), 0 0 0 4px var(--color-g);
}

/* Red variant */
.px-border-r {
  border: 2px solid var(--color-r);
  box-shadow: 0 0 0 2px var(--color-bg), 0 0 0 4px var(--color-r);
}

/* Blue variant */
.px-border-b {
  border: 2px solid var(--color-b);
  box-shadow: 0 0 0 2px var(--color-bg), 0 0 0 4px var(--color-b);
}

/* Pixel offset shadow (for cards, buttons) — direction: bottom-right */
.px-shadow   { box-shadow: 4px 4px 0 var(--color-brd); }
.px-shadow-r { box-shadow: 4px 4px 0 var(--color-r-sh); }
.px-shadow-g { box-shadow: 4px 4px 0 var(--color-g-sh); }
.px-shadow-b { box-shadow: 4px 4px 0 var(--color-b-sh); }

/* Active/pressed state */
.px-btn:active {
  transform: translate(2px, 2px);
  box-shadow: 2px 2px 0 var(--color-brd);
}
```

**Rule:** `border-radius` is **never used** anywhere in the UI. All corners are sharp (0px).
This is the most important rule for maintaining the 8-bit aesthetic.

### Dot Grid Background [NEW]

Use on hero sections and prediction banners.

```css
.dot-grid {
  background-image: radial-gradient(circle, var(--color-brd) 1px, transparent 1px);
  background-size: 16px 16px;
  opacity: 0.5;
}
```

Apply as an absolutely-positioned overlay div, `pointer-events: none`.

### Pixel Text Shadow [NEW]

Use on large display text (hero title, prediction name).

```css
.txt-shadow-r { text-shadow: 3px 3px 0 var(--color-r-sh); }
.txt-shadow-g { text-shadow: 3px 3px 0 var(--color-g-sh); }
.txt-shadow-b { text-shadow: 3px 3px 0 var(--color-b-sh); }
```

---

## Animations [OVERRIDE — replaces Framer Motion]

**Do not use Framer Motion.** All animations are pure CSS.
Remove `PageTransition.tsx` and all `AnimatePresence` usage.
Remove Framer Motion from `package.json`.

### Blink Cursor [NEW]

```css
@keyframes blink {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0; }
}
.blink { animation: blink 1s step-end infinite; }
```

Append `<span className="blink">_</span>` after the predicted champion's name.

### Marching Ants [NEW]

Animated dashed line below WDL result bars.

```css
@keyframes march {
  to { background-position: 8px 0; }
}
.marching {
  background: repeating-linear-gradient(
    90deg,
    var(--color-g-mid) 0,
    var(--color-g-mid) 4px,
    transparent 4px,
    transparent 8px
  );
  background-size: 8px 2px;
  height: 2px;
  animation: march 0.4s linear infinite;
  margin-top: 10px;
}
```

### Pixel Button Press [NEW]

```css
.px-btn {
  transition: transform 0.05s, box-shadow 0.05s;
  cursor: pointer;
}
.px-btn:hover  { transform: translate(2px, 2px); }
.px-btn:active { transform: translate(4px, 4px); }
```

### Section Fade-In [KEEP — CSS only]

```css
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}
.fade-in { animation: fadeUp 0.3s ease forwards; }
.delay-1 { animation-delay: 0.06s; opacity: 0; }
.delay-2 { animation-delay: 0.12s; opacity: 0; }
.delay-3 { animation-delay: 0.18s; opacity: 0; }
```

---

## Component Patterns [NEW]

### Nav (`Nav.tsx`)

```
[WC26▶K1] | LOOKUP | TEAMS | MONTE | GROUPS | BRACKET | ABOUT
```

- Logo: `color-r` text on `color-r-bg` bg, `▶` glyph in `color-b`
- Nav links: `text-3xs`, `color-muted` default, hover = `color-surf` bg
- Active link: `color-b-bg` background, `color-b` text
- `border-bottom: 2px solid var(--color-brd2)` on the nav bar
- No rounded corners. No underlines. No icons.

### Section Title

```css
.section-title {
  font-size: 8px;
  color: var(--color-b);
  letter-spacing: 2px;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  text-transform: uppercase;
}
.section-title::before {
  content: '►';
  color: var(--color-r);
}
```

### WDLBar (`WDLBar.tsx`) [OVERRIDE]

- Three flex segments: red (`color-r`) / surface (`color-surf`) / blue (`color-b`)
- `flex` value = probability integer (e.g. `style={{ flex: pA }}`)
- `transition: flex 0.3s` for animated updates
- `border: 2px solid var(--color-brd2)` + `box-shadow: 3px 3px 0 var(--color-brd)`
- Labels row below: left=red `{nameA} {pA}%`, center=muted `DRAW {pD}%`, right=blue `{nameB} {pB}%`
- Marching ants div below labels

### Pixel Button (`Btn.tsx`) [OVERRIDE]

Four variants: `red`, `blue`, `green`, `outline-blue`.

- Font: `var(--font-pixel), monospace`, `font-size: 8px`
- Padding: `10px 16px`
- No border-radius
- Each variant has a matching `px-shadow-*` color
- Hover + active use `.px-btn` transitions

### PixelBar (`PixelBar.tsx`) [NEW]

```tsx
// components/ui/PixelBar.tsx
// height: 12px, border: 1px solid color-brd2, bg: color-surf
// fill div with stripe overlay (repeating-linear-gradient for texture)
// accepts: value (0-100), color (CSS variable string)
```

Used in: FactorBreakdown, Model Variables section, Monte Carlo results.

### Klement Pick Badge [NEW]

```tsx
<span style={{
  fontSize: 5,
  color: 'var(--color-g)',
  background: 'var(--color-g-bg)',
  padding: '2px 4px',
  border: '1px solid var(--color-g-sh)',
}}>K✓</span>
```

---

## Page-Level Notes [NEW]

### Home / Landing (`app/page.tsx`)

Sections in order (each separated by `border-bottom: 2px solid var(--color-brd)`):

1. **Hero** — dot grid bg, eyebrow tag, 18px red title + green `<span>`, muted subtext, red CTA + outline-blue button
2. **Stats Bar** — 3-column grid on `color-surf`: `3 / CORRECT CALLS` (red), `48 / QUALIFIED TEAMS` (green), `0.55 / MODEL R²` (blue)
3. **Track Record** — 3 record cards grid
4. **Prediction Banner** — green bg, dot grid, blink cursor
5. **Model Variables** — 5 PixelBar rows

Remove the original marketing landing sections (`HeroSection`, `TrackRecordSection`, etc.) entirely.

### Lookup (`app/lookup/page.tsx`)

- Two `<select>` elements: `font-family: var(--font-pixel)`, `border: 2px solid var(--color-brd2)`, `box-shadow: 3px 3px 0 var(--color-brd)`, no border-radius
- `WDLBar` below
- Factor grid: two cards, left team `border-left: 3px solid var(--color-r)`, right team `border-left: 3px solid var(--color-b)`

### Teams (`app/teams/page.tsx`)

- Team selector → 3 score cards in a row
- `FactorBreakdown` with `PixelBar`
- H2H list: `grid(1fr 2fr 1fr)` per row — mini WDL bar in center column

### Monte Carlo (`app/mc/page.tsx`)

- Green "RUN SIMULATIONS" button
- Button text → `⏳ RUNNING...` while simulating
- Results: rank + team + `PixelBar` + `%` per row
- Footer note: `"N SIMULATIONS COMPLETE. 45% VARIANCE IS UNMODELLED NOISE."`

### Groups (`app/groups/page.tsx`)

- 2-column grid of group cards
- Card header: `color-b-bg` background, group letter in `color-b`
- Qualified teams: 6×6px `color-g` square dot before flag
- Points bold + `color-r` for qualified rows

### Knockout (`app/knockout/[round]/page.tsx`)

- Sub-nav tabs: `R32 | R16 | QF | SF | FINAL`
- Active tab: `color-r-bg` bg, `color-r` text
- Match card: `grid(1fr 2fr 1fr)` — left team | WDL bar | right team
- Klement pick team shows `K✓` badge
- Final match: wrap in `px-border-g`

---

## What NOT to Change [NEW]

These files must remain completely untouched:

- `lib/klement.ts`
- `lib/teams.json`
- `lib/fixtures.ts`
- `types/index.ts`
- `scripts/fetch-rankings.js`
- `.github/workflows/update-rankings.yml`
- `app/api/revalidate/route.ts`

---

## Hard Rules [KEEP + additions]

1. **No score prediction.** [KEEP]
2. **No dark mode.** [KEEP]
3. **`teams.json` is the single source of truth.** [KEEP]
4. **Klement picks are hardcoded in `fixtures.ts`.** [KEEP]
5. **All model functions are pure.** [KEEP]
6. **Simulation is client-side only.** [KEEP]
7. **Group standings come from simulated W/D/L.** [KEEP]
8. **No `border-radius` anywhere.** All corners 0px. [NEW]
9. **No gradients.** Flat colors only — remove all gradient clip text. [NEW]
10. **No Framer Motion.** Remove the dependency. CSS keyframes only. [NEW]
11. **No `backdrop-filter` or glass effects.** [NEW]
12. **Press Start 2P is the only font.** Remove all other font imports. [NEW]
13. **No `box-shadow` with blur radius.** Hard-offset pixel shadows only (`0 blur`). [NEW]

---

## Attribution [KEEP]

- **Klement, J. (2026).** *FIFA World Cup 2026 Predictions.* Panmure Liberum Research, 9 April 2026.
- **Hoffmann, R., Ging, L.C. & Ramasamy, B. (2002).** Journal of Applied Economics, 5(2), 253–272.
- 8-bit design system: retro pixel art aesthetic, white background, RGB accent palette.

Independent fan tool. Not affiliated with Panmure Liberum, FIFA, or Adidas.