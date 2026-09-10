-- Diagnóstico de posiciones: divergencias entre Stockfish y Maia-1900.
--
-- Lo llena scripts/position_diagnostics.py, un batch LOCAL que corre fuera de
-- Vercel con los dos motores instalados en la máquina. La app no escribe acá.
--
-- Este archivo se aplica A MANO (psql "$DATABASE_URL" -f migrations/001_position_diagnostics.sql),
-- no por scripts/init-db.mjs, que es el que exige que ningún comentario lleve
-- un punto y coma. Aun así se respeta el estilo de db/schema.sql: IF NOT EXISTS
-- en todo, e índices nombrados <tabla>_<cols>_idx.

CREATE TABLE IF NOT EXISTS position_diagnostics (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id            UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  -- Ply 1-based del movimiento mío, igual convención que blunder_drills.
  ply                INTEGER NOT NULL,
  -- FEN de la posición ANTES de mi jugada: es la que se le pasa a los motores.
  fen                TEXT NOT NULL,
  move_played        TEXT NOT NULL,
  cp_loss            INTEGER NOT NULL,
  -- [{"rank":1,"move_san":"Nf3","move_uci":"g1f3","eval_cp":34}, ...]
  -- Evaluaciones en centipeones DESDE MI PERSPECTIVA (positivo = mejor para mí).
  sf_top3            JSONB NOT NULL,
  maia_top_move      TEXT NOT NULL,
  -- Probabilidades de policy de Maia-1900, 0..1.
  maia_policy_played NUMERIC(6,4),
  maia_policy_sf_top NUMERIC(6,4),
  category           TEXT NOT NULL CHECK (category IN ('brecha_conceptual','jugada_inhumana','error_propio')),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (game_id, ply)
);

CREATE INDEX IF NOT EXISTS position_diagnostics_game_id_idx ON position_diagnostics (game_id);
CREATE INDEX IF NOT EXISTS position_diagnostics_category_idx ON position_diagnostics (category);

-- Registro de corridas, una fila por partida analizada.
--
-- Existe por la idempotencia: una partida limpia produce CERO filas en
-- position_diagnostics, así que mirando esa tabla sola sería indistinguible de
-- una partida nunca procesada y se re-analizaría entera en cada corrida. Como
-- cada partida cuesta minutos de Stockfish a profundidad 20, ese es justo el
-- caso que no conviene repetir.
CREATE TABLE IF NOT EXISTS position_diagnostics_runs (
  game_id     UUID PRIMARY KEY REFERENCES games(id) ON DELETE CASCADE,
  analyzed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  depth       INTEGER NOT NULL,
  -- Posiciones mías que llegaron a evaluarse con Stockfish.
  positions   INTEGER NOT NULL,
  -- Filas insertadas en position_diagnostics, puede ser 0.
  findings    INTEGER NOT NULL
);
