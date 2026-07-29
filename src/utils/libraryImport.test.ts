import { describe, it, expect } from 'vitest';
import { parseLibraryLine, parseLibrary, parseNote } from './libraryImport';

describe('parseLibraryLine', () => {
  it('parses a full active Chessable row with progress and block', () => {
    const parsed = parseLibraryLine(
      'How to Reassess Your Chess (4th Ed) | Jeremy Silman | chessable | activo | viernes-conceptos · 215/516'
    );
    expect(parsed).toMatchObject({
      title: 'How to Reassess Your Chess (4th Ed)',
      author: 'Jeremy Silman',
      source: 'chessable',
      status: 'activo',
      block: 'viernes-conceptos',
      progressDone: 215,
      progressTotal: 516,
    });
  });

  it('keeps dashes inside titles intact', () => {
    // The old ' - ' splitter turned this into title 'Tal'.
    const parsed = parseLibraryLine('Tal - Botvinnik 1960 | Mikhail Tal | pdf | archivado |');
    expect(parsed?.title).toBe('Tal - Botvinnik 1960');
    expect(parsed?.author).toBe('Mikhail Tal');
  });

  it('keeps date ranges inside titles intact', () => {
    const parsed = parseLibraryLine(
      'Mis Mejores Partidas 1924-1937 | Alexander Alekhine | pdf | archivado |'
    );
    expect(parsed?.title).toBe('Mis Mejores Partidas 1924-1937');
    expect(parsed?.author).toBe('Alexander Alekhine');
  });

  it('accepts accented status words', () => {
    expect(parseLibraryLine('X | Y | pdf | Archivado |')?.status).toBe('archivado');
    expect(parseLibraryLine('X | Y | pdf | REFERENCIA |')?.status).toBe('referencia');
  });

  it('defaults an unknown or missing status to archivado, never activo', () => {
    // Defaulting the other way would silently break the max-3-active rule.
    expect(parseLibraryLine('Some Book')?.status).toBe('archivado');
    expect(parseLibraryLine('Some Book | Author | pdf | leyendo |')?.status).toBe('archivado');
  });

  it('handles a title-only line', () => {
    expect(parseLibraryLine('Just A Title')).toMatchObject({
      title: 'Just A Title',
      author: undefined,
      status: 'archivado',
    });
  });

  it('returns null when there is no title', () => {
    expect(parseLibraryLine('')).toBeNull();
    expect(parseLibraryLine('  |  |  |  ')).toBeNull();
  });

  it('preserves free-text notes that carry a real instruction', () => {
    const parsed = parseLibraryLine(
      'Chess Tactics from Scratch | Jacob Aagaard | chessable | archivado | 230/741 · pausar · reactivar cuando se agoten blunders propios'
    );
    expect(parsed?.progressDone).toBe(230);
    expect(parsed?.progressTotal).toBe(741);
    expect(parsed?.notes).toContain('reactivar cuando se agoten blunders propios');
    expect(parsed?.notes).toContain('pausar');
  });
});

describe('parseNote', () => {
  it('separates block, progress and prose', () => {
    expect(parseNote('miercoles-finales · 58/358 · empezar por capítulos de torre')).toEqual({
      block: 'miercoles-finales',
      progressDone: 58,
      progressTotal: 358,
      notes: 'empezar por capítulos de torre',
    });
  });

  it('handles a bare percentage note with no counts', () => {
    expect(parseNote('5min-diarios · 26% · orden módulos 12-14-13-7')).toMatchObject({
      block: '5min-diarios',
      progressDone: undefined,
      progressTotal: undefined,
    });
  });

  it('returns all-undefined for an empty note', () => {
    expect(parseNote('')).toEqual({
      block: undefined,
      progressDone: undefined,
      progressTotal: undefined,
      notes: undefined,
    });
  });
});

describe('parseLibrary', () => {
  it('parses a multi-line paste and skips blanks', () => {
    const books = parseLibrary(
      [
        'How to Reassess Your Chess (4th Ed) | Jeremy Silman | chessable | activo | viernes-conceptos · 215/516',
        '',
        'Los 100 finales que hay que saber | Jesús de la Villa | chessable | activo | miercoles-finales · 58/358',
        '   ',
        'Práctica de los finales de torre | Viktor Korchnói | pdf | referencia | consultar por posición concreta',
      ].join('\n')
    );
    expect(books).toHaveLength(3);
    expect(books.filter(b => b.status === 'activo')).toHaveLength(2);
    expect(books[2]).toMatchObject({ status: 'referencia', source: 'pdf' });
  });
});
