-- Evidencia y explicación de cada hallazgo: el "por qué" detrás del número.
--
-- Stockfish NO sabe por qué evalúa lo que evalúa. Su evaluación es una red
-- (NNUE) que devuelve un número: no hay adentro un "perdiste la pareja de
-- alfiles" que se pueda leer. Los términos clásicos desaparecieron cuando NNUE
-- reemplazó la evaluación escrita a mano.
--
-- Así que la explicación se RECONSTRUYE, preguntándole al motor cosas que sí
-- puede contestar:
--   * eval ply a ply de la variante -> CUÁNDO cae de verdad, que casi nunca es
--     en la jugada que uno cree
--   * material (PSQT) vs posicional (capas), que el comando `eval` sí separa ->
--     si se fue en madera o la posición se pudrió sin capturas
--   * ablación diferencia-en-diferencias -> QUÉ PIEZA es la culpable. Se saca
--     una pieza del tablero y se re-evalúa, antes y después de la jugada. La
--     diferencia de las diferencias cancela el valor material de la pieza y
--     deja solo cuánto MÁS estorba después. Es explicación por intervención.
--   * diff estructural (movilidad, peones, atacantes cerca del rey)
--
-- `explanation` es prosa generada a partir de esa evidencia, cacheada porque
-- cuesta plata generarla. La regla es que el modelo REDACTA hechos calculados,
-- no analiza ajedrez: si se le pide que explique una posición por su cuenta
-- escribe algo que suena bien y suele estar mal.
--
-- Se aplica a mano:
--   psql "$DATABASE_URL" -f migrations/004_diagnostic_evidence.sql

ALTER TABLE position_diagnostics
  ADD COLUMN IF NOT EXISTS evidence JSONB;

ALTER TABLE position_diagnostics
  ADD COLUMN IF NOT EXISTS explanation TEXT;

-- Modelo y momento con que se generó la prosa, para poder invalidarla cuando
-- cambie el prompt o el modelo sin borrar la evidencia, que es cara de recalcular.
ALTER TABLE position_diagnostics
  ADD COLUMN IF NOT EXISTS explained_with TEXT;

CREATE INDEX IF NOT EXISTS position_diagnostics_evidence_idx
  ON position_diagnostics (id) WHERE evidence IS NULL;
