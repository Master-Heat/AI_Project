var board = null;
var game = new Chess(); // Create a new chess game instance

// Load configuration from localStorage
var gameConfig = {
  timeControl: 180,  // Default 3 minutes
  aiColor: 'black',  // Default AI as black
  humanColor: 'white' // Default human as white
};

// Check if configuration exists in localStorage
var savedConfig = localStorage.getItem('chessGameConfig');
if (savedConfig) {
  gameConfig = JSON.parse(savedConfig);
  // Clear the config after loading so it doesn't persist
  localStorage.removeItem('chessGameConfig');
}

// Setup the UI based on configuration
function setupGameUI () {
  // AI is always at top, Human is always at bottom
  var playerTopDiv = document.getElementById('playerTop');
  var playerBottomDiv = document.getElementById('playerBottom');
  
  playerTopDiv.querySelector('.player-name').textContent = 'AI';
  playerBottomDiv.querySelector('.player-name').textContent = 'You';
  
  // Set color symbols based on AI color
  if (gameConfig.aiColor === 'black') {
    playerTopDiv.querySelector('.player-color').textContent = '♞'; // Black piece for AI at top
    playerBottomDiv.querySelector('.player-color').textContent = '♙'; // White piece for Human at bottom
  } else {
    playerTopDiv.querySelector('.player-color').textContent = '♙'; // White piece for AI at top
    playerBottomDiv.querySelector('.player-color').textContent = '♞'; // Black piece for Human at bottom
  }
}

// Timer variables
var whiteTime = gameConfig.timeControl;
var blackTime = gameConfig.timeControl;
var timerInterval = null;

// Format time as MM:SS
function formatTime (seconds) {
  var mins = Math.floor(seconds / 60);
  var secs = seconds % 60;
  return (mins < 10 ? '0' : '') + mins + ':' + (secs < 10 ? '0' : '') + secs;
}

// Update player display styling
function updatePlayerDisplay () {
  var playerTop = document.getElementById('playerTop');
  var playerBottom = document.getElementById('playerBottom');
  
  playerTop.classList.remove('active');
  playerBottom.classList.remove('active');
  
  // Top is always AI, Bottom is always Human
  // But piece colors vary based on AI color
  
  if (gameConfig.aiColor === 'black') {
    // AI (black) at top, Human (white) at bottom
    if (game.turn() === 'w') {
      playerBottom.classList.add('active');
    } else {
      playerTop.classList.add('active');
    }
  } else {
    // AI (white) at top, Human (black) at bottom
    if (game.turn() === 'w') {
      playerTop.classList.add('active');
    } else {
      playerBottom.classList.add('active');
    }
  }
}

// Update timer display
function updateTimerDisplay () {
  if (gameConfig.aiColor === 'black') {
    // AI (black) at top, Human (white) at bottom
    document.querySelector('#playerTop .player-time').textContent = formatTime(blackTime);
    document.querySelector('#playerBottom .player-time').textContent = formatTime(whiteTime);
  } else {
    // AI (white) at top, Human (black) at bottom
    document.querySelector('#playerTop .player-time').textContent = formatTime(whiteTime);
    document.querySelector('#playerBottom .player-time').textContent = formatTime(blackTime);
  }
}

// Start the game timer
function startTimer () {
  stopTimer();
  
  timerInterval = setInterval(function () {
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

// Stop the timer
function stopTimer () {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

// End game by timeout
function endGameByTimeout (winner) {
  var resultDiv = document.querySelector('.result');
  var resultText = document.querySelector('#resultText');
  resultText.textContent = 'Time\'s up!\n' + winner + ' wins!';
  resultDiv.classList.add('show');
}

function onDragStart (source, piece, position, orientation) {
  // Do not pick up pieces if the game is over
  if (game.game_over()) return false;

  // Only pick up pieces for the side to move
  if ((game.turn() === 'w' && piece.search(/^b/) !== -1) ||
      (game.turn() === 'b' && piece.search(/^w/) !== -1)) {
    return false;
  }
}

function onDrop (source, target) {
  // See if the move is legal
  var move = game.move({
    from: source,
    to: target,
    promotion: 'q' // NOTE: always promote to a queen for example simplicity
  });

  // Illegal move
  if (move === null) return 'snapback';

  updateStatus();
  updatePlayerDisplay();
  
  // Only start timer if game is not over
  if (!game.game_over()) {
    startTimer();
  }
}

// Update the board position after the piece snap
// for castling, en passant, pawn promotion
function onSnapEnd () {
  board.position(game.fen());
}

function updateStatus () {
  var status = '';
  var moveColor = (game.turn() === 'b') ? 'Black' : 'White';
  var resultDiv = document.querySelector('.result');
  var resultText = document.querySelector('#resultText');

  // Checkmate?
  if (game.in_checkmate()) {
    var winner = moveColor === 'Black' ? 'White' : 'Black';
    status = moveColor + ' is in checkmate!\n' + winner + ' wins!';
    resultText.textContent = status;
    resultDiv.classList.add('show');
    stopTimer();
  }
  // Draw?
  else if (game.in_draw()) {
    status = 'Game Over\nDrawn Position';
    resultText.textContent = status;
    resultDiv.classList.add('show');
    stopTimer();
  }
  // Game still on
  else {
    status = moveColor + ' to move';
    if (game.in_check()) {
      status += ', ' + moveColor + ' is in check';
    }
    resultDiv.classList.remove('show');
    console.log(status);
  }
}

var config = {
  draggable: true,
  position: 'start',
  orientation: gameConfig.aiColor === 'black' ? 'white' : 'black',
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