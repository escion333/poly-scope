# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start the Vite dev server with HMR
- `npm run build` — type-check (`tsc -b`) then produce a production bundle
- `npm run lint` — run ESLint over the repo
- `npm run preview` — serve the built `dist/` locally

There is no test runner configured.

## What this app does

Poly Scope is a single-page, client-only React app (the `package.json` name is `polymarket-whale-radar`). A user pastes a Polymarket **event** URL or slug; the app fetches the event, pulls every holder position for each of its markets, and renders per-outcome holder-concentration analytics ("who really holds each side"). There is no backend — all data is fetched directly from Polymarket's public APIs in the browser.

## Architecture

The data flow is a strict pipeline driven from [src/App.tsx](src/App.tsx)'s `runAnalysis`:

`parseEventSlug` → `fetchEvent` → `analyzeEvent` → per-outcome `getConcentrationSummary` → render.

- **[src/lib/polymarket.ts](src/lib/polymarket.ts)** — all API access and data shaping. Owns the domain types (`GammaEvent`, `GammaMarket`, `OutcomeAnalysis`, `MarketAnalysis`, `RankedHolder`). Two upstream APIs (see [src/config.ts](src/config.ts)):
  - **Gamma API** (`/events/slug/:slug`) for event + market metadata.
  - **Data API** (`/v1/market-positions`) for holder positions, fetched per market keyed by `conditionId`, paginated by `offset` in `PAGE_SIZE` (500) steps up to `MAX_OFFSET` (10000). When the largest token group on a page is still full, it pages again; exceeding `MAX_OFFSET` sets `hitOffsetCeiling`, which the UI surfaces as a "Ceiling hit" warning (percentages are then over fetched holders only).
  - Positions come grouped by `token` (one token = one outcome side). `buildOutcomeAnalyses` joins these against the market's parallel arrays — `outcomes`, `outcomePrices`, `clobTokenIds` — which arrive as JSON-encoded strings and must go through `parseJsonArray`/`parseNumber`.
- **[src/lib/concentration.ts](src/lib/concentration.ts)** — pure math, no I/O. `getConcentrationSummary` takes holder sizes and computes top-holder share, top-5 share, HHI, Gini, and a `ConcentrationVerdict`. Verdict thresholds (`Thin side` < 10 holders, `Single-wallet dominated` ≥ 50% top holder, `Whale-heavy`, `Clustered`, `Spread out`) live in `getVerdict` and are the editing point for tuning what counts as concentrated.
- **[src/lib/format.ts](src/lib/format.ts)** — `Intl`-based number/currency/percent formatters and `shortWallet`. Use these rather than inlining formatting.
- **[src/App.tsx](src/App.tsx)** — the entire UI as one file of small presentational components plus a `LoadState` machine (`idle`/`loading`/`success`/`error`) and progress reporting threaded through `analyzeEvent`'s `onProgress` callback.

### Conventions worth knowing

- **Shares are size-weighted, not value-weighted.** Concentration math operates on holder `size` (token count); USD `value` is computed separately for display. Don't conflate `share`/`valueShare` or `sideValue`/`totalSize`.
- **CORS escape hatch:** direct browser fetches normally work. If they start failing on CORS, set `CONFIG.PROXY` in [src/config.ts](src/config.ts) to a proxy prefix — `fetchJSON` prepends it to every request URL.
- Error handling is centralized in `fetchJSON`, which maps 404/429/network failures to user-facing messages; surface new failures there rather than at call sites.
- Styling is Tailwind v4 (via `@tailwindcss/vite`) with utility classes inline in JSX; there is no component library.
- TypeScript runs strict-ish (`noUnusedLocals`/`noUnusedParameters`, `verbatimModuleSyntax`) — use `import type` for type-only imports.
