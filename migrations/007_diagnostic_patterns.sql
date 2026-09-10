-- Patrones: qué tienen en común mis errores.
--
-- Una lista de treinta divergencias sueltas no es un plan de estudio. Si varias
-- comparten estructura — cambios equivocados de piezas menores, columnas
-- abiertas mal disputadas, peones colgantes — eso deja de ser una lista de
-- errores y pasa a ser UN tema, que es lo que se puede estudiar.
--
-- El agrupamiento lo hace un modelo sobre las explicaciones y la evidencia ya
-- calculadas, no sobre las posiciones: sigue sin analizar ajedrez, agrupa
-- textos. Por eso requiere haber corrido antes --evidence y --explain.
--
-- `finding_ids` apunta a position_diagnostics en vez de duplicar nada, así se
-- puede navegar del patrón a las partidas que lo generaron.
--
-- Se aplica a mano:
--   psql "$DATABASE_URL" -f migrations/007_diagnostic_patterns.sql

CREATE TABLE IF NOT EXISTS diagnostic_patterns (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  summary      TEXT NOT NULL,
  -- Qué hacer al respecto: la parte accionable.
  study_note   TEXT,
  finding_ids  UUID[] NOT NULL,
  -- Modelo y esfuerzo con que se agrupó, para poder regenerar sin adivinar.
  grouped_with TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS diagnostic_patterns_created_at_idx
  ON diagnostic_patterns (created_at DESC);
