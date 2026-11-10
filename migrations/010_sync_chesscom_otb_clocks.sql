-- Expand: Chess.com as a games source, plus OTB round and clock snapshots.
-- NOT applied by the PR. Re-runnable (DROP IF EXISTS / ADD COLUMN IF NOT EXISTS).
--
-- Rollback (do not run unless reverting):
--   ALTER TABLE games DROP COLUMN IF EXISTS round, DROP COLUMN IF EXISTS clock_20,
--     DROP COLUMN IF EXISTS clock_30, DROP COLUMN IF EXISTS clock_40;
--   -- Only if no row has source = 'chesscom':
--   ALTER TABLE games DROP CONSTRAINT IF EXISTS games_source_check;
--   ALTER TABLE games ADD CONSTRAINT games_source_check CHECK (source IN ('otb', 'lichess'));

-- Allow chess.com as a games.source
ALTER TABLE games DROP CONSTRAINT IF EXISTS games_source_check;
ALTER TABLE games ADD CONSTRAINT games_source_check
  CHECK (source IN ('otb', 'lichess', 'chesscom'));

-- OTB round + clock snapshots at moves 20/30/40 (TEXT, free-form remaining time)
ALTER TABLE games ADD COLUMN IF NOT EXISTS round TEXT;
ALTER TABLE games ADD COLUMN IF NOT EXISTS clock_20 TEXT;
ALTER TABLE games ADD COLUMN IF NOT EXISTS clock_30 TEXT;
ALTER TABLE games ADD COLUMN IF NOT EXISTS clock_40 TEXT;
