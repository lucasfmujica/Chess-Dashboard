import { describe, expect, it } from 'vitest';
import {
  CHAT_MAX_CONTENT_CHARS,
  CHAT_MAX_TOTAL_CHARS,
  CHAT_MAX_TURNS,
  chatTurnsTooBig,
  isMissingTable,
} from './_chatLimits';

const user = (text: string) => ({ role: 'user', text });

describe('chatTurnsTooBig', () => {
  it('accepts a conversation within every limit', () => {
    expect(chatTurnsTooBig([user('hola'), { role: 'assistant', text: 'ok' }])).toBeNull();
  });

  it('accepts exactly the maximum turns and content size', () => {
    expect(chatTurnsTooBig(Array.from({ length: CHAT_MAX_TURNS }, () => user('x')))).toBeNull();
    expect(chatTurnsTooBig([user('x'.repeat(CHAT_MAX_CONTENT_CHARS))])).toBeNull();
  });

  it('rejects too many turns', () => {
    expect(chatTurnsTooBig(Array.from({ length: CHAT_MAX_TURNS + 1 }, () => user('x')))).toMatch(/turnos/);
  });

  it('rejects one oversized message', () => {
    expect(chatTurnsTooBig([user('x'.repeat(CHAT_MAX_CONTENT_CHARS + 1))])).toMatch(/mensaje/);
  });

  it('counts tool outputs toward the per-message limit', () => {
    const turn = { role: 'tool', results: [{ id: '1', output: 'x'.repeat(CHAT_MAX_CONTENT_CHARS + 1) }] };
    expect(chatTurnsTooBig([turn])).toMatch(/mensaje/);
  });

  it('rejects a total above the cap even when each message fits', () => {
    const perTurn = CHAT_MAX_CONTENT_CHARS;
    const count = Math.ceil(CHAT_MAX_TOTAL_CHARS / perTurn) + 1;
    expect(count).toBeLessThanOrEqual(CHAT_MAX_TURNS);
    expect(chatTurnsTooBig(Array.from({ length: count }, () => user('x'.repeat(perTurn))))).toMatch(
      /conversación/
    );
  });
});

describe('isMissingTable', () => {
  it('recognises Postgres 42P01 and its message', () => {
    expect(isMissingTable({ code: '42P01' })).toBe(true);
    expect(isMissingTable(new Error('relation "chat_usage_daily" does not exist'))).toBe(true);
    expect(isMissingTable(new Error('connection refused'))).toBe(false);
    expect(isMissingTable(null)).toBe(false);
  });
});
