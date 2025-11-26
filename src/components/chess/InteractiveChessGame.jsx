import React, { useState, useEffect, useCallback, useMemo } from 'react';

// ============================================================================
// CHESS ENGINE - Piece Values and Constants
// ============================================================================

const PIECE_VALUES = {
  p: 100,   // Pawn
  n: 320,   // Knight
  b: 330,   // Bishop
  r: 500,   // Rook
  q: 900,   // Queen
  k: 20000  // King
};

// Piece-Square Tables for positional evaluation
const PIECE_SQUARE_TABLES = {
  p: [ // Pawn
    [0,  0,  0,  0,  0,  0,  0,  0],
    [50, 50, 50, 50, 50, 50, 50, 50],
    [10, 10, 20, 30, 30, 20, 10, 10],
    [5,  5, 10, 25, 25, 10,  5,  5],
    [0,  0,  0, 20, 20,  0,  0,  0],
    [5, -5,-10,  0,  0,-10, -5,  5],
    [5, 10, 10,-20,-20, 10, 10,  5],
    [0,  0,  0,  0,  0,  0,  0,  0]
  ],
  n: [ // Knight
    [-50,-40,-30,-30,-30,-30,-40,-50],
    [-40,-20,  0,  0,  0,  0,-20,-40],
    [-30,  0, 10, 15, 15, 10,  0,-30],
    [-30,  5, 15, 20, 20, 15,  5,-30],
    [-30,  0, 15, 20, 20, 15,  0,-30],
    [-30,  5, 10, 15, 15, 10,  5,-30],
    [-40,-20,  0,  5,  5,  0,-20,-40],
    [-50,-40,-30,-30,-30,-30,-40,-50]
  ],
  b: [ // Bishop
    [-20,-10,-10,-10,-10,-10,-10,-20],
    [-10,  0,  0,  0,  0,  0,  0,-10],
    [-10,  0,  5, 10, 10,  5,  0,-10],
    [-10,  5,  5, 10, 10,  5,  5,-10],
    [-10,  0, 10, 10, 10, 10,  0,-10],
    [-10, 10, 10, 10, 10, 10, 10,-10],
    [-10,  5,  0,  0,  0,  0,  5,-10],
    [-20,-10,-10,-10,-10,-10,-10,-20]
  ],
  r: [ // Rook
    [0,  0,  0,  0,  0,  0,  0,  0],
    [5, 10, 10, 10, 10, 10, 10,  5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [0,  0,  0,  5,  5,  0,  0,  0]
  ],
  q: [ // Queen
    [-20,-10,-10, -5, -5,-10,-10,-20],
    [-10,  0,  0,  0,  0,  0,  0,-10],
    [-10,  0,  5,  5,  5,  5,  0,-10],
    [-5,  0,  5,  5,  5,  5,  0, -5],
    [0,  0,  5,  5,  5,  5,  0, -5],
    [-10,  5,  5,  5,  5,  5,  0,-10],
    [-10,  0,  5,  0,  0,  0,  0,-10],
    [-20,-10,-10, -5, -5,-10,-10,-20]
  ],
  k: [ // King (middlegame)
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-20,-30,-30,-40,-40,-30,-30,-20],
    [-10,-20,-20,-20,-20,-20,-20,-10],
    [20, 20,  0,  0,  0,  0, 20, 20],
    [20, 30, 10,  0,  0, 10, 30, 20]
  ]
};

const AI_LEVELS = [
  { id: 'beginner', depth: 1, mistakeRate: 0.5, name: 'Rookie Riley' },
  { id: 'intermediate', depth: 2, mistakeRate: 0.2, name: 'Club Player Casey' },
  { id: 'advanced', depth: 3, mistakeRate: 0.08, name: 'Expert Elena' },
  { id: 'master', depth: 4, mistakeRate: 0, name: 'Grandmaster Gareth' }
];

// ============================================================================
// CHESS ENGINE - Board Utilities
// ============================================================================

const createInitialBoard = () => {
  return [
    ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
    ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
    ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
  ];
};

const isWhitePiece = (piece) => piece && piece === piece.toUpperCase();
const isBlackPiece = (piece) => piece && piece === piece.toLowerCase() && piece !== piece.toUpperCase();

const getPieceColor = (piece) => {
  if (!piece) return null;
  return isWhitePiece(piece) ? 'white' : 'black';
};

const squareToAlgebraic = (row, col) => {
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  return files[col] + (8 - row);
};

const algebraicToSquare = (algebraic) => {
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const col = files.indexOf(algebraic[0]);
  const row = 8 - parseInt(algebraic[1]);
  return [row, col];
};

// ============================================================================
// CHESS ENGINE - Move Generation
// ============================================================================

const isValidSquare = (row, col) => row >= 0 && row < 8 && col >= 0 && col < 8;

const getPawnMoves = (board, row, col, color, enPassantTarget) => {
  const moves = [];
  const direction = color === 'white' ? -1 : 1;
  const startRow = color === 'white' ? 6 : 1;
  const promotionRow = color === 'white' ? 0 : 7;

  // Forward move
  const newRow = row + direction;
  if (isValidSquare(newRow, col) && !board[newRow][col]) {
    if (newRow === promotionRow) {
      // Promotion (we'll only promote to queen as per requirements)
      moves.push({ from: [row, col], to: [newRow, col], promotion: 'q' });
    } else {
      moves.push({ from: [row, col], to: [newRow, col] });
    }

    // Double move from start
    if (row === startRow) {
      const doubleRow = row + (2 * direction);
      if (!board[doubleRow][col]) {
        moves.push({ from: [row, col], to: [doubleRow, col] });
      }
    }
  }

  // Captures
  for (const dcol of [-1, 1]) {
    const captureCol = col + dcol;
    if (isValidSquare(newRow, captureCol)) {
      const targetPiece = board[newRow][captureCol];
      if (targetPiece && getPieceColor(targetPiece) !== color) {
        if (newRow === promotionRow) {
          moves.push({ from: [row, col], to: [newRow, captureCol], promotion: 'q' });
        } else {
          moves.push({ from: [row, col], to: [newRow, captureCol] });
        }
      }

      // En passant
      if (enPassantTarget && enPassantTarget === squareToAlgebraic(newRow, captureCol)) {
        moves.push({
          from: [row, col],
          to: [newRow, captureCol],
          enPassant: true
        });
      }
    }
  }

  return moves;
};

const getKnightMoves = (board, row, col, color) => {
  const moves = [];
  const knightMoves = [
    [-2, -1], [-2, 1], [-1, -2], [-1, 2],
    [1, -2], [1, 2], [2, -1], [2, 1]
  ];

  for (const [drow, dcol] of knightMoves) {
    const newRow = row + drow;
    const newCol = col + dcol;
    if (isValidSquare(newRow, newCol)) {
      const targetPiece = board[newRow][newCol];
      if (!targetPiece || getPieceColor(targetPiece) !== color) {
        moves.push({ from: [row, col], to: [newRow, newCol] });
      }
    }
  }

  return moves;
};

const getSlidingMoves = (board, row, col, color, directions) => {
  const moves = [];

  for (const [drow, dcol] of directions) {
    let newRow = row + drow;
    let newCol = col + dcol;

    while (isValidSquare(newRow, newCol)) {
      const targetPiece = board[newRow][newCol];

      if (!targetPiece) {
        moves.push({ from: [row, col], to: [newRow, newCol] });
      } else {
        if (getPieceColor(targetPiece) !== color) {
          moves.push({ from: [row, col], to: [newRow, newCol] });
        }
        break;
      }

      newRow += drow;
      newCol += dcol;
    }
  }

  return moves;
};

const getBishopMoves = (board, row, col, color) => {
  const diagonals = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  return getSlidingMoves(board, row, col, color, diagonals);
};

const getRookMoves = (board, row, col, color) => {
  const orthogonals = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  return getSlidingMoves(board, row, col, color, orthogonals);
};

const getQueenMoves = (board, row, col, color) => {
  const allDirections = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],           [0, 1],
    [1, -1],  [1, 0],  [1, 1]
  ];
  return getSlidingMoves(board, row, col, color, allDirections);
};

const getKingMoves = (board, row, col, color, castlingRights) => {
  const moves = [];
  const kingMoves = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],           [0, 1],
    [1, -1],  [1, 0],  [1, 1]
  ];

  for (const [drow, dcol] of kingMoves) {
    const newRow = row + drow;
    const newCol = col + dcol;
    if (isValidSquare(newRow, newCol)) {
      const targetPiece = board[newRow][newCol];
      if (!targetPiece || getPieceColor(targetPiece) !== color) {
        moves.push({ from: [row, col], to: [newRow, newCol] });
      }
    }
  }

  // Castling
  const castlingRow = color === 'white' ? 7 : 0;
  if (row === castlingRow) {
    // Kingside castling
    if (castlingRights[color]?.kingside) {
      if (!board[row][5] && !board[row][6] && board[row][7]) {
        moves.push({ from: [row, col], to: [row, 6], castling: 'kingside' });
      }
    }
    // Queenside castling
    if (castlingRights[color]?.queenside) {
      if (!board[row][1] && !board[row][2] && !board[row][3] && board[row][0]) {
        moves.push({ from: [row, col], to: [row, 2], castling: 'queenside' });
      }
    }
  }

  return moves;
};

const getPieceMoves = (board, row, col, enPassantTarget, castlingRights) => {
  const piece = board[row][col];
  if (!piece) return [];

  const color = getPieceColor(piece);
  const pieceType = piece.toLowerCase();

  switch (pieceType) {
    case 'p':
      return getPawnMoves(board, row, col, color, enPassantTarget);
    case 'n':
      return getKnightMoves(board, row, col, color);
    case 'b':
      return getBishopMoves(board, row, col, color);
    case 'r':
      return getRookMoves(board, row, col, color);
    case 'q':
      return getQueenMoves(board, row, col, color);
    case 'k':
      return getKingMoves(board, row, col, color, castlingRights);
    default:
      return [];
  }
};

// ============================================================================
// CHESS ENGINE - Game State Validation
// ============================================================================

const findKing = (board, color) => {
  const king = color === 'white' ? 'K' : 'k';
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      if (board[row][col] === king) {
        return [row, col];
      }
    }
  }
  return null;
};

const isSquareAttacked = (board, row, col, byColor) => {
  // Check if square [row, col] is attacked by any piece of byColor
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece && getPieceColor(piece) === byColor) {
        const moves = getPieceMoves(board, r, c, null, {});
        for (const move of moves) {
          if (move.to[0] === row && move.to[1] === col && !move.castling) {
            return true;
          }
        }
      }
    }
  }
  return false;
};

const isInCheck = (board, color) => {
  const kingPos = findKing(board, color);
  if (!kingPos) return false;

  const opponentColor = color === 'white' ? 'black' : 'white';
  return isSquareAttacked(board, kingPos[0], kingPos[1], opponentColor);
};

const makeMove = (board, move) => {
  const newBoard = board.map(row => [...row]);
  const [fromRow, fromCol] = move.from;
  const [toRow, toCol] = move.to;
  const piece = newBoard[fromRow][fromCol];

  // Handle promotion
  if (move.promotion) {
    const color = getPieceColor(piece);
    const promotedPiece = color === 'white' ? move.promotion.toUpperCase() : move.promotion.toLowerCase();
    newBoard[toRow][toCol] = promotedPiece;
    newBoard[fromRow][fromCol] = null;
  }
  // Handle en passant
  else if (move.enPassant) {
    newBoard[toRow][toCol] = piece;
    newBoard[fromRow][fromCol] = null;
    // Remove captured pawn
    newBoard[fromRow][toCol] = null;
  }
  // Handle castling
  else if (move.castling) {
    newBoard[toRow][toCol] = piece;
    newBoard[fromRow][fromCol] = null;

    // Move rook
    if (move.castling === 'kingside') {
      newBoard[toRow][5] = newBoard[toRow][7];
      newBoard[toRow][7] = null;
    } else {
      newBoard[toRow][3] = newBoard[toRow][0];
      newBoard[toRow][0] = null;
    }
  }
  // Normal move
  else {
    newBoard[toRow][toCol] = piece;
    newBoard[fromRow][fromCol] = null;
  }

  return newBoard;
};

const isLegalMove = (board, move, color, enPassantTarget, castlingRights) => {
  // Make the move
  const newBoard = makeMove(board, move);

  // Check if king is in check after the move
  if (isInCheck(newBoard, color)) {
    return false;
  }

  // Additional castling validation
  if (move.castling) {
    const [fromRow, fromCol] = move.from;
    const opponentColor = color === 'white' ? 'black' : 'white';

    // Can't castle out of check
    if (isSquareAttacked(board, fromRow, fromCol, opponentColor)) {
      return false;
    }

    // Can't castle through check
    if (move.castling === 'kingside') {
      if (isSquareAttacked(board, fromRow, 5, opponentColor)) {
        return false;
      }
    } else {
      if (isSquareAttacked(board, fromRow, 3, opponentColor)) {
        return false;
      }
    }
  }

  return true;
};

const getAllLegalMoves = (board, color, enPassantTarget, castlingRights) => {
  const moves = [];

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (piece && getPieceColor(piece) === color) {
        const pieceMoves = getPieceMoves(board, row, col, enPassantTarget, castlingRights);
        for (const move of pieceMoves) {
          if (isLegalMove(board, move, color, enPassantTarget, castlingRights)) {
            moves.push(move);
          }
        }
      }
    }
  }

  return moves;
};

// ============================================================================
// CHESS ENGINE - Position Evaluation
// ============================================================================

const evaluatePosition = (board) => {
  let score = 0;

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (!piece) continue;

      const pieceType = piece.toLowerCase();
      const color = getPieceColor(piece);
      const pieceValue = PIECE_VALUES[pieceType];

      // Get piece-square table value
      let positionValue = 0;
      if (PIECE_SQUARE_TABLES[pieceType]) {
        const tableRow = color === 'white' ? row : 7 - row;
        positionValue = PIECE_SQUARE_TABLES[pieceType][tableRow][col];
      }

      const totalValue = pieceValue + positionValue;
      score += color === 'white' ? totalValue : -totalValue;
    }
  }

  return score; // In centipawns
};

// ============================================================================
// CHESS ENGINE - AI (Minimax with Alpha-Beta Pruning)
// ============================================================================

const minimax = (board, depth, alpha, beta, maximizingPlayer, color, enPassantTarget, castlingRights) => {
  if (depth === 0) {
    return { score: evaluatePosition(board), move: null };
  }

  const moves = getAllLegalMoves(board, color, enPassantTarget, castlingRights);

  if (moves.length === 0) {
    // Checkmate or stalemate
    if (isInCheck(board, color)) {
      return { score: maximizingPlayer ? -999999 : 999999, move: null };
    }
    return { score: 0, move: null }; // Stalemate
  }

  if (maximizingPlayer) {
    let maxEval = -Infinity;
    let bestMove = null;

    for (const move of moves) {
      const newBoard = makeMove(board, move);
      const opponentColor = color === 'white' ? 'black' : 'white';

      const evaluation = minimax(newBoard, depth - 1, alpha, beta, false, opponentColor, null, castlingRights);

      if (evaluation.score > maxEval) {
        maxEval = evaluation.score;
        bestMove = move;
      }

      alpha = Math.max(alpha, evaluation.score);
      if (beta <= alpha) {
        break; // Alpha-beta pruning
      }
    }

    return { score: maxEval, move: bestMove };
  } else {
    let minEval = Infinity;
    let bestMove = null;

    for (const move of moves) {
      const newBoard = makeMove(board, move);
      const opponentColor = color === 'white' ? 'black' : 'white';

      const evaluation = minimax(newBoard, depth - 1, alpha, beta, true, opponentColor, null, castlingRights);

      if (evaluation.score < minEval) {
        minEval = evaluation.score;
        bestMove = move;
      }

      beta = Math.min(beta, evaluation.score);
      if (beta <= alpha) {
        break; // Alpha-beta pruning
      }
    }

    return { score: minEval, move: bestMove };
  }
};

const getAIMove = (board, color, aiLevel, enPassantTarget, castlingRights) => {
  const level = AI_LEVELS.find(l => l.id === aiLevel);
  const moves = getAllLegalMoves(board, color, enPassantTarget, castlingRights);

  if (moves.length === 0) return null;

  // Apply mistake rate
  if (Math.random() < level.mistakeRate) {
    // Make a random move
    return moves[Math.floor(Math.random() * moves.length)];
  }

  // Use minimax to find best move
  const result = minimax(
    board,
    level.depth,
    -Infinity,
    Infinity,
    true,
    color,
    enPassantTarget,
    castlingRights
  );

  return result.move || moves[0];
};

// ============================================================================
// TEACHING SYSTEM
// ============================================================================

const TEACHING_TIPS = {
  opening: [
    "Control the center with pawns (e4, d4, e5, d5)",
    "Develop knights before bishops",
    "Castle early to protect your king",
    "Don't move the same piece twice in the opening"
  ],
  tactics: [
    "Look for forks - attacking two pieces at once",
    "Check for pins - attacking a piece that can't move",
    "Watch for discovered attacks when you move one piece",
    "Always check if your opponent left pieces hanging (undefended)"
  ],
  endgame: [
    "Activate your king - it's a strong piece in the endgame",
    "Push passed pawns (pawns with no enemy pawns blocking them)",
    "Place rooks on open files or behind passed pawns",
    "Cut off the enemy king from important squares"
  ],
  defense: [
    "When attacked, look for counterattacks",
    "Keep your king safe - don't weaken pawn cover",
    "Consider trading pieces when defending to simplify",
    "Defend important pieces and squares"
  ]
};

const getGamePhase = (board) => {
  let pieceCount = 0;
  let majorPieces = 0;

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (piece) {
        pieceCount++;
        const type = piece.toLowerCase();
        if (type === 'q' || type === 'r') majorPieces++;
      }
    }
  }

  if (pieceCount <= 10) return 'endgame';
  if (pieceCount > 20 && majorPieces >= 4) return 'opening';
  return 'middlegame';
};

const getCurrentTip = (board, moveHistory) => {
  const phase = getGamePhase(board);

  if (moveHistory.length < 10) return TEACHING_TIPS.opening;
  if (phase === 'endgame') return TEACHING_TIPS.endgame;

  // Randomly choose between tactics and defense for middlegame
  return Math.random() > 0.5 ? TEACHING_TIPS.tactics : TEACHING_TIPS.defense;
};

// ============================================================================
// REACT COMPONENT
// ============================================================================

const InteractiveChessGame = () => {
  // Game state
  const [board, setBoard] = useState(createInitialBoard());
  const [currentPlayer, setCurrentPlayer] = useState('white');
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [legalMoves, setLegalMoves] = useState([]);
  const [moveHistory, setMoveHistory] = useState([]);
  const [capturedPieces, setCapturedPieces] = useState({ white: [], black: [] });
  const [gameStatus, setGameStatus] = useState('active');
  const [enPassantTarget, setEnPassantTarget] = useState(null);
  const [castlingRights, setCastlingRights] = useState({
    white: { kingside: true, queenside: true },
    black: { kingside: true, queenside: true }
  });
  const [lastMove, setLastMove] = useState(null);

  // AI and teaching
  const [aiLevel, setAiLevel] = useState('intermediate');
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [hintMove, setHintMove] = useState(null);
  const [positionEvaluation, setPositionEvaluation] = useState(0);
  const [showAnalysis, setShowAnalysis] = useState(false);

  // Teaching tips
  const currentTips = useMemo(() => getCurrentTip(board, moveHistory), [board, moveHistory]);
  const [currentTipIndex, setCurrentTipIndex] = useState(0);

  // Unicode chess pieces
  const PIECE_SYMBOLS = {
    'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘', 'P': '♙',
    'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟'
  };

  // Update position evaluation when board changes
  useEffect(() => {
    setPositionEvaluation(evaluatePosition(board));
  }, [board]);

  // Check for game over
  useEffect(() => {
    const moves = getAllLegalMoves(board, currentPlayer, enPassantTarget, castlingRights);

    if (moves.length === 0) {
      if (isInCheck(board, currentPlayer)) {
        setGameStatus(currentPlayer === 'white' ? 'black_wins' : 'white_wins');
      } else {
        setGameStatus('stalemate');
      }
    }
  }, [board, currentPlayer, enPassantTarget, castlingRights]);

  // AI move
  useEffect(() => {
    if (currentPlayer === 'black' && gameStatus === 'active' && !isAIThinking) {
      setIsAIThinking(true);

      // Add delay for better UX
      setTimeout(() => {
        const move = getAIMove(board, 'black', aiLevel, enPassantTarget, castlingRights);

        if (move) {
          executeMove(move);
        }

        setIsAIThinking(false);
      }, 500);
    }
  }, [currentPlayer, gameStatus, board, aiLevel, enPassantTarget, castlingRights]);

  const executeMove = useCallback((move) => {
    const [fromRow, fromCol] = move.from;
    const [toRow, toCol] = move.to;
    const piece = board[fromRow][fromCol];
    const capturedPiece = board[toRow][toCol];

    // Update board
    const newBoard = makeMove(board, move);
    setBoard(newBoard);

    // Update captured pieces
    if (capturedPiece) {
      const captureColor = getPieceColor(capturedPiece) === 'white' ? 'white' : 'black';
      setCapturedPieces(prev => ({
        ...prev,
        [captureColor]: [...prev[captureColor], capturedPiece]
      }));
    }

    // Handle en passant capture
    if (move.enPassant) {
      const capturedPawn = board[fromRow][toCol];
      const captureColor = getPieceColor(capturedPawn) === 'white' ? 'white' : 'black';
      setCapturedPieces(prev => ({
        ...prev,
        [captureColor]: [...prev[captureColor], capturedPawn]
      }));
    }

    // Update en passant target
    if (piece.toLowerCase() === 'p' && Math.abs(toRow - fromRow) === 2) {
      const enPassantRow = (fromRow + toRow) / 2;
      setEnPassantTarget(squareToAlgebraic(enPassantRow, toCol));
    } else {
      setEnPassantTarget(null);
    }

    // Update castling rights
    const newCastlingRights = { ...castlingRights };
    if (piece.toLowerCase() === 'k') {
      const color = getPieceColor(piece) === 'white' ? 'white' : 'black';
      newCastlingRights[color] = { kingside: false, queenside: false };
    } else if (piece.toLowerCase() === 'r') {
      const color = getPieceColor(piece) === 'white' ? 'white' : 'black';
      if (fromCol === 0) newCastlingRights[color].queenside = false;
      if (fromCol === 7) newCastlingRights[color].kingside = false;
    }
    setCastlingRights(newCastlingRights);

    // Add to move history
    const from = squareToAlgebraic(fromRow, fromCol);
    const to = squareToAlgebraic(toRow, toCol);
    let notation = `${piece.toUpperCase()}${from}-${to}`;
    if (move.castling) notation = move.castling === 'kingside' ? 'O-O' : 'O-O-O';

    setMoveHistory(prev => [...prev, notation]);
    setLastMove(move);

    // Switch player
    setCurrentPlayer(prev => prev === 'white' ? 'black' : 'white');
    setSelectedSquare(null);
    setLegalMoves([]);
    setShowHint(false);
    setHintMove(null);
  }, [board, castlingRights]);

  const handleSquareClick = (row, col) => {
    if (gameStatus !== 'active' || currentPlayer === 'black' || isAIThinking) return;

    const piece = board[row][col];

    // If a square is already selected
    if (selectedSquare) {
      const [selectedRow, selectedCol] = selectedSquare;

      // Try to make a move
      const move = legalMoves.find(m => m.to[0] === row && m.to[1] === col);

      if (move) {
        executeMove(move);
      } else if (piece && getPieceColor(piece) === currentPlayer) {
        // Select a different piece
        const moves = getPieceMoves(board, row, col, enPassantTarget, castlingRights)
          .filter(m => isLegalMove(board, m, currentPlayer, enPassantTarget, castlingRights));
        setSelectedSquare([row, col]);
        setLegalMoves(moves);
      } else {
        // Deselect
        setSelectedSquare(null);
        setLegalMoves([]);
      }
    } else {
      // Select a piece
      if (piece && getPieceColor(piece) === currentPlayer) {
        const moves = getPieceMoves(board, row, col, enPassantTarget, castlingRights)
          .filter(m => isLegalMove(board, m, currentPlayer, enPassantTarget, castlingRights));
        setSelectedSquare([row, col]);
        setLegalMoves(moves);
      }
    }
  };

  const handleHint = () => {
    if (currentPlayer === 'black') return;

    const move = getAIMove(board, 'white', aiLevel, enPassantTarget, castlingRights);
    setHintMove(move);
    setShowHint(true);
  };

  const handleNewGame = () => {
    setBoard(createInitialBoard());
    setCurrentPlayer('white');
    setSelectedSquare(null);
    setLegalMoves([]);
    setMoveHistory([]);
    setCapturedPieces({ white: [], black: [] });
    setGameStatus('active');
    setEnPassantTarget(null);
    setCastlingRights({
      white: { kingside: true, queenside: true },
      black: { kingside: true, queenside: true }
    });
    setLastMove(null);
    setShowHint(false);
    setHintMove(null);
    setCurrentTipIndex(0);
  };

  const isSquareHighlighted = (row, col) => {
    if (selectedSquare && selectedSquare[0] === row && selectedSquare[1] === col) {
      return 'selected';
    }
    if (lastMove && (
      (lastMove.from[0] === row && lastMove.from[1] === col) ||
      (lastMove.to[0] === row && lastMove.to[1] === col)
    )) {
      return 'lastMove';
    }
    if (legalMoves.some(m => m.to[0] === row && m.to[1] === col)) {
      return 'legal';
    }
    if (hintMove && showHint && (
      (hintMove.from[0] === row && hintMove.from[1] === col) ||
      (hintMove.to[0] === row && hintMove.to[1] === col)
    )) {
      return 'hint';
    }
    if (isInCheck(board, currentPlayer)) {
      const kingPos = findKing(board, currentPlayer);
      if (kingPos && kingPos[0] === row && kingPos[1] === col) {
        return 'check';
      }
    }
    return null;
  };

  const getSquareColor = (row, col) => {
    const isLight = (row + col) % 2 === 0;
    const highlight = isSquareHighlighted(row, col);

    if (highlight === 'selected') return 'bg-blue-400';
    if (highlight === 'lastMove') return isLight ? 'bg-yellow-200' : 'bg-yellow-300';
    if (highlight === 'legal') return isLight ? 'bg-green-200' : 'bg-green-300';
    if (highlight === 'hint') return isLight ? 'bg-purple-200' : 'bg-purple-300';
    if (highlight === 'check') return 'bg-red-400';

    return isLight ? 'bg-amber-100' : 'bg-amber-700';
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-6 bg-gradient-to-br from-slate-50 to-slate-100 rounded-3xl shadow-2xl">
      <div className="mb-6">
        <h1 className="text-4xl font-bold text-slate-800 mb-2">Interactive Chess Training</h1>
        <p className="text-slate-600">Play against AI opponents and improve your skills</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chess Board */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-xl p-6">
            {/* Status Bar */}
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${currentPlayer === 'white' ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`} />
                <span className="font-semibold text-slate-700">
                  {gameStatus === 'active' ? (
                    currentPlayer === 'white' ? 'Your Turn' : 'AI Thinking...'
                  ) : gameStatus === 'white_wins' ? 'You Win!' : gameStatus === 'black_wins' ? 'AI Wins!' : 'Stalemate!'}
                </span>
              </div>

              {showAnalysis && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-600">Evaluation:</span>
                  <span className={`font-bold ${positionEvaluation > 0 ? 'text-green-600' : positionEvaluation < 0 ? 'text-red-600' : 'text-slate-600'}`}>
                    {positionEvaluation > 0 ? '+' : ''}{(positionEvaluation / 100).toFixed(2)}
                  </span>
                </div>
              )}
            </div>

            {/* Board */}
            <div className="inline-block bg-slate-800 p-4 rounded-xl shadow-2xl">
              <div className="grid grid-cols-8 gap-0 border-4 border-slate-900">
                {board.map((row, rowIndex) => (
                  row.map((piece, colIndex) => {
                    const squareColor = getSquareColor(rowIndex, colIndex);
                    const highlight = isSquareHighlighted(rowIndex, colIndex);

                    return (
                      <div
                        key={`${rowIndex}-${colIndex}`}
                        className={`w-16 h-16 flex items-center justify-center cursor-pointer relative transition-all duration-150 ${squareColor} hover:opacity-80`}
                        onClick={() => handleSquareClick(rowIndex, colIndex)}
                      >
                        {/* Algebraic notation */}
                        {colIndex === 0 && (
                          <div className="absolute left-1 top-1 text-xs font-bold opacity-50">
                            {8 - rowIndex}
                          </div>
                        )}
                        {rowIndex === 7 && (
                          <div className="absolute right-1 bottom-1 text-xs font-bold opacity-50">
                            {String.fromCharCode(97 + colIndex)}
                          </div>
                        )}

                        {/* Legal move indicator */}
                        {highlight === 'legal' && !piece && (
                          <div className="w-4 h-4 bg-slate-700 rounded-full opacity-30" />
                        )}

                        {/* Piece */}
                        {piece && (
                          <div className="text-5xl select-none">
                            {PIECE_SYMBOLS[piece]}
                          </div>
                        )}
                      </div>
                    );
                  })
                ))}
              </div>
            </div>

            {/* Controls */}
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                onClick={handleNewGame}
                className="px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl hover:from-blue-600 hover:to-blue-700 transition-all"
              >
                New Game
              </button>

              <button
                onClick={handleHint}
                disabled={currentPlayer === 'black' || gameStatus !== 'active'}
                className="px-6 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl hover:from-purple-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Show Hint
              </button>

              <button
                onClick={() => setShowAnalysis(!showAnalysis)}
                className={`px-6 py-2 ${showAnalysis ? 'bg-gradient-to-r from-green-500 to-green-600' : 'bg-gradient-to-r from-slate-500 to-slate-600'} text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all`}
              >
                {showAnalysis ? 'Hide' : 'Show'} Analysis
              </button>
            </div>
          </div>
        </div>

        {/* Side Panel */}
        <div className="space-y-6">
          {/* AI Difficulty */}
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">AI Opponent</h3>
            <div className="space-y-2">
              {AI_LEVELS.map(level => (
                <button
                  key={level.id}
                  onClick={() => setAiLevel(level.id)}
                  className={`w-full px-4 py-3 rounded-lg font-semibold text-left transition-all ${
                    aiLevel === level.id
                      ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-lg'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {level.name}
                </button>
              ))}
            </div>
          </div>

          {/* Teaching Tips */}
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800">Chess Tips</h3>
              <button
                onClick={() => setCurrentTipIndex((currentTipIndex + 1) % currentTips.length)}
                className="text-sm text-blue-600 hover:text-blue-700 font-semibold"
              >
                Next Tip →
              </button>
            </div>
            <p className="text-slate-700 leading-relaxed">
              {currentTips[currentTipIndex]}
            </p>
          </div>

          {/* Captured Pieces */}
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Captured Pieces</h3>

            <div className="space-y-3">
              <div>
                <p className="text-sm font-semibold text-slate-600 mb-2">Black Captured:</p>
                <div className="flex flex-wrap gap-1">
                  {capturedPieces.black.map((piece, idx) => (
                    <span key={idx} className="text-2xl">{PIECE_SYMBOLS[piece]}</span>
                  ))}
                  {capturedPieces.black.length === 0 && (
                    <span className="text-slate-400 text-sm">None</span>
                  )}
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-600 mb-2">White Captured:</p>
                <div className="flex flex-wrap gap-1">
                  {capturedPieces.white.map((piece, idx) => (
                    <span key={idx} className="text-2xl">{PIECE_SYMBOLS[piece]}</span>
                  ))}
                  {capturedPieces.white.length === 0 && (
                    <span className="text-slate-400 text-sm">None</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Move History */}
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Move History</h3>
            <div className="max-h-64 overflow-y-auto space-y-1">
              {moveHistory.length === 0 ? (
                <p className="text-slate-400 text-sm">No moves yet</p>
              ) : (
                moveHistory.map((move, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    <span className="font-semibold text-slate-600 w-8">{Math.floor(idx / 2) + 1}.</span>
                    <span className={idx % 2 === 0 ? 'text-slate-800 font-medium' : 'text-slate-600'}>
                      {move}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InteractiveChessGame;
