import type { VercelRequest, VercelResponse } from '@vercel/node';
import Anthropic from '@anthropic-ai/sdk';
import { sql } from './_db.js';
import { rowToHomework, type HomeworkRow } from './_trainingMapper.js';
import {
  EXTRACTION_SCHEMA,
  SYSTEM_PROMPT,
  coachFromTitle,
  dayOf,
  formatTranscript,
  isChessLesson,
  normalizeKind,
  type FathomMeeting,
} from './_fathomExtract.js';

/**
 * Weekly import of coaching homework from Fathom.
 *
 * Exists because Fathom's own action-item detector extracts nothing from these
 * lessons: the coaches assign verbally ("bien, esa es la tarea para el hogar")
 * with no commitment language, so the assignment survives only in memory. This
 * reads the transcript and pulls the assignments out directly.
 *
 * The extraction rules — most lessons have no assignment, and the Spanish ASR
 * mangles proper nouns — live with the prompt in _fathomExtract.ts.
 */

/** Fallback window when the homework table is empty. */
const DEFAULT_LOOKBACK_DAYS = 30;

const FATHOM_BASE = 'https://api.fathom.ai/external/v1/meetings';

interface FathomPage {
  items?: FathomMeeting[];
  next_cursor?: string | null;
}

async function fetchChessLessons(apiKey: string, createdAfter: string): Promise<FathomMeeting[]> {
  const lessons: FathomMeeting[] = [];
  let cursor: string | undefined;

  // Bounded: a weekly run sees at most a handful of pages, and an unbounded
  // loop here would be a runaway on an unexpected cursor response.
  for (let page = 0; page < 10; page += 1) {
    const url = new URL(FATHOM_BASE);
    url.searchParams.set('created_after', createdAfter);
    url.searchParams.set('include_transcript', 'true');
    if (cursor) url.searchParams.set('cursor', cursor);

    const res = await fetch(url, { headers: { 'X-Api-Key': apiKey } });
    if (!res.ok) {
      throw new Error(`Fathom ${res.status}: ${await res.text().catch(() => '')}`);
    }
    const body = (await res.json()) as FathomPage;

    for (const meeting of body.items ?? []) {
      if (isChessLesson(meeting)) lessons.push(meeting);
    }

    if (!body.next_cursor) break;
    cursor = body.next_cursor;
  }

  return lessons;
}

interface ExtractedAssignment {
  task: string;
  kind: string;
  due_date: string;
  quote: string;
  uncertain_terms: string[];
}

async function extractAssignments(
  anthropic: Anthropic,
  meeting: FathomMeeting,
  transcript: string
): Promise<ExtractedAssignment[]> {
  const response = await anthropic.messages.create({
    model: 'claude-opus-5',
    // Thinking is on by default on Opus 5 and shares this budget with the
    // response, so this is sized well above the small JSON payload.
    max_tokens: 8000,
    system: SYSTEM_PROMPT,
    output_config: { format: { type: 'json_schema', schema: EXTRACTION_SCHEMA } },
    messages: [
      {
        role: 'user',
        content:
          `Clase: ${meeting.title ?? 'sin título'}\n` +
          `Fecha: ${dayOf(meeting.created_at)}\n\n` +
          `Transcripción:\n${transcript}`,
      },
    ],
  });

  // A safety refusal returns 200 with an empty content array — reading
  // content[0] unconditionally would throw.
  if (response.stop_reason === 'refusal') return [];

  const block = response.content.find(b => b.type === 'text');
  if (!block || block.type !== 'text') return [];

  try {
    const parsed = JSON.parse(block.text) as { assignments?: ExtractedAssignment[] };
    return parsed.assignments ?? [];
  } catch {
    return [];
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Vercel sends `Authorization: Bearer $CRON_SECRET` on scheduled invocations.
  // Without this the route is a public endpoint that spends Anthropic tokens.
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const fathomKey = process.env.FATHOM_API_KEY;
  if (!fathomKey) {
    return res.status(500).json({ error: 'FATHOM_API_KEY is not set' });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY is not set' });
  }

  // Resume from the newest assignment already stored, so a re-run never
  // re-reads transcripts that produced rows. Falls back to a short window on
  // an empty table rather than the whole history.
  const [{ latest }] = (await sql`
    SELECT to_char(max(assigned_date), 'YYYY-MM-DD') AS latest FROM homework
  `) as { latest: string | null }[];
  const createdAfter = latest
    ? new Date(`${latest}T00:00:00Z`).toISOString()
    : new Date(Date.now() - DEFAULT_LOOKBACK_DAYS * 86_400_000).toISOString();

  const anthropic = new Anthropic();
  const report: {
    recordingId: number;
    title: string;
    found: number;
    inserted: number;
    flagged: string[];
  }[] = [];

  let lessons: FathomMeeting[];
  try {
    lessons = await fetchChessLessons(fathomKey, createdAfter);
  } catch (err) {
    return res.status(502).json({ error: err instanceof Error ? err.message : 'Fathom failed' });
  }

  for (const meeting of lessons) {
    const transcript = formatTranscript(meeting.transcript ?? []);
    if (!transcript.trim()) continue;

    let assignments: ExtractedAssignment[] = [];
    try {
      assignments = await extractAssignments(anthropic, meeting, transcript);
    } catch (err) {
      // One bad lesson must not abort the rest of the run.
      console.error(`Extraction failed for ${meeting.recording_id}`, err);
      continue;
    }

    const assignedDate = dayOf(meeting.created_at);
    const coach = coachFromTitle(meeting.title ?? '');
    let inserted = 0;
    const flagged: string[] = [];

    for (const a of assignments) {
      if (!a.task?.trim()) continue;
      flagged.push(...(a.uncertain_terms ?? []));

      // Dedupe is on (recording_id, md5(task)), so a re-run over the same
      // lesson is a no-op even if the extraction wording drifts slightly.
      const rows = (await sql`
        INSERT INTO homework (
          assigned_date, coach, recording_id, task, kind, due_date, source_url, notes
        ) VALUES (
          ${assignedDate}::date, ${coach}, ${meeting.recording_id}, ${a.task.trim()},
          ${normalizeKind(a.kind)},
          ${a.due_date?.trim() ? a.due_date.trim() : null}::date,
          ${meeting.url ?? null},
          ${
            `Extraída automáticamente. Textual: "${a.quote}"` +
            (a.uncertain_terms?.length
              ? `\nTérminos dudosos del reconocedor de voz: ${a.uncertain_terms.join(', ')}. Verificalos antes de confiar en la consigna.`
              : '')
          }
        )
        ON CONFLICT (recording_id, md5(task)) DO NOTHING
        RETURNING *
      `) as HomeworkRow[];
      if (rows.length > 0) inserted += 1;
    }

    report.push({
      recordingId: meeting.recording_id,
      title: meeting.title ?? '',
      found: assignments.length,
      inserted,
      flagged,
    });
  }

  const open = (await sql`
    SELECT * FROM homework WHERE status <> 'hecho'
    ORDER BY due_date ASC NULLS LAST, assigned_date DESC
  `) as HomeworkRow[];

  return res.status(200).json({
    since: createdAfter,
    lessonsScanned: lessons.length,
    inserted: report.reduce((sum, r) => sum + r.inserted, 0),
    perLesson: report,
    open: open.map(rowToHomework),
  });
}
