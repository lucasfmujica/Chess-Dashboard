// Read one chapter of a book PDF and propose concept candidates from it.
//
// Deliberately scoped to a page range rather than a whole book. A 400-page
// book processed in one pass produces hundreds of rows, none of them attached
// to a game of yours — which is the state the Concepts tab already calls
// "leído, no aprendido". One chapter at a time, matched to what the weekly
// plan says you are actually studying, is the version worth reviewing.
//
// The PDF pages are sent to Claude natively, not as extracted text: chess
// books carry their meaning in the diagrams, and text extraction throws those
// away.
//
// IMPORTANT — how this differs from extract-concepts-from-study.mts: there,
// `summary` is your own writing, copied verbatim. Here it is written by the
// model from the book. Every candidate therefore carries the page number and a
// verbatim quote so you can check it against the source before approving.
// Nothing is inserted by this script.
//
// Usage:
//   npx tsx --env-file=.env.local scripts/import-book-concepts.mts \
//     --pdf ~/libros/silman.pdf --pages 45-72 --book "How to Reassess"
//
//   --pdf    path to the book
//   --pages  inclusive 1-based page range of the chapter, e.g. 45-72
//   --book   substring of the book's title or author in your library, so the
//            concepts link to the right row in `books` (optional)
//   --chapter  label stored as source_chapter (defaults to "<book> pp.45-72")
//   --dry-run  slice the pages and report, without calling the API
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { neon } from '@neondatabase/serverless';
import Anthropic from '@anthropic-ai/sdk';
import { PDFDocument } from 'pdf-lib';
import {
  appendReview,
  isValidFen,
  CATEGORIES,
  type ReviewEntry,
} from './_conceptReview.mjs';

/** Pages per request. Chess books are dense; a chapter is normally well under this. */
const MAX_PAGES = 40;

const arg = (name: string): string | undefined => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const dryRun = process.argv.includes('--dry-run');

const pdfPath = arg('pdf');
const pagesArg = arg('pages');
const bookQuery = arg('book');
const chapterLabel = arg('chapter');

if (!pdfPath || !pagesArg) {
  console.error('Usage: --pdf <path> --pages <from-to> [--book <title>] [--chapter <label>] [--dry-run]');
  process.exit(1);
}

const pageMatch = /^(\d+)\s*-\s*(\d+)$/.exec(pagesArg.trim());
if (!pageMatch) {
  console.error(`--pages must look like 45-72, got "${pagesArg}"`);
  process.exit(1);
}
const fromPage = Number(pageMatch[1]);
const toPage = Number(pageMatch[2]);
if (fromPage < 1 || toPage < fromPage) {
  console.error(`--pages range is not valid: ${fromPage}-${toPage}`);
  process.exit(1);
}
if (toPage - fromPage + 1 > MAX_PAGES) {
  console.error(
    `That is ${toPage - fromPage + 1} pages. Keep a run to ${MAX_PAGES} or fewer — one chapter, not one book.`
  );
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set. Run with --env-file=.env.local');
  process.exit(1);
}
const sql = neon(process.env.DATABASE_URL);

// ------------------------------------------------------------ slice the pages

const source = await PDFDocument.load(readFileSync(path.resolve(pdfPath)));
const totalPages = source.getPageCount();
if (toPage > totalPages) {
  console.error(`The PDF has ${totalPages} pages; you asked for up to ${toPage}.`);
  process.exit(1);
}

const chapter = await PDFDocument.create();
// pdf-lib is 0-based; the flag is 1-based because that is what a reader sees.
const indices = Array.from({ length: toPage - fromPage + 1 }, (_, i) => fromPage - 1 + i);
for (const page of await chapter.copyPages(source, indices)) chapter.addPage(page);
const chapterBytes = await chapter.save();

const label = chapterLabel ?? `${path.basename(pdfPath, '.pdf')} pp.${fromPage}-${toPage}`;
const megabytes = chapterBytes.byteLength / 1024 / 1024;

console.log(`Book:     ${pdfPath}`);
console.log(`Pages:    ${fromPage}-${toPage} of ${totalPages} (${indices.length} pages, ${megabytes.toFixed(1)} MB)`);
console.log(`Chapter:  ${label}`);

// The API caps a request at 32 MB, and the base64 encoding adds a third.
if (megabytes > 20) {
  console.error(`\nThat slice is too large to send (${megabytes.toFixed(1)} MB). Use a narrower page range.`);
  process.exit(1);
}

if (dryRun) {
  const out = path.join(os.tmpdir(), `chapter-${fromPage}-${toPage}.pdf`);
  writeFileSync(out, chapterBytes);
  console.log(`\nDry run — wrote the slice to ${out} so you can check the page range.`);
  console.log('Open it, confirm it is the chapter you meant, then re-run without --dry-run.');
  process.exit(0);
}

// -------------------------------------------------------------- resolve book

const books = (await sql`
  SELECT id, title, author, status FROM books
`) as { id: string; title: string; author: string | null; status: string }[];

let book: { id: string; title: string } | undefined;
if (bookQuery) {
  const needle = bookQuery.toLowerCase();
  const matches = books.filter(
    b => b.title.toLowerCase().includes(needle) || (b.author ?? '').toLowerCase().includes(needle)
  );
  if (matches.length === 0) {
    console.error(`\nNo book in your library matches "${bookQuery}".`);
    process.exit(1);
  }
  if (matches.length > 1) {
    console.error(`\n"${bookQuery}" matches ${matches.length} books — be more specific:`);
    for (const m of matches) console.error(`  - ${m.title} (${m.author ?? 'sin autor'})`);
    process.exit(1);
  }
  book = matches[0];
  console.log(`Library:  ${book.title}`);
  const status = matches[0].status;
  if (status !== 'activo') {
    // Not fatal, but worth saying out loud: the plan's own rule is that only
    // active books get studied, and concepts from a shelved one will sit unread.
    console.log(`          (marked "${status}" — the weekly plan only studies 'activo' books)`);
  }
}

// ------------------------------------------------------------------- extract

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('\nANTHROPIC_API_KEY is not set, which this needs to read the pages.');
  process.exit(1);
}

const SYSTEM_PROMPT = `Sos un asistente que lee capítulos de libros de ajedrez y extrae las ideas entrenables.

El lector es un jugador de ~1880 que apunta a 2000-2200, entrena ~30 minutos por día, y guarda cada idea como una ficha que después va a repasar.

Extraé sólo ideas que se puedan ENTRENAR o APLICAR en una partida. Una buena ficha responde "¿qué hago distinto ahora que sé esto?".

NO extraigas:
- Datos históricos, anécdotas, biografías.
- Ejercicios o posiciones sueltas sin la idea detrás.
- Repeticiones de una idea que ya extrajiste en este mismo capítulo.

Para cada idea devolvés:
- name: título corto (menos de 60 caracteres) que nombre la IDEA.
- category: una de ${CATEGORIES.join(', ')}.
- summary: la idea en 1 a 3 frases, en castellano rioplatense, accionable.
- page: el número de página del PDF donde aparece. La primera página que te paso es la ${fromPage}.
- quote: una frase TEXTUAL del libro que respalde la idea. Copiala tal cual, sin traducir.
- fen: SÓLO si el libro imprime explícitamente un FEN en el texto. Si la posición está únicamente como diagrama, devolvé "" — no intentes leer el diagrama y reconstruir el FEN.

Preferí 5 ideas buenas a 20 mediocres. Si el capítulo no tiene ideas entrenables, devolvé una lista vacía.`;

const SCHEMA = {
  type: 'object',
  properties: {
    concepts: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Título corto de la idea, en castellano.' },
          category: { type: 'string', enum: [...CATEGORIES] },
          summary: { type: 'string', description: 'La idea en 1-3 frases, accionable.' },
          page: { type: 'integer', description: 'Página del PDF donde aparece.' },
          quote: { type: 'string', description: 'Frase textual del libro, sin traducir.' },
          fen: {
            type: 'string',
            description: 'FEN sólo si el libro lo imprime explícitamente; si no, string vacío.',
          },
        },
        required: ['name', 'category', 'summary', 'page', 'quote', 'fen'],
        additionalProperties: false,
      },
    },
  },
  required: ['concepts'],
  additionalProperties: false,
} as const;

interface ExtractedConcept {
  name: string;
  category: string;
  summary: string;
  page: number;
  quote: string;
  fen: string;
}

const anthropic = new Anthropic();

console.log('\nLeyendo el capítulo…');

const response = await anthropic.messages.create({
  model: 'claude-sonnet-5',
  // Adaptive thinking is on by default on Sonnet 5 and shares this budget with
  // the response, so this sits well above the JSON payload itself. Effort is
  // left at the default here, unlike the titling script: reading a chapter and
  // deciding which ideas are trainable is the intelligence-sensitive half.
  max_tokens: 16000,
  system: SYSTEM_PROMPT,
  output_config: { format: { type: 'json_schema', schema: SCHEMA } },
  messages: [
    {
      role: 'user',
      content: [
        // The document block goes before the text block, per the API's own
        // guidance — the instruction reads as being about the pages above it.
        {
          type: 'document',
          source: {
            type: 'base64',
            media_type: 'application/pdf',
            data: Buffer.from(chapterBytes).toString('base64'),
          },
        },
        {
          type: 'text',
          text: `Este es el capítulo "${label}"${book ? ` del libro "${book.title}"` : ''}. Páginas ${fromPage} a ${toPage}. Extraé las ideas entrenables.`,
        },
      ],
    },
  ],
});

// A safety refusal returns 200 with no content — reading content[0] would throw.
if (response.stop_reason === 'refusal') {
  console.error('La lectura fue rechazada por los clasificadores de seguridad. Nada que revisar.');
  process.exit(1);
}

const block = response.content[0];
const parsed =
  block?.type === 'text'
    ? (JSON.parse(block.text) as { concepts: ExtractedConcept[] })
    : { concepts: [] };

console.log(`Ideas propuestas: ${parsed.concepts.length}`);
console.log(
  `Tokens: ${response.usage.input_tokens} entrada / ${response.usage.output_tokens} salida`
);

// ------------------------------------------------------ validate and stage

const existing = (await sql`SELECT id, name FROM concepts`) as { id: string; name: string }[];
const existingByName = new Map(existing.map(c => [c.name.trim().toLowerCase(), c.id]));

let droppedFens = 0;
const entries: ReviewEntry[] = parsed.concepts.map(c => {
  // Model-supplied FENs are checked against a real board. An invalid one is
  // dropped rather than stored: a wrong position shown as an example is worse
  // than no example at all.
  const fenOk = c.fen ? isValidFen(c.fen) : false;
  if (c.fen && !fenOk) droppedFens += 1;

  return {
    approve: false,
    name: c.name,
    category: CATEGORIES.includes(c.category as (typeof CATEGORIES)[number])
      ? c.category
      : 'strategy',
    summary: c.summary,
    sourceChapter: label,
    sourceType: 'book',
    exampleFens: fenOk ? [c.fen] : [],
    bookId: book?.id,
    bookTitle: book?.title,
    page: c.page,
    quote: c.quote,
    duplicateOf: existingByName.get(c.name.trim().toLowerCase()),
  };
});

if (droppedFens > 0) {
  console.log(`FENs descartados por inválidos: ${droppedFens}`);
}
const dupes = entries.filter(e => e.duplicateOf).length;
if (dupes > 0) {
  console.log(`Ya existe un concepto con ese nombre: ${dupes} (marcados con duplicateOf)`);
}

const { added, total } = appendReview(entries);

console.log(`\nAgregados a la cola de revisión: ${added} (la cola tiene ${total})`);
console.log('\nNada fue insertado. Cada ficha trae su página y una cita textual — revisalas');
console.log('contra el libro, poné "approve": true en las que valgan, y después:');
console.log('  npx tsx --env-file=.env.local scripts/extract-concepts-from-study.mts --insert');
