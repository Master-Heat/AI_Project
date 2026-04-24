/**
 * script.js
 * ──────────────────────────────────────────────────────────────
 * Main game logic. Connects chess.js + chessboard.js + AI.
 * ──────────────────────────────────────────────────────────────
 */

var board = null;
var game  = new Chess();

// ═══════════════════════════════════════════════════════════════
//  LOAD CONFIG FROM INDEX.HTML (Setup Page)
// ═══════════════════════════════════════════════════════════════

var gameConfig = {
  timeControl: 180,
  aiColor:     'black',
  humanColor:  'white'
};

var savedConfig = localStorage.getItem('chessGameConfig');
if (savedConfig) {
  var parsed = JSON.parse(savedConfig);

  if (parsed.aiColor === 'random') {
    parsed.aiColor = Math.random() < 0.5 ? 'white' : 'black';
  }

  parsed.humanColor = parsed.aiColor === 'white' ? 'black' : 'white';
  gameConfig        = parsed;
  localStorage.removeItem('chessGameConfig');
}

// ═══════════════════════════════════════════════════════════════
//  WEB WORKER SETUP
// ═══════════════════════════════════════════════════════════════

var aiWorker = new Worker('javascript/worker.js');

aiWorker.onmessage = function(e) {
  var bestMove = e.data;

  // ← REMOVED: Time calculation logic (timer runs smoothly now)

  if (bestMove) {
    game.move(bestMove);
    board.position(game.fen());
    updateStatus();
    updatePlayerDisplay();
    updateTimerDisplay();

    if (!game.game_over()) {
      startTimer(); // ← Timer continues for human's turn
    }
  }
};

// ═══════════════════════════════════════════════════════════════
//  TIMERS
// ═══════════════════════════════════════════════════════════════

var whiteTime     = gameConfig.timeControl;
var blackTime     = gameConfig.timeControl;
var timerInterval = null;

function formatTime(seconds) {
  var mins = Math.floor(seconds / 60);
  var secs = seconds % 60;
  return (mins < 10 ? '0' : '') + mins + ':' + (secs < 10 ? '0' : '') + secs;
}

function updateTimerDisplay() {
  var aiTime    = gameConfig.aiColor === 'white' ? whiteTime : blackTime;
  var humanTime = gameConfig.aiColor === 'white' ? blackTime : whiteTime;
  document.querySelector('#playerTop .player-time').textContent    = formatTime(aiTime);
  document.querySelector('#playerBottom .player-time').textContent = formatTime(humanTime);
}

function startTimer() {
  stopTimer();
  timerInterval = setInterval(function() {
    if (game.turn() === 'w') {
      whiteTime--;
      if (whiteTime <= 0) {
        whiteTime = 0;
        stopTimer();
        endGameByTimeout('Black');
        return; // ← Added to prevent negative time
      }
    } else {
      blackTime--;
      if (blackTime <= 0) {
        blackTime = 0;
        stopTimer();
        endGameByTimeout('White');
        return; // ← Added to prevent negative time
      }
    }
    updateTimerDisplay();
  }, 1000);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function endGameByTimeout(winner) {
  stopTimer();
  var resultDiv  = document.querySelector('.result');
  var resultText = document.getElementById('resultText');
  var winnerLabel =
    (winner === 'White' && gameConfig.humanColor === 'white') ||
    (winner === 'Black' && gameConfig.humanColor === 'black')
      ? 'You win! 🎉'
      : 'AI wins!';
  resultText.textContent = "Time's up!\n" + winnerLabel;
  resultDiv.classList.add('show');
}

// ═══════════════════════════════════════════════════════════════
//  UI HELPERS
// ═══════════════════════════════════════════════════════════════

function setupGameUI() {
  var playerTopDiv    = document.getElementById('playerTop');
  var playerBottomDiv = document.getElementById('playerBottom');

  playerTopDiv.querySelector('.player-name').textContent    = 'AI';
  playerBottomDiv.querySelector('.player-name').textContent = 'You';

  if (gameConfig.aiColor === 'black') {
    playerTopDiv.querySelector('.player-color').textContent    = '♞';
    playerBottomDiv.querySelector('.player-color').textContent = '♙';
  } else {
    playerTopDiv.querySelector('.player-color').textContent    = '♙';
    playerBottomDiv.querySelector('.player-color').textContent = '♞';
  }
}

function updatePlayerDisplay() {
  var playerTop    = document.getElementById('playerTop');
  var playerBottom = document.getElementById('playerBottom');

  playerTop.classList.remove('active');
  playerBottom.classList.remove('active');

  if (game.turn() === gameConfig.aiColor[0]) {
    playerTop.classList.add('active');
  } else {
    playerBottom.classList.add('active');
  }
}

function updateStatus() {
  if (!game.game_over()) return;

  stopTimer();
  var resultDiv  = document.querySelector('.result');
  var resultText = document.getElementById('resultText');
  var status     = '';

  if (game.in_checkmate()) {
    var loserColor  = game.turn();
    var winnerColor = loserColor === 'w' ? 'black' : 'white';
    var winnerLabel = winnerColor === gameConfig.humanColor
      ? 'You win! 🎉'
      : 'AI wins!';
    status = 'Checkmate!\n' + winnerLabel;
  } else if (game.in_draw()) {
    status = 'Game Over\nDraw!';
  }

  resultText.textContent = status;
  resultDiv.classList.add('show');
}

// ═══════════════════════════════════════════════════════════════
//  CLICK-TO-MOVE
// ═══════════════════════════════════════════════════════════════

var selectedSquare   = null;
var legalMoveSquares = [];

function clearHighlights() {
  if (selectedSquare) {
    $('[data-square="' + selectedSquare + '"]')
      .removeClass('highlight-selected');
  }

  legalMoveSquares.forEach(function(sq) {
    $('[data-square="' + sq + '"]')
      .removeClass('highlight-legal-move')
      .removeClass('highlight-capture-move');
  });

  selectedSquare   = null;
  legalMoveSquares = [];
}

function highlightLegalMoves(square) {
  var moves = game.moves({ square: square, verbose: true });
  if (moves.length === 0) return false;

  $('[data-square="' + square + '"]').addClass('highlight-selected');
  selectedSquare = square;

  moves.forEach(function(move) {
    var sq  = move.to;
    var $sq = $('[data-square="' + sq + '"]');

    if (game.get(sq)) {
      $sq.addClass('highlight-capture-move');
    } else {
      $sq.addClass('highlight-legal-move');
    }

    legalMoveSquares.push(sq);
  });

  return true;
}

function onSquareClick(square) {
  if (game.game_over())                      return;
  if (game.turn() === gameConfig.aiColor[0]) return;

  var piece = game.get(square);

  // Nothing selected yet
  if (!selectedSquare) {
    if (!piece)                      return;
    if (piece.color !== game.turn()) return;
    highlightLegalMoves(square);
    return;
  }

  // Clicked same square → deselect
  if (square === selectedSquare) {
    clearHighlights();
    return;
  }

  // Clicked another friendly piece → switch selection
  if (piece && piece.color === game.turn()) {
    clearHighlights();
    highlightLegalMoves(square);
    return;
  }

  // Clicked a legal destination → make the move
  if (legalMoveSquares.indexOf(square) !== -1) {
    var from = selectedSquare;
    clearHighlights();

    var move = game.move({ from: from, to: square, promotion: 'q' });
    if (move === null) return;

    board.position(game.fen());
    updateStatus();
    updatePlayerDisplay();
    updateTimerDisplay();

    if (!game.game_over()) {
      startTimer();
      makeAIMove();
    }
    return;
  }

  // Clicked somewhere else → deselect
  clearHighlights();
}

// ═══════════════════════════════════════════════════════════════
//  AI TRIGGER
// ═══════════════════════════════════════════════════════════════

function makeAIMove() {
  if (game.game_over())                      return;
  if (game.turn() !== gameConfig.aiColor[0]) return;

  setTimeout(function() {
    // Try opening book first
    var bookMove = getOpeningMove();
    if (bookMove) {
      game.move(bookMove);
      board.position(game.fen());
      updateStatus();
      updatePlayerDisplay();
      updateTimerDisplay();
      if (!game.game_over()) startTimer();
      return;
    }

    // No book move — use minimax via worker
    // ← REMOVED: stopTimer() — let it keep running!
    
    aiWorker.postMessage({
      fen:        game.fen(),
      gameConfig: gameConfig
    });
  }, 300);
}

// ═══════════════════════════════════════════════════════════════
//  BOARD INITIALIZATION
// ═══════════════════════════════════════════════════════════════

var config = {
  draggable:   false,
  position:    'start',
  orientation: gameConfig.humanColor,
  pieceTheme: function(piece) {
    // Convert SVG string to data URI
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(chessPiecesSVG[piece]);
  }
};

setupGameUI();
board = Chessboard('chessboard', config);
updateStatus();

// ═══════════════════════════════════════════════════════════════
//  CLICK LISTENER
// ═══════════════════════════════════════════════════════════════

$('#chessboard').on('click', '.square-55d63', function() {
  var square = $(this).attr('data-square');

  // Fallback: parse from class name if data-square is missing
  if (!square || square === '55d63') {
    var classList = $(this).attr('class');
    var match     = classList.match(/square-([a-h][1-8])/);
    if (match) {
      square = match[1];
    }
  }

  onSquareClick(square);
});

// ═══════════════════════════════════════════════════════════════
//  WAIT FOR OPENING BOOK TO LOAD BEFORE STARTING
// ═══════════════════════════════════════════════════════════════

var startInterval = setInterval(function() {
  if (openingBookLoaded) {
    clearInterval(startInterval);

    resetOpening();

    whiteTime = gameConfig.timeControl;
    blackTime = gameConfig.timeControl;

    updateTimerDisplay();
    updatePlayerDisplay();
    startTimer();

    if (gameConfig.aiColor === 'white') {
      makeAIMove();
    }
  }
}, 100);