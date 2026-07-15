-- Chess dashboard core chess-data schema (Neon Postgres).
-- Applied once via scripts/init-db.mjs. No migration framework: this is the
-- single source of truth for the schema on this personal, single-user project.

-- Singleton row: the app's own player identity (previously a hardcoded constant).
CREATE TABLE IF NOT EXISTS profile (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  current_elo INTEGER NOT NULL,
  elo_change_last_tournament INTEGER,
  last_tournament TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Singleton row: repertoire ECOs by color.
CREATE TABLE IF NOT EXISTS repertoire (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  white_ecos TEXT[] NOT NULL DEFAULT '{}',
  black_ecos TEXT[] NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS opening_heroes (
  eco TEXT PRIMARY KEY,
  heroes TEXT[] NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lichess_game_id TEXT UNIQUE,
  source TEXT NOT NULL CHECK (source IN ('otb','lichess')) DEFAULT 'otb',
  color CHAR(1) NOT NULL CHECK (color IN ('W','B')),
  result CHAR(1) NOT NULL CHECK (result IN ('W','D','L')),
  elo INTEGER NOT NULL,
  opponent TEXT NOT NULL,
  opponent_elo INTEGER,
  eco TEXT,
  opening_name TEXT,
  tournament TEXT,
  rated BOOLEAN NOT NULL DEFAULT true,
  played_date DATE,
  played_time TEXT,
  speed TEXT,
  time_control TEXT,
  elo_change INTEGER,
  k_factor INTEGER,
  pgn TEXT,
  city TEXT,
  country TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS games_played_date_idx ON games (played_date);
CREATE INDEX IF NOT EXISTS games_source_idx ON games (source);

-- Stockfish eval cache, keyed by (pgn_hash, depth) — not by game id — so it
-- also covers ad-hoc PGN pasted into the Analysis Board that isn't tied to
-- any stored game row.
CREATE TABLE IF NOT EXISTS game_analyses (
  pgn_hash TEXT NOT NULL,
  depth INTEGER NOT NULL,
  evals INTEGER[] NOT NULL,
  moves JSONB NOT NULL,
  accuracy_white NUMERIC(5,2) NOT NULL,
  accuracy_black NUMERIC(5,2) NOT NULL,
  blunders INTEGER NOT NULL,
  mistakes INTEGER NOT NULL,
  inaccuracies INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (pgn_hash, depth)
);

CREATE TABLE IF NOT EXISTS annotated_games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_name TEXT,
  opponent TEXT,
  played_date TEXT,
  opening TEXT,
  eco TEXT,
  result TEXT,
  rating INTEGER,
  tags TEXT[] NOT NULL DEFAULT '{}',
  notes TEXT,
  key_moments JSONB NOT NULL DEFAULT '[]',
  pgn TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Manual tournament -> city-key overrides for the Geography tab (the
-- default tournament->city guess lives in code, constants/locations.ts).
CREATE TABLE IF NOT EXISTS tournament_locations (
  tournament TEXT PRIMARY KEY,
  city_key TEXT NOT NULL
);

-- Prepared opening lines for tournament study (plan/trap notes per line),
-- distinct from `repertoire` (just an ECO allow-list per color).
CREATE TABLE IF NOT EXISTS repertoire_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  color CHAR(1) NOT NULL CHECK (color IN ('W','B')),
  vs_move TEXT,
  eco TEXT,
  line_name TEXT,
  moves_san TEXT,
  key_fen TEXT,
  plan TEXT,
  golden_rule TEXT,
  priority INTEGER,
  confidence INTEGER CHECK (confidence BETWEEN 1 AND 5),
  lichess_url TEXT,
  last_reviewed TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Mined blunders/mistakes from the player's own games (bestMoveUci comes from
-- the Stockfish batch analysis already cached in game_analyses), drilled with
-- the same confidence-based SRS as repertoire_lines, plus solve-mode counters.
CREATE TABLE IF NOT EXISTS blunder_drills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  ply INTEGER NOT NULL,
  fen_before TEXT NOT NULL,
  played_san TEXT NOT NULL,
  best_move_uci TEXT NOT NULL,
  cp_loss INTEGER NOT NULL,
  eval_before INTEGER NOT NULL,
  eval_after INTEGER NOT NULL,
  confidence INTEGER CHECK (confidence BETWEEN 1 AND 5),
  last_reviewed TIMESTAMPTZ,
  review_count INTEGER NOT NULL DEFAULT 0,
  solved_count INTEGER NOT NULL DEFAULT 0,
  archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (game_id, ply)
);
CREATE INDEX IF NOT EXISTS blunder_drills_game_id_idx ON blunder_drills (game_id);

-- Rivals being scouted before a tournament round. Their actual games are
-- fetched live from Lichess client-side, not duplicated here.
CREATE TABLE IF NOT EXISTS scouting_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  lichess_username TEXT,
  tournament TEXT,
  notes TEXT,
  last_scouted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One drillable endgame snapshot per game: the first position where both
-- sides drop to endgame-level material. No Stockfish analysis required —
-- material_delta/endgame_type are a pure FEN heuristic computed at mining time.
CREATE TABLE IF NOT EXISTS endgame_drills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  ply INTEGER NOT NULL,
  fen TEXT NOT NULL,
  material_delta INTEGER NOT NULL,
  endgame_type TEXT NOT NULL CHECK (endgame_type IN ('pawn','rook','minor','queen','mixed')),
  confidence INTEGER CHECK (confidence BETWEEN 1 AND 5),
  last_reviewed TIMESTAMPTZ,
  review_count INTEGER NOT NULL DEFAULT 0,
  archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (game_id, ply)
);
CREATE INDEX IF NOT EXISTS endgame_drills_game_id_idx ON endgame_drills (game_id);

-- Tournament norm attempts, tracked against editable/approximate title
-- thresholds (real FIDE norm regulations are more intricate than a single
-- performance-rating cutoff — this is a rough personal tracker, not a
-- verifier, hence the thresholds live in a separate editable row).
CREATE TABLE IF NOT EXISTS norm_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament TEXT NOT NULL,
  title_target TEXT NOT NULL CHECK (title_target IN ('IM','GM','WIM','WGM')),
  games_count INTEGER,
  performance_rating INTEGER,
  titled_opponents INTEGER,
  foreign_opponents INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Singleton row: user-editable norm performance-rating thresholds per title.
-- Defaults are typical historical figures, not an authoritative current FIDE
-- source — surfaced in the UI as editable so the user can correct them.
CREATE TABLE IF NOT EXISTS norm_thresholds (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  im_performance INTEGER NOT NULL DEFAULT 2450,
  gm_performance INTEGER NOT NULL DEFAULT 2600,
  wim_performance INTEGER NOT NULL DEFAULT 2250,
  wgm_performance INTEGER NOT NULL DEFAULT 2400
);
