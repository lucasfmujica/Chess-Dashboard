import { describe, expect, it } from 'vitest';
import {
  chapterReview,
  ecoMatches,
  formatPoints,
  linkGamesToChapter,
  openingMatches,
  parseEcoRange,
  scoreGames,
} from './studyChapterLinks';
import type { StudyChapter, StudyChapterHeader, StudyMoveNode } from './studyPgn';
import type { Game, RepertoireMove } from '../types/chess';

const header = (over: Partial<StudyChapterHeader> = {}): StudyChapterHeader => ({
  chapterName: '04 BLANCAS - vs 1...c5 (simetrica)',
  eco: 'A39',
  opening: 'English Opening: Symmetrical Variation',
  studyName: 'Repertorio',
  ...over,
});

const game = (over: Partial<Game>): Game => ({
  elo: 1800,
  color: 'W',
  result: 'W',
  opp: 'X',
  opp_elo: 1800,
  eco: 'A39',
  tournament: 'T',
  rated: true,
  ...over,
});

const line = (sans: string[]): StudyMoveNode[] =>
  sans.map((san, i) => ({ san, moveNumber: Math.floor(i / 2) + 1, turn: i % 2 ? 'b' : 'w', variations: [] }));

const chapter = (h: Partial<StudyChapterHeader>, sans: string[] = []): StudyChapter => ({
  header: header(h),
  mainline: line(sans),
});

type Move = Parameters<typeof chapterReview>[1][number];
const move = (over: Partial<RepertoireMove>): Move => ({
  chapterNo: 4,
  chapterName: '04 BLANCAS - vs 1...c5',
  color: 'W',
  pathSan: '',
  expectedSan: 'c4',
  role: 'main',
  ...over,
});

const NOW = Date.UTC(2026, 10, 10);
const DAY = 86_400_000;

describe('parseEcoRange / ecoMatches', () => {
  it('parses a single code and a range', () => {
    expect(parseEcoRange('A00')).toEqual([0, 0]);
    expect(parseEcoRange('B30-B39')).toEqual([130, 139]);
    expect(parseEcoRange('b39 – b30')).toEqual([130, 139]);
    expect(parseEcoRange('')).toBeNull();
    expect(parseEcoRange('Unknown')).toBeNull();
  });

  it('matches exact codes and codes inside a range', () => {
    expect(ecoMatches('A39', 'A39')).toBe(true);
    expect(ecoMatches('A39', 'A38')).toBe(false);
    expect(ecoMatches('B30-B39', 'B33')).toBe(true);
    expect(ecoMatches('B30-B39', 'B40')).toBe(false);
    expect(ecoMatches('B30', 'Unknown')).toBe(false);
  });
});

describe('openingMatches', () => {
  it('accepts the same opening or a deeper variation of it', () => {
    expect(openingMatches('Sicilian Defense', 'Sicilian Defense: Najdorf Variation')).toBe(true);
    expect(openingMatches('Réti Opening', 'Reti Opening')).toBe(true);
    expect(openingMatches('Sicilian Defense: Najdorf', 'Sicilian Defense')).toBe(false);
    expect(openingMatches('French', 'French Defense')).toBe(false);
    expect(openingMatches('', 'French Defense')).toBe(false);
  });
});

describe('linkGamesToChapter', () => {
  const games = [
    game({ eco: 'A39', color: 'W', result: 'W' }),
    game({ eco: 'A39', color: 'B', result: 'L' }),
    game({ eco: 'A30', color: 'W', result: 'D' }),
  ];

  it('links by ECO and keeps only the chapter side', () => {
    const link = linkGamesToChapter(header(), games);
    expect(link.method).toBe('eco');
    expect(link.color).toBe('W');
    expect(link.games).toHaveLength(1);
  });

  it('keeps both colors when the title does not say', () => {
    const link = linkGamesToChapter(header({ chapterName: 'Inglesa simétrica' }), games);
    expect(link.color).toBeNull();
    expect(link.games).toHaveLength(2);
  });

  it('uses an ECO range', () => {
    const link = linkGamesToChapter(header({ eco: 'A30-A39' }), games);
    expect(link.games).toHaveLength(2);
  });

  it('falls back to the opening name without ECO', () => {
    const named = [
      game({ eco: 'Unknown', opening: 'English Opening: Symmetrical Variation, Mecking' }),
      game({ eco: 'Unknown', opening: 'English Opening: King’s English' }),
    ];
    const link = linkGamesToChapter(header({ eco: '' }), named);
    expect(link.method).toBe('opening');
    expect(link.games).toHaveLength(1);
  });

  it('has nothing to link with neither ECO nor opening', () => {
    const link = linkGamesToChapter(header({ eco: '', opening: '' }), games);
    expect(link).toEqual({ games: [], method: null, color: 'W' });
  });
});

describe('scoreGames / formatPoints', () => {
  it('scores wins, draws and losses', () => {
    const score = scoreGames([{ result: 'W' }, { result: 'D' }, { result: 'L' }, { result: 'W' }]);
    expect(score).toEqual({ points: 2.5, total: 4, pct: 63, wins: 2, draws: 1, losses: 1 });
  });

  it('has no percentage without games', () => {
    expect(scoreGames([]).pct).toBeNull();
  });

  it('writes half points as ½', () => {
    expect(formatPoints(0)).toBe('0');
    expect(formatPoints(0.5)).toBe('½');
    expect(formatPoints(4.5)).toBe('4½');
    expect(formatPoints(3)).toBe('3');
  });
});

describe('chapterReview', () => {
  it('joins by chapter number and counts due main moves', () => {
    const moves = [
      move({ lastReviewed: undefined }),
      move({ lastReviewed: NOW - 2 * DAY, confidence: 1 }),
      move({ lastReviewed: NOW - 2 * DAY, confidence: 5 }),
      move({ role: 'trap' }),
      move({ chapterNo: 5 }),
    ];
    expect(chapterReview(chapter({}), moves, NOW)).toEqual({ due: 2, total: 3, method: 'chapter' });
  });

  it('falls back to the chapter name when the title has no number', () => {
    const moves = [move({ chapterNo: 99, chapterName: 'Inglesa simétrica' })];
    const result = chapterReview(chapter({ chapterName: 'Inglesa Simetrica' }), moves, NOW);
    expect(result.method).toBe('chapter');
    expect(result.due).toBe(1);
  });

  it('falls back to the move sequence', () => {
    const moves = [
      move({ chapterNo: 99, chapterName: 'otro', color: 'W', pathSan: '', expectedSan: 'c4' }),
      move({ chapterNo: 99, chapterName: 'otro', color: 'W', pathSan: 'c4 c5', expectedSan: 'Nc3' }),
      move({ chapterNo: 99, chapterName: 'otro', color: 'W', pathSan: 'c4 e5', expectedSan: 'Nc3' }),
      move({ chapterNo: 99, chapterName: 'otro', color: 'B', pathSan: 'c4', expectedSan: 'c5' }),
    ];
    const result = chapterReview(chapter({ chapterName: 'Inglesa con BLANCAS' }, ['c4', 'c5', 'Nc3', 'Nc6']), moves, NOW);
    expect(result).toEqual({ due: 2, total: 2, method: 'moves' });
  });

  it('reports no link when nothing matches', () => {
    expect(chapterReview(chapter({}), [move({ chapterNo: 7 })], NOW)).toEqual({ due: 0, total: 0, method: null });
  });
});
