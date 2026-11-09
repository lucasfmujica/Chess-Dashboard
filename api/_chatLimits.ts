/**
 * Caps on the diagnostic chat, which spends model tokens on every request.
 * Kept apart from api/prep.ts so they can be tested without a database.
 */

export const CHAT_MAX_TURNS = 24;
export const CHAT_MAX_CONTENT_CHARS = 8000;
export const CHAT_MAX_TOTAL_CHARS = 48000;
export const CHAT_DAILY_LIMIT = 40;

/** Just the fields the limits read; the full shape lives in api/prep.ts. */
export interface ChatTurnLike {
  role?: string;
  text?: unknown;
  results?: { output?: unknown }[];
}

/** Every string a turn carries to the provider: message text and tool outputs. */
const turnContents = (turn: ChatTurnLike): string[] => {
  if (!turn || typeof turn !== 'object') return [];
  if (turn.role === 'tool') {
    return Array.isArray(turn.results) ? turn.results.map(r => String(r?.output ?? '')) : [];
  }
  return typeof turn.text === 'string' ? [turn.text] : [];
};

/** A message naming the first limit the turns break, or null when they fit. */
export const chatTurnsTooBig = (turns: ChatTurnLike[]): string | null => {
  if (turns.length > CHAT_MAX_TURNS) return `Demasiados turnos (máximo ${CHAT_MAX_TURNS}).`;
  let total = 0;
  for (const turn of turns) {
    for (const content of turnContents(turn)) {
      if (content.length > CHAT_MAX_CONTENT_CHARS) {
        return `Un mensaje supera ${CHAT_MAX_CONTENT_CHARS} caracteres.`;
      }
      total += content.length;
    }
  }
  if (total > CHAT_MAX_TOTAL_CHARS) return `La conversación supera ${CHAT_MAX_TOTAL_CHARS} caracteres.`;
  return null;
};

/** Postgres 42P01: the migration that creates the table was never applied. */
export const isMissingTable = (err: unknown): boolean =>
  (err as { code?: string } | null)?.code === '42P01' ||
  /relation .* does not exist/i.test(err instanceof Error ? err.message : '');
