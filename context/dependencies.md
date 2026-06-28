# Dependencies

This file is informational. The project declares 4 direct runtime dependencies,
below the 5-dependency threshold that would make this file mandatory, but it is
maintained here for the choice rationale and to track the unused dependency.

## Runtime Dependencies

| Package | Version | Role |
|---|---|---|
| `next` | `16.2.6` | App Router framework, routing, ISR, image, font loading |
| `react` | `19.2.4` | UI runtime |
| `react-dom` | `19.2.4` | DOM renderer for React |
| `lucide-react` | `^1.17.0` | Icon set - declared but currently unused |

Key dev dependencies: `typescript` `^5`, `tailwindcss` `^4` with
`@tailwindcss/postcss` `^4`, `vitest` `^4.1.7`, `eslint` `^9` with
`eslint-config-next` `16.2.6`, and the `@types/*` packages.

## Choice Rationale

- `next` provides static generation, `generateStaticParams` for the knockout
  routes, the ISR revalidation webhook, and `next/font` for the pixel font -
  covering hosting needs with no separate server.
- `react` / `react-dom` are pinned exact to match the Next 16 / React 19
  pairing.
- Tailwind v4 is used token-first through the `@theme` block rather than a
  config file.
- The forecast model deliberately uses no math library; the normal CDF is a
  local `erf` approximation in `lib/klement.ts`, keeping the model
  dependency-free and trivially testable.

## Deprecated or Under Review

- `lucide-react` is declared in `package.json` but imported by no source file
  (verified by repository search). It is a candidate for removal; social icons
  in `Nav` use inline markup instead.

## Known Incompatibilities

None recorded. React and React DOM must stay on the same `19.2.4` version, and
`eslint-config-next` should track the `next` major version.
