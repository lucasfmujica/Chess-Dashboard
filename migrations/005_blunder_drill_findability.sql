-- Qué tan encontrable es la solución de cada blunder drill.
--
-- Los drills se minan por pérdida de centipeones, así que entran posiciones
-- donde la jugada correcta tiene 1 o 2% de policy en Maia: para alguien de esta
-- banda son irresolubles en el tablero. Entrenar con eso no enseña, frustra.
--
-- Guardando la policy que Maia-1900 le da a la solución, los drills se pueden
-- separar en dos pilas: los que un humano de este nivel PUEDE encontrar
-- (entrenamiento real) y los que son curiosidades de motor (mirar, no entrenar).
--
-- Es rating de LICHESS: Maia-1900 modela a un ~1900 de Lichess, del orden de
-- 1750-1800 FIDE.
--
-- Lo llena scripts/position_diagnostics.py --drills-policy. Se aplica a mano:
--   psql "$DATABASE_URL" -f migrations/005_blunder_drill_findability.sql

ALTER TABLE blunder_drills
  ADD COLUMN IF NOT EXISTS maia_policy NUMERIC(6,4);

CREATE INDEX IF NOT EXISTS blunder_drills_maia_policy_idx
  ON blunder_drills (maia_policy);
