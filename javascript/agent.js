/**
 * agent.js
 * ──────────────────────────────────────────────────────────────
 * Chess AI using:
 * 1. Transposition Table  → cache already-seen positions
 * 2. Iterative Deepening  → search deeper within time limit
 * 3. Move Ordering        → captures and good moves first
 * 4. Alpha-Beta Pruning   → skip bad branches
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
//  Caches positions we already evaluated so we never
//  calculate the same position twice
// ═══════════════════════════════════════════════════════════════

var transpositionTable = {};
var TT_SIZE_LIMIT      = 500000; // Max entries before clearing
var ttEntryCount       = 0;

// Entry types for the transposition table
var TT_EXACT = 0; // Exact score
var TT_ALPHA = 1; // Upper bound (failed low)
var TT_BETA  = 2; // Lower bound (failed high / beta cutoff)

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
  // Clear table if it gets too large to prevent memory issues
  if (ttEntryCount >= TT_SIZE_LIMIT) {
    ttClear();
  }

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
var searchTimeLimit = 0; // milliseconds

/**
 * Time limits per time control:
 * We give the AI a budget per move so it never
 * takes more than this regardless of depth.
 *
 * 1 min  → 1.5s per move  (depth 3)
 * 3 min  → 2.5s per move  (depth 4)
 * 10 min → 4.0s per move  (depth 4)
 */
function getTimeLimit() {
  var time = gameConfig.timeControl;
  if (time <= 60)  return 1500; // 1.5 seconds
  if (time <= 180) return 2500; // 2.5 seconds
  return 4000;                  // 4.0 seconds
}

function getMaxDepth() {
  var time = gameConfig.timeControl;
  if (time <= 60)  return 3; // 1 min  → max depth 3
  if (time <= 180) return 4; // 3 min  → max depth 4
  return 4;                  // 10 min → max depth 4
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
//  MOVE ORDERING (fast - no game.move() calls)
// ═══════════════════════════════════════════════════════════════

function scoreMoveForOrdering(move, ttBestMove) {
  // If this move was the best from a previous search iteration,
  // try it first (very powerful with iterative deepening)
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
  // ── Time check ────────────────────────────────────────────────
  // Stop searching if we have run out of time
  if (isTimeUp()) return evaluateBoard();

  // ── Terminal states ───────────────────────────────────────────
  if (game.in_checkmate()) {
    return isMaximizing ? -999999 - depth : 999999 + depth;
  }
  if (game.in_draw() || game.in_stalemate()) return 0;
  if (depth === 0) return evaluateBoard();

  // ── Transposition table lookup ────────────────────────────────
  var ttKey   = game.fen();
  var ttScore = ttGet(ttKey, depth, alpha, beta);
  if (ttScore !== null) return ttScore;

  // Get best move from previous search (for ordering)
  var ttEntry   = transpositionTable[ttKey];
  var ttBestMove = ttEntry ? ttEntry.bestMove : null;

  var moves    = getOrderedMoves(ttBestMove);
  var bestMove = null;
  var origAlpha = alpha;

  if (isMaximizing) {
    var maxScore = -Infinity;

    for (var i = 0; i < moves.length; i++) {
      if (isTimeUp()) break;

      game.move(moves[i]);
      var score = minimax(depth - 1, alpha, beta, false);
      game.undo();

      if (score > maxScore) {
        maxScore = score;
        bestMove = moves[i];
      }
      if (score > alpha) alpha = score;
      if (beta <= alpha) break; // Beta cutoff
    }

    // Store in transposition table
    var ttType = maxScore <= origAlpha ? TT_ALPHA
               : maxScore >= beta      ? TT_BETA
               : TT_EXACT;
    ttSet(ttKey, depth, maxScore, ttType, bestMove);

    return maxScore;

  } else {
    var minScore = Infinity;

    for (var i = 0; i < moves.length; i++) {
      if (isTimeUp()) break;

      game.move(moves[i]);
      var score = minimax(depth - 1, alpha, beta, true);
      game.undo();

      if (score < minScore) {
        minScore = score;
        bestMove = moves[i];
      }
      if (score < beta) beta = score;
      if (beta <= alpha) break; // Alpha cutoff
    }

    var ttType = minScore <= origAlpha ? TT_ALPHA
               : minScore >= beta      ? TT_BETA
               : TT_EXACT;
    ttSet(ttKey, depth, minScore, ttType, bestMove);

    return minScore;
  }
}

// ═══════════════════════════════════════════════════════════════
//  ITERATIVE DEEPENING
//  Search depth 1, then 2, then 3, then 4...
//  If time runs out mid-search, return best move from last
//  COMPLETED depth. This guarantees we always have a move.
// ═══════════════════════════════════════════════════════════════

function findBestMove() {
  // 1. Opening book
  var bookMove = getOpeningMove();
  if (bookMove) return bookMove;

  // 2. Setup time management
  searchStartTime = Date.now();
  searchTimeLimit = getTimeLimit();
  var maxDepth    = getMaxDepth();
  var isAIWhite   = gameConfig.aiColor === 'white';

  // Clear transposition table at start of each move search
  // (keeps memory usage bounded)
  ttClear();

  var bestMoveOverall = null;
  var bestScoreOverall = isAIWhite ? -Infinity : Infinity;

  console.log('AI: Starting iterative deepening | Max depth: ' +
              maxDepth + ' | Time limit: ' + searchTimeLimit + 'ms');

  // 3. Iterative deepening loop
  for (var currentDepth = 1; currentDepth <= maxDepth; currentDepth++) {
    // Stop if time is already up before starting a new depth
    if (isTimeUp()) {
      console.log('AI: Time up before depth ' + currentDepth +
                  '. Using depth ' + (currentDepth - 1) + ' result.');
      break;
    }

    var moves     = getOrderedMoves(bestMoveOverall);
    var bestMoves = [];
    var bestScore = isAIWhite ? -Infinity : Infinity;
    var searchCompleted = true;

    for (var i = 0; i < moves.length; i++) {
      // Check time before each root move
      if (isTimeUp()) {
        searchCompleted = false;
        break;
      }

      game.move(moves[i]);

      // Instant checkmate
      if (game.in_checkmate()) {
        game.undo();
        console.log('AI: Checkmate in 1 found → ' + moves[i]);
        return moves[i];
      }

      var score = minimax(
        currentDepth - 1,
        -Infinity,
        Infinity,
        !isAIWhite
      );
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

    // Only update overall best if this depth search COMPLETED fully
    // A partial search result might be misleading
    if (searchCompleted && bestMoves.length > 0) {
      bestMoveOverall  = bestMoves[Math.floor(Math.random() * bestMoves.length)];
      bestScoreOverall = bestScore;
      var elapsed      = Date.now() - searchStartTime;
      console.log('AI: Depth ' + currentDepth +
                  ' done in ' + elapsed + 'ms' +
                  ' | Best: ' + bestMoveOverall +
                  ' (score: ' + bestScoreOverall + ')');
    } else {
      console.log('AI: Depth ' + currentDepth +
                  ' incomplete (time up). Using depth ' +
                  (currentDepth - 1) + ' result.');
      break;
    }
  }

  var totalTime = Date.now() - searchStartTime;
  console.log('AI: Final move → ' + bestMoveOverall +
              ' | Total time: ' + totalTime + 'ms');
  return bestMoveOverall;
}