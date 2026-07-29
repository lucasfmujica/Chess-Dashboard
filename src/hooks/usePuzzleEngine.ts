import { useCallback, useEffect, useRef } from 'react';
import { StockfishEngine, type PositionEval } from '../engine/stockfishEngine';

/**
 * A single Stockfish instance kept alive for a whole drilling session.
 *
 * `useLocalEngine` terminates its worker whenever `enabled` flips false, which
 * is right for an analysis panel you toggle but wrong here: spinning up a WASM
 * worker per puzzle would cost more than the search itself. This hook creates
 * the engine lazily on the first grade and keeps it until the component
 * unmounts.
 *
 * Calls are serialised internally. `StockfishEngine.evaluate` — unlike
 * `analyzeLive` — is not queued, so two overlapping evaluations would attach
 * competing listeners to the same worker and resolve with each other's scores.
 */

/** Search depth for grading. Deep enough to be trusted, fast enough to feel instant. */
export const GRADE_DEPTH = 14;

export interface PuzzleEngine {
  evaluate: (fen: string, depth?: number) => Promise<PositionEval>;
}

export const usePuzzleEngine = (): PuzzleEngine => {
  const engineRef = useRef<StockfishEngine | null>(null);
  const queueRef = useRef<Promise<unknown>>(Promise.resolve());
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      engineRef.current?.terminate();
      engineRef.current = null;
    };
  }, []);

  const evaluate = useCallback((fen: string, depth: number = GRADE_DEPTH) => {
    const run = async (): Promise<PositionEval> => {
      // The component may have unmounted while this call sat in the queue.
      if (!aliveRef.current) return {};
      const engine = (engineRef.current ??= new StockfishEngine());
      return engine.evaluate(fen, depth);
    };
    // Chain on both fulfilment and rejection so one failed evaluation does
    // not wedge every later one.
    const next = queueRef.current.then(run, run);
    queueRef.current = next.catch(() => undefined);
    return next as Promise<PositionEval>;
  }, []);

  return { evaluate };
};
