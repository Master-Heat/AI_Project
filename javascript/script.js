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

  // Resolve random color here, once, before anything runs
  if (parsed.aiColor === 'random') {
    parsed.aiColor = Math.random() < 0.5 ? 'white' : 'black';
  }

  parsed.humanColor = parsed.aiColor === 'white' ? 'black' : 'white';
  gameConfig        = parsed;
  localStorage.removeItem('chessGameConfig');
}

// ═══════════════════════════════════════════════════════════════
//  TIMERS
// ═══════════════════════════════════════════════════════════════

var whiteTime    = gameConfig.timeControl;
var blackTime    = gameConfig.timeControl;
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
      }
    } else {
      blackTime--;
      if (blackTime <= 0) {
        blackTime = 0;
        stopTimer();
        endGameByTimeout('White');
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
    playerTop.classList.add('active');    // AI always on top
  } else {
    playerBottom.classList.add('active'); // Human always on bottom
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
//  BOARD EVENT HANDLERS
// ═══════════════════════════════════════════════════════════════

function onDragStart(source, piece) {
  if (game.game_over()) return false;

  // Block dragging on AI's turn
  if (game.turn() === gameConfig.aiColor[0]) return false;

  // Block dragging the wrong color pieces
  if (game.turn() === 'w' && piece.search(/^b/) !== -1) return false;
  if (game.turn() === 'b' && piece.search(/^w/) !== -1) return false;
}

function onDrop(source, target) {
  // Extra safety: reject if AI's turn
  if (game.turn() === gameConfig.aiColor[0]) return 'snapback';

  var move = game.move({
    from:      source,
    to:        target,
    promotion: 'q'
  });

  if (move === null) return 'snapback';

  updateStatus();
  updatePlayerDisplay();
  updateTimerDisplay();

  if (!game.game_over()) {
    startTimer();
    makeAIMove();
  }
}

function onSnapEnd() {
  board.position(game.fen());
}

// ═══════════════════════════════════════════════════════════════
//  AI TRIGGER
// ═══════════════════════════════════════════════════════════════

function makeAIMove() {
  if (game.game_over()) return;
  if (game.turn() !== gameConfig.aiColor[0]) return;

  // Small delay so the browser renders the human's move first
  setTimeout(function() {
    var startTime = Date.now(); // Record start time
    

    var bestMove = findBestMove(); // Defined in agent.js

    var endTime = Date.now(); // calculate the time while finding the best move 
    var timeSpent = Math.floor((endTime - startTime) / 1000);
    if (gameConfig.aiColor === "white"){
      whiteTime -= timeSpent
    }else{
      blackTime -=timeSpent
    }

    if (bestMove) {
      game.move(bestMove);
      board.position(game.fen());
      updateStatus();
      updatePlayerDisplay();
      updateTimerDisplay();

      if (!game.game_over()) {
        startTimer();
      }
    }
  }, 300);
}

// ═══════════════════════════════════════════════════════════════
//  BOARD INITIALIZATION
// ═══════════════════════════════════════════════════════════════

var config = {
  draggable:   true,
  position:    'start',
  orientation: gameConfig.humanColor, // Human always at bottom
  onDragStart: onDragStart,
  onDrop:      onDrop,
  onSnapEnd:   onSnapEnd
};

setupGameUI();
board = Chessboard('chessboard', config);
updateStatus();

// ═══════════════════════════════════════════════════════════════
//  WAIT FOR OPENING BOOK TO LOAD BEFORE STARTING
// ═══════════════════════════════════════════════════════════════

/**
 * We poll every 100ms until openingBook.js has finished
 * fetching and parsing all ECO JSON files.
 * This prevents the AI from skipping the book on move 1.
 */
var startInterval = setInterval(function() {
  if (openingBookLoaded) {
    clearInterval(startInterval);

    // Fresh shuffle and reset for this game
    resetOpening();

    // Reset timers to correct values
    whiteTime = gameConfig.timeControl;
    blackTime = gameConfig.timeControl;

    updateTimerDisplay();
    updatePlayerDisplay();
    startTimer();

    // If AI is White it moves first
    if (gameConfig.aiColor === 'white') {
      makeAIMove();
    }
  }
}, 100);