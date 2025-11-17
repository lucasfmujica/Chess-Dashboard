/**
 * Lichess API Integration
 * Fetches games from Lichess.org for a given username
 */

const LICHESS_API_BASE = 'https://lichess.org/api';

/**
 * Fetch games from Lichess for a specific user
 * @param {string} username - Lichess username
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Array of game objects
 */
export const fetchLichessGames = async (username, options = {}) => {
  const {
    max = 50,
    rated = true,
    perfType = 'classical,rapid,blitz', // classical, rapid, blitz, bullet
    since = null, // timestamp in milliseconds
    until = null,
  } = options;

  try {
    const params = new URLSearchParams({
      max: max.toString(),
      rated: rated.toString(),
      perfType,
      pgnInJson: 'false',
      clocks: 'false',
      evals: 'false',
      opening: 'true',
    });

    if (since) params.append('since', since.toString());
    if (until) params.append('until', until.toString());

    const response = await fetch(
      `${LICHESS_API_BASE}/games/user/${username}?${params.toString()}`,
      {
        headers: {
          'Accept': 'application/x-ndjson',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Lichess API error: ${response.status} ${response.statusText}`);
    }

    const text = await response.text();

    // Parse NDJSON (newline-delimited JSON)
    const games = text
      .trim()
      .split('\n')
      .filter(line => line.trim())
      .map(line => JSON.parse(line));

    return games;
  } catch (error) {
    console.error('Error fetching Lichess games:', error);
    throw error;
  }
};

/**
 * Transform Lichess game data to match our app's game format
 * @param {Array} lichessGames - Raw games from Lichess API
 * @param {string} username - The user's Lichess username
 * @returns {Array} Games in our app format
 */
export const transformLichessGames = (lichessGames, username) => {
  return lichessGames.map(game => {
    const isWhite = game.players.white.user?.name?.toLowerCase() === username.toLowerCase();
    const playerColor = isWhite ? 'white' : 'black';
    const opponentColor = isWhite ? 'black' : 'white';

    const playerData = game.players[playerColor];
    const opponentData = game.players[opponentColor];

    // Determine result from player's perspective
    let result;
    if (game.winner === playerColor) {
      result = 'W';
    } else if (game.winner === opponentColor) {
      result = 'L';
    } else {
      result = 'D'; // Draw or no winner
    }

    return {
      elo: playerData.rating || 0,
      color: isWhite ? 'W' : 'B',
      result,
      opp: opponentData.user?.name || 'Anonymous',
      opp_elo: opponentData.rating || 0,
      eco: game.opening?.eco || 'Unknown',
      tournament: game.tournament?.name || 'Lichess Online',
      rated: game.rated,
      time: new Date(game.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      date: new Date(game.createdAt).toISOString().split('T')[0],
      gameId: game.id,
      speed: game.speed, // bullet, blitz, rapid, classical
      timeControl: game.clock ? `${game.clock.initial / 60}+${game.clock.increment}` : 'unlimited',
      opening: game.opening?.name || 'Unknown Opening',
      source: 'lichess', // Mark as Lichess game
    };
  });
};

/**
 * Get user's current rating from Lichess
 * @param {string} username - Lichess username
 * @returns {Promise<Object>} User rating data
 */
export const fetchLichessUserRating = async (username) => {
  try {
    const response = await fetch(`${LICHESS_API_BASE}/user/${username}`);

    if (!response.ok) {
      throw new Error(`Lichess API error: ${response.status}`);
    }

    const userData = await response.json();

    return {
      classical: userData.perfs?.classical?.rating || null,
      rapid: userData.perfs?.rapid?.rating || null,
      blitz: userData.perfs?.blitz?.rating || null,
      bullet: userData.perfs?.bullet?.rating || null,
      username: userData.username,
      id: userData.id,
    };
  } catch (error) {
    console.error('Error fetching Lichess user rating:', error);
    throw error;
  }
};

/**
 * Merge Lichess games with existing local games, removing duplicates
 * @param {Array} existingGames - Current games in the app
 * @param {Array} newGames - New games from Lichess
 * @returns {Array} Merged games without duplicates
 */
export const mergeGames = (existingGames, newGames) => {
  const gameMap = new Map();

  // Add existing games first
  existingGames.forEach(game => {
    const key = game.gameId || `${game.tournament}-${game.opp}-${game.date}`;
    gameMap.set(key, game);
  });

  // Add new games (will overwrite if duplicate key)
  newGames.forEach(game => {
    const key = game.gameId || `${game.tournament}-${game.opp}-${game.date}`;
    gameMap.set(key, game);
  });

  return Array.from(gameMap.values());
};
