# ♟️ Chess Dashboard

A personal chess performance and training system for classical OTB play. It imports your games (Lichess, PGN, manual entry, tournament crosstables), analyses them with a local Stockfish, mines your own mistakes into drills, and turns all of it into a daily training queue that answers one question: *what do I work on today?*

Single-user by design. Games and training data live in a Postgres database (Neon), served through Vercel serverless functions; the chess engine runs entirely in your browser.

## ✨ What's in it

The sidebar is grouped into four sections.

### Play & Review

- **Overview** — Record, win rate, form, ELO trend, upcoming tournaments, and a "today" strip with the day's training block and any overdue coach homework. Also the place where you import games (Lichess sync, PGN paste, manual entry).
- **Analysis Board** — Full-page board running Stockfish 18 (WASM) locally: eval bar, MultiPV engine lines, eval graph over the whole game, move-by-move accuracy. Analyse a pasted PGN or any imported game; results are cached in the database so a game is only analysed once.
- **Game Library** — Every game with filters, replay, annotations and personal notes.

### Analytics

- **ELO Progress** — Rating curve over time with tournament performance ratings.
- **Performance** — How you score against each opponent-strength bracket, by time of day, and tournament-vs-tournament comparisons.
- **By Color** — Separate White and Black analytics with sortable game lists.
- **Records** — Bests, worsts and personal milestones.
- **Streaks** — Winning, unbeaten and playing streaks, plus monthly consistency.

### Study & Prep

- **Repertoire** — Four views over one shared set of lines:
  - *Mapa* — repertoire coverage by ECO code, with what to study next.
  - *Líneas* — your actual lines, matched against the games you played, so gaps and deviations are visible.
  - *Entrenar* — flashcard drilling of the lines with spaced repetition.
  - *Estudio* — a PGN study reader (chapters, variations, comments).
- **Drills** — Positions from your own games, graded like puzzles:
  - *Cálculo* — the coached exercise: sit on a blunder position from one of your games, write your candidate moves down *before* revealing the answer, then get graded on whether the right move was even a candidate.
  - *Finales* — endgames mined out of your games, played out against the engine rather than just guessed.
- **Concepts & Books** — Concepts to internalise and the books/courses they come from, with an active-item limit so the list stays a working set instead of a wishlist.
- **Opponent Prep** — Scouting targets: an opponent's openings and tendencies, plus a Lichess masters-explorer board for the resulting positions.
- **Tournaments** — Per-event breakdowns, performance ratings, crosstable import, and upcoming events.
- **Geography** — Map of where you've played, with per-city results.

### Progress

- **Goals** — Target ELO and date, projected trajectory, achievements and next milestones.
- **Norm Tracker** — IM/GM/WIM/WGM norm attempts against configurable thresholds.
- **Training Plan** — The training loop itself:
  - *Hoy* — the day's queue (blunders, endgames, repertoire) with quotas from the weekly program. Candidates must be written before the answer unlocks.
  - *Semana* — the weekly program, plan vs. what actually happened.
  - *Tareas* — homework assigned by the coaches, imported automatically (see below).
  - *Registro* — the diagnostic view, headlined by the candidate-miss split: "never occurred to me" vs. "saw it and rejected it" — the number that decides whether to train breadth or depth.

### Data import

- **Lichess sync** — Pull rated games by username, filtered by time control and count, deduplicated server-side by Lichess game id. A one-click *"ponerse al día"* resumes from the last game you already have.
- **PGN import** — Paste PGN from any source; games are matched to you by player name.
- **Manual entry** — For games with no PGN at all (team rapid, unrecorded events).
- **Coach homework** — A weekly Vercel cron reads the chess-lesson transcripts from Fathom and uses Claude to extract the assignments. The coaches assign verbally, with no commitment language, so nothing else catches them — this does.

## 🛠️ Tech stack

| Area | Tools |
| --- | --- |
| Framework | React 19 + Vite 8, TypeScript |
| Styling | TailwindCSS with a token-based design system (`src/components/ui/`) |
| Charts | Recharts, d3-geo + world-atlas for the map |
| Chess | chess.js, react-chessboard, `@mliebelt/pgn-parser` |
| Engine | Stockfish 18 Lite (WASM), multi-threaded when the page is cross-origin isolated, single-threaded fallback otherwise |
| Backend | Vercel serverless functions (`api/`) over Neon serverless Postgres |
| AI | Anthropic SDK (`claude`) for the weekly homework extraction |
| State | React Context + custom hooks; `localStorage` only for UI preferences and caches |
| Component docs | Storybook 8 |
| Testing | Vitest + Testing Library (unit), Playwright + axe-core (E2E & a11y) |

## 🚀 Getting started

### Prerequisites

- Node.js 20+ and npm
- A Postgres database (the project uses [Neon](https://neon.tech))

### Install

```bash
git clone https://github.com/lucasfmujica/Chess-Dashboard.git
cd Chess-Dashboard
npm install          # postinstall copies the Stockfish WASM build into public/engine
```

### Configure

```bash
cp .env.example .env.local
```

Then set at least `DATABASE_URL`. Server-only variables (no `VITE_` prefix) never reach the browser bundle:

| Variable | Scope | What it does |
| --- | --- | --- |
| `DATABASE_URL` | server | Neon connection string. Required. |
| `API_SECRET` / `VITE_API_SECRET` | server / client | Shared key sent on write requests. A bot deterrent, **not** access control — the client half ships in the bundle. |
| `LICHESS_TOKEN` | server | Lichess OAuth token for the masters opening explorer (any scope; anonymous access is no longer allowed). |
| `CRON_SECRET` | server | Verifies Vercel's scheduled invocation of `/api/cron`. Without it the route is public and spends Anthropic tokens on every hit. |
| `FATHOM_API_KEY` | server | Fathom REST key for reading lesson transcripts. |
| `ANTHROPIC_API_KEY` | server | Used by the homework-extraction call. |
| `VITE_ENABLE_LICHESS_SYNC` | client | Toggles the Lichess import panel. |
| `VITE_STORAGE_PREFIX` | client | Namespace for `localStorage` keys. |

### Create the schema

```bash
node --env-file=.env.local scripts/init-db.mjs
```

### Run it

The app needs two processes: Vite for the frontend, and a local stand-in for Vercel's function runtime for `/api/*`.

```bash
npm run dev       # http://localhost:3000
npm run dev:api   # http://localhost:3001, proxied from /api
```

Vite serves with `Cross-Origin-Opener-Policy` / `Cross-Origin-Embedder-Policy` headers so the multi-threaded Stockfish build can use `SharedArrayBuffer`; the same headers are set in `vercel.json` for production.

## 📦 Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Frontend dev server on port 3000 |
| `npm run dev:api` | Local API server on port 3001 |
| `npm run build` | Production build into `build/` |
| `npm run preview` | Serve the production build locally |
| `npm run typecheck` | TypeScript check for both the app and `api/` |
| `npm test` | Unit tests (Vitest, single run) |
| `npm run test:watch` | Unit tests in watch mode |
| `npm run test:e2e` | Playwright end-to-end + accessibility tests |
| `npm run test:e2e:ui` | Playwright UI runner |
| `npm run storybook` | Storybook on port 6006 |

One-off maintenance scripts (all take `node --env-file=.env.local`):

| Script | Purpose |
| --- | --- |
| `scripts/init-db.mjs` | Apply `db/schema.sql` |
| `scripts/seed-team-tournaments.mjs` | Load the team rapid events that have no PGN (idempotent) |
| `scripts/backfill-game-metadata.mts` | Derive `played_date` / `opening_name` for older rows |
| `scripts/gen-openings.mjs` | Regenerate the openings book from the Lichess dataset (needs network) |

## 📁 Project structure

```
api/                    # Vercel serverless functions
├── games.ts            #   games, plus profile / repertoire / repertoire-lines /
│   …                   #   analyses / annotations / opening-heroes / tournament-locations
├── prep.ts             #   drills, opponent prep, norms, training log, concepts — all
│                       #   multiplexed on ?resource=; one function each would blow
│                       #   the Hobby-plan function limit
├── explorer.ts         #   Lichess masters explorer proxy (keeps the token server-side)
├── cron.ts             #   weekly Fathom → Claude homework import
├── migrate.ts          #   one-time localStorage → Postgres migration
└── _*.ts               #   row→domain mappers and shared handlers (not routes)

db/schema.sql           # Full schema: games, analyses, repertoire lines, drills,
                        # tournaments, training sessions, concepts, homework, norms…

src/
├── components/
│   ├── chess/          # Boards, engine UI, tabs/ (one per sidebar entry), study/
│   ├── charts/         # ELO progression, eval graph, openings, geo map
│   ├── ui/             # Design-system primitives (Card, Button, Badge, Table…)
│   └── modals/         # Promise-based modal system
├── engine/             # Stockfish wrapper, game analysis, blunder & endgame mining
├── context/            # Games, UI, Theme, GameViewer, RepertoireLines
├── hooks/              # useGameStats, useDailyQueue, useLocalEngine, useNormTracker…
├── utils/              # PGN, ELO math, SRS, queue selection, repertoire matching
├── constants/          # ECO names, weekly training program, city directory
└── ChessDashboard.tsx  # Layout, sidebar sections and tab routing

e2e/                    # Playwright specs (app, modals, accessibility)
scripts/                # DB init, seeds, backfills, engine copy
```

## 🔒 Data & privacy

This is a single-user app with no accounts and no per-user authentication. Your games and training data live in your own Neon database; the API key on write endpoints is a deterrent against casual bots, not real access control. Outbound calls go to Lichess (game sync, opening explorer), and — only if you configure the cron — to Fathom and the Anthropic API. Stockfish runs locally in the browser; no position is ever sent anywhere for analysis.

## 📄 License

Personal project. All rights reserved.
