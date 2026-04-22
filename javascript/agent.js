/**
 * agent.js
 * ──────────────────────────────────────────────────────────────
 * Dependencies (must load before this file):
 *   - chess.js        → game object
 *   - script.js       → gameConfig object
 *   - openingBook.js  → getOpeningMove(), resetOpening()
 * ──────────────────────────────────────────────────────────────
 */

// ═══════════════════════════════════════════════════════════════
//  PIECE VALUES
// ═══════════════════════════════════════════════════════════════

var pieceValues = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000
};

// ═══════════════════════════════════════════════════════════════
//  POSITION TABLES
// ═══════════════════════════════════════════════════════════════

var pawnTable = [
   0,  0,  0,  0,  0,  0,  0,  0,
  50, 50, 50, 50, 50, 50, 50, 50,
  10, 10, 20, 30, 30, 20, 10, 10,
   5,  5, 10, 25, 25, 10,  5,  5,
   0,  0,  0, 20, 20,  0,  0,  0,
   5, -5,-10,  0,  0,-10, -5,  5,
   5, 10, 10,-20,-20, 10, 10,  5,
   0,  0,  0,  0,  0,  0,  0,  0
];

var knightTable = [
  -50,-40,-30,-30,-30,-30,-40,-50,
  -40,-20,  0,  0,  0,  0,-20,-40,
  -30,  0, 10, 15, 15, 10,  0,-30,
  -30,  5, 15, 20, 20, 15,  5,-30,
  -30,  0, 15, 20, 20, 15,  0,-30,
  -30,  5, 10, 15, 15, 10,  5,-30,
  -40,-20,  0,  5,  5,  0,-20,-40,
  -50,-40,-30,-30,-30,-30,-40,-50
];

var bishopTable = [
  -20,-10,-10,-10,-10,-10,-10,-20,
  -10,  0,  0,  0,  0,  0,  0,-10,
  -10,  0,  5, 10, 10,  5,  0,-10,
  -10,  5,  5, 10, 10,  5,  5,-10,
  -10,  0, 10, 10, 10, 10,  0,-10,
  -10, 10, 10, 10, 10, 10, 10,-10,
  -10,  5,  0,  0,  0,  0,  5,-10,
  -20,-10,-10,-10,-10,-10,-10,-20
];

var rookTable = [
   0,  0,  0,  0,  0,  0,  0,  0,
   5, 10, 10, 10, 10, 10, 10,  5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
   0,  0,  0,  5,  5,  0,  0,  0
];

var queenTable = [
  -20,-10,-10, -5, -5,-10,-10,-20,
  -10,  0,  0,  0,  0,  0,  0,-10,
  -10,  0,  5,  5,  5,  5,  0,-10,
   -5,  0,  5,  5,  5,  5,  0, -5,
    0,  0,  5,  5,  5,  5,  0, -5,
  -10,  5,  5,  5,  5,  5,  0,-10,
  -10,  0,  5,  0,  0,  0,  0,-10,
  -20,-10,-10, -5, -5,-10,-10,-20
];

var kingTable = [
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -20,-30,-30,-40,-40,-30,-30,-20,
  -10,-20,-20,-20,-20,-20,-20,-10,
   20, 20,  0,  0,  0,  0, 20, 20,
   20, 30, 10,  0,  0, 10, 30, 20
];

// ═══════════════════════════════════════════════════════════════
//  EVALUATION
// ═══════════════════════════════════════════════════════════════

function getPiecePositionBonus(pieceType, color, row, col) {
  var index = color === 'w'
    ? (row * 8 + col)
    : ((7 - row) * 8 + col);

  switch (pieceType) {
    case 'p': return pawnTable[index];
    case 'n': return knightTable[index];
    case 'b': return bishopTable[index];
    case 'r': return rookTable[index];
    case 'q': return queenTable[index];
    case 'k': return kingTable[index];
    default:  return 0;
  }
}

function evaluateBoard() {
  var boardArray = game.board();
  var score      = 0;

  for (var row = 0; row < 8; row++) {
    for (var col = 0; col < 8; col++) {
      var piece = boardArray[row][col];
      if (!piece) continue;
      var value = pieceValues[piece.type]
                + getPiecePositionBonus(piece.type, piece.color, row, col);
      score += piece.color === 'w' ? value : -value;
    }
  }

  return score;
}

// ═══════════════════════════════════════════════════════════════
//  DEPTH CONTROL
// ═══════════════════════════════════════════════════════════════

function getAIDepth() {
  var time = gameConfig.timeControl;
  if (time <= 60)  return 2; // 1 min  → depth 2
  if (time <= 180) return 3; // 3 min  → depth 3
  return 3;                  // 10 min → depth 3 (capped for browser)
}

// ═══════════════════════════════════════════════════════════════
//  MINIMAX + ALPHA-BETA PRUNING
// ═══════════════════════════════════════════════════════════════

function minimax(depth, alpha, beta, isMaximizing) {
  if (depth === 0 || game.game_over()) return evaluateBoard();

  var moves = game.moves();

  if (isMaximizing) {
    var maxScore = -Infinity;
    for (var i = 0; i < moves.length; i++) {
      game.move(moves[i]);
      var score = minimax(depth - 1, alpha, beta, false);
      game.undo();
      maxScore = Math.max(maxScore, score);
      alpha    = Math.max(alpha, score);
      if (beta <= alpha) break;
    }
    return maxScore;
  } else {
    var minScore = Infinity;
    for (var i = 0; i < moves.length; i++) {
      game.move(moves[i]);
      var score = minimax(depth - 1, alpha, beta, true);
      game.undo();
      minScore = Math.min(minScore, score);
      beta     = Math.min(beta, score);
      if (beta <= alpha) break;
    }
    return minScore;
  }
}

// ═══════════════════════════════════════════════════════════════
//  MAIN ENTRY POINT
// ═══════════════════════════════════════════════════════════════

function findBestMove() {
  // 1. Try opening book first (from openingBook.js)
  var bookMove = getOpeningMove();
  if (bookMove) return bookMove;

  // 2. Fall back to Minimax
  var moves     = game.moves();
  var bestMove  = null;
  var isAIWhite = gameConfig.aiColor === 'white';
  var bestScore = isAIWhite ? -Infinity : Infinity;
  var depth     = getAIDepth();

  console.log('AI: Calculating at depth ' + depth + '...');

  for (var i = 0; i < moves.length; i++) {
    game.move(moves[i]);
    var score = minimax(depth - 1, -Infinity, Infinity, !isAIWhite);
    game.undo();

    if (isAIWhite && score > bestScore) {
      bestScore = score;
      bestMove  = moves[i];
    }
    if (!isAIWhite && score < bestScore) {
      bestScore = score;
      bestMove  = moves[i];
    }
  }

  console.log('AI: Best move → ' + bestMove + ' (score: ' + bestScore + ')');
  return bestMove;
}