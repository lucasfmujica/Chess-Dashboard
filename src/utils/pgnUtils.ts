/**
 * PGN (Portable Game Notation) utilities
 * Functions for parsing and importing PGN chess games
 */

import type { Game, PlayerColor, GameResult } from '../types/chess';

/** Move numbers whose clock reading is kept. */
const CLOCK_MOVES = [20, 30, 40] as const;
type ClockMove = (typeof CLOCK_MOVES)[number];

/** Clock readings ('H:MM:SS') by move number for one side. */
export type SideClocks = Partial<Record<ClockMove, string>>;
export interface ClockSnapshots {
  white: SideClocks;
  black: SideClocks;
}

/** Intermediate shape extracted from a PGN game's headers. */
export interface ParsedPgnGame {
  whiteElo?: number;
  blackElo?: number;
  white?: string;
  black?: string;
  result?: string;
  eco?: string;
  tournament?: string;
  /** `Round` tag, when it carries a real value ('?' and '-' do not). */
  round?: string;
  /** Remaining clock after each side's move 20 / 30 / 40, from `{[%clk ...]}` comments. */
  clocks?: ClockSnapshots;
  /** SAN movetext (everything after the headers), when present. */
  moves?: string;
}

/** Result of converting parsed PGN games into the internal format. */
export interface PgnConversionResult {
  games: Game[];
  skippedCount: number;
}

/** Valid PGN result tokens. */
const VALID_RESULTS = new Set(['1-0', '0-1', '1/2-1/2']);

/**
 * Parse an ELO string into a sane rating number.
 * Returns 0 for missing/invalid/out-of-range values (treated as "unrated").
 */
const parseElo = (value: string): number => {
  const elo = parseInt(value, 10);
  if (Number.isNaN(elo) || elo < 0 || elo > 4000) return 0;
  return elo;
};

/**
 * Read the `{[%clk H:MM:SS]}` comments at moves 20, 30 and 40 from SAN movetext.
 *
 * A reading is the clock *after* that side's move with that number (white's
 * 20th move, black's 20th move). If a move number carries several `%clk`
 * comments for the same side (e.g. inside a variation), the last one seen wins.
 * Returns an empty snapshot for movetext without clocks.
 */
export const extractClockSnapshots = (movetext: string): ClockSnapshots => {
  const clocks: ClockSnapshots = { white: {}, black: {} };
  let moveNo = 1;
  let side: 'white' | 'black' = 'white';
  let last: { moveNo: number; side: 'white' | 'black' } | null = null;

  const tokens = /\{([^}]*)\}|(\d+)\.(\.\.)?|([^\s{}]+)/g;
  let match: RegExpExecArray | null;
  while ((match = tokens.exec(movetext)) !== null) {
    const [, comment, number, dots, word] = match;
    if (comment !== undefined) {
      const clk = /\[%clk\s+(\d+:\d{2}:\d{2}(?:\.\d+)?)\]/.exec(comment);
      if (clk && last && (CLOCK_MOVES as readonly number[]).includes(last.moveNo)) {
        clocks[last.side][last.moveNo as ClockMove] = clk[1];
      }
    } else if (number !== undefined) {
      moveNo = Number(number);
      side = dots ? 'black' : 'white';
    } else if (word !== undefined && !VALID_RESULTS.has(word) && word !== '*' && !word.startsWith('$')) {
      last = { moveNo, side };
      if (side === 'white') {
        side = 'black';
      } else {
        side = 'white';
        moveNo += 1;
      }
    }
  }
  return clocks;
};

/**
 * Parse PGN text and extract game metadata.
 */
export const parsePGN = (pgnText: string): ParsedPgnGame[] => {
  try {
    if (typeof pgnText !== 'string' || !pgnText.trim()) return [];

    const parsedGames: ParsedPgnGame[] = [];
    const gameBlocks = pgnText.split(/\n\n(?=\[Event)/);

    gameBlocks.forEach(block => {
      if (!block.trim()) return;

      const game: ParsedPgnGame = {};
      const lines = block.split('\n');
      const moveLines: string[] = [];

      lines.forEach(line => {
        if (line.startsWith('[')) {
          const match = line.match(/\[(\w+)\s+"([^"]+)"\]/);
          if (match) {
            const [, key, value] = match;
            if (key === 'WhiteElo') game.whiteElo = parseElo(value);
            if (key === 'BlackElo') game.blackElo = parseElo(value);
            if (key === 'White') game.white = value;
            if (key === 'Black') game.black = value;
            if (key === 'Result') game.result = value;
            if (key === 'ECO') game.eco = value;
            if (key === 'Event') game.tournament = value;
            if (key === 'Round' && value !== '?' && value !== '-') game.round = value;
          }
        } else if (line.trim()) {
          // Non-header, non-empty line -> part of the movetext.
          moveLines.push(line.trim());
        }
      });

      const moves = moveLines.join(' ').trim();
      if (moves) {
        game.moves = moves;
        const clocks = extractClockSnapshots(moves);
        if (Object.keys(clocks.white).length || Object.keys(clocks.black).length) game.clocks = clocks;
      }

      // Only keep games with both players and a recognized result.
      if (game.white && game.black && game.result && VALID_RESULTS.has(game.result)) {
        parsedGames.push(game);
      }
    });

    return parsedGames;
  } catch (error) {
    throw new Error(`Error parsing PGN: ${(error as Error).message}`);
  }
};

/**
 * Convert parsed PGN games to internal game format.
 * @param parsedGames Games from parsePGN()
 * @param playerName Player's name as it appears in PGN
 * @param playerElo Player's ELO at the time of the tournament
 */
export const convertPGNGamesToInternal = (
  parsedGames: ParsedPgnGame[],
  playerName: string,
  playerElo: number
): PgnConversionResult => {
  const formattedGames: Game[] = [];
  let skippedGames = 0;

  parsedGames.forEach(game => {
    // Determine player's color and opponent
    let color: PlayerColor;
    let oppName: string;
    let oppElo: number;
    let result: GameResult;
    let clocks: SideClocks | undefined;

    if (game.white && game.white.toLowerCase().includes(playerName.toLowerCase())) {
      color = 'W';
      oppName = game.black || 'Unknown';
      oppElo = game.blackElo || 0;
      clocks = game.clocks?.white;
      // Convert PGN result format to our format
      if (game.result === '1-0') result = 'W';
      else if (game.result === '0-1') result = 'L';
      else if (game.result === '1/2-1/2') result = 'D';
      else {
        skippedGames++;
        return;
      }
    } else if (game.black && game.black.toLowerCase().includes(playerName.toLowerCase())) {
      color = 'B';
      oppName = game.white || 'Unknown';
      oppElo = game.whiteElo || 0;
      clocks = game.clocks?.black;
      // Convert PGN result format (reversed for black)
      if (game.result === '0-1') result = 'W';
      else if (game.result === '1-0') result = 'L';
      else if (game.result === '1/2-1/2') result = 'D';
      else {
        skippedGames++;
        return;
      }
    } else {
      skippedGames++;
      return;
    }

    formattedGames.push({
      elo: playerElo,
      color,
      result,
      opp: oppName,
      opp_elo: oppElo,
      eco: game.eco || 'Unknown',
      tournament: game.tournament || 'Imported Tournament',
      rated: true,
      source: 'otb',
      time: '00:00',
      ...(game.round ? { round: game.round } : {}),
      ...(clocks?.[20] ? { clock20: clocks[20] } : {}),
      ...(clocks?.[30] ? { clock30: clocks[30] } : {}),
      ...(clocks?.[40] ? { clock40: clocks[40] } : {}),
      ...(game.moves ? { pgn: game.moves } : {}),
    });
  });

  return {
    games: formattedGames,
    skippedCount: skippedGames,
  };
};
