-- Cola de pedidos de análisis hechos desde la app.
--
-- El análisis necesita Stockfish y lc0 con los pesos de Maia corriendo minutos
-- por partida, así que NO puede correr en una función de Vercel. La app solo
-- encola: marca una partida acá, y scripts/position_diagnostics.py --requested
-- la drena la próxima vez que corre en la máquina local.
--
-- Se aplica a mano, igual que 001:
--   psql "$DATABASE_URL" -f migrations/002_position_diagnostics_requests.sql

CREATE TABLE IF NOT EXISTS position_diagnostics_requests (
  game_id      UUID PRIMARY KEY REFERENCES games(id) ON DELETE CASCADE,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Pedir una partida ya analizada significa re-analizarla: el script la corre
  -- con la semántica de --force en vez de saltearla. Es lo que hace falta
  -- cuando cambian la profundidad o los umbrales.
  force        BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS position_diagnostics_requests_requested_at_idx
  ON position_diagnostics_requests (requested_at);
