/**
 * agent.js
 * ──────────────────────────────────────────────────────────────
 * Chess AI using Minimax + Alpha-Beta Pruning
 * ──────────────────────────────────────────────────────────────
 * Dependencies:
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
//  EVALUATION FUNCTION
//  Fast version - no Chess() object creation inside
// ═══════════════════════════════════════════════════════════════

function evaluateBoard() {
  // ── Checkmate / Draw ──────────────────────────────────────────
  if (game.in_checkmate()) {
    return game.turn() === 'b' ? 999999 : -999999;
  }
  if (game.in_draw() || game.in_stalemate()) return 0;

  var board        = game.board();
  var score        = 0;
  var whiteBishops = 0;
  var blackBishops = 0;

  // ── Material + Position ───────────────────────────────────────
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

  // ── Bishop Pair Bonus ─────────────────────────────────────────
  if (whiteBishops >= 2) score += 30;
  if (blackBishops >= 2) score -= 30;

  // ── Check Penalty ─────────────────────────────────────────────
  // Small bonus — just enough to prefer giving check
  // over an equal non-checking move
  if (game.in_check()) {
    score += game.turn() === 'b' ? 30 : -30;
  }

  return score;
}

// ═══════════════════════════════════════════════════════════════
//  MOVE ORDERING  (fast version - no game.move() calls)
// ═══════════════════════════════════════════════════════════════

/**
 * Score a move using ONLY the move object data.
 * No game.move() / game.undo() calls here.
 * This keeps ordering fast enough for depth 3-4.
 *
 * Priority:
 * 1. Queen promotion with capture  → highest
 * 2. Captures by MVV-LVA           → most valuable victim first
 * 3. Queen promotion (no capture)  → big positional gain
 * 4. Other promotions              → still good
 * 5. Castling                      → good positional move
 * 6. Normal moves                  → base score 0
 *
 * Checkmate is handled SEPARATELY in findBestMove()
 * by checking move 1 of the ordered list instantly.
 * The minimax scores handle deeper checkmates naturally.
 */
function scoreMoveForOrdering(move) {
  var score = 0;

  // ── Captures (MVV-LVA) ────────────────────────────────────────
  if (move.captured) {
    var victimValue   = pieceValues[move.captured] || 0;
    var attackerValue = pieceValues[move.piece]    || 0;
    // Capturing a queen with a pawn scores much higher than
    // capturing a pawn with a queen
    score += 10 * victimValue - attackerValue + 5000;
  }

  // ── Promotions ────────────────────────────────────────────────
  if (move.promotion) {
    score += pieceValues[move.promotion] + 4000;
  }

  // ── Castling ──────────────────────────────────────────────────
  if (move.flags) {
    if (move.flags.indexOf('k') !== -1) score += 300; // Kingside
    if (move.flags.indexOf('q') !== -1) score += 300; // Queenside
  }

  return score;
}

function getOrderedMoves() {
  var moves = game.moves({ verbose: true });

  // Sort by score descending (best moves first)
  moves.sort(function(a, b) {
    return scoreMoveForOrdering(b) - scoreMoveForOrdering(a);
  });

  // Return SAN strings for game.move() compatibility
  return moves.map(function(m) { return m.san; });
}

// ═══════════════════════════════════════════════════════════════
//  DEPTH CONTROL
// ═══════════════════════════════════════════════════════════════

function getAIDepth() {
  var time = gameConfig.timeControl;
  if (time <= 60)  return 2; // 1 min
  if (time <= 180) return 3; // 3 min
  return 3;                  // 10 min
}

// ═══════════════════════════════════════════════════════════════
//  MINIMAX + ALPHA-BETA
// ═══════════════════════════════════════════════════════════════

function minimax(depth, alpha, beta, isMaximizing) {
  // ── Terminal checks ───────────────────────────────────────────
  if (game.in_checkmate()) {
    return isMaximizing ? -999999 - depth : 999999 + depth;
  }
  if (game.in_draw() || game.in_stalemate()) return 0;
  if (depth === 0) return evaluateBoard();

  var moves = getOrderedMoves();

  if (isMaximizing) {
    var maxScore = -Infinity;
    for (var i = 0; i < moves.length; i++) {
      game.move(moves[i]);
      var score = minimax(depth - 1, alpha, beta, false);
      game.undo();
      if (score > maxScore) maxScore = score;
      if (score > alpha)    alpha    = score;
      if (beta <= alpha)    break;
    }
    return maxScore;
  } else {
    var minScore = Infinity;
    for (var i = 0; i < moves.length; i++) {
      game.move(moves[i]);
      var score = minimax(depth - 1, alpha, beta, true);
      game.undo();
      if (score < minScore) minScore = score;
      if (score < beta)     beta     = score;
      if (beta <= alpha)    break;
    }
    return minScore;
  }
}

// ═══════════════════════════════════════════════════════════════
//  MAIN ENTRY POINT
// ═══════════════════════════════════════════════════════════════

function findBestMove() {
  // 1. Opening book
  var bookMove = getOpeningMove();
  if (bookMove) return bookMove;

  // 2. Minimax
  var moves     = getOrderedMoves();
  var bestMoves = [];
  var isAIWhite = gameConfig.aiColor === 'white';
  var bestScore = isAIWhite ? -Infinity : Infinity;
  var depth     = getAIDepth();

  console.log('AI: Depth ' + depth + ' | Moves: ' + moves.length);

  for (var i = 0; i < moves.length; i++) {
    game.move(moves[i]);

    // Instant checkmate — no need to search further
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

  var chosen = bestMoves[Math.floor(Math.random() * bestMoves.length)];
  console.log('AI: Chose → ' + chosen + ' (score: ' + bestScore + ')');
  return chosen;
}