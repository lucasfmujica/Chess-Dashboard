import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from './_db.js';
import { requireApiKey } from './_auth.js';
import {
  rowToTrainingSession,
  rowToTrainingAttempt,
  rowToBook,
  rowToConcept,
  rowToHomework,
  type TrainingSessionRow,
  type TrainingAttemptRow,
  type BookRow,
  type ConceptRow,
  type HomeworkRow,
} from './_trainingMapper.js';
import { rowToRepertoireMove, type RepertoireMoveRow } from './_repertoireMoveMapper.js';

// Handlers for the training-loop resources. These live in a `_`-prefixed
// module (not picked up as a route) and are dispatched from prep.ts, because
// each new file under api/ counts against the Vercel Hobby function limit
// and the project is already close to it.

interface TrainingSessionInput {
  sessionDate?: string;
  block: string;
  minutes?: number;
  source?: string;
  attempted?: number;
  solved?: number;
  notes?: string;
}

export const trainingSessions = async (
  req: VercelRequest,
  res: VercelResponse,
  id: string | undefined
) => {
  if (id) {
    if (req.method === 'PUT') {
      if (!requireApiKey(req, res)) return;
      const s = req.body as Partial<TrainingSessionInput>;
      // Partial patch (COALESCE), matching the drill endpoints rather than
      // the full-replace style of repertoire-lines/annotations: a session is
      // created empty when the queue starts and topped up as it progresses.
      const rows = (await sql`
        UPDATE training_sessions SET
          block = COALESCE(${s.block ?? null}, block),
          minutes = COALESCE(${s.minutes ?? null}, minutes),
          source = COALESCE(${s.source ?? null}, source),
          attempted = COALESCE(${s.attempted ?? null}, attempted),
          solved = COALESCE(${s.solved ?? null}, solved),
          notes = COALESCE(${s.notes ?? null}, notes)
        WHERE id = ${id}
        RETURNING *
      `) as TrainingSessionRow[];
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Training session not found' });
      }
      return res.status(200).json(rowToTrainingSession(rows[0]));
    }

    if (req.method === 'DELETE') {
      if (!requireApiKey(req, res)) return;
      const rows = await sql`DELETE FROM training_sessions WHERE id = ${id} RETURNING id`;
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Training session not found' });
      }
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'PUT, DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (req.method === 'GET') {
    // ?from=YYYY-MM-DD keeps the Training Log from pulling the whole history
    // just to chart the last few weeks.
    const from = typeof req.query.from === 'string' ? req.query.from : null;
    const rows = (await sql`
      SELECT * FROM training_sessions
      WHERE (${from}::date IS NULL OR session_date >= ${from}::date)
      ORDER BY session_date DESC, created_at DESC
    `) as TrainingSessionRow[];
    return res.status(200).json(rows.map(rowToTrainingSession));
  }

  if (req.method === 'POST') {
    if (!requireApiKey(req, res)) return;
    const s = req.body as TrainingSessionInput;
    if (!s?.block) {
      return res.status(400).json({ error: 'block is required' });
    }
    const rows = (await sql`
      INSERT INTO training_sessions (session_date, block, minutes, source, attempted, solved, notes)
      VALUES (
        COALESCE(${s.sessionDate ?? null}::date, CURRENT_DATE),
        ${s.block}, ${s.minutes ?? 0}, ${s.source ?? null},
        ${s.attempted ?? 0}, ${s.solved ?? 0}, ${s.notes ?? null}
      )
      RETURNING *
    `) as TrainingSessionRow[];
    return res.status(201).json(rowToTrainingSession(rows[0]));
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method not allowed' });
};

interface TrainingAttemptInput {
  sessionId?: string;
  itemKind: string;
  itemId?: string;
  correct: boolean;
  candidateMiss?: boolean | null;
  candidatesWritten?: string;
  seconds?: number;
  thinkSeconds?: number;
}

export const trainingAttempts = async (
  req: VercelRequest,
  res: VercelResponse,
  id: string | undefined
) => {
  if (id && req.method === 'DELETE') {
    if (!requireApiKey(req, res)) return;
    const rows = await sql`DELETE FROM training_attempts WHERE id = ${id} RETURNING id`;
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Training attempt not found' });
    }
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'GET') {
    const from = typeof req.query.from === 'string' ? req.query.from : null;
    const sessionId = typeof req.query.sessionId === 'string' ? req.query.sessionId : null;
    const rows = (await sql`
      SELECT ta.* FROM training_attempts ta
      LEFT JOIN training_sessions ts ON ts.id = ta.session_id
      WHERE (${sessionId}::uuid IS NULL OR ta.session_id = ${sessionId}::uuid)
        -- COALESCE, not ts.session_date: an attempt with no session (drilling
        -- outside the scheduled queue) has a NULL session_date, and NULL >= date
        -- is NULL, so a date filter would drop every one of them.
        AND (${from}::date IS NULL
             OR COALESCE(ts.session_date, ta.created_at::date) >= ${from}::date)
      ORDER BY ta.created_at ASC
    `) as TrainingAttemptRow[];
    return res.status(200).json(rows.map(rowToTrainingAttempt));
  }

  if (req.method === 'POST') {
    if (!requireApiKey(req, res)) return;
    // Always a bulk insert: the daily queue flushes a whole session's
    // attempts at once rather than one round-trip per exercise.
    const attempts = req.body as TrainingAttemptInput[];
    if (!Array.isArray(attempts)) {
      return res.status(400).json({ error: 'Expected an array of training attempts' });
    }
    if (attempts.length === 0) {
      return res.status(201).json({ inserted: 0 });
    }
    const queries = attempts.map(
      a => sql`
        INSERT INTO training_attempts (
          session_id, item_kind, item_id, correct, candidate_miss, candidates_written,
          seconds, think_seconds
        ) VALUES (
          ${a.sessionId ?? null}, ${a.itemKind}, ${a.itemId ?? null}, ${a.correct},
          ${a.candidateMiss ?? null}, ${a.candidatesWritten ?? null},
          ${a.seconds ?? null}, ${a.thinkSeconds ?? null}
        )
      `
    );
    await sql.transaction(queries as Parameters<typeof sql.transaction>[0]);
    return res.status(201).json({ inserted: attempts.length });
  }

  res.setHeader('Allow', 'GET, POST, DELETE');
  return res.status(405).json({ error: 'Method not allowed' });
};

interface BookInput {
  title: string;
  author?: string;
  category?: string;
  level?: string;
  status?: string;
  source?: string;
  block?: string;
  progressDone?: number;
  progressTotal?: number;
  currentChapter?: string;
  priority?: number;
  notes?: string;
}

export const books = async (req: VercelRequest, res: VercelResponse, id: string | undefined) => {
  if (id) {
    if (req.method === 'PUT') {
      if (!requireApiKey(req, res)) return;
      const b = req.body as Partial<BookInput>;
      const rows = (await sql`
        UPDATE books SET
          title = COALESCE(${b.title ?? null}, title),
          author = COALESCE(${b.author ?? null}, author),
          category = COALESCE(${b.category ?? null}, category),
          level = COALESCE(${b.level ?? null}, level),
          status = COALESCE(${b.status ?? null}, status),
          source = COALESCE(${b.source ?? null}, source),
          block = COALESCE(${b.block ?? null}, block),
          progress_done = COALESCE(${b.progressDone ?? null}, progress_done),
          progress_total = COALESCE(${b.progressTotal ?? null}, progress_total),
          current_chapter = COALESCE(${b.currentChapter ?? null}, current_chapter),
          priority = COALESCE(${b.priority ?? null}, priority),
          notes = COALESCE(${b.notes ?? null}, notes)
        WHERE id = ${id}
        RETURNING *
      `) as BookRow[];
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Book not found' });
      }
      return res.status(200).json(rowToBook(rows[0]));
    }

    if (req.method === 'DELETE') {
      if (!requireApiKey(req, res)) return;
      const rows = await sql`DELETE FROM books WHERE id = ${id} RETURNING id`;
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Book not found' });
      }
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'PUT, DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (req.method === 'GET') {
    // Active books first, then reference, then archived — the same order the
    // training plan cares about them in.
    const rows = (await sql`
      SELECT * FROM books
      ORDER BY CASE status WHEN 'activo' THEN 0 WHEN 'referencia' THEN 1 ELSE 2 END,
               priority ASC NULLS LAST, title ASC
    `) as BookRow[];
    return res.status(200).json(rows.map(rowToBook));
  }

  if (req.method === 'POST') {
    if (!requireApiKey(req, res)) return;
    // Accepts either one book or an array, so the library can be seeded by
    // pasting a whole list instead of adding titles one at a time.
    const body = req.body as BookInput | BookInput[];
    const list = Array.isArray(body) ? body : [body];
    const valid = list.filter(b => b?.title?.trim());
    if (valid.length === 0) {
      return res.status(400).json({ error: 'title is required' });
    }
    const rows = (await sql`
      INSERT INTO books (
        title, author, category, level, status, source, block,
        progress_done, progress_total, current_chapter, priority, notes
      )
      SELECT * FROM UNNEST(
        ${valid.map(b => b.title.trim())}::text[],
        ${valid.map(b => b.author ?? null)}::text[],
        ${valid.map(b => b.category ?? null)}::text[],
        ${valid.map(b => b.level ?? null)}::text[],
        ${valid.map(b => b.status ?? 'archivado')}::text[],
        ${valid.map(b => b.source ?? null)}::text[],
        ${valid.map(b => b.block ?? null)}::text[],
        ${valid.map(b => b.progressDone ?? null)}::int[],
        ${valid.map(b => b.progressTotal ?? null)}::int[],
        ${valid.map(b => b.currentChapter ?? null)}::text[],
        ${valid.map(b => b.priority ?? null)}::int[],
        ${valid.map(b => b.notes ?? null)}::text[]
      )
      RETURNING *
    `) as BookRow[];
    return res.status(201).json(rows.map(rowToBook));
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method not allowed' });
};

interface HomeworkInput {
  assignedDate?: string;
  coach: string;
  recordingId?: string | number | null;
  task: string;
  kind?: string;
  dueDate?: string | null;
  status?: string;
  sourceUrl?: string;
  notes?: string;
}

export const homework = async (
  req: VercelRequest,
  res: VercelResponse,
  id: string | undefined
) => {
  if (id) {
    if (req.method === 'PUT') {
      if (!requireApiKey(req, res)) return;
      const h = req.body as Partial<HomeworkInput>;
      // dueDate is explicitly clearable: an assignment can lose its deadline,
      // and COALESCE alone would make null mean "leave alone".
      const clearDue = Object.prototype.hasOwnProperty.call(h, 'dueDate') && h.dueDate === null;
      const rows = (await sql`
        UPDATE homework SET
          assigned_date = COALESCE(${h.assignedDate ?? null}::date, assigned_date),
          coach = COALESCE(${h.coach ?? null}, coach),
          task = COALESCE(${h.task ?? null}, task),
          kind = COALESCE(${h.kind ?? null}, kind),
          due_date = CASE WHEN ${clearDue} THEN NULL
                          ELSE COALESCE(${h.dueDate ?? null}::date, due_date) END,
          status = COALESCE(${h.status ?? null}, status),
          source_url = COALESCE(${h.sourceUrl ?? null}, source_url),
          notes = COALESCE(${h.notes ?? null}, notes)
        WHERE id = ${id}
        RETURNING *
      `) as HomeworkRow[];
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Homework not found' });
      }
      return res.status(200).json(rowToHomework(rows[0]));
    }

    if (req.method === 'DELETE') {
      if (!requireApiKey(req, res)) return;
      const rows = await sql`DELETE FROM homework WHERE id = ${id} RETURNING id`;
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Homework not found' });
      }
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'PUT, DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (req.method === 'GET') {
    // Open work first, oldest deadline first — an overdue task should be the
    // first thing read, not something to scroll for.
    const rows = (await sql`
      SELECT * FROM homework
      ORDER BY CASE WHEN status = 'hecho' THEN 1 ELSE 0 END,
               due_date ASC NULLS LAST, assigned_date DESC
    `) as HomeworkRow[];
    return res.status(200).json(rows.map(rowToHomework));
  }

  if (req.method === 'POST') {
    if (!requireApiKey(req, res)) return;
    // Accepts one or many, so an importer can push a whole session at once.
    const body = req.body as HomeworkInput | HomeworkInput[];
    const list = Array.isArray(body) ? body : [body];
    const valid = list.filter(h => h?.task?.trim() && h?.coach?.trim());
    if (valid.length === 0) {
      return res.status(400).json({ error: 'coach and task are required' });
    }
    const queries = valid.map(
      h => sql`
        INSERT INTO homework (
          assigned_date, coach, recording_id, task, kind, due_date, status, source_url, notes
        ) VALUES (
          COALESCE(${h.assignedDate ?? null}::date, CURRENT_DATE),
          ${h.coach.trim()}, ${h.recordingId ?? null}, ${h.task.trim()}, ${h.kind ?? null},
          ${h.dueDate ?? null}::date, ${h.status ?? 'pendiente'},
          ${h.sourceUrl ?? null}, ${h.notes ?? null}
        )
        ON CONFLICT (recording_id, md5(task)) DO NOTHING
      `
    );
    await sql.transaction(queries as Parameters<typeof sql.transaction>[0]);
    const rows = (await sql`
      SELECT * FROM homework
      ORDER BY CASE WHEN status = 'hecho' THEN 1 ELSE 0 END,
               due_date ASC NULLS LAST, assigned_date DESC
    `) as HomeworkRow[];
    return res.status(201).json(rows.map(rowToHomework));
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method not allowed' });
};

interface ConceptInput {
  name: string;
  category: string;
  bookId?: string | null;
  sourceChapter?: string | null;
  sourceType?: string | null;
  status?: string;
  summary?: string | null;
  exampleFens?: string[];
  gameIds?: string[];
  confidence?: number | null;
  lastReviewed?: number | null;
  /** Applied server-side, so two screens reviewing the same concept both count. */
  reviewCountInc?: number;
}

export const concepts = async (req: VercelRequest, res: VercelResponse, id: string | undefined) => {
  if (id) {
    if (req.method === 'PUT') {
      if (!requireApiKey(req, res)) return;
      const c = req.body as Partial<ConceptInput>;
      /**
       * Present in the body = write it, even as null or []. Absent = leave it.
       *
       * COALESCE cannot express the first half: it treats null as "no value",
       * so clearing a summary, dropping the last example FEN or unlinking the
       * last game were all impossible — the write looked like it worked and
       * the old value stayed. `bookId` already carried a hand-rolled exception
       * for exactly this; generalising it removes the exception.
       *
       * `name`, `category` and `status` stay COALESCEd: they are NOT NULL, so
       * "clear it" is not a thing they can mean.
       */
      const has = (key: keyof ConceptInput) => Object.prototype.hasOwnProperty.call(c, key);
      const rows = (await sql`
        UPDATE concepts SET
          name = COALESCE(${c.name ?? null}, name),
          category = COALESCE(${c.category ?? null}, category),
          status = COALESCE(${c.status ?? null}, status),
          book_id = CASE WHEN ${has('bookId')} THEN ${c.bookId ?? null} ELSE book_id END,
          source_chapter =
            CASE WHEN ${has('sourceChapter')} THEN ${c.sourceChapter ?? null} ELSE source_chapter END,
          source_type =
            CASE WHEN ${has('sourceType')} THEN ${c.sourceType ?? null} ELSE source_type END,
          summary = CASE WHEN ${has('summary')} THEN ${c.summary ?? null} ELSE summary END,
          example_fens =
            CASE WHEN ${has('exampleFens')} THEN ${c.exampleFens ?? []} ELSE example_fens END,
          game_ids =
            CASE WHEN ${has('gameIds')} THEN ${c.gameIds ?? []}::uuid[] ELSE game_ids END,
          confidence = CASE WHEN ${has('confidence')} THEN ${c.confidence ?? null} ELSE confidence END,
          last_reviewed = CASE
            WHEN ${has('lastReviewed')}
            THEN ${c.lastReviewed ? new Date(c.lastReviewed).toISOString() : null}
            ELSE last_reviewed
          END,
          -- Bumped in SQL, like every other drillable table, so the Concepts
          -- tab and the daily queue can't clobber each other's total.
          review_count = review_count + ${c.reviewCountInc ?? 0}
        WHERE id = ${id}
        RETURNING *
      `) as ConceptRow[];
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Concept not found' });
      }
      return res.status(200).json(rowToConcept(rows[0]));
    }

    if (req.method === 'DELETE') {
      if (!requireApiKey(req, res)) return;
      const rows = await sql`DELETE FROM concepts WHERE id = ${id} RETURNING id`;
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Concept not found' });
      }
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'PUT, DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (req.method === 'GET') {
    const rows = (await sql`
      SELECT * FROM concepts ORDER BY created_at DESC
    `) as ConceptRow[];
    return res.status(200).json(rows.map(rowToConcept));
  }

  if (req.method === 'POST') {
    if (!requireApiKey(req, res)) return;
    const c = req.body as ConceptInput;
    if (!c?.name?.trim() || !c?.category) {
      return res.status(400).json({ error: 'name and category are required' });
    }
    const rows = (await sql`
      INSERT INTO concepts (
        name, category, book_id, source_chapter, source_type, status,
        summary, example_fens, game_ids, confidence, last_reviewed
      ) VALUES (
        ${c.name.trim()}, ${c.category}, ${c.bookId ?? null}, ${c.sourceChapter ?? null},
        ${c.sourceType ?? null}, ${c.status ?? 'to-study'}, ${c.summary ?? null},
        ${c.exampleFens ?? []}, ${c.gameIds ?? []}::uuid[], ${c.confidence ?? null},
        ${c.lastReviewed ? new Date(c.lastReviewed).toISOString() : null}
      )
      RETURNING *
    `) as ConceptRow[];
    return res.status(201).json(rowToConcept(rows[0]));
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method not allowed' });
};

/** The only fields a review outcome touches. */
interface RepertoireMovePatch {
  confidence?: number;
  lastReviewed?: number;
  reviewCountInc?: number;
}

/**
 * Rows are produced by scripts/import-repertoire-moves.mts, not by the app, so
 * there is no POST or DELETE here — only reading them and recording reviews.
 *
 * PATCH is deliberately partial, unlike PUT /repertoire-lines which replaces
 * every column. That endpoint's full-replace semantics already forced callers
 * to spread the whole object or silently null out plan/goldenRule/notes
 * (see the note in useDailyQueue). A review outcome has no business carrying
 * fen_before and comment along with it.
 */
export const repertoireMoves = async (
  req: VercelRequest,
  res: VercelResponse,
  id: string | undefined
) => {
  if (id) {
    if (req.method === 'PATCH') {
      if (!requireApiKey(req, res)) return;
      const m = req.body as RepertoireMovePatch;
      const rows = (await sql`
        UPDATE repertoire_moves SET
          confidence = COALESCE(${m.confidence ?? null}, confidence),
          last_reviewed = COALESCE(${m.lastReviewed ? new Date(m.lastReviewed).toISOString() : null}, last_reviewed),
          review_count = review_count + ${m.reviewCountInc ?? 0}
        WHERE id = ${id}
        RETURNING *
      `) as RepertoireMoveRow[];
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Repertoire move not found' });
      }
      return res.status(200).json(rowToRepertoireMove(rows[0]));
    }

    res.setHeader('Allow', 'PATCH');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (req.method === 'GET') {
    // Ordered so a chapter arrives ready to play front to back.
    const rows = (await sql`
      SELECT * FROM repertoire_moves ORDER BY chapter_no, depth, path_san
    `) as RepertoireMoveRow[];
    return res.status(200).json(rows.map(rowToRepertoireMove));
  }

  res.setHeader('Allow', 'GET');
  return res.status(405).json({ error: 'Method not allowed' });
};
