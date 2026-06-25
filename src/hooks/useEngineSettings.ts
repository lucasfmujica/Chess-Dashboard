import { useLocalStorage } from './useLocalStorage';

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
}

export const DEFAULT_ENGINE_SETTINGS: EngineSettings = {
  mode: 'depth',
  depth: 18,
  movetimeMs: 1500,
  hashMb: 64,
  multipv: 3,
};

/** Persisted Stockfish settings shared by the live engine and full-game analysis. */
export const useEngineSettings = () =>
  useLocalStorage<EngineSettings>('chess-dashboard-engine-settings', DEFAULT_ENGINE_SETTINGS);
