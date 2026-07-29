# Codebase Review — Chess Dashboard

**Date:** July 29, 2026
**Stack:** React 19.2 + Vite 8, TypeScript 5.9, Vercel functions over Neon Postgres
**Size:** ~30,500 lines across 205 TS/TSX files (`src/` + `api/`)

Supersedes the November 2025 review, whose critical findings (no TypeScript, no tests, no error boundary, no state layer) have since been resolved. This one is measured against the codebase as it stands today.

---

## Verified state

Everything below was checked, not assumed:

| Check | Command | Result |
| --- | --- | --- |
| Type safety | `npm run typecheck` | Clean, app **and** `api/` |
| Unit tests | `npm test` | 171 tests, 15 files, all passing (~3s) |
| TypeScript coverage | file count | 205 TS/TSX vs 7 JS — and the 7 are `setupTests.js`, 2 Storybook stories and 4 test files |
| E2E | `e2e/` | 3 Playwright specs, including axe-core accessibility scans |

---

## 1. Type safety — strong

The migration is done. `tsconfig.json` covers `src/`, a second config covers `api/`, and both pass `--noEmit` clean. Domain types live in `src/types/` (`chess`, `training`, `blunders`, `endgames`, `norms`) and are shared by the client, the API client and the serverless handlers, so a schema change surfaces at compile time on both sides of the wire.

The row→domain mappers in `api/_*Mapper.ts` are the seam where `snake_case` DB rows become camelCase domain objects, and they're typed on both ends.

**Remaining gap:** the mappers trust the shape of what Postgres returns. That's a reasonable trade for a single-user app with a fixed schema, but it means a hand-run migration that renames a column fails at runtime, not at build.

## 2. Testing — good foundations, uneven coverage

171 passing tests is a real suite, and the choice of *what* is tested is sound: the pure logic that would silently corrupt data is covered.

| Area | Files tested | Notes |
| --- | --- | --- |
| `src/utils/` | 9 of 24 | ELO math, PGN parsing, SRS queue selection, repertoire matching, puzzle grading, date handling — the load-bearing pure functions |
| `src/components/` | 3 | ErrorBoundary, Modal, ModalContext |
| `src/types/` | 1 | Training type guards |
| `api/` | 1 | Fathom extraction helpers (deliberately dependency-free so they're testable without a key) |
| `src/hooks/` | **0 of 23** | — |
| `src/engine/` | **0 of 4** | — |

**Priority gap:** the hooks and the engine miners. `useDailyQueue`, `useGameStats` and `mineBlunders`/`mineEndgames` decide what you train and are entirely untested — a regression there wouldn't crash anything, it would just quietly serve the wrong exercises. `mineEndgames` in particular (material counting, endgame classification) is pure and easy to test; there's no reason it isn't.

## 3. Architecture — good separation, one hot spot

The state layer landed: five contexts (`Games`, `UI`, `Theme`, `GameViewer`, `RepertoireLines`) replaced what used to be fifteen `useState` calls in one component. Data flows through a single typed `src/api/client.ts` rather than scattered `fetch` calls.

`ChessDashboard.tsx` is down from ~700 lines to 472, and the merges of Repertoire (4 sub-tabs) and Drills (2 sub-tabs) into hub components cut the sidebar without duplicating the data fetching.

**Hot spot — `OverviewTab` prop drilling.** It still receives ~20 props from `ChessDashboard.tsx`, including component references (`LichessSyncPanel`), icon components (`Swords`, `Target`, `TrendingUp`) and five separate PGN-import state setters. The contexts exist; this tab just predates them. Passing icons as props is the clearest smell — those are static imports pretending to be data.

**Component size.** Ten files exceed 400 lines:

| File | Lines |
| --- | --- |
| `ConceptsTab.tsx` | 775 |
| `PuzzleBoard.tsx` | 703 |
| `GameAnnotationTab.tsx` | 700 |
| `OpponentStrengthTab.tsx` | 608 |
| `OverviewTab.tsx` | 584 |
| `TodayQueue.tsx` | 563 |

`ConceptsTab` is the one to split: it's a CRUD screen for two unrelated resources (concepts and books) sharing one file. `PuzzleBoard` is large but cohesive — grading state machine plus board — and splitting it would spread one flow across files.

## 4. Accessibility — instrumented

`e2e/accessibility.spec.ts` runs axe-core against the app in CI, which is the part that actually prevents regressions. 38 component files carry `aria-*` attributes, modals manage focus, and the mobile nav overlay is `aria-hidden`.

**Gap:** axe catches static violations, not keyboard flow. The board interactions (drag-drop moves, the candidate-entry step in the drills) have no keyboard path that's been verified, and axe won't flag that.

## 5. Data & security — appropriate for one user, with the caveat written down

The honest part is already in the code: `api/_auth.ts` documents that `API_SECRET` ships in the client bundle and is a bot deterrent, not access control. That's the right call for a single-user app and it's better to have it stated than implied.

Real considerations:

1. **No input validation on API writes.** No zod/joi/yup anywhere. Handlers read `req.body` and pass fields to SQL. The queries are parameterised (Neon's tagged template), so this isn't an injection risk — but a malformed body can write nonsense rows that only surface later as a rendering bug.
2. **No rate limiting** on the Lichess sync or the explorer proxy. Lichess enforces its own, so the failure mode is a 429 you have to wait out.
3. **`/api/cron` depends on `CRON_SECRET` being set.** Without it the route is public and spends Anthropic tokens per hit. Documented in `.env.example`; worth verifying it's actually set in the Vercel project.
4. **26 `console.*` calls** in non-test source. Fine for a personal tool, noise in a shared one.

## 6. Configuration — code is ahead of the example file

`src/config/env.ts` is a clean typed accessor with defaults. But **`.env.example` is stale** and now actively misleading:

- Missing `DATABASE_URL` — the one variable without which nothing runs.
- Missing `VITE_API_SECRET` (the client half of the API key).
- Still advertises `VITE_API_URL`, `VITE_LICHESS_CLIENT_ID`, Sentry, PostHog and GA blocks that nothing reads.

The README now instructs `cp .env.example .env.local`, so this is the first thing a fresh clone hits. **Fix this first** — it's the cheapest item here and the only one that blocks setup.

---

## Priorities

**Now**
1. Sync `.env.example` with the variables the code actually reads.
2. Verify `CRON_SECRET` is set in the Vercel project.

**Next**
3. Test the engine miners (`mineBlunders`, `mineEndgames`) — pure functions, high consequence.
4. Test `useDailyQueue` and the SRS scheduling — same reasoning.
5. Move `OverviewTab` onto the contexts; stop passing icon components as props.

**Later**
6. Split `ConceptsTab` into concepts and books.
7. Validate API request bodies at the handler boundary.
8. Keyboard-accessible path through the drill flow.

---

## What's no longer true

For anyone comparing against the previous review: TypeScript coverage went 0 → 205 files, tests 1 → 171, and Error Boundaries, Context state management, environment configuration, CI and accessibility instrumentation all exist now. The `localStorage`-as-database architecture it described was replaced by Postgres. Its scoring table applies to a codebase that no longer exists.
