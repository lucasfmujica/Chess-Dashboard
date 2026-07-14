import { useEffect, useState } from 'react';
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
import { useLocalEngine } from '../../../hooks/useLocalEngine';
import { useEngineSettings } from '../../../hooks/useEngineSettings';
import { winPct, formatEval } from '../../../utils/evalFormat';
import EngineLines from '../EngineLines';
import StudyMoveList from './StudyMoveList';
import type { StudyChapter } from '../../../utils/studyPgn';

interface StudyChapterReaderProps {
  chapter: StudyChapter;
}

const ControlButton = ({
  onClick,
  disabled,
  active,
  label,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  label: string;
  children: React.ReactNode;
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    aria-label={label}
    title={label}
    className={`flex items-center justify-center w-10 h-9 rounded-md border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
      active
        ? 'border-accent/40 bg-accent/15 text-accent'
        : 'border-hairline bg-surface text-fg-muted hover:bg-surface-2 hover:text-fg'
    }`}
  >
    {children}
  </button>
);

const StudyChapterReader = ({ chapter }: StudyChapterReaderProps) => {
  const nav = useStudyLineNavigation(chapter.mainline);
  const [flipped, setFlipped] = useState(false);
  const [settings, setSettings] = useEngineSettings();
  const [engineOn, setEngineOn] = useState(false);
  const engineState = useLocalEngine(nav.fen, settings, engineOn);
  const { header } = chapter;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); nav.stepBack(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); nav.stepForward(); }
      else if (e.key === 'Home') { e.preventDefault(); nav.resetToMainlineStart(); }
      else if (e.key === 'End') { e.preventDefault(); nav.jumpToLineEnd(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [nav.stepBack, nav.stepForward, nav.resetToMainlineStart, nav.jumpToLineEnd]);

  const liveEvalCp = engineOn ? engineState.lines[0]?.evalCp : undefined;
  const evalAvailable = liveEvalCp !== undefined;
  const currentEval = liveEvalCp ?? 0;
  const whiteFraction = evalAvailable ? winPct(currentEval) / 100 : 0.5;
  const whiteWinning = currentEval >= 0;
  const labelAtBottom = whiteWinning !== flipped;
  const isMate = Math.abs(currentEval) >= 9000;
  const evalLabel = isMate ? '#' : (Math.abs(currentEval) / 100).toFixed(1);

  return (
    <div className="flex flex-col xl:flex-row gap-5 xl:h-full">
      <div className="flex flex-col items-center justify-center xl:h-full flex-shrink-0">
        <div className="flex gap-2 w-full xl:w-auto">
          {/* Eval bar */}
          <div
            className="relative w-7 rounded-md overflow-hidden border border-hairline bg-zinc-900 flex-shrink-0"
            title={
              evalAvailable
                ? `Evaluation ${formatEval(currentEval)} (White's perspective)`
                : 'Turn on the engine to see the evaluation'
            }
          >
            <div
              className="absolute left-0 right-0 bg-zinc-100 transition-all duration-200"
              style={flipped ? { top: 0, height: `${whiteFraction * 100}%` } : { bottom: 0, height: `${whiteFraction * 100}%` }}
            />
            {evalAvailable && (
              <span
                className={`absolute left-0 right-0 text-center text-[10px] font-bold tabular-nums leading-none ${whiteWinning ? 'text-zinc-900' : 'text-zinc-100'}`}
                style={labelAtBottom ? { bottom: 3 } : { top: 3 }}
              >
                {evalLabel}
              </span>
            )}
          </div>

          <div className="aspect-square flex-1 xl:flex-none xl:w-[min(700px,calc(100vw-972px))] rounded-lg overflow-hidden border border-hairline">
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
        </div>

        <div className="mt-3 flex-shrink-0 flex items-center justify-center gap-2">
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
        <p className="mt-2 text-center text-xs text-fg-subtle">Use ← → to step, Home/End to jump</p>
      </div>

      <div className="flex-1 min-w-0 flex flex-col xl:h-full">
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

        <div className="mt-3 flex-shrink-0">
          <EngineLines
            state={engineState}
            enabled={engineOn}
            onToggle={() => setEngineOn(o => !o)}
            settings={settings}
            setSettings={setSettings}
          />
        </div>

        <div className="mt-3 flex-1 xl:min-h-0 overflow-y-auto rounded-lg border border-hairline bg-surface p-3">
          <StudyMoveList nodes={chapter.mainline} ancestorFrames={[]} activePath={nav.path} onSelect={nav.goToPath} />
        </div>
      </div>
    </div>
  );
};

export default StudyChapterReader;
