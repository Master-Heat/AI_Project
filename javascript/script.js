/**
 * script.js
 * ──────────────────────────────────────────────────────────────
 * Main game logic. Connects chess.js + chessboard.js + AI.
 * ONLY executes when initializeGame() is called
 * ──────────────────────────────────────────────────────────────
 */

(function() {
  'use strict';

  // ═══════════════════════════════════════════════════════════════
  //  GLOBAL VARIABLES (inside closure)
  // ═══════════════════════════════════════════════════════════════

  var board = null;
  var game = null;
  var gameConfig = null;
  var whiteTime = 0;
  var blackTime = 0;
  var timerInterval = null;
  var selectedSquare = null;
  var legalMoveSquares = [];
  var aiWorker = null;

  // ═══════════════════════════════════════════════════════════════
  //  GAME INITIALIZATION
  // ═══════════════════════════════════════════════════════════════

  window.initializeGame = function() {
    console.log('Initializing game...');
    
    // Get config from setup
    if (window.gameConfigData) {
      gameConfig = window.gameConfigData;
    } else {
      gameConfig = {
        timeControl: 180,
        aiColor: 'black',
        humanColor: 'white',
        playerCount: 1
      };
    }

    // Initialize Chess.js
    game = new Chess();

    // Initialize worker
    if (!aiWorker) {
      aiWorker = new Worker('javascript/worker.js');
      aiWorker.onmessage = function(e) {
        var bestMove = e.data;
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
      };
    }

    // Reset timers
    whiteTime = gameConfig.timeControl;
    blackTime = gameConfig.timeControl;

    // Determine orientation
    var orientation = gameConfig.humanColor || gameConfig.player1Color || 'white';

    // Board config
    var config = {
      draggable: false,
      position: 'start',
      orientation: orientation,
      pieceTheme: function(piece) {
        if (typeof chessPiecesSVG !== 'undefined' && chessPiecesSVG[piece]) {
          return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(chessPiecesSVG[piece]);
        }
        return 'img/chesspieces/wikipedia/' + piece + '.png';
      }
    };

    // Create or reset board
    if (board === null) {
      board = Chessboard('chessboard', config);

      // Attach click listener
      $('#chessboard').on('click', '.square-55d63', function() {
        var square = $(this).attr('data-square');

        if (!square || square === '55d63') {
          var classList = $(this).attr('class');
          var match = classList.match(/square-([a-h][1-8])/);
          if (match) {
            square = match[1];
          }
        }

        onSquareClick(square);
      });
    } else {
      board.orientation(orientation);
      board.position('start');
    }

    console.log('Board created, waiting for opening book...');

    // Wait for opening book
    var attempts = 0;
    var startInterval = setInterval(function() {
      attempts++;
      
      if (typeof openingBookLoaded !== 'undefined' && openingBookLoaded) {
        clearInterval(startInterval);
        console.log('Opening book loaded, starting game');

        if (typeof resetOpening === 'function') {
          resetOpening();
        }

        if (gameConfig.playerCount === 1) {
          updateTimerDisplay();
          updatePlayerDisplay();
          startTimer();

          if (gameConfig.aiColor === 'white') {
            makeAIMove();
          }
        }
      } else if (attempts > 100) {
        // Timeout after 10 seconds
        clearInterval(startInterval);
        console.warn('Opening book failed to load, starting anyway');
        
        if (gameConfig.playerCount === 1) {
          updateTimerDisplay();
          updatePlayerDisplay();
          startTimer();

          if (gameConfig.aiColor === 'white') {
            makeAIMove();
          }
        }
      }
    }, 100);
  };

  // ═══════════════════════════════════════════════════════════════
  //  TIMERS
  // ═══════════════════════════════════════════════════════════════

  function formatTime(seconds) {
    var mins = Math.floor(seconds / 60);
    var secs = seconds % 60;
    return (mins < 10 ? '0' : '') + mins + ':' + (secs < 10 ? '0' : '') + secs;
  }

  function updateTimerDisplay() {
    if (!gameConfig) return;

    var aiTime = gameConfig.aiColor === 'white' ? whiteTime : blackTime;
    var humanTime = gameConfig.aiColor === 'white' ? blackTime : whiteTime;

    var cards = document.querySelectorAll('.player-card-ui .card-time-row');
    if (cards.length >= 2) {
      cards[0].textContent = formatTime(aiTime);
      cards[1].textContent = formatTime(humanTime);
    }
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
          return;
        }
      } else {
        blackTime--;
        if (blackTime <= 0) {
          blackTime = 0;
          stopTimer();
          endGameByTimeout('White');
          return;
        }
      }
      updateTimerDisplay();
    }, 1000);
  }

  window.stopTimer = function() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  };

  var stopTimer = window.stopTimer;

  function endGameByTimeout(winner) {
    stopTimer();
    var resultDiv = document.querySelector('.result');
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

  function updatePlayerDisplay() {
    var cards = document.querySelectorAll('.player-card-ui');
    if (cards.length >= 2) {
      cards.forEach(function(card) {
        card.classList.remove('active');
      });

      if (game.turn() === gameConfig.aiColor[0]) {
        cards[0].classList.add('active');
      } else {
        cards[1].classList.add('active');
      }
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

  window.clearHighlights = function() {
    if (selectedSquare) {
      $('[data-square="' + selectedSquare + '"]')
        .removeClass('highlight-selected');
    }

    legalMoveSquares.forEach(function(sq) {
      $('[data-square="' + sq + '"]')
        .removeClass('highlight-legal-move')
        .removeClass('highlight-capture-move');
    });

    selectedSquare = null;
    legalMoveSquares = [];
  };

  var clearHighlights = window.clearHighlights;

  function highlightLegalMoves(square) {
    var moves = game.moves({ square: square, verbose: true });
    if (moves.length === 0) return false;

    $('[data-square="' + square + '"]').addClass('highlight-selected');
    selectedSquare = square;

    moves.forEach(function(move) {
      var sq = move.to;
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
    if (game.game_over()) return;
    if (game.turn() === gameConfig.aiColor[0]) return;

    var piece = game.get(square);

    if (!selectedSquare) {
      if (!piece) return;
      if (piece.color !== game.turn()) return;
      highlightLegalMoves(square);
      return;
    }

    if (square === selectedSquare) {
      clearHighlights();
      return;
    }

    if (piece && piece.color === game.turn()) {
      clearHighlights();
      highlightLegalMoves(square);
      return;
    }

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

    clearHighlights();
  }

  // ═══════════════════════════════════════════════════════════════
  //  AI TRIGGER
  // ═══════════════════════════════════════════════════════════════

  function makeAIMove() {
    if (game.game_over()) return;
    if (game.turn() !== gameConfig.aiColor[0]) return;

    setTimeout(function() {
      var bookMove = null;
      if (typeof getOpeningMove === 'function') {
        bookMove = getOpeningMove();
      }

      if (bookMove) {
        game.move(bookMove);
        board.position(game.fen());
        updateStatus();
        updatePlayerDisplay();
        updateTimerDisplay();
        if (!game.game_over()) startTimer();
        return;
      }

      aiWorker.postMessage({
        fen: game.fen(),
        gameConfig: gameConfig
      });
    }, 300);
  }

})();