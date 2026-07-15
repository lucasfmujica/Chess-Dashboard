export type { MinedEndgame, EndgameType } from '../engine/mineEndgames';

/** Minimal game context joined in alongside a drill, for display without a second fetch. */
export interface EndgameDrillGame {
  opponent: string;
  playedDate?: string;
  eco?: string;
  openingName?: string;
  color: 'W' | 'B';
  result: 'W' | 'D' | 'L';
}

/** A mined endgame snapshot as stored server-side, with SRS review state. */
export interface EndgameDrill {
  id: string;
  gameId: string;
  ply: number;
  fen: string;
  materialDelta: number;
  endgameType: 'pawn' | 'rook' | 'minor' | 'queen' | 'mixed';
  confidence?: number;
  lastReviewed?: number;
  reviewCount: number;
  archived: boolean;
  createdAt: number;
  game: EndgameDrillGame;
}
