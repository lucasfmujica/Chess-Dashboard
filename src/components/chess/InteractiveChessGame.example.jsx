import React from 'react';
import InteractiveChessGame from './InteractiveChessGame';

/**
 * Example usage of the InteractiveChessGame component
 *
 * This is a standalone interactive chess game with:
 * - Full chess rules (castling, en passant, pawn promotion)
 * - AI opponents with 4 difficulty levels
 * - Teaching system with contextual tips
 * - Hint system powered by minimax AI
 * - Position analysis in centipawns
 * - Move history and captured pieces tracking
 */
const InteractiveChessGameExample = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 py-8">
      <InteractiveChessGame />
    </div>
  );
};

export default InteractiveChessGameExample;
