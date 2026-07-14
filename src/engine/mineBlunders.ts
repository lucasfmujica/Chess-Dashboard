import { parsePgn } from '../hooks/useGameReplay';
import { getCachedAnalysis } from '../hooks/useGameAnalysis';
import type { Game } from '../types/chess';

export interface MinedBlunder {
  gameId: string;
  ply: number;
  fenBefore: string;
  playedSan: string;
  bestMoveUci: string;
  cpLoss: number;
  evalBefore: number;
  evalAfter: number;
}

/**
 * Mine the player's own blunders/mistakes out of one game's cached Stockfish
 * analysis. Requires the game to already be analyzed (via Analysis Board /
 * "Analyze all") and stored with an id — games without either are skipped.
 */
export const mineBlundersFromGame = (game: Game): MinedBlunder[] => {
  if (!game.id || !game.pgn) return [];
  const analysis = getCachedAnalysis(game.pgn);
  if (!analysis) return [];
  const { fens, sans } = parsePgn(game.pgn);

  return analysis.moves
    .filter(mv => {
      if (mv.quality !== 'blunder' && mv.quality !== 'mistake') return false;
      if (!mv.bestMoveUci) return false;
      const whiteMoved = mv.ply % 2 === 1;
      const moverIsPlayer = whiteMoved === (game.color === 'W');
      return moverIsPlayer;
    })
    .map((mv): MinedBlunder | null => {
      const fenBefore = fens[mv.ply - 1];
      const playedSan = sans[mv.ply - 1];
      const evalBefore = analysis.evals[mv.ply - 1];
      if (fenBefore === undefined || playedSan === undefined || evalBefore === undefined) return null;
      return {
        gameId: game.id!,
        ply: mv.ply,
        fenBefore,
        playedSan,
        bestMoveUci: mv.bestMoveUci!,
        cpLoss: mv.cpLoss,
        evalBefore,
        evalAfter: mv.evalCp,
      };
    })
    .filter((b): b is MinedBlunder => b !== null);
};

export const mineAllBlunders = (games: Game[]): MinedBlunder[] => games.flatMap(mineBlundersFromGame);
