# Orbit v2.2.0 — Interface refresh

## Run

```powershell
npm install
npm run build
npm run desktop
```

## Design rationale

The design direction is **Field Notes**: a compact, instrument-like workspace with graphite surfaces, semantic lime accents, thin dividers, near-square geometry, and restrained elevation. Accent color marks actionable or selected states; it is not used as ambient decoration. Density is intentionally higher in operational areas such as the Agent Task Runner and settings, while line length and spacing are preserved for AI answers and task reports.

## Main files changed

- `src/index.css` — design tokens, semantic theme variables, base typography, focus behavior, reduced-motion behavior.
- `src/App.css` — page layouts, reusable controls, settings, AI workspace, task runner, responsive rules.
- `src/App.tsx` — version-independent typographic command/file markers instead of emoji icons.
- `index.html` — product title and metadata.
- `package.json` — version `2.2.0`.

No business logic or API contracts were intentionally changed.
