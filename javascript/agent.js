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

//  2. OPENING BOOK LOGIC

var openingLibrary = [];
var ecoDatabase = {};

// Fetch the opening book from your local file
async function loadDatabases() {
  try {
    // Load moves.json (Sequential lines)
    const movesRes = await fetch('moves.json');
    openingLibrary = await movesRes.json();

    console.log("Chess Databases Loaded Successfully");
  } catch (err) {
    console.error("Error loading chess databases:", err);
  }
}

// Call the loader
loadDatabases();

function getOpeningMove() {
  var history = game.history();
  // Clean FEN: Only take pieces, turn, and castling (ignores move clocks)
  var currentFEN = game.fen().split(' ').slice(0, 3).join(' ');

  // 1. Check moves.json first (Exact line matching)
  if (Array.isArray(openingLibrary) && openingLibrary.length > 0) {
    var match = openingLibrary.find(line => 
      line.moves.length > history.length && 
      history.every((move, i) => move === line.moves[i])
    );
    if (match) {
      console.log("Book (Line): " + match.name);
      return match.moves[history.length];
    }
  }}

// function getOpeningMove() {
//   var currentFEN = game.fen();
//   var bookMoves = openingBook[currentFEN];

//   if (bookMoves && bookMoves.length > 0) {
//     var randomIndex = Math.floor(Math.random() * bookMoves.length);
//     return bookMoves[randomIndex];
//   }

//   return null;
// }

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

  if (game.in_checkmate()) {
    // If it is White's turn and they are in mate, Black wins (Score: -10000)
    // If it is Black's turn and they are in mate, White wins (Score: +10000)
    return game.turn() === 'w' ? -10000 : 10000;
  }
  
  if (game.in_draw() || game.in_stalemate() || game.in_threefold_repetition()) {
    return 0; // Draws are neutral
  }

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