import { describe, it, expect } from 'vitest';
import {
  activeLimitBreach,
  bookProgressPct,
  isHomeworkOverdue,
  ACTIVE_LIMITS,
  type Book,
  type Homework,
} from './training';

const book = (over: Partial<Book>): Book =>
  ({ id: 'b', title: 'T', status: 'archivado', createdAt: 0, ...over }) as Book;

describe('activeLimitBreach', () => {
  it('blocks a third active Chessable course', () => {
    const existing = [
      book({ id: '1', source: 'chessable', status: 'activo' }),
      book({ id: '2', source: 'chessable', status: 'activo' }),
    ];
    const candidate = book({ id: '3', source: 'chessable' });
    const breach = activeLimitBreach(candidate, [...existing, candidate]);
    expect(breach).not.toBeNull();
    expect(breach?.limit).toBe(ACTIVE_LIMITS.chessable);
    expect(breach?.current).toHaveLength(2);
  });

  it('allows a second Chessable course when only one is active', () => {
    const existing = [book({ id: '1', source: 'chessable', status: 'activo' })];
    const candidate = book({ id: '2', source: 'chessable' });
    expect(activeLimitBreach(candidate, [...existing, candidate])).toBeNull();
  });

  it('blocks a second video course, since the limit there is one', () => {
    const existing = [book({ id: '1', source: 'curso', status: 'activo' })];
    const candidate = book({ id: '2', source: 'curso' });
    expect(activeLimitBreach(candidate, [...existing, candidate])?.limit).toBe(1);
  });

  it('does not cap PDFs — game material is not a course', () => {
    // The real library has Silman + de la Villa (chessable), Studer (curso)
    // AND Fischer (pdf) all active, which is not a violation of the rule.
    const existing = [
      book({ id: '1', source: 'chessable', status: 'activo' }),
      book({ id: '2', source: 'chessable', status: 'activo' }),
      book({ id: '3', source: 'curso', status: 'activo' }),
      book({ id: '4', source: 'pdf', status: 'activo' }),
    ];
    const candidate = book({ id: '5', source: 'pdf' });
    expect(activeLimitBreach(candidate, [...existing, candidate])).toBeNull();
  });

  it('ignores books of other sources when counting', () => {
    const existing = [
      book({ id: '1', source: 'pdf', status: 'activo' }),
      book({ id: '2', source: 'pdf', status: 'activo' }),
    ];
    const candidate = book({ id: '3', source: 'chessable' });
    expect(activeLimitBreach(candidate, [...existing, candidate])).toBeNull();
  });

  it('does not count the book against itself when it is already active', () => {
    const already = book({ id: '1', source: 'curso', status: 'activo' });
    expect(activeLimitBreach(already, [already])).toBeNull();
  });

  it('treats an unknown or missing source as uncapped', () => {
    expect(activeLimitBreach(book({ source: undefined }), [])).toBeNull();
    expect(activeLimitBreach(book({ source: 'video-random' }), [])).toBeNull();
  });
});

describe('bookProgressPct', () => {
  it('computes a percentage from the counts', () => {
    expect(bookProgressPct(book({ progressDone: 215, progressTotal: 516 }))).toBe(42);
  });

  it('is undefined without a total, and safe when the total is zero', () => {
    expect(bookProgressPct(book({ progressDone: 5 }))).toBeUndefined();
    expect(bookProgressPct(book({ progressDone: 5, progressTotal: 0 }))).toBeUndefined();
  });

  it('treats a missing done count as zero', () => {
    expect(bookProgressPct(book({ progressTotal: 100 }))).toBe(0);
  });
});

describe('isHomeworkOverdue', () => {
  const hw = (over: Partial<Homework>): Homework =>
    ({ id: 'h', assignedDate: '2026-07-28', coach: 'Toto', task: 't', status: 'pendiente', createdAt: 0, ...over }) as Homework;

  it('is overdue once the due date has passed', () => {
    expect(isHomeworkOverdue(hw({ dueDate: '2026-08-04' }), '2026-08-05')).toBe(true);
  });

  it('is not overdue on the due date itself', () => {
    expect(isHomeworkOverdue(hw({ dueDate: '2026-08-04' }), '2026-08-04')).toBe(false);
  });

  it('is never overdue once done', () => {
    expect(isHomeworkOverdue(hw({ dueDate: '2026-01-01', status: 'hecho' }), '2026-08-05')).toBe(
      false
    );
  });

  it('is never overdue without a due date', () => {
    expect(isHomeworkOverdue(hw({}), '2026-08-05')).toBe(false);
  });
});
