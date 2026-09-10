-- Escalera de Maia: la misma posición vista por los nueve modelos, 1100 a 1900.
--
-- Un solo Maia dice "un 1900 juega esto". Los nueve dicen DÓNDE de la curva
-- humana está el error, que es otra cosa:
--   un 1100 ya no lo juega  -> descuido tuyo, no hay nada que estudiar
--   un 1500 no y un 1900 sí -> hábito contraintuitivo que se aprende y hay que desaprender
--   nadie lo evita hasta 1900 -> sigue siendo común justo debajo de tu nivel
--
-- Son ratings de LICHESS, no FIDE. Maia se entrenó con partidas de Lichess y
-- ese pool está inflado: 1900 de Lichess es del orden de 1750-1800 FIDE. La
-- escalera entonces termina algo por DEBAJO de un jugador de 1880 FIDE, y no
-- puede decir nada sobre qué haría un 2100.
--
-- Va como columna JSONB y no como tabla aparte porque es un atributo del
-- hallazgo, siempre se lee junto con él, y son nueve pares de números.
-- Se llena en una pasada aparte (position_diagnostics.py --ladder) porque Maia
-- con búsqueda nula es casi gratis y no justifica re-correr Stockfish.
--
-- Se aplica a mano:
--   psql "$DATABASE_URL" -f migrations/003_maia_ladder.sql

ALTER TABLE position_diagnostics
  ADD COLUMN IF NOT EXISTS maia_ladder JSONB;

-- Índice parcial: las consultas que importan son "qué falta calcular" y
-- "mostrame los hallazgos que ya tienen escalera".
CREATE INDEX IF NOT EXISTS position_diagnostics_maia_ladder_idx
  ON position_diagnostics (id) WHERE maia_ladder IS NULL;
