import { useCallback, useMemo, useState } from 'react';
import { BookOpenIcon, ClockIcon, SparklesIcon, CheckIcon } from '@heroicons/react/24/outline';
import { useRepertoireMoves, type ChapterMoves } from '../../../../hooks/useRepertoireMoves';
import { buildLines } from '../../../../utils/repertoireMoves';
import { isDue } from '../../../../utils/srs';
import { Card, StatCard } from '../../../ui';
import { PieceLabel } from '../../../ui/PieceGlyph';
import { LoadingSpinner } from '../../../LoadingSkeleton';
import LineTrainerBoard from './LineTrainerBoard';
import type { RepertoireMove } from '../../../../types/chess';

/**
 * The per-move repertoire trainer.
 *
 * Sits next to the flashcards rather than replacing them: a card there is a
 * whole chapter and asks for the plan, which is content that lives in
 * `repertoire_lines` and not in the study PGN at all. This asks for the moves.
 */

const SELECT_CLASS =
  'w-full rounded-lg border border-hairline bg-surface px-3 py-2 text-sm text-fg focus:border-accent focus:ring-1 focus:ring-accent';

interface PlayableLine {
  moves: RepertoireMove[];
  dueCount: number;
}

const MoveTrainerPanel = () => {
  const { chapters, loading, error, review, moves } = useRepertoireMoves();
  const [now] = useState(() => Date.now());
  const [chapterNo, setChapterNo] = useState<number | null>(null);
  const [lineIndex, setLineIndex] = useState(0);
  /** Bumped to remount the board on a fresh line or a replay. */
  const [runId, setRunId] = useState(0);

  const stats = useMemo(() => {
    const main = moves.filter(m => m.role === 'main');
    const scored = main.filter(m => m.confidence);
    return {
      total: main.length,
      due: main.filter(m => isDue(m.lastReviewed, m.confidence, now)).length,
      mastered: main.filter(m => (m.confidence ?? 0) >= 5).length,
      avgConfidence: scored.length
        ? Math.round((scored.reduce((sum, m) => sum + (m.confidence ?? 0), 0) / scored.length) * 10) / 10
        : 0,
    };
  }, [moves, now]);

  /** Every chapter's lines, with how many of their moves are due. */
  const linesByChapter = useMemo(() => {
    const map = new Map<number, PlayableLine[]>();
    for (const chapter of chapters) {
      map.set(
        chapter.chapterNo,
        buildLines(chapter.main).map(line => ({
          moves: line,
          dueCount: line.filter(m => isDue(m.lastReviewed, m.confidence, now)).length,
        }))
      );
    }
    return map;
  }, [chapters, now]);

  /**
   * Default to the chapter carrying the most due moves rather than chapter 01,
   * so opening the tab lands on work that is actually owed.
   */
  const defaultChapterNo = useMemo(() => {
    let best: { no: number; due: number } | null = null;
    for (const chapter of chapters) {
      const due = chapter.main.filter(m => isDue(m.lastReviewed, m.confidence, now)).length;
      if (!best || due > best.due) best = { no: chapter.chapterNo, due };
    }
    return best?.no ?? null;
  }, [chapters, now]);

  const activeChapterNo = chapterNo ?? defaultChapterNo;
  const chapter: ChapterMoves | undefined = chapters.find(c => c.chapterNo === activeChapterNo);
  const lines = activeChapterNo === null ? [] : (linesByChapter.get(activeChapterNo) ?? []);

  /** Longest first: the mainline is the line worth landing on. */
  const orderedLines = useMemo(
    () => lines.map((line, i) => ({ ...line, i })).sort((a, b) => b.dueCount - a.dueCount || b.moves.length - a.moves.length),
    [lines]
  );
  const activeLine = orderedLines.find(l => l.i === lineIndex) ?? orderedLines[0];

  const selectChapter = useCallback((no: number) => {
    setChapterNo(no);
    setLineIndex(-1); // -1 never matches, so the sort's first line wins.
    setRunId(id => id + 1);
  }, []);

  const selectLine = useCallback((i: number) => {
    setLineIndex(i);
    setRunId(id => id + 1);
  }, []);

  const onGraded = useCallback(
    (move: RepertoireMove, correct: boolean) => {
      void review(move.id, correct).catch(() => undefined);
    },
    [review]
  );

  if (loading) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center">
        <LoadingSpinner size="lg" color="indigo" />
        <p className="mt-4 text-fg-muted">Cargando jugadas del repertorio…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-hairline bg-surface p-5 text-sm text-loss">{error}</div>
    );
  }

  if (stats.total === 0) {
    return (
      <Card>
        <h3 className="text-h3 text-fg">Todavía no hay jugadas cargadas</h3>
        <p className="mt-2 text-sm text-fg-muted">
          Las jugadas salen del PGN del estudio. Corré el importador:
        </p>
        <pre className="mt-3 overflow-x-auto rounded-lg border border-hairline bg-surface-2 p-3 text-xs text-fg">
          npx tsx --env-file=.env.local scripts/import-repertoire-moves.mts --apply
        </pre>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard title="Jugadas" value={stats.total} icon={BookOpenIcon} />
        <StatCard title="Para hoy" value={stats.due} icon={ClockIcon} />
        <StatCard title="Dominadas" value={stats.mastered} icon={SparklesIcon} subtitle="Confianza 5/5" />
        <StatCard title="Confianza media" value={`${stats.avgConfidence}/5`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="space-y-4">
          <Card>
            <label className="text-label mb-2 block" htmlFor="chapter-select">
              Capítulo
            </label>
            <select
              id="chapter-select"
              className={SELECT_CLASS}
              value={activeChapterNo ?? ''}
              onChange={e => selectChapter(Number(e.target.value))}
            >
              {chapters.map(c => {
                const due = c.main.filter(m => isDue(m.lastReviewed, m.confidence, now)).length;
                return (
                  <option key={c.chapterNo} value={c.chapterNo}>
                    {c.chapterName}
                    {due > 0 ? ` · ${due} para hoy` : ''}
                  </option>
                );
              })}
            </select>
            {chapter && (
              <p className="mt-2 flex items-center gap-2 text-xs text-fg-subtle">
                <PieceLabel color={chapter.color} />
                {chapter.eco && <span>{chapter.eco}</span>}
                <span>· {chapter.main.length} jugadas</span>
              </p>
            )}
          </Card>

          <Card>
            <p className="text-label mb-2">Líneas ({orderedLines.length})</p>
            <ul className="max-h-[420px] space-y-1 overflow-y-auto">
              {orderedLines.map(line => {
                const active = line.i === activeLine?.i;
                return (
                  <li key={line.i}>
                    <button
                      onClick={() => selectLine(line.i)}
                      aria-current={active ? 'true' : undefined}
                      className={`w-full rounded-lg border px-3 py-2 text-left text-xs transition-colors ${
                        active
                          ? 'border-accent bg-accent/10 text-fg'
                          : 'border-hairline bg-surface text-fg-muted hover:border-accent/50'
                      }`}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="font-semibold">
                          {line.moves.length} jugada{line.moves.length === 1 ? '' : 's'}
                        </span>
                        {line.dueCount > 0 ? (
                          <span className="text-accent">{line.dueCount} para hoy</span>
                        ) : (
                          <CheckIcon className="h-3.5 w-3.5 text-win" />
                        )}
                      </span>
                      <span className="mt-0.5 block truncate font-mono">
                        {line.moves.map(m => m.expectedSan).join(' ')}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </Card>
        </div>

        <Card>
          {chapter && activeLine ? (
            <>
              <h3 className="mb-1 text-h3 text-fg">{chapter.chapterName}</h3>
              <p className="mb-4 text-xs text-fg-subtle">
                {activeLine.moves[0]?.pathSan
                  ? `Desde: ${activeLine.moves[0].pathSan}`
                  : 'Desde la posición inicial'}
              </p>
              <LineTrainerBoard
                line={activeLine.moves}
                byPath={chapter.byPath}
                orientation={chapter.color === 'W' ? 'white' : 'black'}
                onGraded={onGraded}
                resetKey={`${chapter.chapterNo}-${activeLine.i}-${runId}`}
              />
            </>
          ) : (
            <p className="text-sm text-fg-muted">Elegí un capítulo para empezar.</p>
          )}
        </Card>
      </div>
    </div>
  );
};

export default MoveTrainerPanel;
