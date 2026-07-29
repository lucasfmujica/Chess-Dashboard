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
        AND (${from}::date IS NULL OR ts.session_date >= ${from}::date)
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
          session_id, item_kind, item_id, correct, candidate_miss, candidates_written, seconds
        ) VALUES (
          ${a.sessionId ?? null}, ${a.itemKind}, ${a.itemId ?? null}, ${a.correct},
          ${a.candidateMiss ?? null}, ${a.candidatesWritten ?? null}, ${a.seconds ?? null}
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
  sourceChapter?: string;
  sourceType?: string;
  status?: string;
  summary?: string;
  exampleFens?: string[];
  gameIds?: string[];
  confidence?: number;
  lastReviewed?: number;
}

export const concepts = async (req: VercelRequest, res: VercelResponse, id: string | undefined) => {
  if (id) {
    if (req.method === 'PUT') {
      if (!requireApiKey(req, res)) return;
      const c = req.body as Partial<ConceptInput>;
      // book_id is intentionally NOT COALESCEd against itself the same way:
      // unlinking a concept from its book means sending null, which COALESCE
      // would silently ignore. `bookId === undefined` = leave alone,
      // `bookId === null` = clear.
      const clearBook = Object.prototype.hasOwnProperty.call(c, 'bookId') && c.bookId === null;
      const rows = (await sql`
        UPDATE concepts SET
          name = COALESCE(${c.name ?? null}, name),
          category = COALESCE(${c.category ?? null}, category),
          book_id = CASE WHEN ${clearBook} THEN NULL ELSE COALESCE(${c.bookId ?? null}, book_id) END,
          source_chapter = COALESCE(${c.sourceChapter ?? null}, source_chapter),
          source_type = COALESCE(${c.sourceType ?? null}, source_type),
          status = COALESCE(${c.status ?? null}, status),
          summary = COALESCE(${c.summary ?? null}, summary),
          example_fens = COALESCE(${c.exampleFens ?? null}, example_fens),
          game_ids = COALESCE(${c.gameIds ?? null}::uuid[], game_ids),
          confidence = COALESCE(${c.confidence ?? null}, confidence),
          last_reviewed = COALESCE(
            ${c.lastReviewed ? new Date(c.lastReviewed).toISOString() : null}, last_reviewed
          )
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
