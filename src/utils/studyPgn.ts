import { useEffect, useState } from 'react';

/** One move in a chapter's move tree, with its own alternative continuations. */
export interface StudyMoveNode {
  san: string;
  moveNumber: number;
  turn: 'w' | 'b';
  /** Free-text annotation attached to this move (may span multiple lines). */
  comment?: string;
  /** Alternative continuations replacing this move; each is its own move chain. */
  variations: StudyMoveNode[][];
}

/** Headers pulled from a Lichess study chapter's PGN tags. */
export interface StudyChapterHeader {
  chapterName: string;
  eco: string;
  opening: string;
  studyName: string;
  chapterUrl?: string;
}

export interface StudyChapter {
  header: StudyChapterHeader;
  mainline: StudyMoveNode[];
}

/** Lichess study exports carry custom tags (ChapterName, StudyName, ChapterURL)
 *  that aren't part of the standard PGN tag set the parser's types model. */
type RawTags = Record<string, string | undefined>;

interface RawPgnMove {
  notation: { notation: string };
  moveNumber: number;
  turn: 'w' | 'b';
  commentAfter?: string;
  variations: RawPgnMove[][];
}

const mapMoves = (moves: RawPgnMove[]): StudyMoveNode[] =>
  moves.map(move => ({
    san: move.notation.notation,
    moveNumber: move.moveNumber,
    turn: move.turn,
    comment: move.commentAfter?.trim() || undefined,
    variations: (move.variations || []).map(mapMoves),
  }));

/** Parse a full multi-chapter Lichess study PGN export into per-chapter move trees. */
export const parseStudyPgn = async (pgnText: string): Promise<StudyChapter[]> => {
  const { parseGames } = await import('@mliebelt/pgn-parser');
  const games = parseGames(pgnText);

  return games.map((game, index) => {
    const tags = (game.tags || {}) as RawTags;
    const header: StudyChapterHeader = {
      chapterName: tags.ChapterName || tags.Event || `Chapter ${index + 1}`,
      eco: tags.ECO || '',
      opening: tags.Opening || '',
      studyName: tags.StudyName || '',
      chapterUrl: tags.ChapterURL,
    };
    return { header, mainline: mapMoves(game.moves as unknown as RawPgnMove[]) };
  });
};

let cached: StudyChapter[] | null = null;
let loadPromise: Promise<StudyChapter[]> | null = null;

/** Lazy-load (and cache) the bundled repertoire study PGN as parsed chapters. */
export const loadStudyChapters = (): Promise<StudyChapter[]> => {
  if (cached) return Promise.resolve(cached);
  if (!loadPromise) {
    loadPromise = fetch(`${import.meta.env.BASE_URL}data/repertoire-study.pgn`)
      .then(res => {
        if (!res.ok) throw new Error(`repertoire study PGN ${res.status}`);
        return res.text();
      })
      .then(parseStudyPgn)
      .then(chapters => {
        cached = chapters;
        return chapters;
      })
      .catch(err => {
        loadPromise = null; // allow a later retry
        throw err;
      });
  }
  return loadPromise;
};

interface UseStudyChaptersResult {
  chapters: StudyChapter[] | null;
  loading: boolean;
  error: string | null;
}

export const useStudyChapters = (): UseStudyChaptersResult => {
  const [chapters, setChapters] = useState<StudyChapter[] | null>(cached);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cached) return;
    let cancelled = false;
    setLoading(true);
    loadStudyChapters()
      .then(loaded => {
        if (!cancelled) setChapters(loaded);
      })
      .catch(err => {
        if (!cancelled) setError((err as Error).message || 'Failed to load repertoire study.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { chapters, loading, error };
};
