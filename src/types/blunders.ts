export type { MinedBlunder } from '../engine/mineBlunders';

/** Minimal game context joined in alongside a drill, for display without a second fetch. */
export interface BlunderDrillGame {
  opponent: string;
  playedDate?: string;
  eco?: string;
  openingName?: string;
  color: 'W' | 'B';
  result: 'W' | 'D' | 'L';
}

/** A mined blunder/mistake as stored server-side, with SRS + solve-mode state. */
export interface BlunderDrill {
  id: string;
  gameId: string;
  ply: number;
  fenBefore: string;
  playedSan: string;
  bestMoveUci: string;
  cpLoss: number;
  evalBefore: number;
  evalAfter: number;
  confidence?: number;
  lastReviewed?: number;
  reviewCount: number;
  solvedCount: number;
  archived: boolean;
  /**
   * Probabilidad 0..1 que Maia-1900 le da a la solución: qué tan encontrable es
   * en el tablero para esta banda de rating (Lichess, ~1750-1800 FIDE). Por
   * debajo de ~2% el drill es una curiosidad de motor, no entrenamiento.
   */
  maiaPolicy?: number;
  createdAt: number;
  game: BlunderDrillGame;
}
