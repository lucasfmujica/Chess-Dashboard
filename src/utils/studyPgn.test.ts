import { readFileSync } from 'fs';
import path from 'path';
import { describe, it, expect, beforeAll } from 'vitest';
import { Chess } from 'chess.js';
import { parseStudyPgn } from './studyPgn';
import type { StudyChapter, StudyMoveNode } from './studyPgn';

const flattenAllPaths = (nodes: StudyMoveNode[], prefix: string[]): string[][] => {
  const paths: string[][] = [];
  let sansSoFar = prefix;
  for (const node of nodes) {
    for (const variation of node.variations) {
      paths.push(...flattenAllPaths(variation, sansSoFar));
    }
    sansSoFar = [...sansSoFar, node.san];
  }
  paths.push(sansSoFar);
  return paths;
};

const findNode = (nodes: StudyMoveNode[], predicate: (n: StudyMoveNode) => boolean): StudyMoveNode | undefined => {
  for (const node of nodes) {
    if (predicate(node)) return node;
    for (const variation of node.variations) {
      const found = findNode(variation, predicate);
      if (found) return found;
    }
  }
  return undefined;
};

describe('parseStudyPgn (real repertoire fixture)', () => {
  let chapters: StudyChapter[];

  beforeAll(async () => {
    const fixturePath = path.join(__dirname, '../../public/data/repertoire-study.pgn');
    const raw = readFileSync(fixturePath, 'utf-8');
    chapters = await parseStudyPgn(raw);
  });

  it('parses exactly 32 chapters', () => {
    expect(chapters).toHaveLength(32);
  });

  it('extracts non-empty headers for every chapter', () => {
    chapters.forEach(chapter => {
      expect(chapter.header.chapterName).toBeTruthy();
      expect(chapter.header.eco).toBeTruthy();
      expect(chapter.header.opening).toBeTruthy();
      expect(chapter.header.chapterUrl).toBeTruthy();
    });
  });

  it('matches chapter 1 headers exactly', () => {
    const [chapter1] = chapters;
    expect(chapter1.header.chapterName).toBe('01 BLANCAS - vs 1...Nf6 (doble fianchetto)');
    expect(chapter1.header.eco).toBe('A14');
  });

  it('preserves a long multi-line comment on chapter 1', () => {
    const node = findNode(chapters[0].mainline, n => !!n.comment?.includes('QUÉ QUIERO EN ESTA POSICIÓN'));
    expect(node).toBeDefined();
    expect(node!.san).toBe('Nxd5');
    expect(node!.comment).toContain('\n');
  });

  it('preserves nested sibling variations with their own comments (chapter 2)', () => {
    // Located by content, not by "the first node with two variations": the
    // study grows, and that position is not a stable address.
    const branchNode = findNode(chapters[1].mainline, n =>
      n.variations.some(v => v.some(m => m.comment?.includes('golpeando e5')))
    );
    expect(branchNode).toBeDefined();
    expect(branchNode!.variations.length).toBeGreaterThan(1);
    const variation = branchNode!.variations.find(v => v.some(m => m.comment?.includes('golpeando e5')))!;
    expect(variation.find(n => n.comment?.includes('y d4 gana tiempo'))).toBeDefined();
  });

  it('replays every mainline and variation path through chess.js without error, for every chapter', () => {
    let totalPaths = 0;
    chapters.forEach(chapter => {
      const paths = flattenAllPaths(chapter.mainline, []);
      totalPaths += paths.length;
      paths.forEach(sans => {
        const chess = new Chess();
        sans.forEach(san => {
          expect(() => chess.move(san)).not.toThrow();
        });
      });
    });
    expect(totalPaths).toBeGreaterThan(32);
  });
});

describe('chapter URLs of the repertoire study', () => {
  it('map every numbered chapter to the live study DPH7PV7i, never the old iPk8Xex1', async () => {
    const { chapterUrlMap } = await import('./studyChapterUrls');
    const pgnText = readFileSync(path.join(__dirname, '../../public/data/repertoire-study.pgn'), 'utf8');
    const urls = chapterUrlMap(await parseStudyPgn(pgnText));
    expect(urls.size).toBe(32);
    for (const url of urls.values()) {
      expect(url).toMatch(/^https:\/\/lichess\.org\/study\/DPH7PV7i\/\w+$/);
      expect(url).not.toContain('iPk8Xex1');
    }
  });

  it('rewrites a row still on the old study by its line_name prefix, and leaves the rest', async () => {
    const { lineUrlChanges } = await import('./studyChapterUrls');
    const urls = new Map([[1, 'https://lichess.org/study/DPH7PV7i/aaa'], [2, 'https://lichess.org/study/DPH7PV7i/bbb']]);
    const changes = lineUrlChanges(
      [
        { id: 'a', line_name: '01 BLANCAS - vs 1...Nf6', lichess_url: 'https://lichess.org/study/iPk8Xex1/zzz' },
        { id: 'b', line_name: '02 BLANCAS - x', lichess_url: 'https://lichess.org/study/DPH7PV7i/bbb' },
        { id: 'c', line_name: '99 NEGRAS - no chapter', lichess_url: null },
        { id: 'd', line_name: 'no number', lichess_url: null },
      ],
      urls
    );
    expect(changes).toEqual([
      { id: 'a', lineName: '01 BLANCAS - vs 1...Nf6', from: 'https://lichess.org/study/iPk8Xex1/zzz', to: 'https://lichess.org/study/DPH7PV7i/aaa' },
    ]);
  });
});
