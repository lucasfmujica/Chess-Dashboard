/**
 * Pure helpers for the Fathom homework import (see api/cron.ts).
 *
 * Kept dependency-free and separate from the handler so the parts that decide
 * *which* lessons are read and *how* their transcripts are shaped can be
 * tested without an API key or a network call.
 */

/** Only lessons whose title contains this are considered. */
export const TITLE_MATCH = 'clase de ajedrez';

export const HOMEWORK_KINDS = [
  'final',
  'calculo',
  'repertorio',
  'concepto',
  'lectura',
  'partida',
] as const;

export type HomeworkKindName = (typeof HOMEWORK_KINDS)[number];

export interface FathomTranscriptSegment {
  speaker?: { display_name?: string | null } | null;
  text?: string | null;
  timestamp?: string | null;
}

export interface FathomMeeting {
  recording_id: number;
  title?: string | null;
  created_at?: string | null;
  url?: string | null;
  transcript?: FathomTranscriptSegment[] | null;
}

/** Whether a Fathom meeting is one of the chess lessons. */
export const isChessLesson = (meeting: FathomMeeting): boolean =>
  (meeting.title ?? '').toLowerCase().includes(TITLE_MATCH);

/**
 * Flatten Fathom's transcript segments into speaker-attributed lines,
 * dropping segments whose text is empty (the ASR emits a fair number).
 */
export const formatTranscript = (segments: FathomTranscriptSegment[]): string =>
  segments
    .filter(s => (s.text ?? '').trim().length > 0)
    .map(s => `${s.speaker?.display_name ?? 'Speaker'}: ${(s.text ?? '').trim()}`)
    .join('\n');

/** Derive the coach from the lesson title; both run their own sessions. */
export const coachFromTitle = (title: string): string => {
  const lower = title.toLowerCase();
  if (lower.includes('juan cruz')) return 'Juan Cruz';
  if (lower.includes('toto')) return 'Toto';
  return 'Desconocido';
};

/** Calendar day of an ISO timestamp, as 'YYYY-MM-DD'. */
export const dayOf = (iso: string | null | undefined): string =>
  (iso ?? new Date().toISOString()).slice(0, 10);

/** Normalize a model-supplied kind, or null when it isn't one of ours. */
export const normalizeKind = (kind: string | undefined): HomeworkKindName | null =>
  HOMEWORK_KINDS.includes(kind as HomeworkKindName) ? (kind as HomeworkKindName) : null;

/**
 * `due_date` is a plain string rather than a nullable union: structured
 * outputs supports `anyOf`, but a single type with a documented empty-string
 * sentinel is simpler to validate and impossible to get subtly wrong.
 */
export const EXTRACTION_SCHEMA = {
  type: 'object',
  properties: {
    assignments: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          task: {
            type: 'string',
            description:
              'The assignment in Spanish, as an instruction the player can act on. Include quantities and conditions that were stated.',
          },
          kind: { type: 'string', enum: [...HOMEWORK_KINDS] },
          due_date: {
            type: 'string',
            description:
              'YYYY-MM-DD if a deadline was stated or clearly implied (e.g. "para la clase que viene"). Empty string if no deadline was given.',
          },
          quote: {
            type: 'string',
            description: 'The verbatim transcript phrase the assignment is taken from.',
          },
          uncertain_terms: {
            type: 'array',
            items: { type: 'string' },
            description:
              'Words in the quote that look like speech-recognition errors — mangled names of openings, players, or books. Empty array if none.',
          },
        },
        required: ['task', 'kind', 'due_date', 'quote', 'uncertain_terms'],
        additionalProperties: false,
      },
    },
  },
  required: ['assignments'],
  additionalProperties: false,
} as const;

/**
 * The extraction instructions.
 *
 * Both numbered rules come from doing the first import by hand:
 *   1. Four of six lessons contained no assignment at all. An extractor that
 *      always finds one will invent them, which is worse than missing them.
 *   2. The Spanish ASR rendered "razonamiento" as "razonismo", which reads
 *      convincingly like the name of a chess opening. The model must flag
 *      terms it is unsure of rather than completing them.
 */
export const SYSTEM_PROMPT = `Extraés tarea asignada en clases de ajedrez, a partir de transcripciones automáticas en español rioplatense.

Los profes asignan hablando, sin lenguaje de compromiso: "bien, esa es la tarea para el hogar", "para la semana que viene quiero que...", "te propongo que practiques...". No hay listas ni deadlines explícitos la mayoría de las veces.

Dos reglas que importan más que encontrar tareas:

1. LA MAYORÍA DE LAS CLASES NO TIENE TAREA. Muchas son revisión de repertorio o resolución de ejercicios de punta a punta, sin nada asignado. Si no hay una asignación explícita, devolvé "assignments": []. Una lista vacía es una respuesta correcta y esperada. No infieras tarea a partir de temas que se discutieron: que hayan analizado finales de torre no significa que le pidieron practicar finales de torre.

2. LA TRANSCRIPCIÓN TIENE ERRORES DE RECONOCIMIENTO. Los nombres propios se rompen: aperturas, jugadores, libros. Un ejemplo real: el reconocedor escribió "razonismo" donde el profe dijo "razonamiento", y leído rápido parece el nombre de una apertura. Nunca completes ni corrijas un nombre propio adivinando. Si una palabra de la cita parece un error de transcripción, ponela en uncertain_terms y describí la tarea sin ella.

Escribí task en español, como una instrucción accionable, conservando cantidades y condiciones que se dijeron ("4 veces", "nivel 4 o superior", "2 con blancas a ganar"). quote va textual de la transcripción, sin arreglar.`;
