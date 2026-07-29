import { describe, it, expect } from 'vitest';
import {
  isChessLesson,
  formatTranscript,
  coachFromTitle,
  dayOf,
  normalizeKind,
  EXTRACTION_SCHEMA,
  SYSTEM_PROMPT,
  type FathomMeeting,
} from './_fathomExtract';

/** The real lesson titles, as they come back from Fathom. */
const TITLES = {
  toto: 'Clase de Ajedrez - CM Toto Arias',
  totoPrefixed: 'Chess: Clase de Ajedrez - CM Toto Arias',
  juanCruz: 'Clase de Ajedrez Grupal - FM Juan Cruz Arias',
  therapy: 'Terapia 27/07',
};

const meeting = (title: string): FathomMeeting => ({ recording_id: 1, title });

describe('isChessLesson', () => {
  it('matches every real chess-lesson title shape', () => {
    expect(isChessLesson(meeting(TITLES.toto))).toBe(true);
    expect(isChessLesson(meeting(TITLES.totoPrefixed))).toBe(true);
    expect(isChessLesson(meeting(TITLES.juanCruz))).toBe(true);
  });

  it('excludes non-chess meetings', () => {
    // Therapy sessions sit in the same account and must never be read.
    expect(isChessLesson(meeting(TITLES.therapy))).toBe(false);
    expect(isChessLesson(meeting('Weekly standup'))).toBe(false);
  });

  it('is case-insensitive and safe on a missing title', () => {
    expect(isChessLesson(meeting('CLASE DE AJEDREZ con Toto'))).toBe(true);
    expect(isChessLesson({ recording_id: 1 })).toBe(false);
    expect(isChessLesson({ recording_id: 1, title: null })).toBe(false);
  });
});

describe('coachFromTitle', () => {
  it('distinguishes the two coaches', () => {
    expect(coachFromTitle(TITLES.toto)).toBe('Toto');
    expect(coachFromTitle(TITLES.juanCruz)).toBe('Juan Cruz');
  });

  it('prefers Juan Cruz when both names appear', () => {
    // "Juan Cruz Arias" and "Toto Arias" are brothers — a title naming both
    // must not silently attribute the lesson to Toto by ordering accident.
    expect(coachFromTitle('Clase de Ajedrez - Juan Cruz y Toto Arias')).toBe('Juan Cruz');
  });

  it('falls back rather than guessing', () => {
    expect(coachFromTitle('Clase de Ajedrez')).toBe('Desconocido');
    expect(coachFromTitle('')).toBe('Desconocido');
  });
});

describe('formatTranscript', () => {
  it('renders speaker-attributed lines', () => {
    expect(
      formatTranscript([
        { speaker: { display_name: 'Toto Arias' }, text: 'Esa es la tarea para el hogar.' },
        { speaker: { display_name: 'Lucas Mujica' }, text: 'Dale.' },
      ])
    ).toBe('Toto Arias: Esa es la tarea para el hogar.\nLucas Mujica: Dale.');
  });

  it('drops empty and whitespace-only segments the ASR emits', () => {
    expect(
      formatTranscript([
        { speaker: { display_name: 'A' }, text: 'hola' },
        { speaker: { display_name: 'A' }, text: '' },
        { speaker: { display_name: 'A' }, text: '   ' },
        { speaker: { display_name: 'A' }, text: null },
      ])
    ).toBe('A: hola');
  });

  it('falls back to a placeholder for an unattributed segment', () => {
    // Fathom labels unmatched voices "Speaker 1" or omits the speaker; the
    // line still carries content and must not be dropped.
    expect(formatTranscript([{ speaker: null, text: 'jugá esto' }])).toBe('Speaker: jugá esto');
  });

  it('returns empty string for an empty transcript', () => {
    expect(formatTranscript([])).toBe('');
  });
});

describe('dayOf', () => {
  it('takes the calendar day of an ISO timestamp', () => {
    expect(dayOf('2026-07-28T22:30:00Z')).toBe('2026-07-28');
  });

  it('falls back to today rather than producing an invalid date', () => {
    expect(dayOf(null)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(dayOf(undefined)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('normalizeKind', () => {
  it('accepts the kinds the database allows', () => {
    expect(normalizeKind('final')).toBe('final');
    expect(normalizeKind('calculo')).toBe('calculo');
  });

  it('rejects anything else, so a hallucinated kind cannot break the insert', () => {
    // The column has a CHECK constraint; an unmapped value must become NULL
    // rather than failing the whole row.
    expect(normalizeKind('tactica')).toBeNull();
    expect(normalizeKind('Final')).toBeNull();
    expect(normalizeKind(undefined)).toBeNull();
  });
});

describe('EXTRACTION_SCHEMA', () => {
  it('forbids extra properties, as structured outputs requires', () => {
    expect(EXTRACTION_SCHEMA.additionalProperties).toBe(false);
    expect(EXTRACTION_SCHEMA.properties.assignments.items.additionalProperties).toBe(false);
  });

  it('requires every field, so the handler never reads an absent key', () => {
    const item = EXTRACTION_SCHEMA.properties.assignments.items;
    expect([...item.required].sort()).toEqual(
      ['due_date', 'kind', 'quote', 'task', 'uncertain_terms'].sort()
    );
    expect(Object.keys(item.properties).sort()).toEqual([...item.required].sort());
  });

  it('constrains kind to the database enum', () => {
    expect([...EXTRACTION_SCHEMA.properties.assignments.items.properties.kind.enum]).toEqual([
      'final',
      'calculo',
      'repertorio',
      'concepto',
      'lectura',
      'partida',
    ]);
  });

  it('uses a plain string for due_date, not a nullable union', () => {
    // Structured outputs supports anyOf, but an empty-string sentinel is
    // simpler to validate — the handler maps '' to SQL NULL.
    expect(EXTRACTION_SCHEMA.properties.assignments.items.properties.due_date.type).toBe('string');
  });
});

describe('SYSTEM_PROMPT', () => {
  it('tells the model an empty result is correct', () => {
    // Four of the six backfilled lessons had no assignment. Without this the
    // extractor invents one, which is worse than missing it.
    expect(SYSTEM_PROMPT).toMatch(/assignments": \[\]/);
    expect(SYSTEM_PROMPT.toLowerCase()).toContain('no tiene tarea');
  });

  it('carries the concrete ASR trap it must not repeat', () => {
    // "razonismo" was really "razonamiento" and reads like an opening name.
    expect(SYSTEM_PROMPT).toContain('razonismo');
    expect(SYSTEM_PROMPT).toContain('razonamiento');
    expect(SYSTEM_PROMPT).toContain('uncertain_terms');
  });
});
