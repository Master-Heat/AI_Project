/**
 * worker.js
 * ──────────────────────────────────────────────────────────────
 * Web Worker for Chess AI
 * Runs minimax in a background thread so the UI never freezes
 * ──────────────────────────────────────────────────────────────
 */

// ── Load chess.js inside the worker ──────────────────────────
importScripts('https://cdnjs.cloudflare.com/ajax/libs/chess.js/0.10.3/chess.min.js');

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

var kingMiddlegameTable = [
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -20,-30,-30,-40,-40,-30,-30,-20,
  -10,-20,-20,-20,-20,-20,-20,-10,
   20, 20,  0,  0,  0,  0, 20, 20,
   20, 30, 10,  0,  0, 10, 30, 20
];

var kingEndgameTable = [
  -50,-40,-30,-20,-20,-30,-40,-50,
  -30,-20,-10,  0,  0,-10,-20,-30,
  -30,-10, 20, 30, 30, 20,-10,-30,
  -30,-10, 30, 40, 40, 30,-10,-30,
  -30,-10, 30, 40, 40, 30,-10,-30,
  -30,-10, 20, 30, 30, 20,-10,-30,
  -30,-30,  0,  0,  0,  0,-30,-30,
  -50,-30,-30,-30,-30,-30,-30,-50
];

// ═══════════════════════════════════════════════════════════════
//  GAME PHASE DETECTION
// ═══════════════════════════════════════════════════════════════

function isEndgame(game) {
  var board = game.board();
  var material = 0;
  for (var r = 0; r < 8; r++) {
    for (var c = 0; c < 8; c++) {
      var piece = board[r][c];
      if (piece && piece.type !== 'p' && piece.type !== 'k') {
        material += pieceValues[piece.type];
      }
    }
  }
  return material < 1400;
}

// ═══════════════════════════════════════════════════════════════
//  POSITION BONUS
// ═══════════════════════════════════════════════════════════════

function getPiecePositionBonus(game, pieceType, color, row, col) {
  var index = color === 'w'
    ? (row * 8 + col)
    : ((7 - row) * 8 + col);

  switch (pieceType) {
    case 'p': return pawnTable[index];
    case 'n': return knightTable[index];
    case 'b': return bishopTable[index];
    case 'r': return rookTable[index];
    case 'q': return queenTable[index];
    case 'k': return isEndgame(game)
                ? kingEndgameTable[index]
                : kingMiddlegameTable[index];
    default:  return 0;
  }
}

// ═══════════════════════════════════════════════════════════════
//  EVALUATION FUNCTION
// ═══════════════════════════════════════════════════════════════

function evaluateBoard(game) {
  if (game.in_checkmate()) {
    return game.turn() === 'b' ? 999999 : -999999;
  }
  if (game.in_draw() || game.in_stalemate()) return 0;

  var board = game.board();
  var score = 0;
  var whiteBishops = 0;
  var blackBishops = 0;

  for (var row = 0; row < 8; row++) {
    for (var col = 0; col < 8; col++) {
      var piece = board[row][col];
      if (!piece) continue;

      var value = pieceValues[piece.type]
                + getPiecePositionBonus(game, piece.type, piece.color, row, col);

      if (piece.color === 'w') {
        score += value;
        if (piece.type === 'b') whiteBishops++;
      } else {
        score -= value;
        if (piece.type === 'b') blackBishops++;
      }
    }
  }

  if (whiteBishops >= 2) score += 30;
  if (blackBishops >= 2) score -= 30;

  if (game.in_check()) {
    score += game.turn() === 'b' ? 30 : -30;
  }

  return score;
}

// ═══════════════════════════════════════════════════════════════
//  MOVE ORDERING
// ═══════════════════════════════════════════════════════════════

function scoreMoveForOrdering(move) {
  var score = 0;

  if (move.captured) {
    var victimValue = pieceValues[move.captured] || 0;
    var attackerValue = pieceValues[move.piece] || 0;
    score += 10 * victimValue - attackerValue + 5000;
  }

  if (move.promotion) {
    score += pieceValues[move.promotion] + 4000;
  }

  if (move.flags) {
    if (move.flags.indexOf('k') !== -1) score += 300;
    if (move.flags.indexOf('q') !== -1) score += 300;
  }

  return score;
}

function getOrderedMoves(game) {
  var moves = game.moves({ verbose: true });
  moves.sort(function(a, b) {
    return scoreMoveForOrdering(b) - scoreMoveForOrdering(a);
  });
  return moves;
}

// ═══════════════════════════════════════════════════════════════
//  DEPTH CONTROL
// ═══════════════════════════════════════════════════════════════

function getAIDepth(gameConfig) {
  if (!gameConfig) return 3;
  
  var time = gameConfig.timeControl;
  if (time <= 60) return 2;
  if (time <= 180) return 3;
  return 3;
}

// ═══════════════════════════════════════════════════════════════
//  MINIMAX + ALPHA-BETA
// ═══════════════════════════════════════════════════════════════

function minimax(game, depth, alpha, beta, isMaximizing) {
  if (game.in_checkmate()) {
    return isMaximizing ? -999999 - depth : 999999 + depth;
  }
  if (game.in_draw() || game.in_stalemate()) return 0;
  if (depth === 0) return evaluateBoard(game);

  var moves = game.moves({ verbose: true });
  moves.sort(function(a, b) {
    return scoreMoveForOrdering(b) - scoreMoveForOrdering(a);
  });

  if (isMaximizing) {
    var maxScore = -Infinity;
    for (var i = 0; i < moves.length; i++) {
      game.move(moves[i]);
      var score = minimax(game, depth - 1, alpha, beta, false);
      game.undo();
      if (score > maxScore) maxScore = score;
      if (score > alpha) alpha = score;
      if (beta <= alpha) break;
    }
    return maxScore;
  } else {
    var minScore = Infinity;
    for (var i = 0; i < moves.length; i++) {
      game.move(moves[i]);
      var score = minimax(game, depth - 1, alpha, beta, true);
      game.undo();
      if (score < minScore) minScore = score;
      if (score < beta) beta = score;
      if (beta <= alpha) break;
    }
    return minScore;
  }
}

// ═══════════════════════════════════════════════════════════════
//  MAIN ENTRY POINT
// ═══════════════════════════════════════════════════════════════

function findBestMove(game, gameConfig) {
  var moves = getOrderedMoves(game);
  var bestMoves = [];
  var isAIWhite = gameConfig.aiColor === 'white';
  var bestScore = isAIWhite ? -Infinity : Infinity;
  var depth = getAIDepth(gameConfig);

  for (var i = 0; i < moves.length; i++) {
    game.move(moves[i]);

    if (game.in_checkmate()) {
      game.undo();
      return moves[i].san;
    }

    var score = minimax(game, depth - 1, -Infinity, Infinity, !isAIWhite);
    game.undo();

    if (isAIWhite) {
      if (score > bestScore) {
        bestScore = score;
        bestMoves = [moves[i]];
      } else if (score === bestScore) {
        bestMoves.push(moves[i]);
      }
    } else {
      if (score < bestScore) {
        bestScore = score;
        bestMoves = [moves[i]];
      } else if (score === bestScore) {
        bestMoves.push(moves[i]);
      }
    }
  }

  var chosen = bestMoves[Math.floor(Math.random() * bestMoves.length)];
  return chosen.san;
}

// ═══════════════════════════════════════════════════════════════
//  WORKER MESSAGE HANDLER
// ═══════════════════════════════════════════════════════════════

self.onmessage = function(e) {
  var data = e.data;
  
  // Create game instance from FEN
  var game = new Chess(data.fen);
  var gameConfig = data.gameConfig;
  
  // Find best move
  var bestMove = findBestMove(game, gameConfig);
  
  // Send result back to main thread
  self.postMessage(bestMove);
};