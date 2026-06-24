import { useMemo, useState } from 'react';
import { BeakerIcon } from '@heroicons/react/24/outline';
import { useGames } from '../../../context/GamesContext';
import GameViewer from '../GameViewer';
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

/**
 * Full-page analysis board: load any game (pasted PGN or an imported game with
 * moves), step through it, see Stockfish accuracy/eval and what masters play.
 */
const AnalysisBoardTab = () => {
  const { games } = useGames();
  const [loaded, setLoaded] = useState<LoadedGame | null>(null);
  const [pasteText, setPasteText] = useState('');

  // Games that actually carry moves.
  const playableGames = useMemo(
    () => games.map((g, i) => ({ g, i })).filter(({ g }) => !!g.pgn),
    [games]
  );

  const loadPaste = () => {
    if (!pasteText.trim()) return;
    setLoaded({
      pgn: pasteText,
      white: headerValue(pasteText, 'White'),
      black: headerValue(pasteText, 'Black'),
      result: headerValue(pasteText, 'Result'),
      orientation: 'white',
    });
  };

  const loadStored = (index: string) => {
    const idx = parseInt(index, 10);
    const g = games[idx];
    if (!g?.pgn) {
      setLoaded(null);
      return;
    }
    setLoaded({
      pgn: g.pgn,
      white: g.color === 'W' ? 'You' : g.opp,
      black: g.color === 'B' ? 'You' : g.opp,
      result: g.result === 'W' ? '1-0 / 0-1' : g.result === 'D' ? '½-½' : '',
      orientation: g.color === 'B' ? 'black' : 'white',
    });
  };

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

      {/* Accuracy over analysed games */}
      <AccuracyTrendCard />

      {/* Board + explorer + analysis */}
      <div className="rounded-lg border border-hairline bg-surface p-5">
        <GameViewer
          pgn={loaded?.pgn}
          white={loaded?.white}
          black={loaded?.black}
          result={loaded?.result}
          orientation={loaded?.orientation}
          showExplorer
        />
      </div>
    </div>
  );
};

export default AnalysisBoardTab;
