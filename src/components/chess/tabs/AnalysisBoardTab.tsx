import { useMemo, useState } from 'react';
import { BeakerIcon, PlusCircleIcon, ChevronLeftIcon, ChevronRightIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
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
  const { games, updateGamePgn } = useGames();
  const [loaded, setLoaded] = useState<LoadedGame | null>(null);
  // Index (into `games`) of the loaded stored game, so we can step ‹ prev/next ›.
  // null when nothing is loaded or a pasted PGN (not part of the library) is shown.
  const [loadedIndex, setLoadedIndex] = useState<number | null>(null);
  const [pasteText, setPasteText] = useState('');
  // Selected game's stable database id (not array index — the array can be
  // refetched/reordered after any write, so index isn't a safe identifier).
  const [attachGameId, setAttachGameId] = useState('');
  const [attachText, setAttachText] = useState('');
  // Bumped after batch analysis so the accuracy trend re-reads cached results.
  const [analysisRefreshKey, setAnalysisRefreshKey] = useState(0);
  // The load/attach utility panel starts collapsed so the board is the first thing seen.
  const [toolsOpen, setToolsOpen] = useState(false);
  const [toolsTab, setToolsTab] = useState<'load' | 'attach'>('load');

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
  const selectAttach = (id: string) => {
    setAttachGameId(id);
    const g = games.find(g => g.id === id);
    setAttachText(g?.pgn || '');
  };

  const saveMoves = async () => {
    if (!attachGameId) return;
    const moves = attachText.trim();
    const updated = await updateGamePgn(attachGameId, moves || undefined);
    // Immediately load the just-saved game onto the board so the user sees it
    // replay (otherwise the board stays empty until they reselect the game).
    if (moves) {
      setLoaded(toLoadedGame(updated, moves));
    } else {
      setLoaded(null);
    }
    setLoadedIndex(null);
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
      {/* Load / attach — collapsed by default so the board is the first thing seen */}
      <div className="rounded-lg border border-hairline bg-surface">
        <button
          onClick={() => setToolsOpen(o => !o)}
          className="w-full flex items-center justify-between gap-2 px-5 py-4 text-left"
          aria-expanded={toolsOpen}
        >
          <span className="flex items-center gap-2">
            <BeakerIcon className="w-5 h-5 text-accent" />
            <span>
              <span className="text-lg font-semibold text-fg">Load a game</span>
              <span className="block text-sm text-fg-muted">Paste a PGN, pick an imported game, or add moves to an OTB game</span>
            </span>
          </span>
          <ChevronDownIcon className={`w-5 h-5 text-fg-subtle shrink-0 transition-transform duration-200 ${toolsOpen ? 'rotate-180' : ''}`} />
        </button>

        {toolsOpen && (
          <div className="px-5 pb-5">
            <div className="inline-flex gap-1 rounded-md border border-hairline bg-surface-2 p-1 mb-4">
              <button
                onClick={() => setToolsTab('load')}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${toolsTab === 'load' ? 'bg-surface text-fg' : 'text-fg-muted hover:text-fg'}`}
              >
                Load game
              </button>
              <button
                onClick={() => setToolsTab('attach')}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${toolsTab === 'attach' ? 'bg-surface text-fg' : 'text-fg-muted hover:text-fg'}`}
              >
                Attach moves
              </button>
            </div>

            {toolsTab === 'load' ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
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
                      No games with moves yet. Import a PGN (with moves) from Overview, then they appear here.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <PlusCircleIcon className="w-4 h-4 text-accent" />
                  <p className="text-sm text-fg-muted">
                    Your over-the-board games are saved without moves. Pick one and paste its PGN to make it
                    replayable and analysable.
                  </p>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wide text-fg-subtle mb-1.5">Game</label>
                    <select
                      value={attachGameId}
                      onChange={e => selectAttach(e.target.value)}
                      className="w-full rounded-md border border-hairline bg-surface text-fg text-sm px-3 py-2 focus:border-accent focus:ring-1 focus:ring-accent"
                    >
                      <option value="" disabled>Select a game…</option>
                      {games.filter(g => g.id).map(g => (
                        <option key={g.id} value={g.id}>
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
                      disabled={!attachGameId}
                      className="w-full rounded-md border border-hairline bg-surface text-fg placeholder-fg-subtle text-sm font-mono px-3 py-2 focus:border-accent focus:ring-1 focus:ring-accent resize-y disabled:opacity-50"
                    />
                    <button
                      onClick={saveMoves}
                      disabled={!attachGameId}
                      className="mt-2 px-4 py-2 rounded-md border border-hairline bg-surface text-fg text-sm font-medium hover:bg-surface-2 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      Save moves
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Accuracy over analysed games */}
      <AccuracyTrendCard refreshKey={analysisRefreshKey} />

      {/* Board + explorer + analysis — the visual hero of this tab */}
      <div className="rounded-xl border border-hairline bg-surface p-6 shadow-sm">
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
