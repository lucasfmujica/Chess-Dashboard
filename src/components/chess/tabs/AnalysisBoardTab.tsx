import { useMemo, useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { Button, Card, SegmentedControl } from '../../ui';
import { useGames, useSourceFilteredGames } from '../../../context/GamesContext';
import { gameToViewerData } from '../../../utils/gameMapping';
import type { GameViewerData } from '../../../context/GameViewerContext';
import GameViewer from '../GameViewer';
import DiagnosticsPanel, { type BoardMarks } from './annotations/DiagnosticsPanel';
import GamesAnalysisList from '../GamesAnalysisList';
import AccuracyTrendCard from '../../charts/AccuracyTrendCard';

/** Paper form field: ruled, square, focus in pen. */
const FIELD =
  'w-full rounded border border-hairline bg-surface px-3 py-2 text-sm text-fg placeholder-fg-subtle focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent';

const headerValue = (text: string, key: string): string | undefined =>
  text.match(new RegExp(`\\[${key}\\s+"([^"]+)"\\]`))?.[1];

/**
 * Full-page analysis board: load any game (pasted PGN or an imported game with
 * moves), step through it, see Stockfish accuracy/eval and what masters play.
 */
const AnalysisBoardTab = () => {
  const { updateGamePgn } = useGames();
  // Same filtered list GamesAnalysisList walks, so the indices below line up.
  const games = useSourceFilteredGames();
  const [loaded, setLoaded] = useState<GameViewerData | null>(null);
  /** Lo que el diagnóstico pinta sobre el tablero: la jugada del motor y las
   *  piezas que la jugada activó. Vive acá porque el panel se renderiza dentro
   *  del visor y la información tiene que subir al padre para poder bajar. */
  const [marks, setMarks] = useState<BoardMarks>({});
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
    setLoaded(gameToViewerData(g, g.pgn));
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
      setLoaded(gameToViewerData(updated, moves));
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
      <Card flush>
        <button
          onClick={() => setToolsOpen(o => !o)}
          className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent sm:px-6"
          aria-expanded={toolsOpen}
        >
          <span className="min-w-0">
            <span className="block font-serif text-xl font-semibold leading-tight text-fg">Cargar una partida</span>
            <span className="mt-1 block text-sm text-fg-muted">
              Pegá un PGN, elegí una partida importada o agregale las jugadas a una partida de torneo
            </span>
          </span>
          <ChevronDownIcon className={`h-5 w-5 shrink-0 text-fg-subtle transition-transform duration-200 ${toolsOpen ? 'rotate-180' : ''}`} />
        </button>

        {toolsOpen && (
          <div className="border-t border-hairline px-5 pb-5 pt-4 sm:px-6">
            <SegmentedControl
              aria-label="Cómo cargar la partida"
              size="sm"
              value={toolsTab}
              onChange={setToolsTab}
              options={[
                { value: 'load', label: 'Cargar partida' },
                { value: 'attach', label: 'Agregar jugadas' },
              ]}
              className="mb-4"
            />

            {toolsTab === 'load' ? (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <div className="lg:col-span-2">
                  <label htmlFor="ab-paste" className="text-label mb-1.5 block">Pegar un PGN</label>
                  <textarea
                    id="ab-paste"
                    value={pasteText}
                    onChange={e => setPasteText(e.target.value)}
                    rows={3}
                    placeholder={'[Event "..."]\n\n1. e4 e5 2. Nf3 Nc6 ...'}
                    className={`${FIELD} resize-y font-mono`}
                  />
                  <Button variant="primary" size="sm" onClick={loadPaste} disabled={!pasteText.trim()} className="mt-2">
                    Cargar PGN
                  </Button>
                </div>

                <div>
                  <label htmlFor="ab-stored" className="text-label mb-1.5 block">O elegí una partida importada</label>
                  {playableGames.length > 0 ? (
                    <select
                      id="ab-stored"
                      onChange={e => loadStored(e.target.value)}
                      defaultValue=""
                      className={FIELD}
                    >
                      <option value="" disabled>Elegir partida…</option>
                      {playableGames.map(({ g, i }) => (
                        <option key={i} value={i}>
                          {g.tournament} · vs {g.opp}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-sm text-fg-muted">
                      Todavía no hay partidas con jugadas. Importá un PGN con jugadas desde Resumen y aparecen acá.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <p className="mb-3 text-sm text-fg-muted">
                  Las partidas de torneo se guardan sin jugadas. Elegí una y pegá su PGN para poder
                  reproducirla y analizarla.
                </p>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                  <div>
                    <label htmlFor="ab-attach-game" className="text-label mb-1.5 block">Partida</label>
                    <select
                      id="ab-attach-game"
                      value={attachGameId}
                      onChange={e => selectAttach(e.target.value)}
                      className={FIELD}
                    >
                      <option value="" disabled>Elegir partida…</option>
                      {games.filter(g => g.id).map(g => (
                        <option key={g.id} value={g.id}>
                          {g.tournament} · vs {g.opp}{g.pgn ? ' (con jugadas)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="lg:col-span-2">
                    <label htmlFor="ab-attach-pgn" className="text-label mb-1.5 block">Jugadas (PGN)</label>
                    <textarea
                      id="ab-attach-pgn"
                      value={attachText}
                      onChange={e => setAttachText(e.target.value)}
                      rows={3}
                      placeholder={'1. e4 e5 2. Nf3 Nc6 ...'}
                      disabled={!attachGameId}
                      className={`${FIELD} resize-y font-mono disabled:opacity-50`}
                    />
                    <Button size="sm" onClick={saveMoves} disabled={!attachGameId} className="mt-2">
                      Guardar jugadas
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Board + explorer + analysis — the visual hero of this tab */}
      <Card>
        {/* Step between all your games with moves, without using the dropdown. */}
        {playableGames.length > 0 && (
          <div className="mb-5 flex items-center justify-between gap-3 border-b border-hairline pb-3">
            <Button
              variant="ghost"
              size="sm"
              icon={ChevronLeftIcon}
              onClick={() => gotoPlayable(playablePos < 0 ? 0 : playablePos - 1)}
              disabled={playablePos <= 0}
            >
              <span className="hidden sm:inline">Partida anterior</span>
              <span className="sm:hidden">Anterior</span>
            </Button>
            <span className="min-w-0 truncate text-center font-mono text-xs tabular-nums text-fg-muted">
              {playablePos >= 0
                ? `partida ${playablePos + 1} de ${playableGames.length}`
                : `${playableGames.length} ${playableGames.length === 1 ? 'partida' : 'partidas'} con jugadas`}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => gotoPlayable(playablePos < 0 ? 0 : playablePos + 1)}
              disabled={playablePos >= playableGames.length - 1}
            >
              <span className="hidden sm:inline">Partida siguiente</span>
              <span className="sm:hidden">Siguiente</span>
              <ChevronRightIcon className="h-3.5 w-3.5" />
            </Button>
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
          wide
          marks={marks}
          capture={position => (
            <DiagnosticsPanel position={position} gameId={loaded?.gameId} onMarks={setMarks} />
          )}
        />
      </Card>

      {/* All your games: results, opening, accuracy — click to load on the board */}
      <GamesAnalysisList
        onLoad={loadByIndex}
        loadedIndex={loadedIndex}
        onAnalyzed={() => setAnalysisRefreshKey(k => k + 1)}
      />

      {/* Accuracy over analysed games */}
      <AccuracyTrendCard refreshKey={analysisRefreshKey} />
    </div>
  );
};

export default AnalysisBoardTab;
