/**
 * openingBook.js
 * ──────────────────────────────────────────────────────────────
 * Loads ECO JSON files and handles all opening book logic.
 * ──────────────────────────────────────────────────────────────
 * Dependencies (must be loaded before this file):
 *   - chess.js  → provides the `game` object
 *   - script.js → provides the `gameConfig` object
 * ──────────────────────────────────────────────────────────────
 */

// ═══════════════════════════════════════════════════════════════
//  STATE
// ═══════════════════════════════════════════════════════════════

var openingBookLoaded = false; // True once all JSON files are fetched
var allOpenings       = [];    // Every opening parsed from ECO files
var chosenOpening     = null;  // The opening chosen for this game
var chosenMoves       = [];    // Moves array of the chosen opening
var openingDeviated   = false; // True if human went off-book

// ═══════════════════════════════════════════════════════════════
//  LOAD ECO JSON FILES
// ═══════════════════════════════════════════════════════════════

function loadECOFile(path) {
  return fetch(path)
    .then(function(response) {
      if (!response.ok) throw new Error('Failed to load: ' + path);
      return response.json();
    })
    .then(function(data) {
      data.forEach(function(entry) {
        var moves = parsePGN(entry.pgn);
        if (moves.length >= 2) {
          allOpenings.push({
            eco:   entry.eco,
            name:  entry.name,
            pgn:   entry.pgn,
            moves: moves
          });
        }
      });
      console.log('Loaded ' + path + ' → ' + data.length + ' openings');
    })
    .catch(function(err) {
      console.warn('Opening book warning: ' + err.message);
    });
}

function loadOpeningBook() {
  var files = [
    'opening/ecoA.json',
    'opening/ecoB.json',
    'opening/ecoC.json',
    'opening/ecoD.json',
    'opening/ecoE.json'
  ];

  Promise.all(files.map(function(file) {
    return loadECOFile(file);
  }))
  .then(function() {
    openingBookLoaded = true;
    console.log('Opening book ready: ' + allOpenings.length + ' openings loaded.');
  });
}

// ═══════════════════════════════════════════════════════════════
//  PGN PARSER
// ═══════════════════════════════════════════════════════════════

/**
 * Converts PGN string to a clean array of moves
 * Input:  "1. e4 e5 2. Nf3 Nc6"
 * Output: ["e4", "e5", "Nf3", "Nc6"]
 */
function parsePGN(pgn) {
  if (!pgn) return [];
  return pgn
    .replace(/\d+\./g,      '')  // Remove move numbers "1." "2."
    .replace(/[!?]+/g,      '')  // Remove annotations "!" "?"
    .replace(/\{[^}]*\}/g,  '')  // Remove comments {comment}
    .replace(/1-0|0-1|1\/2-1\/2|\*/g, '') // Remove results
    .split(/\s+/)
    .filter(function(m) { return m.length > 0; });
}

// ═══════════════════════════════════════════════════════════════
//  OPENING SELECTION LOGIC
// ═══════════════════════════════════════════════════════════════

/**
 * Find all openings that match the moves played so far
 */
function findMatchingOpenings(history) {
  return allOpenings.filter(function(opening) {
    if (opening.moves.length <= history.length) return false;
    for (var i = 0; i < history.length; i++) {
      if (opening.moves[i] !== history[i]) return false;
    }
    return true;
  });
}

/**
 * Pick one opening randomly from a list
 */
function pickRandomOpening(openings) {
  if (!openings || openings.length === 0) return null;
  return openings[Math.floor(Math.random() * openings.length)];
}

// ═══════════════════════════════════════════════════════════════
//  PUBLIC FUNCTIONS (called by agent.js)
// ═══════════════════════════════════════════════════════════════

/**
 * Returns the next book move for the AI, or null to use Minimax
 */
function getOpeningMove() {
  // Not ready or already off-book
  if (!openingBookLoaded || openingDeviated) return null;

  var history     = game.history();
  var movesPlayed = history.length;
  var isAIWhite   = gameConfig.aiColor === 'white';

  // ── AI is White, first move of the game ──────────────────────
  if (isAIWhite && movesPlayed === 0) {
    chosenOpening = pickRandomOpening(allOpenings);
    if (!chosenOpening) return null;
    chosenMoves = chosenOpening.moves;
    console.log('AI Opening: ' + chosenOpening.name +
                ' [' + chosenOpening.eco + ']');
    return chosenMoves[0];
  }

  // ── No opening chosen yet, find one based on history ─────────
  if (!chosenOpening) {
    var matches = findMatchingOpenings(history);
    if (matches.length === 0) {
      console.log('AI: No book match. Switching to Minimax.');
      openingDeviated = true;
      return null;
    }
    chosenOpening = pickRandomOpening(matches);
    chosenMoves   = chosenOpening.moves;
    console.log('AI Opening: ' + chosenOpening.name +
                ' [' + chosenOpening.eco + ']');
  }

  // ── Check if game still matches the chosen opening ───────────
  for (var i = 0; i < movesPlayed; i++) {
    if (i >= chosenMoves.length) break;
    if (history[i] !== chosenMoves[i]) {
      console.log('AI: Deviation at move ' + (i + 1) +
                  '. Expected "' + chosenMoves[i] +
                  '", got "' + history[i] + '". Switching to Minimax.');
      openingDeviated = true;
      chosenOpening   = null;
      chosenMoves     = [];
      return null;
    }
  }

  // ── End of the opening line ───────────────────────────────────
  if (movesPlayed >= chosenMoves.length) {
    console.log('AI: End of opening line. Switching to Minimax.');
    return null;
  }

  // ── Get the next move ─────────────────────────────────────────
  var nextMove    = chosenMoves[movesPlayed];
  var isWhiteTurn = (movesPlayed % 2 === 0);

  // This move belongs to the human, not the AI
  if (isWhiteTurn !== isAIWhite) return null;

  // Safety: make sure the move is actually legal right now
  var legalMoves = game.moves();
  if (legalMoves.indexOf(nextMove) === -1) {
    console.warn('AI: Book move "' + nextMove +
                 '" is illegal here. Switching to Minimax.');
    openingDeviated = true;
    return null;
  }

  console.log('AI [' + chosenOpening.eco + ' ' +
              chosenOpening.name + ']: ' + nextMove);
  return nextMove;
}

/**
 * Reset opening state — call this when starting a new game
 */
function resetOpening() {
  chosenOpening   = null;
  chosenMoves     = [];
  openingDeviated = false;
  console.log('AI: Opening book reset.');
}

// ── Start loading immediately when the script runs ───────────
loadOpeningBook();