var board = null;
var game = new Chess();

// ─── Load Config ─────────────────────────────────────────────
var gameConfig = {
  playerCount: 1,
  timeControl: 180,
  playerColor: 'black',
  player1Color: 'white',
  player2Color: 'black',
  aiColor: 'white',
  humanColor: 'black'
};

var savedConfig = localStorage.getItem('chessGameConfig');
if (savedConfig) {
  var parsed = JSON.parse(savedConfig);
  gameConfig = parsed;
  localStorage.removeItem('chessGameConfig');
}

// ─── Timer Setup ─────────────────────────────────────────────
var whiteTime = gameConfig.timeControl;
var blackTime = gameConfig.timeControl;
var timerInterval = null;

// ─── UI Setup ────────────────────────────────────────────────
function setupGameUI() {
  var playerTopDiv = document.getElementById('playerTop');
  var playerBottomDiv = document.getElementById('playerBottom');
  
  if (gameConfig.playerCount === 1) {
    // 1-player mode (vs AI)
    playerTopDiv.querySelector('.player-name').textContent = 'AI';
    playerBottomDiv.querySelector('.player-name').textContent = 'You';
    
    if (gameConfig.aiColor === 'black') {
      playerTopDiv.querySelector('.player-color').textContent = '♞';
      playerBottomDiv.querySelector('.player-color').textContent = '♙';
    } else {
      playerTopDiv.querySelector('.player-color').textContent = '♙';
      playerBottomDiv.querySelector('.player-color').textContent = '♞';
    }
  } else {
    // 2-player mode
    // Player 1 is at bottom (white), Player 2 is at top (black)
    playerTopDiv.querySelector('.player-name').textContent = 'Player 2';
    playerBottomDiv.querySelector('.player-name').textContent = 'Player 1';
    
    if (gameConfig.player2Color === 'black') {
      playerTopDiv.querySelector('.player-color').textContent = '♞';
      playerBottomDiv.querySelector('.player-color').textContent = '♙';
    } else {
      playerTopDiv.querySelector('.player-color').textContent = '♙';
      playerBottomDiv.querySelector('.player-color').textContent = '♞';
    }
  }
}

function formatTime(seconds) {
  var mins = Math.floor(seconds / 60);
  var secs = seconds % 60;
  return (mins < 10 ? '0' : '') + mins + ':' + (secs < 10 ? '0' : '') + secs;
}

function updateTimerDisplay() {
  if (gameConfig.playerCount === 1) {
    // 1-player mode: show AI and human time
    var aiTime = gameConfig.aiColor === 'white' ? whiteTime : blackTime;
    var humanTime = gameConfig.aiColor === 'white' ? blackTime : whiteTime;
    document.querySelector('#playerTop .player-time').textContent = formatTime(aiTime);
    document.querySelector('#playerBottom .player-time').textContent = formatTime(humanTime);
  } else {
    // 2-player mode: Player 1 is white (bottom), Player 2 is determined by player2Color
    var player2Time = gameConfig.player2Color === 'black' ? blackTime : whiteTime;
    var player1Time = gameConfig.player2Color === 'black' ? whiteTime : blackTime;
    document.querySelector('#playerTop .player-time').textContent = formatTime(player2Time);
    document.querySelector('#playerBottom .player-time').textContent = formatTime(player1Time);
  }
}

function startTimer() {
  stopTimer();
  timerInterval = setInterval(function() {
    if (game.turn() === 'w') {
      whiteTime--;
      if (whiteTime <= 0) { whiteTime = 0; stopTimer(); endGameByTimeout('Black'); }
    } else {
      blackTime--;
      if (blackTime <= 0) { blackTime = 0; stopTimer(); endGameByTimeout('White'); }
    }
    updateTimerDisplay();
  }, 1000);
}

function stopTimer() {
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
}

function endGameByTimeout(winner) {
  stopTimer();
  var resultDiv = document.querySelector('.result');
  var resultText = document.getElementById('resultText');
  var winnerLabel;
  
  if (gameConfig.playerCount === 1) {
    winnerLabel = (winner === 'White' && gameConfig.humanColor === 'white') || 
                  (winner === 'Black' && gameConfig.humanColor === 'black') 
                  ? 'You win!' : 'AI wins!';
  } else {
    winnerLabel = winner === 'White' ? 'Player 1 wins!' : 'Player 2 wins!';
  }
  resultText.textContent = "Time's up!\n" + winnerLabel;
  resultDiv.classList.add('show');
}

function updatePlayerDisplay() {
  var playerTop = document.getElementById('playerTop');
  var playerBottom = document.getElementById('playerBottom');
  playerTop.classList.remove('active');
  playerBottom.classList.remove('active');
  
  if (gameConfig.playerCount === 1) {
    // 1-player mode: highlight AI or human based on turn
    if (game.turn() === gameConfig.aiColor[0]) playerTop.classList.add('active');
    else playerBottom.classList.add('active');
  } else {
    // 2-player mode: highlight based on player color
    // Player 1 (bottom) is white, Player 2 (top) is black
    if (game.turn() === 'w') playerBottom.classList.add('active');
    else playerTop.classList.add('active');
  }
}

function updateStatus() {
  if (!game.game_over()) return;
  stopTimer();
  var resultDiv = document.querySelector('.result');
  var resultText = document.getElementById('resultText');
  var status = '';

  if (game.in_checkmate()) {
    var loserColor = game.turn();
    var winnerColor = loserColor === 'w' ? 'black' : 'white';
    var winnerLabel;
    
    if (gameConfig.playerCount === 1) {
      winnerLabel = winnerColor === gameConfig.humanColor ? 'You win! 🎉' : 'AI wins!';
    } else {
      winnerLabel = winnerColor === 'white' ? 'Player 1 wins! 🎉' : 'Player 2 wins! 🎉';
    }
    status = 'Checkmate!\n' + winnerLabel;
  } else if (game.in_draw()) {
    status = 'Game Over\nDraw!';
  }
  resultText.textContent = status;
  resultDiv.classList.add('show');
}

// ─── Board Handlers ──────────────────────────────────────────
function onDragStart(source, piece) {
  if (game.game_over()) return false;
  
  if (gameConfig.playerCount === 1) {
    // 1-player mode: only allow human moves
    if (game.turn() === gameConfig.aiColor[0]) return false;
  }
  
  // Prevent moving opponent pieces
  if ((game.turn() === 'w' && piece.search(/^b/) !== -1) ||
      (game.turn() === 'b' && piece.search(/^w/) !== -1)) return false;
}

function onDrop(source, target) {
  // Safety check: in 1-player mode, don't allow moves on AI's turn
  if (gameConfig.playerCount === 1 && game.turn() === gameConfig.aiColor[0]) return 'snapback';

  var move = game.move({ from: source, to: target, promotion: 'q' });
  if (move === null) return 'snapback';

  updateStatus();
  updatePlayerDisplay();
  
  // Handle next turn
  if (!game.game_over()) {
    startTimer();
    if (gameConfig.playerCount === 1) {
      makeAIMove(); // 1-player mode: trigger AI
    }
  }
}

function onSnapEnd() {
  board.position(game.fen());
}

// ─── AI TRIGGER FUNCTION ─────────────────────────────────────
// This function connects script.js to agent.js
function makeAIMove() {
  if (game.game_over()) return;
  // Double check it's actually AI's turn
  if (game.turn() !== gameConfig.aiColor[0]) return;

  // Small delay so the browser can render the human's move first
  setTimeout(function() {
    // Call the function from agent.js
    var bestMove = findBestMove(); 

    if (bestMove) {
      game.move(bestMove);
      board.position(game.fen());
      updateStatus();
      updatePlayerDisplay();

      if (!game.game_over()) {
        startTimer();
      }
    }
  }, 300);
}

// ─── Initialize ──────────────────────────────────────────────
var boardOrientation = gameConfig.playerCount === 1 ? gameConfig.humanColor : 'white'; // In 2-player, player 1 is white
var config = {
  draggable: true,
  position: 'start',
  orientation: boardOrientation,
  onDragStart: onDragStart,
  onDrop: onDrop,
  onSnapEnd: onSnapEnd
};

setupGameUI();
board = Chessboard('chessboard', config);
updateStatus();
updateTimerDisplay();
updatePlayerDisplay();
startTimer();

// If AI is white (1-player mode only), it moves first
if (gameConfig.playerCount === 1 && gameConfig.aiColor === 'white') {
  makeAIMove();
}