/**
 * agent.js
 * ──────────────────────────────────────────────────────────────
 * Chess AI using:
 * 1. Iterative Deepening
 * 2. Alpha-Beta Pruning
 * 3. Transposition Table
 * 4. Move Ordering (MVV-LVA)
 * 5. Quiescence Search (depth-limited)
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
//  TRANSPOSITION TABLE
// ═══════════════════════════════════════════════════════════════

var transpositionTable = {};
var TT_SIZE_LIMIT      = 200000;
var ttEntryCount       = 0;
var TT_EXACT           = 0;
var TT_ALPHA           = 1;
var TT_BETA            = 2;

function ttClear() {
  transpositionTable = {};
  ttEntryCount       = 0;
}

function ttGet(key, depth, alpha, beta) {
  var entry = transpositionTable[key];
  if (!entry || entry.depth < depth) return null;
  if (entry.type === TT_EXACT) return entry.score;
  if (entry.type === TT_ALPHA && entry.score <= alpha) return alpha;
  if (entry.type === TT_BETA  && entry.score >= beta)  return beta;
  return null;
}

function ttSet(key, depth, score, type, bestMove) {
  if (ttEntryCount >= TT_SIZE_LIMIT) ttClear();
  transpositionTable[key] = {
    depth:    depth,
    score:    score,
    type:     type,
    bestMove: bestMove
  };
  ttEntryCount++;
}

// ═══════════════════════════════════════════════════════════════
//  TIME MANAGEMENT
// ═══════════════════════════════════════════════════════════════

var searchStartTime = 0;
var searchTimeLimit = 0;

function getTimeLimit() {
  var time = gameConfig.timeControl;
  if (time <= 60)  return 1500; // 1.5s for 1 min
  if (time <= 180) return 3000; // 3.0s for 3 min
  return 5000;                  // 5.0s for 10 min
}

function getMaxDepth() {
  var time = gameConfig.timeControl;
  if (time <= 60)  return 4; // 1 min
  if (time <= 180) return 5; // 3 min
  return 6;                  // 10 min
}

function isTimeUp() {
  return (Date.now() - searchStartTime) >= searchTimeLimit;
}

// ═══════════════════════════════════════════════════════════════
//  GAME PHASE
// ═══════════════════════════════════════════════════════════════

function isEndgame() {
  var board    = game.board();
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
    case 'k': return isEndgame()
                ? kingEndgameTable[index]
                : kingMiddlegameTable[index];
    default:  return 0;
  }
}

// ═══════════════════════════════════════════════════════════════
//  EVALUATION
// ═══════════════════════════════════════════════════════════════

function evaluateBoard() {
  if (game.in_checkmate()) {
    return game.turn() === 'b' ? 999999 : -999999;
  }
  if (game.in_draw() || game.in_stalemate()) return 0;

  var board        = game.board();
  var score        = 0;
  var whiteBishops = 0;
  var blackBishops = 0;

  for (var row = 0; row < 8; row++) {
    for (var col = 0; col < 8; col++) {
      var piece = board[row][col];
      if (!piece) continue;
      var value = pieceValues[piece.type]
                + getPiecePositionBonus(piece.type, piece.color, row, col);
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
//  QUIESCENCE SEARCH (depth-limited to max 4 extra plies)
// ═══════════════════════════════════════════════════════════════

var MAX_QUIESCENCE_DEPTH = 4;

function quiescence(alpha, beta, isMaximizing, qdepth) {
  // Hard limit on quiescence depth
  if (qdepth <= 0 || isTimeUp()) return evaluateBoard();

  var standPat = evaluateBoard();

  // Stand-pat pruning
  if (isMaximizing) {
    if (standPat >= beta)  return beta;
    if (standPat > alpha)  alpha = standPat;
  } else {
    if (standPat <= alpha) return alpha;
    if (standPat < beta)   beta = standPat;
  }

  // Only look at captures
  var moves = game.moves({ verbose: true }).filter(function(m) {
    return m.captured;
  });

  // Order captures by MVV-LVA (best captures first)
  moves.sort(function(a, b) {
    var aScore = (pieceValues[a.captured] || 0) * 10
               - (pieceValues[a.piece]    || 0);
    var bScore = (pieceValues[b.captured] || 0) * 10
               - (pieceValues[b.piece]    || 0);
    return bScore - aScore;
  });

  for (var i = 0; i < moves.length; i++) {
    if (isTimeUp()) break;

    game.move(moves[i].san);
    // Recurse with qdepth - 1
    var score = quiescence(alpha, beta, !isMaximizing, qdepth - 1);
    game.undo();

    if (isMaximizing) {
      if (score > alpha) alpha = score;
      if (alpha >= beta) break;
    } else {
      if (score < beta)  beta = score;
      if (beta <= alpha) break;
    }
  }

  return isMaximizing ? alpha : beta;
}

// ═══════════════════════════════════════════════════════════════
//  MOVE ORDERING
// ═══════════════════════════════════════════════════════════════

function scoreMoveForOrdering(move, ttBestMove) {
  // TT best move from previous iteration gets highest priority
  if (ttBestMove && move.san === ttBestMove) return 2000000;

  var score = 0;

  // Captures (MVV-LVA)
  if (move.captured) {
    var victimValue   = pieceValues[move.captured] || 0;
    var attackerValue = pieceValues[move.piece]    || 0;
    score += 10 * victimValue - attackerValue + 5000;
  }

  // Promotions
  if (move.promotion) {
    score += pieceValues[move.promotion] + 4000;
  }

  // Castling
  if (move.flags) {
    if (move.flags.indexOf('k') !== -1) score += 300;
    if (move.flags.indexOf('q') !== -1) score += 300;
  }

  return score;
}

function getOrderedMoves(ttBestMove) {
  var moves = game.moves({ verbose: true });
  moves.sort(function(a, b) {
    return scoreMoveForOrdering(b, ttBestMove) -
           scoreMoveForOrdering(a, ttBestMove);
  });
  return moves.map(function(m) { return m.san; });
}

// ═══════════════════════════════════════════════════════════════
//  MINIMAX + ALPHA-BETA + TRANSPOSITION TABLE
// ═══════════════════════════════════════════════════════════════

function minimax(depth, alpha, beta, isMaximizing) {
  if (isTimeUp()) return evaluateBoard();

  if (game.in_checkmate()) {
    return isMaximizing ? -999999 - depth : 999999 + depth;
  }
  if (game.in_draw() || game.in_stalemate()) return 0;

  // At depth 0 run quiescence with depth limit
  if (depth === 0) {
    return quiescence(alpha, beta, isMaximizing, MAX_QUIESCENCE_DEPTH);
  }

  // Transposition table lookup
  var ttKey    = game.fen();
  var ttScore  = ttGet(ttKey, depth, alpha, beta);
  if (ttScore !== null) return ttScore;

  var ttEntry    = transpositionTable[ttKey];
  var ttBestMove = ttEntry ? ttEntry.bestMove : null;
  var moves      = getOrderedMoves(ttBestMove);
  var bestMove   = null;
  var origAlpha  = alpha;

  if (isMaximizing) {
    var maxScore = -Infinity;
    for (var i = 0; i < moves.length; i++) {
      if (isTimeUp()) break;
      game.move(moves[i]);
      var score = minimax(depth - 1, alpha, beta, false);
      game.undo();
      if (score > maxScore) { maxScore = score; bestMove = moves[i]; }
      if (score > alpha)    alpha = score;
      if (beta <= alpha)    break;
    }
    var type = maxScore <= origAlpha ? TT_ALPHA
             : maxScore >= beta      ? TT_BETA
             : TT_EXACT;
    ttSet(ttKey, depth, maxScore, type, bestMove);
    return maxScore;

  } else {
    var minScore = Infinity;
    for (var i = 0; i < moves.length; i++) {
      if (isTimeUp()) break;
      game.move(moves[i]);
      var score = minimax(depth - 1, alpha, beta, true);
      game.undo();
      if (score < minScore) { minScore = score; bestMove = moves[i]; }
      if (score < beta)     beta = score;
      if (beta <= alpha)    break;
    }
    var type = minScore <= origAlpha ? TT_ALPHA
             : minScore >= beta      ? TT_BETA
             : TT_EXACT;
    ttSet(ttKey, depth, minScore, type, bestMove);
    return minScore;
  }
}

// ═══════════════════════════════════════════════════════════════
//  ITERATIVE DEEPENING (no aspiration windows - too slow here)
// ═══════════════════════════════════════════════════════════════

function findBestMove() {
  // 1. Opening book
  var bookMove = getOpeningMove();
  if (bookMove) return bookMove;

  // 2. Setup
  searchStartTime = Date.now();
  searchTimeLimit = getTimeLimit();
  var maxDepth    = getMaxDepth();
  var isAIWhite   = gameConfig.aiColor === 'white';

  ttClear();

  var bestMoveOverall  = null;
  var bestScoreOverall = isAIWhite ? -Infinity : Infinity;

  console.log('AI: Iterative deepening | Max depth: ' + maxDepth +
              ' | Time: ' + searchTimeLimit + 'ms');

  // 3. Search depth 1, 2, 3... up to maxDepth or time limit
  for (var depth = 1; depth <= maxDepth; depth++) {
    if (isTimeUp()) {
      console.log('AI: Time up before depth ' + depth);
      break;
    }

    var moves       = getOrderedMoves(bestMoveOverall);
    var bestMoves   = [];
    var bestScore   = isAIWhite ? -Infinity : Infinity;
    var completed   = true;

    for (var i = 0; i < moves.length; i++) {
      if (isTimeUp()) {
        completed = false;
        break;
      }

      game.move(moves[i]);

      // Instant checkmate
      if (game.in_checkmate()) {
        game.undo();
        console.log('AI: Checkmate in 1 → ' + moves[i]);
        return moves[i];
      }

      var score = minimax(depth - 1, -Infinity, Infinity, !isAIWhite);
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

    if (completed && bestMoves.length > 0) {
      // Only update if this depth completed fully
      bestMoveOverall  = bestMoves[Math.floor(Math.random() * bestMoves.length)];
      bestScoreOverall = bestScore;
      var elapsed      = Date.now() - searchStartTime;
      console.log('AI: Depth ' + depth + ' ✓ | ' + elapsed + 'ms | ' +
                  bestMoveOverall + ' (score: ' + bestScoreOverall + ')');

      // Checkmate found
      if (Math.abs(bestScoreOverall) > 900000) {
        console.log('AI: Forced mate → ' + bestMoveOverall);
        break;
      }
    } else {
      console.log('AI: Depth ' + depth + ' incomplete → using depth ' +
                  (depth - 1) + ' result.');
      break;
    }
  }

  var total = Date.now() - searchStartTime;
  console.log('AI: Final → ' + bestMoveOverall + ' | ' + total + 'ms');
  return bestMoveOverall;
}