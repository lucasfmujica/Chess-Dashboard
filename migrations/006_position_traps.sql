-- Trampas: dónde el rival tenía una forma natural de equivocarse.
--
-- El resto de este pipeline mira mis jugadas. Esto mira las del rival, y da
-- vuelta la pregunta: en vez de "qué jugué mal", "dónde un jugador de esta banda
-- juega lo natural y se equivoca".
--
-- Una posición es trampa cuando la jugada top de Maia-1900 pierde bastante
-- contra la mejor de Stockfish. O sea: lo que un humano de ese nivel juega por
-- instinto está mal. Sirve para preparación: son las posiciones a las que
-- conviene llevar la partida aunque objetivamente no sean las mejores.
--
-- `fell_for_it` guarda si el rival efectivamente cayó, que es lo que convierte
-- una teoría en una estadística.
--
-- Son ratings de LICHESS: Maia-1900 modela a un ~1900 de Lichess, del orden de
-- 1750-1800 FIDE. Una trampa acá es una trampa para esa banda.
--
-- Se aplica a mano:
--   psql "$DATABASE_URL" -f migrations/006_position_traps.sql

CREATE TABLE IF NOT EXISTS position_traps (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id        UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  ply            INTEGER NOT NULL,
  -- FEN con el rival a mover.
  fen            TEXT NOT NULL,
  -- Lo que Maia-1900 juega acá, y lo que eso cuesta contra la mejor jugada.
  maia_move      TEXT NOT NULL,
  maia_policy    NUMERIC(6,4),
  best_move      TEXT NOT NULL,
  -- Centipeones que pierde la jugada natural, desde el lado del RIVAL.
  trap_cp        INTEGER NOT NULL,
  -- Qué jugó el rival de verdad, y si cayó.
  opponent_move  TEXT NOT NULL,
  fell_for_it    BOOLEAN NOT NULL,
  eco            TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (game_id, ply)
);

CREATE INDEX IF NOT EXISTS position_traps_game_id_idx ON position_traps (game_id);
CREATE INDEX IF NOT EXISTS position_traps_eco_idx ON position_traps (eco);
CREATE INDEX IF NOT EXISTS position_traps_fell_for_it_idx ON position_traps (fell_for_it);

CREATE TABLE IF NOT EXISTS position_traps_runs (
  game_id     UUID PRIMARY KEY REFERENCES games(id) ON DELETE CASCADE,
  analyzed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  depth       INTEGER NOT NULL,
  positions   INTEGER NOT NULL,
  traps       INTEGER NOT NULL
);
