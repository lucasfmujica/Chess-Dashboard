import { useEffect, useState, type CSSProperties } from 'react';
import { Chessboard } from 'react-chessboard';
import { boardSquareStyles } from '../boardTheme';
import BoardFrame from '../BoardFrame';
import {
  ArrowsUpDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
  ArrowUturnLeftIcon,
} from '@heroicons/react/24/solid';
import { ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
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
    className={`flex items-center justify-center w-10 h-9 rounded border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-40 disabled:cursor-not-allowed ${
      active
        ? 'border-transparent bg-accent/10 text-accent'
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
    /* Two declared tracks: the board takes what's left after the notes column,
       and `.board-frame` caps it at the window height. This replaced a
       `xl:w-[min(700px,calc(100vw-972px))]`, where 972 was the sidebar, the
       page padding, the chapter list and the gaps added up by hand — so the
       board never grew when the sidebar was collapsed, and the notes column
       was whatever happened to be left (~224px on most screens). */
    <div className="flex flex-col gap-5 xl:h-full">
      <header className="flex-shrink-0">
        <p className="text-label">
          {[header.opening, header.eco].filter(Boolean).join(' · ') || header.studyName}
        </p>
        <h2 className="mt-1.5 font-serif text-[28px] font-semibold leading-[1.1] tracking-[-0.01em] text-fg text-balance sm:text-[40px]">
          {header.chapterName}
        </h2>
        {header.chapterUrl && (
          <a
            href={header.chapterUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-sm text-accent hover:underline underline-offset-4"
          >
            Ver en Lichess <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
          </a>
        )}
      </header>
    <div
      className="flex flex-col gap-5 xl:grid xl:min-h-0 xl:flex-1 xl:grid-cols-[minmax(0,calc(var(--board-user,var(--board-fit))+var(--board-gutter)))_minmax(340px,1fr)] "
      style={
        {
          '--board-fit': 'calc(100dvh - 340px)',
          // Widen the track by the eval bar only while it is on screen, so
          // toggling the engine moves the bar in beside the board instead of
          // resizing the board itself.
          '--board-gutter': engineOn ? '36px' : '0px',
        } as CSSProperties
      }
    >
      <div className="flex flex-col items-center justify-start xl:h-full min-w-0">
        <div className="flex justify-center gap-2 w-full">
          {/* Eval bar — only with the engine running. Off, it was a black
              column glued to the board that said nothing. */}
          {engineOn && (
            <div
              className="relative w-7 rounded-sm overflow-hidden border border-hairline bg-board-dark flex-shrink-0"
              title={
                evalAvailable
                  ? `Evaluación ${formatEval(currentEval)} (desde Blancas)`
                  : 'Esperando al motor…'
              }
            >
              <div
                className="absolute left-0 right-0 bg-board-light transition-all duration-200"
                style={flipped ? { top: 0, height: `${whiteFraction * 100}%` } : { bottom: 0, height: `${whiteFraction * 100}%` }}
              />
              {evalAvailable && (
                <span
                  className={`absolute left-0 right-0 text-center font-mono text-[10px] font-medium tabular-nums leading-none ${whiteWinning ? 'text-board-dark' : 'text-board-light'}`}
                  style={labelAtBottom ? { bottom: 3 } : { top: 3 }}
                >
                  {evalLabel}
                </span>
              )}
            </div>
          )}

          <BoardFrame className="flex-1 min-w-0">
            <Chessboard
              options={{
                position: nav.fen,
                boardOrientation: flipped ? 'black' : 'white',
                allowDragging: false,
                showNotation: true,
                animationDurationInMs: 150,
                ...boardSquareStyles,
              }}
            />
          </BoardFrame>
        </div>

        <div className="mt-3 flex-shrink-0 flex items-center justify-center gap-2">
          <ControlButton onClick={() => setFlipped(f => !f)} label="Girar tablero">
            <ArrowsUpDownIcon className="w-4 h-4" />
          </ControlButton>
          <ControlButton onClick={nav.resetToMainlineStart} disabled={nav.atStart} label="Primera jugada">
            <ChevronDoubleLeftIcon className="w-4 h-4" />
          </ControlButton>
          <ControlButton onClick={nav.stepBack} disabled={nav.atStart} label="Jugada anterior">
            <ChevronLeftIcon className="w-4 h-4" />
          </ControlButton>
          <ControlButton onClick={nav.stepForward} disabled={nav.atEnd} label="Jugada siguiente">
            <ChevronRightIcon className="w-4 h-4" />
          </ControlButton>
          <ControlButton onClick={nav.jumpToLineEnd} disabled={nav.atEnd} label="Final de la línea">
            <ChevronDoubleRightIcon className="w-4 h-4" />
          </ControlButton>
          {nav.insideVariation && (
            <ControlButton onClick={nav.resetToMainlineStart} label="Volver a la línea principal">
              <ArrowUturnLeftIcon className="w-4 h-4" />
            </ControlButton>
          )}
        </div>
        <p className="mt-2 text-center text-xs text-fg-subtle">← → para avanzar, Inicio/Fin para saltar</p>
      </div>

      <div className="min-w-0 flex flex-col xl:h-full">
        <div className="flex-shrink-0">
          <EngineLines
            state={engineState}
            enabled={engineOn}
            onToggle={() => setEngineOn(o => !o)}
            settings={settings}
            setSettings={setSettings}
          />
        </div>

        <div className="mt-3 flex-1 xl:min-h-0 overflow-y-auto rounded border border-hairline bg-surface shadow-[0_1px_0_rgb(var(--fg)/0.06)]">
          <p className="border-b border-hairline px-4 py-3 font-serif text-base font-semibold text-fg">Jugadas e ideas</p>
          <div className="p-4">
          <StudyMoveList nodes={chapter.mainline} ancestorFrames={[]} activePath={nav.path} onSelect={nav.goToPath} />
          </div>
        </div>
      </div>
    </div>
    </div>
  );
};

export default StudyChapterReader;
