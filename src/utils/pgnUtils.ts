/**
 * PGN (Portable Game Notation) utilities
 * Functions for parsing and importing PGN chess games
 */

import type { Game, PlayerColor, GameResult } from '../types/chess';

/** Intermediate shape extracted from a PGN game's headers. */
export interface ParsedPgnGame {
  whiteElo?: number;
  blackElo?: number;
  white?: string;
  black?: string;
  result?: string;
  eco?: string;
  tournament?: string;
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
          }
        }
      });

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

    if (game.white && game.white.toLowerCase().includes(playerName.toLowerCase())) {
      color = 'W';
      oppName = game.black || 'Unknown';
      oppElo = game.blackElo || 0;
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
    });
  });

  return {
    games: formattedGames,
    skippedCount: skippedGames,
  };
};
