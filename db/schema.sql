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

-- One row per training block actually performed. The *plan* (which block on
-- which weekday) is static config in src/constants/trainingProgram.ts — only
-- what really happened is persisted, so plan-vs-actual is a join against this.
CREATE TABLE IF NOT EXISTS training_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  block TEXT NOT NULL CHECK (block IN (
    'calculation','endgame','repertoire','play','analysis','concept','lesson','tactics'
  )),
  minutes INTEGER NOT NULL DEFAULT 0,
  -- Free text: 'daily-queue', 'Aagaard Positional Play ch.3', 'clase Toto', ...
  source TEXT,
  attempted INTEGER NOT NULL DEFAULT 0,
  solved INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS training_sessions_date_idx ON training_sessions (session_date);

-- One row per exercise attempted inside a session. This is the diagnostic
-- table: the aggregate counters on blunder_drills/endgame_drills say *how
-- often* you drilled, this says *why you failed*.
--
-- candidate_miss semantics (only meaningful when correct = false), fixed:
--   true  = the right move NEVER appeared in my candidate list -> candidate-sweep failure
--   false = it WAS on my list and I rejected it                -> calculation/evaluation failure
-- Without that convention held constant the column is uninterpretable.
CREATE TABLE IF NOT EXISTS training_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES training_sessions(id) ON DELETE CASCADE,
  item_kind TEXT NOT NULL CHECK (item_kind IN ('blunder','endgame','repertoire','external')),
  -- NULL for 'external' (a book/puzzle exercise with no row in this database).
  item_id UUID,
  correct BOOLEAN NOT NULL,
  candidate_miss BOOLEAN,
  -- The candidate moves written down before playing, per the Studer method.
  candidates_written TEXT,
  seconds INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Time spent calculating BEFORE the answer was revealed, split out from
-- `seconds`.
--
-- `seconds` alone could not express this: the clock was restarted when the
-- board became playable, so it measured how long the move took to enter and
-- discarded the 5-10 minutes of calculation that the method is actually about.
-- Keeping both means `seconds` stays the total time on the exercise and
-- `think_seconds` is the number worth training against.
ALTER TABLE training_attempts ADD COLUMN IF NOT EXISTS think_seconds INTEGER;
CREATE INDEX IF NOT EXISTS training_attempts_session_id_idx ON training_attempts (session_id);

-- The chess library. `status` describes a book's ROLE IN THE TRAINING PLAN,
-- not reading progress:
--   activo     = used by a weekly block. Capped at 3 by the "nothing new
--                until something finishes" rule.
--   referencia = consulted for a specific question, never read cover to cover.
--   archivado  = not to be opened at all.
-- progress_done/progress_total hold Chessable-style counts (215/516) because
-- that rule needs a completion percentage to be computable at all.
CREATE TABLE IF NOT EXISTS books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  author TEXT,
  category TEXT,
  level TEXT,
  status TEXT NOT NULL DEFAULT 'archivado',
  source TEXT,
  block TEXT,
  progress_done INTEGER,
  progress_total INTEGER,
  current_chapter TEXT,
  priority INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Columns and constraint applied separately so an already-created books table
-- picks them up. DROP-then-ADD keeps the constraint swap re-runnable, which a
-- bare ADD CONSTRAINT would not be.
ALTER TABLE books ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE books ADD COLUMN IF NOT EXISTS block TEXT;
ALTER TABLE books ADD COLUMN IF NOT EXISTS progress_done INTEGER;
ALTER TABLE books ADD COLUMN IF NOT EXISTS progress_total INTEGER;
ALTER TABLE books ALTER COLUMN status SET DEFAULT 'archivado';
ALTER TABLE books DROP CONSTRAINT IF EXISTS books_status_check;
ALTER TABLE books ADD CONSTRAINT books_status_check
  CHECK (status IN ('activo','referencia','archivado'));

-- Homework assigned in a coaching session.
--
-- Exists because the assignments were being lost: coaches give them verbally
-- ("bien, esa es la tarea para el hogar") with no commitment language, so
-- meeting-notes tooling extracts nothing and the task survives only in
-- memory. recording_id is kept so an importer can dedupe against the source.
--
-- 'vencido' is in the enum for an importer to set, but the UI DERIVES overdue
-- from (due_date < today AND status = 'pendiente') so the count stays correct
-- with no scheduled job running.
CREATE TABLE IF NOT EXISTS homework (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assigned_date DATE NOT NULL,
  coach TEXT NOT NULL,
  recording_id BIGINT,
  task TEXT NOT NULL,
  kind TEXT CHECK (kind IN ('final','calculo','repertorio','concepto','lectura','partida')),
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente','hecho','vencido')),
  source_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS homework_status_idx ON homework (status, due_date);
-- Dedupe key for an automated importer. Manual rows leave recording_id NULL,
-- and Postgres treats NULLs as distinct, so they are never blocked by this.
--
-- Indexed on md5(task) rather than task itself: a btree entry is capped at
-- ~2704 bytes, and an extractor that writes a paragraph-long assignment would
-- otherwise fail the insert outright. The hash is fixed-width, so it can't.
CREATE UNIQUE INDEX IF NOT EXISTS homework_recording_task_idx
  ON homework (recording_id, md5(task));

-- Inventory of studied concepts, each tied back to the player's own games.
-- game_ids is an array rather than a join table, matching the style already
-- used by repertoire.white_ecos / opening_heroes.heroes on this single-user
-- project. confidence/last_reviewed let concepts ride the same SRS helpers
-- (src/utils/srs.ts) as drills and repertoire lines, with no new logic.
CREATE TABLE IF NOT EXISTS concepts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'opening','middlegame','endgame','calculation','strategy','mindset'
  )),
  book_id UUID REFERENCES books(id) ON DELETE SET NULL,
  source_chapter TEXT,
  source_type TEXT,
  status TEXT NOT NULL DEFAULT 'to-study' CHECK (status IN (
    'to-study','studying','applied','mastered'
  )),
  summary TEXT,
  example_fens TEXT[] NOT NULL DEFAULT '{}',
  game_ids UUID[] NOT NULL DEFAULT '{}',
  confidence INTEGER CHECK (confidence BETWEEN 1 AND 5),
  last_reviewed TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Structured post-mortem fields. The pre-existing columns (tags/notes/
-- key_moments) are free text and can't be aggregated. These can, so the
-- Training Log can chart the real distribution of *why* games are lost.
-- NOTE: init-db.mjs splits this file on the statement terminator, so a
-- comment must never contain one.
ALTER TABLE annotated_games ADD COLUMN IF NOT EXISTS game_id UUID REFERENCES games(id) ON DELETE SET NULL;
ALTER TABLE annotated_games ADD COLUMN IF NOT EXISTS error_type TEXT CHECK (error_type IN (
  'candidate-miss','calculation','evaluation','clock','opening','technique','none'
));
ALTER TABLE annotated_games ADD COLUMN IF NOT EXISTS critical_moment_fen TEXT;
ALTER TABLE annotated_games ADD COLUMN IF NOT EXISTS played_move TEXT;
ALTER TABLE annotated_games ADD COLUMN IF NOT EXISTS best_move TEXT;
ALTER TABLE annotated_games ADD COLUMN IF NOT EXISTS lesson TEXT;

-- Which prepared line a game actually followed, and the ply it left book.
-- Populated client-side by the "Match games to repertoire" action (longest
-- common SAN prefix), not by hand.
ALTER TABLE games ADD COLUMN IF NOT EXISTS repertoire_line_id UUID REFERENCES repertoire_lines(id) ON DELETE SET NULL;
ALTER TABLE games ADD COLUMN IF NOT EXISTS book_exit_ply INTEGER;

-- Tournament metadata.
--
-- Replaces the hardcoded TOURNAMENT_ORDER / TOURNAMENT_DATA constants, which
-- were an allow-list: any tournament whose name wasn't in that array vanished
-- from every tournament view. `name` is the natural key and joins to
-- games.tournament.
--
-- The official_* columns hold the federation's own numbers rather than
-- recomputed ones. They disagree: for Copa Cultura AFA XX the sheet reports a
-- 1750 performance where this app's formula gives ~1830 or ~1515 depending on
-- how the unrated opponent is treated. Showing a number that contradicts the
-- official sheet is worse than showing the official one.
CREATE TABLE IF NOT EXISTS tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  start_date DATE,
  end_date DATE,
  kind TEXT NOT NULL DEFAULT 'individual' CHECK (kind IN ('individual','equipos')),
  -- 'reserva' / 'superior' for team events, so editions stay comparable.
  category TEXT,
  time_control TEXT,
  -- Whether this event's games move the FIDE curve. Team rapid events don't.
  affects_elo BOOLEAN NOT NULL DEFAULT true,
  official_performance INTEGER,
  official_points NUMERIC(4,1),
  official_place INTEGER,
  starting_rank INTEGER,
  elo_before INTEGER,
  elo_change NUMERIC(4,1),
  club TEXT,
  chess_results_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Per-game escape hatch from the ELO curve.
--
-- `rated` could not express this: it is the single filter feeding every
-- analytic surface, so rated=false would also remove the game from per-
-- tournament performance, opponent brackets, colour splits, streaks and
-- records — the opposite of what a team rapid event needs.
ALTER TABLE games ADD COLUMN IF NOT EXISTS affects_elo BOOLEAN NOT NULL DEFAULT true;

-- Model games for the opening heroes. `opening_heroes` stores only names, so
-- there was nowhere to keep the games that make a hero worth studying.
CREATE TABLE IF NOT EXISTS model_games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  eco TEXT NOT NULL,
  hero TEXT NOT NULL,
  event TEXT,
  year INTEGER,
  result TEXT,
  pgn TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS model_games_eco_idx ON model_games (eco);

-- Upcoming tournaments live in this table too, distinguished only by
-- start_date >= CURRENT_DATE. They used to be localStorage-only, which meant
-- no serverless function could see them and nothing could be prepared from
-- them automatically. `province` is the one field the old localStorage shape
-- had that this table did not.
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS province TEXT;

-- Counter parity: endgame_drills lacked solved_count, repertoire_lines had no
-- counters at all, so drilling them left no volume trace.
ALTER TABLE endgame_drills ADD COLUMN IF NOT EXISTS solved_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE repertoire_lines ADD COLUMN IF NOT EXISTS review_count INTEGER NOT NULL DEFAULT 0;

-- One trainable decision of the repertoire study, the Chessable unit.
--
-- repertoire_lines already held the 32 chapters, but a chapter is one card:
-- the trainer could ask "do you know the Accelerated Dragon" and nothing
-- finer. The study PGN behind those chapters carries ~1100 moves across its
-- mainlines and 295 variations, and half of them are the player's -- each one
-- a separate thing to remember. This table is that explosion, produced by
-- scripts/import-repertoire-moves.mts from src/utils/repertoireMoves.ts.
--
-- chapter_no (the NN prefix of the chapter title) is the join back to
-- repertoire_lines. The lichess_url columns cannot serve: they point at an
-- earlier export of the study with different chapter ids.
--
-- path_san -- the SAN moves reaching the position -- is the identity, NOT the
-- FEN. Two move-orders that transpose are two things to remember, and keying
-- on FEN would silently drop one of them.
--
-- role says what a row is for:
--   main  the move to play. The only role the SRS schedules.
--   alt   a second move the study also endorses. Accepted, not scheduled.
--   trap  annotated ?/??/?! -- recorded because it LOSES, so the trainer can
--         answer a wrong move with the study's own refutation.
-- The unique key therefore carries expected_san: one position legitimately
-- holds several candidate moves.
CREATE TABLE IF NOT EXISTS repertoire_moves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_no INTEGER NOT NULL,
  chapter_name TEXT NOT NULL,
  eco TEXT,
  color CHAR(1) NOT NULL CHECK (color IN ('W','B')),
  path_san TEXT NOT NULL,
  fen_before TEXT NOT NULL,
  expected_san TEXT NOT NULL,
  reply_san TEXT,
  comment TEXT,
  is_mainline BOOLEAN NOT NULL DEFAULT true,
  role TEXT NOT NULL DEFAULT 'main' CHECK (role IN ('main','alt','trap')),
  depth INTEGER NOT NULL,
  confidence INTEGER CHECK (confidence BETWEEN 1 AND 5),
  last_reviewed TIMESTAMPTZ,
  review_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (chapter_no, path_san, expected_san)
);

-- Serving a chapter front to back is the only read pattern.
CREATE INDEX IF NOT EXISTS repertoire_moves_chapter_idx ON repertoire_moves (chapter_no, depth);

-- Lets a graded repertoire move and a reviewed concept land in the training
-- log like every other exercise. DROP-then-ADD so the swap stays re-runnable.
ALTER TABLE training_attempts DROP CONSTRAINT IF EXISTS training_attempts_item_kind_check;
ALTER TABLE training_attempts ADD CONSTRAINT training_attempts_item_kind_check
  CHECK (item_kind IN ('blunder','endgame','repertoire','repertoire-move','concept','external'));

-- Counter parity again: concepts carried confidence and last_reviewed from the
-- start but no counter, so a concept that had been reviewed ten times looked
-- identical to one reviewed once.
ALTER TABLE concepts ADD COLUMN IF NOT EXISTS review_count INTEGER NOT NULL DEFAULT 0;

-- Which concepts a post-mortem decided the game turned on.
--
-- `concepts.game_ids` already points the other way, and it is what the UI
-- grades a concept by -- an empty array means "read, not learned". But it is
-- written from the Concepts tab, which is the wrong moment: the game is
-- analysed in Game Library, and asking there is what makes the link get made
-- at all. An array column rather than a join table, matching the style already
-- used by concepts.game_ids and opening_heroes.heroes.
ALTER TABLE annotated_games ADD COLUMN IF NOT EXISTS concept_ids UUID[] NOT NULL DEFAULT '{}';
