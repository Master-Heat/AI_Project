/**
 * agent.js
 * Chess AI Engine
 * ----------------
 * Uses Minimax with Alpha-Beta Pruning
 * Evaluation: Material + Piece-Square Tables
 * Includes: Hardcoded Opening Book + Dynamic Depth based on Time Control
 */
//  1. PIECE VALUES & POSITION TABLES

var pieceValues = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000
};

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

//  2. OPENING BOOK

var openingBook = {
  // Starting Position
  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1': [
    'e4', 'd4', 'Nf3', 'c4'
  ],
  // After 1.e4
  'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1': [
    'e5', 'c5', 'e6', 'c6'
  ],
  // After 1.d4
  'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq d3 0 1': [
    'd5', 'Nf6', 'e6'
  ],
  // After 1.e4 e5
  'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2': [
    'Nf3', 'Bc4'
  ],
  // After 1.e4 c5 (Sicilian)
  'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2': [
    'Nf3', 'c3', 'Nc3'
  ],
  // After 1.e4 e5 2.Nf3
  'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2': [
    'Nc6', 'Nf6'
  ],
  // After 1.d4 d5
  'rnbqkbnr/ppp1pppp/8/3p4/3P4/8/PPP1PPPP/RNBQKBNR w KQkq d6 0 2': [
    'c4', 'Nf3', 'Bf4'
  ]
};

function getOpeningMove() {
  var currentFEN = game.fen();
  var bookMoves = openingBook[currentFEN];

  if (bookMoves && bookMoves.length > 0) {
    var randomIndex = Math.floor(Math.random() * bookMoves.length);
    return bookMoves[randomIndex];
  }

  return null;
}

//  3. EVALUATION FUNCTION

function getPiecePositionBonus(pieceType, color, row, col) {
  var index = color === 'w' ? (row * 8 + col) : ((7 - row) * 8 + col);

  switch (pieceType) {
    case 'p': return pawnTable[index];
    case 'n': return knightTable[index];
    case 'b': return bishopTable[index];
    case 'r': return rookTable[index];
    case 'q': return queenTable[index];
    case 'k': return kingTable[index];
    default: return 0;
  }
}

function evaluateBoard() {
  var boardArray = game.board();
  var score = 0;

  for (var row = 0; row < 8; row++) {
    for (var col = 0; col < 8; col++) {
      var piece = boardArray[row][col];
      if (!piece) continue;

      var value = pieceValues[piece.type] 
                + getPiecePositionBonus(piece.type, piece.color, row, col);

      if (piece.color === 'w') {
        score += value;
      } else {
        score -= value;
      }
    }
  }

  return score;
}

//  4. MINIMAX ALGORITHM

/* Determine search depth based on the time control loaded from script.js */
function getAIDepth() {
  // Access the global variable set in script.js
  // var time = gameConfig.timeControl;

  return 2;
  // if (time <= 60) {
  //   return 2; // 1 Minute: Fast and shallow
  // } else if (time <= 180) {
  //   return 3; // 3 Minutes: Standard depth
  // } else {
  //   return 4; // 10 Minutes: Deep search
  // }
}

function minimax(depth, alpha, beta, isMaximizing) {
  if (depth === 0 || game.game_over()) {
    return evaluateBoard();
  }

  var moves = game.moves();

  if (isMaximizing) {
    var maxScore = -Infinity;
    for (var i = 0; i < moves.length; i++) {
      game.move(moves[i]);
      var score = minimax(depth - 1, alpha, beta, false);
      game.undo();
      maxScore = Math.max(maxScore, score);
      alpha = Math.max(alpha, score);
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
      beta = Math.min(beta, score);
      if (beta <= alpha) break;
    }
    return minScore;
  }
}

//  5. MAIN ENTRY POINT

function findBestMove() {
  // 1. Check Opening Book
  var bookMove = getOpeningMove();
  if (bookMove) {
    console.log("AI: Playing Book Move -> " + bookMove);
    return bookMove;
  }

  // 2. Setup Minimax
  var moves = game.moves();
  var bestMove = null;
  var isAIWhite = (gameConfig.aiColor === 'white');
  var bestScore = isAIWhite ? -Infinity : Infinity;
  
  // Get dynamic depth based on time control
  var depth = getAIDepth(); 
  console.log("AI: Calculating at Depth " + depth + "...");

  // 3. Loop through moves
  for (var i = 0; i < moves.length; i++) {
    game.move(moves[i]);
    var score = minimax(depth - 1, -Infinity, Infinity, !isAIWhite);
    game.undo();

    if (isAIWhite) {
      if (score > bestScore) {
        bestScore = score;
        bestMove = moves[i];
      }
    } else {
      if (score < bestScore) {
        bestScore = score;
        bestMove = moves[i];
      }
    }
  }

  console.log("AI: Best Move Found -> " + bestMove + " (Score: " + bestScore + ")");
  return bestMove;
}

//  /**
//   * Triggers the AI logic from agent.js and updates the game state.
//   */
//  function makeAgentMove() {
//    // 1. Safety check: Don't move if the game ended after the human's turn
//    if (game.game_over()) return;
 
//    // 2. Call the entry point function in agent.js to get the best move
//    var bestMove = findBestMove(); 
 
//    // 3. Execute the move in the chess.js logic
//    game.move(bestMove);
 
//    // 4. Update the visual chessboard
//    board.position(game.fen());
 
//    // 5. Sync the UI (Status text, active player highlights, etc.)
//    updateStatus();
//    updatePlayerDisplay();
 
//    // 6. Check if the game ended after AI's move; if not, restart timer for human
//    if (!game.game_over()) {
//      startTimer();
//    }
//  }