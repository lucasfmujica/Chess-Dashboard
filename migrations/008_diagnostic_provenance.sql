-- De dónde salió cada fila: motor y umbrales con los que se calculó.
--
-- Hasta acá una corrida guardaba su profundidad y nada más. Eso alcanza mientras
-- el corpus sea homogéneo, pero deja de alcanzar en cuanto algo cambia: cambiar
-- los umbrales, actualizar Stockfish o tocar la forma de la evidencia deja filas
-- viejas y nuevas mezcladas SIN forma de distinguirlas. Ya pasó una vez —
-- convivieron pasadas a profundidad 10, 12 y 20 y hubo que limpiarlas a mano.
--
-- `classifier` guarda los umbrales como texto ("50/300/5.0/50"), no como
-- columnas: no se consulta por ellos, se compara contra los de ahora para saber
-- qué quedó viejo.
--
-- Se aplica a mano:
--   psql "$DATABASE_URL" -f migrations/008_diagnostic_provenance.sql

ALTER TABLE position_diagnostics_runs
  ADD COLUMN IF NOT EXISTS engine TEXT;

ALTER TABLE position_diagnostics_runs
  ADD COLUMN IF NOT EXISTS classifier TEXT;

ALTER TABLE position_traps_runs
  ADD COLUMN IF NOT EXISTS engine TEXT;

ALTER TABLE position_traps_runs
  ADD COLUMN IF NOT EXISTS classifier TEXT;

-- La evidencia ya guarda su profundidad dentro del JSONB, pero no qué motor la
-- calculó, que es lo que importa cuando Stockfish cambia de versión.
ALTER TABLE position_diagnostics
  ADD COLUMN IF NOT EXISTS evidence_engine TEXT;

CREATE INDEX IF NOT EXISTS position_diagnostics_runs_classifier_idx
  ON position_diagnostics_runs (classifier);
