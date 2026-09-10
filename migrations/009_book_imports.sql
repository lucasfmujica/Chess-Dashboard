-- Qué páginas de qué libro ya se leyeron para extraer conceptos.
--
-- El importador va de a un capítulo a propósito: un libro entero de una produce
-- cientos de fichas que nadie revisa. Pero sin registro, "seguí por el capítulo
-- que viene" es algo que tenés que recordar vos, y releer un rango ya leído
-- duplica conceptos en silencio.
--
-- Guarda el rango, no el contenido: el PDF sigue viviendo en tu disco y esta
-- tabla solo dice hasta dónde llegaste.
--
-- Se aplica a mano:
--   psql "$DATABASE_URL" -f migrations/009_book_imports.sql

CREATE TABLE IF NOT EXISTS book_imports (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id     UUID REFERENCES books(id) ON DELETE CASCADE,
  -- Ruta del PDF tal como se pasó, para poder repetir la corrida sin buscarlo.
  pdf_path    TEXT NOT NULL,
  from_page   INTEGER NOT NULL,
  to_page     INTEGER NOT NULL,
  chapter     TEXT NOT NULL,
  -- Candidatos propuestos, no aprobados: el registro es de lectura, no de qué
  -- terminó guardado.
  candidates  INTEGER NOT NULL DEFAULT 0,
  read_with   TEXT,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS book_imports_book_id_idx ON book_imports (book_id, from_page);
