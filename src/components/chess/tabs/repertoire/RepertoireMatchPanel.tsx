import { useCallback, useEffect, useMemo, useState } from 'react';
import { LinkIcon } from '@heroicons/react/24/outline';
import { useGames } from '../../../../context/GamesContext';
import { fetchRepertoireLines, patchGameRepertoireMatches } from '../../../../api/client';
import { parsePgn } from '../../../../hooks/useGameReplay';
import { matchRepertoireLine } from '../../../../utils/repertoireMatch';
import { Card, Button, Table, THead, TBody, TR, TH, TD } from '../../../ui';
import type { RepertoireLine } from '../../../../types/chess';

/**
 * Links played games to prepared repertoire lines and reports which lines
 * actually cost points.
 *
 * Matching runs in the browser (chess.js is already loaded here and not on
 * the server) and writes back in a single bulk PATCH rather than one request
 * per game.
 */

interface LineStats {
  line: RepertoireLine;
  games: number;
  score: number;
  /** Mean ply at which games left this line — low means it isn't holding up. */
  avgExitPly: number;
}

const RepertoireMatchPanel = () => {
  const { games, refetchGames } = useGames();
  const [lines, setLines] = useState<RepertoireLine[]>([]);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRepertoireLines()
      .then(setLines)
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load lines'));
  }, []);

  const run = useCallback(async () => {
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const withMoves = games.filter(g => g.pgn && g.id);
      const matches = withMoves.map(game => {
        const { sans } = parsePgn(game.pgn);
        const match = matchRepertoireLine(sans, game.color === 'B' ? 'B' : 'W', lines);
        return {
          id: game.id as string,
          repertoireLineId: match?.lineId ?? null,
          bookExitPly: match?.exitPly ?? null,
        };
      });
      await patchGameRepertoireMatches(matches);
      // The games held in context still carry the pre-write link, so pull
      // them again before the table below reads them.
      await refetchGames();
      const matched = matches.filter(m => m.repertoireLineId).length;
      setResult(`${matched} de ${withMoves.length} partidas vinculadas a una línea.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Matching failed');
    } finally {
      setRunning(false);
    }
  }, [games, lines, refetchGames]);

  /** Per-line record, worst-performing first — that's the study order. */
  const stats = useMemo<LineStats[]>(() => {
    const byLine = new Map<string, { games: number; score: number; exitSum: number }>();
    games.forEach(g => {
      if (!g.repertoireLineId) return;
      const entry = byLine.get(g.repertoireLineId) ?? { games: 0, score: 0, exitSum: 0 };
      entry.games += 1;
      entry.score += g.result === 'W' ? 1 : g.result === 'D' ? 0.5 : 0;
      entry.exitSum += g.bookExitPly ?? 0;
      byLine.set(g.repertoireLineId, entry);
    });
    return [...byLine.entries()]
      .flatMap(([lineId, v]) => {
        const line = lines.find(l => l.id === lineId);
        if (!line) return [];
        return [
          {
            line,
            games: v.games,
            score: v.score,
            avgExitPly: v.games ? Math.round((v.exitSum / v.games) * 10) / 10 : 0,
          },
        ];
      })
      .sort((a, b) => a.score / a.games - b.score / b.games);
  }, [games, lines]);

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-h3 text-fg flex items-center gap-2">
            <LinkIcon className="w-5 h-5 text-accent" />
            Partidas contra repertorio
          </h3>
          <p className="text-sm text-fg-muted mt-1">
            Vincula cada partida con la línea preparada que siguió y hasta qué jugada aguantó.
            Así sabés qué capítulo te costó puntos de verdad, no por sensación.
          </p>
        </div>
        <Button onClick={() => void run()} disabled={running || lines.length === 0}>
          {running ? 'Analizando…' : 'Vincular partidas'}
        </Button>
      </div>

      {result && <p className="text-sm text-win mt-3">{result}</p>}
      {error && <p className="text-sm text-loss mt-3">{error}</p>}

      {stats.length > 0 && (
        <div className="mt-5 overflow-x-auto">
          <Table>
            <THead>
              <TR>
                <TH>Línea</TH>
                <TH align="right">Partidas</TH>
                <TH align="right">Puntos</TH>
                <TH align="right">Sale del libro</TH>
              </TR>
            </THead>
            <TBody>
              {stats.map(s => (
                <TR key={s.line.id}>
                  <TD>
                    <span className="text-fg">{s.line.lineName ?? s.line.eco ?? 'Sin nombre'}</span>
                  </TD>
                  <TD align="right">{s.games}</TD>
                  <TD align="right">
                    {s.score}/{s.games}
                  </TD>
                  <TD align="right" muted>
                    jugada {s.avgExitPly}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </div>
      )}
    </Card>
  );
};

export default RepertoireMatchPanel;
