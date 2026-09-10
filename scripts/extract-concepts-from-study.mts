// Turn the repertoire study's own annotations into concept candidates.
//
// The `concepts` table has been empty since it was created. The reason is in
// the training program: Friday says "pick a concept and write its row", so
// every concept costs a blank form on a tab you have to remember to visit.
// Meanwhile the study already holds ~125 notes written by hand, each anchored
// to a real position and many citing the book they came from.
//
// The split matters. The position, the chapter and the TEXT are read straight
// out of the PGN by src/utils/studyConcepts.ts and never touched. Claude is
// given the text only to title it, categorise it and flag near-duplicates —
// so nothing it invents can end up stored as something you wrote.
//
// Nothing is inserted. This writes a review file; `--insert` reads that file
// back and posts the entries you left marked `"approve": true`.
//
// Usage:
//   npx tsx --env-file=.env.local scripts/extract-concepts-from-study.mts
//   npx tsx --env-file=.env.local scripts/extract-concepts-from-study.mts --title
//   npx tsx --env-file=.env.local scripts/extract-concepts-from-study.mts --insert
//   npx tsx --env-file=.env.local scripts/extract-concepts-from-study.mts --study <url|id>
//
// Bare: extract and write the review file with placeholder titles. Free.
// --title: also call Claude to title/categorise (needs ANTHROPIC_API_KEY).
//          Sonnet 5 at low effort, ~5 requests for the whole study — well
//          under a dollar, and a one-time cost.
// --insert: post the approved entries from the review file. Free.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { neon } from '@neondatabase/serverless';
import Anthropic from '@anthropic-ai/sdk';
import { parseStudyPgn } from '../src/utils/studyPgn.js';
import { extractStudyConcepts, type StudyConceptCandidate } from '../src/utils/studyConcepts.js';
import {
  readReview,
  writeReview,
  REVIEW_PATH,
  CATEGORIES,
  type ReviewEntry,
} from './_conceptReview.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PGN_PATH = path.join(__dirname, '../public/data/repertoire-study.pgn');

const wantsTitles = process.argv.includes('--title');
const wantsInsert = process.argv.includes('--insert');

/**
 * `--study <url o id>` baja un estudio de Lichess en vez de leer el archivo local.
 *
 * El script nació para el estudio de repertorio, que vive versionado en
 * public/data. Pero en Lichess hay estudios de libros enteros, y el mismo
 * mecanismo sirve: son notas ancladas a posiciones reales.
 *
 * Ojo con la diferencia, que no es técnica: las notas del repertorio las
 * escribió Lucas, las de un estudio de un libro las escribió otro. Los conceptos
 * guardan su fuente, así que la distinción queda registrada — pero conviene
 * tenerla presente antes de tratar a las dos igual.
 */
const studyArg = (() => {
  const i = process.argv.indexOf('--study');
  if (i === -1) return undefined;
  const raw = process.argv[i + 1];
  if (!raw) {
    console.error('--study necesita una URL o un id de estudio de Lichess.');
    process.exit(1);
  }
  // Acepta la URL completa, la de un capítulo, o el id pelado.
  const match = raw.match(/lichess\.org\/study\/([\w-]{8})/);
  return match ? match[1] : raw.replace(/^.*\//, '');
})();

const fetchStudy = async (id: string): Promise<string> => {
  const url = `https://lichess.org/api/study/${id}.pgn?comments=true&variations=true`;
  // Un estudio privado necesita el token; uno público anda sin él.
  const token = process.env.LICHESS_TOKEN;
  const res = await fetch(url, token ? { headers: { Authorization: `Bearer ${token}` } } : undefined);
  if (!res.ok) {
    console.error(
      res.status === 404
        ? `No encontré el estudio ${id}. Si es privado, hace falta LICHESS_TOKEN en .env.local.`
        : `Lichess respondió ${res.status} para el estudio ${id}.`
    );
    process.exit(1);
  }
  return res.text();
};

const SYSTEM_PROMPT = `Sos un asistente que ordena las notas de un estudio de ajedrez en fichas de concepto.

Te paso notas que el jugador escribió él mismo, en castellano rioplatense, dentro de su repertorio de Lichess.

Para cada nota devolvés:
- name: un título corto (menos de 60 caracteres) que nombre la IDEA, no la jugada. "Enrocar antes de ...Ng4" y no "7...O-O".
- category: una de ${CATEGORIES.join(', ')}. La mayoría son 'opening'; usá 'strategy' para ideas de plan que trascienden la línea, 'calculation' para notas sobre variantes concretas y 'mindset' para notas sobre proceso o errores propios.

Reglas:
- NO reescribas ni resumas la nota. El texto del jugador se guarda tal cual, aparte.
- NO inventes contenido que no esté en la nota.
- Respetá el orden: devolvés exactamente un elemento por nota, en el mismo orden que las recibís.`;

const TITLE_SCHEMA = {
  type: 'object',
  properties: {
    concepts: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Título corto de la idea, en castellano.' },
          category: { type: 'string', enum: [...CATEGORIES] },
        },
        required: ['name', 'category'],
        additionalProperties: false,
      },
    },
  },
  required: ['concepts'],
  additionalProperties: false,
} as const;

/** First sentence, as a stand-in title when Claude is not run. */
const placeholderName = (text: string): string => {
  const firstLine = text.split('\n')[0].trim();
  const sentence = firstLine.split(/(?<=[.:!?])\s/)[0] ?? firstLine;
  return sentence.length > 60 ? `${sentence.slice(0, 57)}…` : sentence;
};

/**
 * Titula un lote con el proveedor que haya configurado.
 *
 * Igual que el chat y las explicaciones: se usa la clave que exista, en vez de
 * pedir una segunda. Devuelve `null` si el modelo se negó o contestó algo que
 * no se puede leer, y ahí el llamador cae a títulos genéricos.
 */
async function titleBatch(
  batch: StudyConceptCandidate[]
): Promise<{ name: string; category: string }[] | null> {
  const prompt = batch
    .map((c, n) => `--- Nota ${n + 1} (capítulo ${c.chapterName}) ---\n${c.text}`)
    .join('\n\n');

  if (!process.env.ANTHROPIC_API_KEY && process.env.XAI_API_KEY) {
    const res = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.XAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'grok-4-fast',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        // Titular una nota ya escrita es una transformación corta y acotada, no
        // algo que necesite razonar: grok-4-fast alcanza y cuesta una fracción.
        response_format: {
          type: 'json_schema',
          json_schema: { name: 'conceptos', schema: TITLE_SCHEMA, strict: true },
        },
      }),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    try {
      return (JSON.parse(body.choices?.[0]?.message?.content ?? '{}') as {
        concepts: { name: string; category: string }[];
      }).concepts;
    } catch {
      return null;
    }
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-5',
    // Adaptive thinking is on by default on Sonnet 5 and shares this budget
    // with the response. 25 titles is ~750 tokens of actual output, so this
    // leaves ample room for the thinking that precedes them.
    max_tokens: 8000,
    system: SYSTEM_PROMPT,
    output_config: {
      // Naming a note that is already written is a short, scoped
      // transformation — not intelligence-sensitive. `low` cuts the thinking
      // tokens, which are billed as output and are the expensive half.
      effort: 'low',
      format: { type: 'json_schema', schema: TITLE_SCHEMA },
    },
    messages: [{ role: 'user', content: prompt }],
  });
  // A safety refusal returns 200 with an empty content array.
  if (response.stop_reason === 'refusal') return null;
  const block = response.content[0];
  if (block?.type !== 'text') return null;
  try {
    return (JSON.parse(block.text) as { concepts: { name: string; category: string }[] }).concepts;
  } catch {
    return null;
  }
}

async function titleCandidates(candidates: StudyConceptCandidate[]) {
  const titled: { name: string; category: string }[] = [];

  // Batched so one oversized request can't lose the whole run, and so a
  // partial failure still leaves most candidates titled.
  const BATCH = 25;
  for (let i = 0; i < candidates.length; i += BATCH) {
    const batch = candidates.slice(i, i + BATCH);
    const parsed = { concepts: (await titleBatch(batch)) ?? [] };

    if (parsed.concepts.length === 0) {
      console.warn(`  lote ${i / BATCH + 1}: sin títulos utilizables, van genéricos`);
      titled.push(...batch.map(c => ({ name: placeholderName(c.text), category: 'opening' })));
      continue;
    }

    // Order is the only thing tying a title back to its note, so a short
    // response must not silently shift every later candidate's title.
    if (parsed.concepts.length !== batch.length) {
      console.warn(
        `  batch ${i / BATCH + 1}: expected ${batch.length} titles, got ${parsed.concepts.length} — using placeholders for this batch`
      );
      titled.push(
        ...batch.map(c => ({ name: placeholderName(c.text), category: 'opening' }))
      );
      continue;
    }
    titled.push(...parsed.concepts);
    console.log(`  titled ${Math.min(i + BATCH, candidates.length)}/${candidates.length}`);
  }
  return titled;
}

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set. Run with --env-file=.env.local');
  process.exit(1);
}
const sql = neon(process.env.DATABASE_URL);

// ---------------------------------------------------------------- insert mode

if (wantsInsert) {
  const entries = readReview();
  if (entries.length === 0) {
    console.error(`No review file at ${REVIEW_PATH}. Run an extraction first.`);
    process.exit(1);
  }
  const approved = entries.filter(e => e.approve);

  console.log(`Review file: ${entries.length} entries, ${approved.length} approved.`);
  if (approved.length === 0) {
    console.log('Nothing marked "approve": true. Edit the file and re-run.');
    process.exit(0);
  }

  let inserted = 0;
  for (const e of approved) {
    await sql`
      INSERT INTO concepts (
        name, category, book_id, source_chapter, source_type, status, summary, example_fens
      ) VALUES (
        ${e.name}, ${e.category}, ${e.bookId ?? null}, ${e.sourceChapter},
        ${e.sourceType}, 'to-study', ${e.summary}, ${e.exampleFens}
      )
    `;
    inserted += 1;
  }
  console.log(`Inserted ${inserted} concepts.`);
  process.exit(0);
}

// ------------------------------------------------------------- extract mode

const pgn = studyArg ? await fetchStudy(studyArg) : readFileSync(PGN_PATH, 'utf8');
if (studyArg) console.log(`Estudio ${studyArg} bajado de Lichess (${(pgn.length / 1024).toFixed(0)} KB)`);
const chapters = await parseStudyPgn(pgn);
const candidates = extractStudyConcepts(chapters);

console.log(`Chapters parsed:   ${chapters.length}`);
console.log(`Notes extracted:   ${candidates.length}`);
console.log(`  with a citation: ${candidates.filter(c => c.citations.length > 0).length}`);

// Resolve citations to real books so a concept can point at the shelf.
//
// Matched against author as well as title: the study cites by surname
// ("Lalić cap. 2", "recomendación de Marin"), and no book in the library is
// titled after its author, so a title-only search resolves nothing at all.
const books = (await sql`
  SELECT id, title, author FROM books
`) as { id: string; title: string; author: string | null }[];

const bookFor = (citations: string[]) => {
  for (const citation of citations) {
    const needle = citation.toLowerCase();
    const matches = books.filter(
      b =>
        b.title.toLowerCase().includes(needle) || (b.author ?? '').toLowerCase().includes(needle)
    );
    // Only an unambiguous match. Three Marin volumes and two Silman books are
    // a question for the reviewer, not something to guess at.
    if (matches.length === 1) return matches[0];
  }
  return undefined;
};

let titles: { name: string; category: string }[];
if (wantsTitles) {
  const titler = process.env.ANTHROPIC_API_KEY
    ? 'Claude'
    : process.env.XAI_API_KEY
      ? 'Grok'
      : null;
  if (!titler) {
    console.error('--title necesita ANTHROPIC_API_KEY o XAI_API_KEY en el entorno.');
    process.exit(1);
  }
  console.log(`\nTitulando con ${titler}…`);
  titles = await titleCandidates(candidates);
} else {
  titles = candidates.map(c => ({ name: placeholderName(c.text), category: 'opening' }));
  console.log('\nUsing placeholder titles (pass --title to have Claude name them).');
}

/**
 * El libro de un estudio armado sobre un libro está en el nombre del capítulo,
 * no citado dentro de la nota.
 *
 * Las notas del repertorio dicen "Silman cap. 3" porque son de Lucas leyendo a
 * Silman. Las de un estudio de Simple Chess no citan a Stean: SON Stean, y lo
 * que lo dice es el capítulo ("Simple Chess: Chapter 2: Outposts"). Sin esto,
 * doscientos conceptos de un libro entero quedan sin apuntar al estante.
 */
const bookFromChapter = (chapterName: string) => {
  const prefix = chapterName.split(':')[0]?.trim();
  if (!prefix || prefix.length < 4) return undefined;
  const needle = prefix.toLowerCase();
  const matches = books.filter(b => b.title.toLowerCase().includes(needle));
  return matches.length === 1 ? matches[0] : undefined;
};

const review: ReviewEntry[] = candidates.map((c, i) => {
  const book = bookFor(c.citations) ?? bookFromChapter(c.chapterName);
  return {
    approve: false,
    name: titles[i]?.name ?? placeholderName(c.text),
    category: titles[i]?.category ?? 'opening',
    summary: c.text,
    sourceChapter: c.chapterName,
    sourceType: 'study-chapter',
    exampleFens: [c.fen],
    bookId: book?.id,
    bookTitle: book?.title,
    citations: c.citations,
    pathSan: c.pathSan,
    san: c.san,
  };
});

writeReview(review);

console.log(`\nWrote ${review.length} candidates to ${REVIEW_PATH}`);
console.log(`  resolved to a book: ${review.filter(r => r.bookId).length}`);
console.log('\nNothing was inserted. Edit the file, flip "approve": true on the ones you want,');
console.log('then run with --insert.');
