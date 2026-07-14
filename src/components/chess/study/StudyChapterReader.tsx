import { useState } from 'react';
import { Chessboard } from 'react-chessboard';
import {
  ArrowsUpDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
  ArrowUturnLeftIcon,
} from '@heroicons/react/24/solid';
import { ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import Badge from '../../ui/Badge';
import { useStudyLineNavigation } from '../../../hooks/useStudyLineNavigation';
import StudyMoveList from './StudyMoveList';
import type { StudyChapter } from '../../../utils/studyPgn';

interface StudyChapterReaderProps {
  chapter: StudyChapter;
}

const ControlButton = ({
  onClick,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    aria-label={label}
    title={label}
    className="flex items-center justify-center w-10 h-9 rounded-md border border-hairline bg-surface text-fg-muted hover:bg-surface-2 hover:text-fg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
  >
    {children}
  </button>
);

const StudyChapterReader = ({ chapter }: StudyChapterReaderProps) => {
  const nav = useStudyLineNavigation(chapter.mainline);
  const [flipped, setFlipped] = useState(false);
  const { header } = chapter;

  return (
    <div className="flex flex-col lg:flex-row gap-5">
      <div className="w-full lg:w-[480px] xl:w-[560px] 2xl:w-[680px] flex-shrink-0">
        <div className="rounded-lg overflow-hidden border border-hairline">
          <Chessboard
            options={{
              position: nav.fen,
              boardOrientation: flipped ? 'black' : 'white',
              allowDragging: false,
              showNotation: true,
              animationDurationInMs: 150,
              lightSquareStyle: { backgroundColor: 'rgb(var(--board-light))' },
              darkSquareStyle: { backgroundColor: 'rgb(var(--board-dark))' },
            }}
          />
        </div>

        <div className="mt-3 flex items-center justify-center gap-2">
          <ControlButton onClick={() => setFlipped(f => !f)} label="Flip board">
            <ArrowsUpDownIcon className="w-4 h-4" />
          </ControlButton>
          <ControlButton onClick={nav.resetToMainlineStart} disabled={nav.atStart} label="First move">
            <ChevronDoubleLeftIcon className="w-4 h-4" />
          </ControlButton>
          <ControlButton onClick={nav.stepBack} disabled={nav.atStart} label="Previous move">
            <ChevronLeftIcon className="w-4 h-4" />
          </ControlButton>
          <ControlButton onClick={nav.stepForward} disabled={nav.atEnd} label="Next move">
            <ChevronRightIcon className="w-4 h-4" />
          </ControlButton>
          <ControlButton onClick={nav.jumpToLineEnd} disabled={nav.atEnd} label="End of line">
            <ChevronDoubleRightIcon className="w-4 h-4" />
          </ControlButton>
          {nav.insideVariation && (
            <ControlButton onClick={nav.resetToMainlineStart} label="Back to mainline">
              <ArrowUturnLeftIcon className="w-4 h-4" />
            </ControlButton>
          )}
        </div>
      </div>

      <div className="flex-1 min-w-0 flex flex-col lg:h-[528px] xl:h-[608px] 2xl:h-[728px]">
        <div className="flex-shrink-0">
          <h3 className="text-h3 text-fg">{header.chapterName}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-fg-muted">
            {header.eco && <Badge tone="accent">{header.eco}</Badge>}
            {header.opening && <span>{header.opening}</span>}
            {header.chapterUrl && (
              <a
                href={header.chapterUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-fg-subtle hover:text-fg"
              >
                View on Lichess <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>

        <div className="mt-3 flex-1 min-h-0 overflow-y-auto rounded-lg border border-hairline bg-surface p-3">
          <StudyMoveList nodes={chapter.mainline} ancestorFrames={[]} activePath={nav.path} onSelect={nav.goToPath} />
        </div>
      </div>
    </div>
  );
};

export default StudyChapterReader;
