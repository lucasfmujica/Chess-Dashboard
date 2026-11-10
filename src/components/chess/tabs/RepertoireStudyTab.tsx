import { useState } from 'react';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import { useStudyChapters } from '../../../utils/studyPgn';
import { useLocalStorage } from '../../../hooks/useLocalStorage';
import { LoadingSpinner } from '../../LoadingSkeleton';
import StudyChapterList from '../study/StudyChapterList';
import StudyChapterReader from '../study/StudyChapterReader';
import StudyChapterMetrics from '../study/StudyChapterMetrics';
import { useSourceFilteredGames } from '../../../context/GamesContext';
import { useRepertoireMoves } from '../../../hooks/useRepertoireMoves';
import { useChapterAssignment } from '../../../hooks/useChapterAssignment';

const RepertoireStudyTab = () => {
  const { chapters, loading, error } = useStudyChapters();
  const [selectedIndex, setSelectedIndex] = useLocalStorage('chess-dashboard-repertoire-study-chapter', 0);
  const [mobileListOpen, setMobileListOpen] = useState(false);
  const games = useSourceFilteredGames();
  // Capítulo por reglas de jugadas; null mientras se indexan las partidas en tandas.
  const assignment = useChapterAssignment(games);
  // Para el panel "Repaso": las jugadas del entrenador, con su vencimiento.
  const { moves, loading: movesLoading, error: movesError } = useRepertoireMoves();
  const [now] = useState(() => Date.now());

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" color="indigo" />
        <p className="mt-4 text-fg-muted">Cargando el estudio de repertorio…</p>
      </div>
    );
  }

  if (error || !chapters || chapters.length === 0) {
    return (
      <div className="rounded border border-hairline bg-surface p-5 text-sm text-fg-muted">
        {error || 'No hay capítulos en el estudio de repertorio.'}
      </div>
    );
  }

  const index = Math.min(Math.max(selectedIndex, 0), chapters.length - 1);
  const chapter = chapters[index];
  const noMoves = assignment?.noMoves.length ?? 0;

  return (
    /* Declared tracks rather than nested flex: the chapter list is a fixed
       column and the reader gets everything else. The height subtracts the
       real chrome (page header + the hub's segmented control + py-8), which
       the old `100vh-160px` under-counted by enough to make the page scroll
       on top of the panes' own scrolling. The mobile dropdown above is
       `xl:hidden`, so it claims no grid cell. */
    <div className="flex flex-col gap-5 xl:grid xl:grid-cols-[300px_minmax(0,1fr)] xl:h-[calc(100dvh-220px)]">
      <div className="xl:hidden">
        <button
          onClick={() => setMobileListOpen(o => !o)}
          aria-expanded={mobileListOpen}
          className="w-full flex items-center justify-between rounded border border-hairline bg-surface px-3 py-2.5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
        >
          <span className="min-w-0 truncate font-serif text-[15px] text-fg">
            <span className="font-mono text-xs tabular-nums text-fg-subtle">{index + 1}/{chapters.length}</span>{' '}
            {chapter.header.chapterName}
          </span>
          {mobileListOpen ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
        </button>
        {mobileListOpen && (
          <div className="mt-2 max-h-80 overflow-y-auto rounded border border-hairline bg-surface px-2 py-3">
            <StudyChapterList
              chapters={chapters}
              selectedIndex={index}
              onSelect={i => {
                setSelectedIndex(i);
                setMobileListOpen(false);
              }}
            />
          </div>
        )}
      </div>

      <div className="hidden xl:block xl:h-full overflow-y-auto rounded border border-hairline bg-surface px-2 py-4 shadow-[0_1px_0_rgb(var(--fg)/0.06)]">
        <StudyChapterList chapters={chapters} selectedIndex={index} onSelect={setSelectedIndex} />
      </div>

      <div className="min-w-0 xl:h-full xl:flex xl:flex-col">
        {noMoves > 0 && (
          <p className="mb-2 flex-shrink-0 text-xs text-fg-muted" title="no entran en capítulos con regla">
            {noMoves === 1 ? '1 partida sin jugadas' : `${noMoves} partidas sin jugadas`}
            <span className="text-fg-subtle"> · no entran en capítulos con regla</span>
          </p>
        )}
        <div className="min-w-0 xl:min-h-0 xl:flex-1">
          <StudyChapterReader
            chapter={chapter}
            metrics={
              <StudyChapterMetrics
                chapter={chapter}
                games={games}
                assignment={assignment}
                moves={movesLoading ? null : moves}
                movesError={movesError}
                now={now}
              />
            }
          />
        </div>
      </div>
    </div>
  );
};

export default RepertoireStudyTab;
