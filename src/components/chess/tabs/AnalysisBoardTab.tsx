import { useMemo, useState } from 'react';
import { BeakerIcon, PlusCircleIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { useGames } from '../../../context/GamesContext';
import type { Game } from '../../../types/chess';
import GameViewer from '../GameViewer';
import GamesAnalysisList from '../GamesAnalysisList';
import AccuracyTrendCard from '../../charts/AccuracyTrendCard';

interface LoadedGame {
  pgn: string;
  white?: string;
  black?: string;
  result?: string;
  orientation?: 'white' | 'black';
}

const headerValue = (text: string, key: string): string | undefined =>
  text.match(new RegExp(`\\[${key}\\s+"([^"]+)"\\]`))?.[1];

/** Build the board's loaded-game state from a stored game + its movetext. */
const toLoadedGame = (g: Game, pgn: string): LoadedGame => ({
  pgn,
  white: g.color === 'W' ? 'You' : g.opp,
  black: g.color === 'B' ? 'You' : g.opp,
  result: g.result === 'W' ? '1-0 / 0-1' : g.result === 'D' ? '½-½' : '',
  orientation: g.color === 'B' ? 'black' : 'white',
});

/**
 * Full-page analysis board: load any game (pasted PGN or an imported game with
 * moves), step through it, see Stockfish accuracy/eval and what masters play.
 */
const AnalysisBoardTab = () => {
  const { games, setGames } = useGames();
  const [loaded, setLoaded] = useState<LoadedGame | null>(null);
  // Index (into `games`) of the loaded stored game, so we can step ‹ prev/next ›.
  // null when nothing is loaded or a pasted PGN (not part of the library) is shown.
  const [loadedIndex, setLoadedIndex] = useState<number | null>(null);
  const [pasteText, setPasteText] = useState('');
  const [attachIndex, setAttachIndex] = useState('');
  const [attachText, setAttachText] = useState('');
  // Bumped after batch analysis so the accuracy trend re-reads cached results.
  const [analysisRefreshKey, setAnalysisRefreshKey] = useState(0);

  // Games that actually carry moves.
  const playableGames = useMemo(
    () => games.map((g, i) => ({ g, i })).filter(({ g }) => !!g.pgn),
    [games]
  );

  // Position of the loaded game within the playable list (for prev/next nav).
  const playablePos = loadedIndex === null ? -1 : playableGames.findIndex(p => p.i === loadedIndex);

  // Load a stored game by its index into `games`.
  const loadByIndex = (idx: number) => {
    const g = games[idx];
    if (!g?.pgn) {
      setLoaded(null);
      setLoadedIndex(null);
      return;
    }
    setLoaded(toLoadedGame(g, g.pgn));
    setLoadedIndex(idx);
  };

  // Jump to a neighbouring game in the playable list.
  const gotoPlayable = (pos: number) => {
    const entry = playableGames[pos];
    if (entry) loadByIndex(entry.i);
  };

  // Pre-fill the editor with the selected game's existing moves.
  const selectAttach = (index: string) => {
    setAttachIndex(index);
    const g = games[parseInt(index, 10)];
    setAttachText(g?.pgn || '');
  };

  const saveMoves = () => {
    if (attachIndex === '') return;
    const idx = parseInt(attachIndex, 10);
    const moves = attachText.trim();
    setGames(prev => prev.map((g, i) => (i === idx ? { ...g, pgn: moves || undefined } : g)));
    // Immediately load the just-saved game onto the board so the user sees it
    // replay (otherwise the board stays empty until they reselect the game).
    const g = games[idx];
    if (g && moves) {
      setLoaded(toLoadedGame(g, moves));
      setLoadedIndex(idx);
    } else {
      setLoaded(null);
      setLoadedIndex(null);
    }
  };

  const loadPaste = () => {
    if (!pasteText.trim()) return;
    setLoaded({
      pgn: pasteText,
      white: headerValue(pasteText, 'White'),
      black: headerValue(pasteText, 'Black'),
      result: headerValue(pasteText, 'Result'),
      orientation: 'white',
    });
    setLoadedIndex(null); // pasted game isn't part of the library
  };

  const loadStored = (index: string) => loadByIndex(parseInt(index, 10));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-lg border border-hairline bg-surface p-5">
        <div className="flex items-center gap-2">
          <BeakerIcon className="w-5 h-5 text-accent" />
          <h2 className="text-lg font-semibold text-fg">Analysis board</h2>
        </div>
        <p className="mt-1 text-sm text-fg-muted">
          Replay a game, flip the board, see what Stockfish thinks (accuracy, blunders, evaluation)
          and what masters play from each position.
        </p>

        <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <label className="block text-xs font-medium uppercase tracking-wide text-fg-subtle mb-1.5">Paste a PGN</label>
            <textarea
              value={pasteText}
              onChange={e => setPasteText(e.target.value)}
              rows={3}
              placeholder={'[Event "..."]\n\n1. e4 e5 2. Nf3 Nc6 ...'}
              className="w-full rounded-md border border-hairline bg-surface text-fg placeholder-fg-subtle text-sm font-mono px-3 py-2 focus:border-accent focus:ring-1 focus:ring-accent resize-y"
            />
            <button
              onClick={loadPaste}
              disabled={!pasteText.trim()}
              className="mt-2 px-4 py-2 rounded-md bg-fg text-app text-sm font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
            >
              Load PGN
            </button>
          </div>

          <div>
            <label className="block text-xs font-medium uppercase tracking-wide text-fg-subtle mb-1.5">
              Or pick an imported game
            </label>
            {playableGames.length > 0 ? (
              <select
                onChange={e => loadStored(e.target.value)}
                defaultValue=""
                className="w-full rounded-md border border-hairline bg-surface text-fg text-sm px-3 py-2 focus:border-accent focus:ring-1 focus:ring-accent"
              >
                <option value="" disabled>Select a game…</option>
                {playableGames.map(({ g, i }) => (
                  <option key={i} value={i}>
                    {g.tournament} — vs {g.opp}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-sm text-fg-muted">
                No games with moves yet. Import a PGN (with moves) from Analytics, then they appear here.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Attach moves to an existing game (e.g. OTB games, which are header-only) */}
      <div className="rounded-lg border border-hairline bg-surface p-5">
        <div className="flex items-center gap-2">
          <PlusCircleIcon className="w-5 h-5 text-accent" />
          <h3 className="text-lg font-semibold text-fg">Add moves to a game</h3>
        </div>
        <p className="mt-1 text-sm text-fg-muted">
          Your over-the-board games are saved without moves. Pick one and paste its PGN to make it
          replayable and analysable (it then shows up above and feeds the accuracy trend).
        </p>
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium uppercase tracking-wide text-fg-subtle mb-1.5">Game</label>
            <select
              value={attachIndex}
              onChange={e => selectAttach(e.target.value)}
              className="w-full rounded-md border border-hairline bg-surface text-fg text-sm px-3 py-2 focus:border-accent focus:ring-1 focus:ring-accent"
            >
              <option value="" disabled>Select a game…</option>
              {games.map((g, i) => (
                <option key={i} value={i}>
                  {g.pgn ? '✓ ' : ''}{g.tournament} — vs {g.opp}
                </option>
              ))}
            </select>
          </div>
          <div className="lg:col-span-2">
            <label className="block text-xs font-medium uppercase tracking-wide text-fg-subtle mb-1.5">PGN moves</label>
            <textarea
              value={attachText}
              onChange={e => setAttachText(e.target.value)}
              rows={3}
              placeholder={'1. e4 e5 2. Nf3 Nc6 ...'}
              disabled={attachIndex === ''}
              className="w-full rounded-md border border-hairline bg-surface text-fg placeholder-fg-subtle text-sm font-mono px-3 py-2 focus:border-accent focus:ring-1 focus:ring-accent resize-y disabled:opacity-50"
            />
            <button
              onClick={saveMoves}
              disabled={attachIndex === ''}
              className="mt-2 px-4 py-2 rounded-md border border-hairline bg-surface text-fg text-sm font-medium hover:bg-surface-2 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Save moves
            </button>
          </div>
        </div>
      </div>

      {/* Accuracy over analysed games */}
      <AccuracyTrendCard refreshKey={analysisRefreshKey} />

      {/* Board + explorer + analysis */}
      <div className="rounded-lg border border-hairline bg-surface p-5">
        {/* Step between all your games with moves, without using the dropdown. */}
        {playableGames.length > 0 && (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-md border border-hairline bg-surface-2 px-3 py-2">
            <button
              onClick={() => gotoPlayable(playablePos < 0 ? 0 : playablePos - 1)}
              disabled={playablePos <= 0}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-sm text-fg-muted hover:bg-surface hover:text-fg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeftIcon className="w-4 h-4" /> Prev game
            </button>
            <span className="text-xs text-fg-muted tabular-nums text-center min-w-0 truncate">
              {playablePos >= 0
                ? `Game ${playablePos + 1} of ${playableGames.length}`
                : `${playableGames.length} game${playableGames.length === 1 ? '' : 's'} with moves`}
            </span>
            <button
              onClick={() => gotoPlayable(playablePos < 0 ? 0 : playablePos + 1)}
              disabled={playablePos >= playableGames.length - 1}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-sm text-fg-muted hover:bg-surface hover:text-fg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next game <ChevronRightIcon className="w-4 h-4" />
            </button>
          </div>
        )}
        <GameViewer
          pgn={loaded?.pgn}
          white={loaded?.white}
          black={loaded?.black}
          result={loaded?.result}
          orientation={loaded?.orientation}
          showExplorer
          showEngine
        />
      </div>

      {/* All your games: results, opening, accuracy — click to load on the board */}
      <GamesAnalysisList
        onLoad={loadByIndex}
        loadedIndex={loadedIndex}
        onAnalyzed={() => setAnalysisRefreshKey(k => k + 1)}
      />
    </div>
  );
};

export default AnalysisBoardTab;
