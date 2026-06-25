import { useEffect, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import { StockfishEngine } from '../engine/stockfishEngine';
import type { EngineLineRaw } from '../engine/stockfishEngine';
import type { EngineSettings } from './useEngineSettings';

export interface EngineLine {
  rank: number;
  /** White-relative eval string, e.g. "+1.20" or "#3". */
  evalText: string;
  /** White-normalized centipawns (for ordering/coloring). */
  evalCp: number;
  depth: number;
  /** First few SAN moves of the principal variation. */
  sans: string[];
  /** First move in UCI (for board arrows). */
  firstUci?: string;
}

export interface LocalEngineState {
  lines: EngineLine[];
  depth: number;
  analyzing: boolean;
}

const whiteToMove = (fen: string): boolean => fen.split(' ')[1] !== 'b';

const sansFromPv = (fen: string, pvUci: string[], max = 6): string[] => {
  const chess = new Chess(fen);
  const sans: string[] = [];
  for (const uci of pvUci.slice(0, max)) {
    try {
      const move = chess.move({
        from: uci.slice(0, 2),
        to: uci.slice(2, 4),
        promotion: uci.length > 4 ? uci[4] : undefined,
      });
      if (!move) break;
      sans.push(move.san);
    } catch {
      break;
    }
  }
  return sans;
};

const toLine = (raw: EngineLineRaw, fen: string): EngineLine => {
  const stmWhite = whiteToMove(fen);
  let evalCp: number;
  let evalText: string;
  if (raw.mate !== undefined) {
    const whiteMate = stmWhite ? raw.mate : -raw.mate;
    evalCp = whiteMate > 0 ? 10000 : -10000;
    evalText = `${whiteMate < 0 ? '-' : ''}#${Math.abs(whiteMate)}`;
  } else {
    const cp = raw.cp ?? 0;
    const whiteCp = stmWhite ? cp : -cp;
    evalCp = whiteCp;
    evalText = `${whiteCp >= 0 ? '+' : ''}${(whiteCp / 100).toFixed(2)}`;
  }
  return {
    rank: raw.multipv,
    evalText,
    evalCp,
    depth: raw.depth,
    sans: sansFromPv(fen, raw.pv),
    firstUci: raw.pv[0],
  };
};

/**
 * Persistent live Stockfish engine for the current position (MultiPV top-N),
 * driven by the user's engine settings. Re-runs as the position changes.
 */
export const useLocalEngine = (
  fen: string,
  settings: EngineSettings,
  enabled: boolean
): LocalEngineState => {
  const engineRef = useRef<StockfishEngine | null>(null);
  const genRef = useRef(0);
  const [state, setState] = useState<LocalEngineState>({ lines: [], depth: 0, analyzing: false });

  const { mode, depth, movetimeMs, hashMb, multipv } = settings;

  useEffect(() => {
    if (!enabled) {
      genRef.current++;
      engineRef.current?.terminate();
      engineRef.current = null;
      setState({ lines: [], depth: 0, analyzing: false });
      return;
    }

    const gen = ++genRef.current;
    const engine = (engineRef.current ??= new StockfishEngine());
    setState(s => ({ ...s, analyzing: true }));

    engine
      .analyzeLive(fen, { multipv, mode, depth, movetimeMs, hashMb }, rawLines => {
        if (gen !== genRef.current) return;
        const lines = rawLines.map(r => toLine(r, fen));
        setState({
          lines,
          depth: Math.max(0, ...lines.map(l => l.depth)),
          analyzing: true,
        });
      })
      .then(() => {
        if (gen === genRef.current) setState(s => ({ ...s, analyzing: false }));
      })
      .catch(() => {
        if (gen === genRef.current) setState(s => ({ ...s, analyzing: false }));
      });
  }, [fen, enabled, mode, depth, movetimeMs, hashMb, multipv]);

  // Free the engine on unmount.
  useEffect(() => () => {
    genRef.current++;
    engineRef.current?.terminate();
    engineRef.current = null;
  }, []);

  return state;
};
