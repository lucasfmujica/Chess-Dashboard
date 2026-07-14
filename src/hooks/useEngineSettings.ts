import { useLocalStorage } from './useLocalStorage';
import { supportsMultiThread } from '../engine/stockfishEngine';

export type EngineMode = 'depth' | 'movetime';

export interface EngineSettings {
  /** Limit the live search by fixed depth or fixed time. */
  mode: EngineMode;
  depth: number;
  movetimeMs: number;
  /** Transposition table size in MB. */
  hashMb: number;
  /** Number of best lines to show (MultiPV). */
  multipv: number;
  /** CPU threads the engine may use. */
  threads: number;
}

/** Cap threads at 4 by default so first-run analysis doesn't peg every core. */
const defaultThreads = supportsMultiThread
  ? Math.max(1, Math.min(4, (navigator.hardwareConcurrency || 4) - 1))
  : 1;

export const DEFAULT_ENGINE_SETTINGS: EngineSettings = {
  mode: 'depth',
  depth: 18,
  movetimeMs: 1500,
  hashMb: 64,
  multipv: 3,
  threads: defaultThreads,
};

/** Persisted Stockfish settings shared by the live engine and full-game analysis. */
export const useEngineSettings = () =>
  useLocalStorage<EngineSettings>('chess-dashboard-engine-settings', DEFAULT_ENGINE_SETTINGS);
