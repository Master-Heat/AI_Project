/**
 * worker.js
 * ──────────────────────────────────────────────────────────────
 * Web Worker for Chess AI
 * Runs minimax in a background thread so the UI never freezes
 * ──────────────────────────────────────────────────────────────
 */

// ── Load chess.js inside the worker ──────────────────────────
importScripts('https://cdnjs.cloudflare.com/ajax/libs/chess.js/0.10.3/chess.min.js');
importScripts('agent.js'); // Import all minimax logic

// ── Worker-local game instance ────────────────────────────────
var game       = null;
var gameConfig = null;

// ── Listen for messages from main thread ─────────────────────
self.onmessage = function(e) {
  var data = e.data;

  // Reconstruct game state from FEN
  game       = new Chess(data.fen);
  gameConfig = data.gameConfig;

  // Run minimax and return best move
  var bestMove = findBestMove();
  self.postMessage(bestMove);
};