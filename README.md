# ♟️ Chess Dashboard

A personal chess analytics dashboard that turns your game history into actionable insights. Import games from **Lichess** or **PGN files**, track your **ELO progression**, study your **opening repertoire**, plan your **training**, and watch your improvement over time — all in one place.

Built with React 19, TailwindCSS, and Recharts. Your data stays in your browser (localStorage) — no backend, no accounts.

## ✨ Features

- **📊 Overview** — At-a-glance stats: win/draw/loss record, win rate, performance summary, and key highlights.
- **📈 Rating** — ELO progression chart over time with performance ratings and trend analysis.
- **🏆 Tournaments** — Per-tournament breakdowns and side-by-side comparisons of your results.
- **🎯 Opponent Strength Analyzer** — See how you perform against different ELO ranges to spot where you over- or under-perform.
- **⚔️ Games by Color** — Separate White and Black analytics, with sortable game lists for each.
- **📚 Repertoire** — Opening repertoire analysis (by ECO code) with recommendations on what to study next.
- **🔬 Analytics** — Deeper trends, monthly performance, time-of-day analysis, and opening statistics.
- **🗓️ Training Planner** — Weekly training calendar with quick templates, daily notes, and one-click **Google Calendar** export.
- **🎯 Goals** — Set a target ELO and date, and track projected progress toward your goal.
- **📝 Game Annotation** — Annotate and review individual games.
- **🥇 Achievements** — Unlockable milestones based on your play and progress.
- **🔥 Streaks** — Track winning streaks, playing streaks, and consistency over time.

### Data import

- **Lichess Sync** — Import rated games directly from Lichess.org by username. Filter by game type (Classical, Rapid, Blitz, Bullet, or all) and game count, with automatic deduplication and format conversion.
- **PGN Import** — Paste PGN text to bulk-import games from any source.

## 🛠️ Tech Stack

| Area | Tools |
| --- | --- |
| Framework | React 19 (Create React App) |
| Styling | TailwindCSS |
| Charts | Recharts |
| Icons | Heroicons + custom chess icons |
| State | React Context + custom hooks, persisted to `localStorage` |
| Component docs | Storybook 8 |
| Testing | React Testing Library (unit), Playwright + axe-core (E2E & accessibility) |
| Language | JavaScript / TypeScript |

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

```bash
git clone https://github.com/lucasfmujica/Chess-Dashboard.git
cd Chess-Dashboard
npm install
```

### Run the app

```bash
npm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Environment variables (optional)

Copy `.env.example` to `.env.local` and adjust as needed:

```bash
cp .env.example .env.local
```

Notable flags:

- `REACT_APP_ENABLE_LICHESS_SYNC` — toggle the Lichess import panel.
- `REACT_APP_STORAGE_PREFIX` — namespace for localStorage keys.

## 📦 Available Scripts

| Command | Description |
| --- | --- |
| `npm start` | Run the app in development mode |
| `npm run build` | Build the app for production into `build/` |
| `npm test` | Run unit tests in watch mode |
| `npm run test:e2e` | Run Playwright end-to-end tests |
| `npm run test:e2e:ui` | Run Playwright tests with the UI runner |
| `npm run storybook` | Launch Storybook on port 6006 |
| `npm run build-storybook` | Build static Storybook |

## 📁 Project Structure

```
src/
├── components/
│   ├── chess/
│   │   ├── tabs/          # Feature tabs (Overview, Rating, Tournaments, ...)
│   │   ├── training/      # Training planner UI
│   │   └── LichessSyncPanel.jsx
│   ├── charts/            # ELO progression, openings pie, map
│   ├── modals/            # Modal system + context
│   └── icons/             # Custom chess icons
├── context/               # GamesContext, UIContext
├── hooks/                 # useGameStats, useTrendsAndAnalytics, ...
├── utils/                 # lichessApi, pgnUtils, eloCalculations, ...
├── constants/             # ECO names, training activities, config
└── ChessDashboard.jsx     # Main layout & tab routing
```

## 🔒 Privacy

All your data lives in your browser via `localStorage`. Nothing is sent to a server — the only external call is to the public Lichess API when you choose to sync games.

## 📄 License

Personal project. All rights reserved.
