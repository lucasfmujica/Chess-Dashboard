import { isDue, nextReviewAt } from './srs';

/**
 * Selection policy for the daily training queue.
 *
 * Kept out of the hook so the ordering rules — which decide what actually
 * gets trained each day — can be tested without React.
 */

/**
 * Stable per-day tiebreak. Selection must not reshuffle when the component
 * re-renders or the page is refreshed mid-session, so ordering among equally
 * due items is a pure hash of (day, item id) rather than Math.random().
 * FNV-1a: cheap, no dependencies, and well spread for short string keys.
 */
export const dayHash = (id: string, dayKey: string): number => {
  let hash = 2166136261;
  const input = `${dayKey}:${id}`;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

export type GamePhase = 'opening' | 'middlegame' | 'endgame';

/** Last ply still counted as opening: move 12. */
const OPENING_MAX_PLY = 24;
/** Endgame = at most this many pieces on the board, kings and pawns not counted. */
const ENDGAME_MAX_PIECES = 6;

/**
 * Phase of a position. Endgame wins over opening so a drill tagged as an
 * endgame never falls back to a ply-based guess; the rest of the middle is
 * simply "not opening, not endgame".
 */
export const gamePhaseFromPlyFen = (
  ply: number,
  fen: string,
  kind?: 'blunder' | 'endgame'
): GamePhase => {
  if (kind === 'endgame') return 'endgame';
  const placement = fen.split(' ')[0] ?? '';
  let pieces = 0;
  for (const ch of placement) {
    if (/[qrbnQRBN]/.test(ch)) pieces += 1;
  }
  if (pieces <= ENDGAME_MAX_PIECES) return 'endgame';
  return ply <= OPENING_MAX_PLY ? 'opening' : 'middlegame';
};

/**
 * Tournament-first ordering of where a game came from: OTB (or unknown
 * source), then slow online games, then blitz. Lower is trained first.
 * Bullet is last only as a safety net — callers drop it before selection.
 */
export const sourceSpeedRank = (source?: string, speed?: string): number => {
  if (!source || source === 'otb') return 0;
  if (speed === 'classical' || speed === 'rapid') return 1;
  if (speed === 'blitz') return 2;
  if (speed === 'bullet') return 4;
  return 3;
};

export const isBulletGame = (source?: string, speed?: string): boolean =>
  !!source && source !== 'otb' && speed === 'bullet';

/** Drops bullet games from any drill list; drills carry their game's source and speed. */
export const withoutBullet = <T extends { game: { source?: string; speed?: string } }>(
  drills: T[]
): T[] => drills.filter(d => !isBulletGame(d.game.source, d.game.speed));

const PHASE_RANK: Record<GamePhase, number> = { middlegame: 0, endgame: 1, opening: 2 };

export const phaseRank = (phase: GamePhase): number => PHASE_RANK[phase];

/** Everything `compareNeverSeen` orders by; lower rank / higher cpLoss / newer wins. */
export interface NeverSeenKey {
  sourceRank: number;
  phaseRank: number;
  /** 0 for rook endgames, 1 otherwise; only meaningful among endgame drills. */
  rookRank: number;
  cpLoss: number;
  /** Epoch ms of the game (or the drill's creation as a fallback). */
  recency: number;
}

export const compareNeverSeen = (a: NeverSeenKey, b: NeverSeenKey): number =>
  a.sourceRank - b.sourceRank ||
  a.rookRank - b.rookRank ||
  a.phaseRank - b.phaseRank ||
  b.cpLoss - a.cpLoss ||
  b.recency - a.recency;

/** What the selector needs to know about an item, however it's shaped. */
export interface QueueAccessors<T> {
  getId: (item: T) => string;
  getConfidence: (item: T) => number | undefined;
  getLastReviewed: (item: T) => number | undefined;
  /**
   * Optional tournament-priority key. Only used to order items that were never
   * reviewed, after the SRS keys and before the day hash.
   */
  getNeverSeenKey?: (item: T) => NeverSeenKey;
}

/**
 * Pick `count` items: everything due first (soonest next-review first), then
 * lowest-confidence items as filler so a day is never short just because the
 * SRS intervals happen not to have elapsed. Never-reviewed items are ordered by
 * `getNeverSeenKey` when given; remaining ties broken by the day hash.
 */
export const pickDueFirst = <T>(
  items: T[],
  count: number,
  now: number,
  dayKey: string,
  accessors: QueueAccessors<T>
): T[] => {
  if (count <= 0 || items.length === 0) return [];
  const { getId, getConfidence, getLastReviewed, getNeverSeenKey } = accessors;

  return [...items]
    .map(item => ({
      item,
      // Due items always precede filler; within a tier, soonest next review,
      // then lowest confidence, then the stable hash.
      tier: isDue(getLastReviewed(item), getConfidence(item), now) ? 0 : 1,
      next: nextReviewAt(getLastReviewed(item), getConfidence(item)),
      confidence: getConfidence(item) ?? 0,
      neverSeenKey:
        getNeverSeenKey && !getLastReviewed(item) ? getNeverSeenKey(item) : undefined,
      hash: dayHash(getId(item), dayKey),
    }))
    .sort(
      (a, b) =>
        a.tier - b.tier ||
        a.next - b.next ||
        a.confidence - b.confidence ||
        (a.neverSeenKey && b.neverSeenKey ? compareNeverSeen(a.neverSeenKey, b.neverSeenKey) : 0) ||
        a.hash - b.hash
    )
    .slice(0, count)
    .map(entry => entry.item);
};
