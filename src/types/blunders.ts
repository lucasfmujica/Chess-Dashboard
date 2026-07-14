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
  createdAt: number;
  game: BlunderDrillGame;
}
