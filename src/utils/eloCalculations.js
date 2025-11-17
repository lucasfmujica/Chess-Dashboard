/**
 * Chess ELO calculation utilities
 */

/**
 * Calculate the expected score for a player against an opponent
 * @param {number} playerElo - Player's ELO rating
 * @param {number} opponentElo - Opponent's ELO rating
 * @returns {number} Expected score (0-1)
 */
export const calculateExpectedScore = (playerElo, opponentElo) => {
  if (opponentElo <= 0) return 0.5;
  return 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));
};

/**
 * Calculate the actual score from a game result
 * @param {string} result - Game result ('W', 'D', or 'L')
 * @returns {number} Actual score (1 for win, 0.5 for draw, 0 for loss)
 */
export const calculateActualScore = (result) => {
  if (result === 'W') return 1;
  if (result === 'D') return 0.5;
  return 0;
};

/**
 * Calculate performance rating based on results against opponents
 * @param {number} totalActualScore - Sum of actual scores
 * @param {number} totalGames - Total number of games
 * @param {number} avgOpponentElo - Average opponent ELO
 * @returns {number} Performance rating
 */
export const calculatePerformanceRating = (totalActualScore, totalGames, avgOpponentElo) => {
  if (totalActualScore <= 0 || totalActualScore >= totalGames || avgOpponentElo <= 0) {
    return avgOpponentElo;
  }
  return Math.round(avgOpponentElo + 400 * Math.log10(totalActualScore / (totalGames - totalActualScore)));
};

/**
 * Calculate average opponent ELO from a list of games
 * @param {Array} games - Array of game objects with opp_elo property
 * @returns {number} Average opponent ELO (rounded)
 */
export const calculateAvgOpponentElo = (games) => {
  const ratedOpponents = games.filter(g => g.opp_elo > 0);
  if (ratedOpponents.length === 0) return 0;
  return Math.round(ratedOpponents.reduce((sum, g) => sum + g.opp_elo, 0) / ratedOpponents.length);
};
