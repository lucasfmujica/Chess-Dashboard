import { StockfishEngine } from './stockfishEngine';

export type MoveQuality = 'best' | 'good' | 'inaccuracy' | 'mistake' | 'blunder';

export interface MoveAnalysis {
  /** 1-based ply. */
  ply: number;
  /** White-normalized eval (centipawns) after this move. */
  evalCp: number;
  /** Centipawn loss for the mover (>= 0). */
  cpLoss: number;
  quality: MoveQuality;
}

export interface GameAnalysis {
  depth: number;
  /** White-normalized eval per position (index 0 = start, length = plies + 1). */
  evals: number[];
  moves: MoveAnalysis[];
  accuracyWhite: number;
  accuracyBlack: number;
  blunders: number;
  mistakes: number;
  inaccuracies: number;
}

export interface AnalyzeOptions {
  depth?: number;
  signal?: AbortSignal;
  onProgress?: (done: number, total: number) => void;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Convert a side-to-move eval (cp or mate) to White-normalized centipawns. */
const toWhiteCp = (cp: number | undefined, mate: number | undefined, whiteToMove: boolean): number => {
  let stmCp: number;
  if (mate !== undefined) {
    stmCp = mate > 0 ? 10000 - mate * 10 : -10000 - mate * 10;
  } else {
    stmCp = cp ?? 0;
  }
  const white = whiteToMove ? stmCp : -stmCp;
  return clamp(white, -10000, 10000);
};

/** Lichess win-percentage model for a centipawn eval (mover's perspective). */
const winPct = (cp: number): number => 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1);

/** Lichess per-move accuracy from the win-% drop. */
const moveAccuracy = (winBefore: number, winAfter: number): number =>
  clamp(103.1668 * Math.exp(-0.04354 * (winBefore - winAfter)) - 3.1669, 0, 100);

const classify = (cpLoss: number): MoveQuality => {
  if (cpLoss >= 300) return 'blunder';
  if (cpLoss >= 150) return 'mistake';
  if (cpLoss >= 50) return 'inaccuracy';
  if (cpLoss >= 20) return 'good';
  return 'best';
};

const sideToMoveIsWhite = (fen: string): boolean => fen.split(' ')[1] !== 'b';

const mean = (arr: number[]): number => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 100);

/**
 * Run Stockfish over every position of a game and derive per-move quality,
 * centipawn loss and Lichess-style accuracy. On-demand and cancellable.
 */
export const analyzeGame = async (
  fens: string[],
  { depth = 13, signal, onProgress }: AnalyzeOptions = {}
): Promise<GameAnalysis> => {
  const engine = new StockfishEngine();
  try {
    await engine.init();
    const evals: number[] = [];
    for (let i = 0; i < fens.length; i++) {
      if (signal?.aborted) throw new DOMException('Analysis cancelled', 'AbortError');
      const res = await engine.evaluate(fens[i], depth);
      evals.push(toWhiteCp(res.cp, res.mate, sideToMoveIsWhite(fens[i])));
      onProgress?.(i + 1, fens.length);
    }

    const moves: MoveAnalysis[] = [];
    const whiteAcc: number[] = [];
    const blackAcc: number[] = [];
    let blunders = 0, mistakes = 0, inaccuracies = 0;

    for (let m = 0; m < fens.length - 1; m++) {
      const moverIsWhite = m % 2 === 0;
      const sign = moverIsWhite ? 1 : -1;
      const beforeMover = sign * evals[m];
      const afterMover = sign * evals[m + 1];
      const cpLoss = Math.max(0, beforeMover - afterMover);
      const quality = classify(cpLoss);

      if (quality === 'blunder') blunders++;
      else if (quality === 'mistake') mistakes++;
      else if (quality === 'inaccuracy') inaccuracies++;

      const acc = moveAccuracy(winPct(beforeMover), winPct(afterMover));
      (moverIsWhite ? whiteAcc : blackAcc).push(acc);

      moves.push({ ply: m + 1, evalCp: evals[m + 1], cpLoss, quality });
    }

    return {
      depth,
      evals,
      moves,
      accuracyWhite: Math.round(mean(whiteAcc) * 10) / 10,
      accuracyBlack: Math.round(mean(blackAcc) * 10) / 10,
      blunders,
      mistakes,
      inaccuracies,
    };
  } finally {
    engine.terminate();
  }
};
