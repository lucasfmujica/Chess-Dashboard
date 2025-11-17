/**
 * PGN (Portable Game Notation) utilities
 * Functions for parsing and importing PGN chess games
 */

/**
 * Parse PGN text and extract game metadata
 * @param {string} pgnText - Raw PGN text containing one or more games
 * @returns {Array} Array of parsed game objects
 */
export const parsePGN = (pgnText) => {
  try {
    const parsedGames = [];
    const gameBlocks = pgnText.split(/\n\n(?=\[Event)/);

    gameBlocks.forEach(block => {
      if (!block.trim()) return;

      const game = {};
      const lines = block.split('\n');

      lines.forEach(line => {
        if (line.startsWith('[')) {
          const match = line.match(/\[(\w+)\s+"([^"]+)"\]/);
          if (match) {
            const [, key, value] = match;
            if (key === 'WhiteElo') game.whiteElo = parseInt(value);
            if (key === 'BlackElo') game.blackElo = parseInt(value);
            if (key === 'White') game.white = value;
            if (key === 'Black') game.black = value;
            if (key === 'Result') game.result = value;
            if (key === 'ECO') game.eco = value;
            if (key === 'Event') game.tournament = value;
          }
        }
      });

      if (game.white && game.black) {
        parsedGames.push(game);
      }
    });

    return parsedGames;
  } catch (error) {
    throw new Error(`Error parsing PGN: ${error.message}`);
  }
};

/**
 * Convert parsed PGN games to internal game format
 * @param {Array} parsedGames - Games from parsePGN()
 * @param {string} playerName - Player's name as it appears in PGN
 * @param {number} playerElo - Player's ELO at the time of the tournament
 * @returns {Object} { games: Array, skippedCount: number }
 */
export const convertPGNGamesToInternal = (parsedGames, playerName, playerElo) => {
  const formattedGames = [];
  let skippedGames = 0;

  parsedGames.forEach(game => {
    // Determine player's color and opponent
    let color, oppName, oppElo, result;

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
    skippedCount: skippedGames
  };
};
