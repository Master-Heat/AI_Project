/**
 * setup.js
 * ──────────────────────────────────────────────────────────────
 * Handles the setup page configuration and game start
 * ──────────────────────────────────────────────────────────────
 */

let playerCount = 1;
let playerColor = 'black';
let player2Color = 'white';
let timeControl = '3';

function openPlayConfig() {
  const playButton = document.querySelector('.play-button');
  playButton.classList.add('expanded');
}

function setPlayerCount(count) {
  playerCount = count;
  document.querySelectorAll('.player-count').forEach(btn => {
    btn.classList.toggle('btn-selected', parseInt(btn.dataset.value) === count);
  });

  const player2Item = document.getElementById('player2ColorItem');
  player2Item.style.display = (count === 1) ? 'none' : 'block';
  document.getElementById('player1ColorLabel').textContent = (count === 1) ? 'Player Color:' : 'Player #1 Color:';
}

function setPlayerColor(color) {
  playerColor = color;
  if (playerCount === 2 && color !== 'random' && color === player2Color) {
    setPlayer2Color(color === 'black' ? 'white' : 'black');
  }
  updateColorUI();
}

function setPlayer2Color(color) {
  player2Color = color;
  if (color !== 'random' && color === playerColor) {
    setPlayerColor(color === 'black' ? 'white' : 'black');
  }
  updateColorUI();
}

function updateColorUI() {
  document.querySelectorAll('.config-item:not(#player2ColorItem) .color-button').forEach(btn => {
    btn.classList.toggle('btn-selected', btn.dataset.value === playerColor);
  });
  document.querySelectorAll('#player2ColorItem .color-button').forEach(btn => {
    btn.classList.toggle('btn-selected', btn.dataset.value === player2Color);
  });
}

function setTimeControl(time) {
  timeControl = time;
  document.querySelectorAll('.time-button').forEach(btn => {
    btn.classList.remove('btn-selected', 'btn-unselected');
    btn.classList.add(btn.dataset.value === time ? 'btn-selected' : 'btn-unselected');
  });
}

function startGame() {
  let gameConfig = {
    playerCount: playerCount,
    timeControl: parseInt(timeControl) * 60,
    boardThemeColor: "#fafafa"
  };

  if (playerCount === 1) {
    gameConfig.humanColor = playerColor === 'random' ? (Math.random() < 0.5 ? 'black' : 'white') : playerColor;
    gameConfig.aiColor = gameConfig.humanColor === 'black' ? 'white' : 'black';
  } else {
    let p1Color = playerColor === 'random' ? (Math.random() < 0.5 ? 'black' : 'white') : playerColor;
    gameConfig.player1Color = p1Color;
    gameConfig.player2Color = p1Color === 'black' ? 'white' : 'black';
  }

  // Create player cards
  const gamePlayerCards = document.getElementById('gamePlayerCards');
  gamePlayerCards.innerHTML = '';

  const createPlayerCard = (name, time) => {
    const card = document.createElement('div');
    card.className = 'player-card-ui';
    card.innerHTML = `
      <div class="card-avatar">
        <div class="avatar-circle"></div>
      </div>
      <div class="card-info">
        <div class="card-name-row">${name}</div>
        <div class="card-time-row">${Math.floor(time / 60)}:00</div>
      </div>`;
    return card;
  };

  const topCard = playerCount === 1
    ? createPlayerCard('AI Opponent', gameConfig.timeControl)
    : createPlayerCard('Player 2', gameConfig.timeControl);

  const bottomCard = playerCount === 1
    ? createPlayerCard('You', gameConfig.timeControl)
    : createPlayerCard('Player 1', gameConfig.timeControl);

  gamePlayerCards.appendChild(topCard);
  gamePlayerCards.appendChild(bottomCard);

  // Store config globally
  window.gameConfigData = gameConfig;

  // Switch to game page
  showPage('gamePage');

  // Initialize the game
  if (typeof initializeGame === 'function') {
    initializeGame();
  }
}

// Page navigation
function showPage(pageId) {
  document.querySelectorAll('.page-view').forEach(page => {
    page.classList.remove('active');
  });
  document.getElementById(pageId).classList.add('active');
}

// Initialize on load
window.addEventListener('DOMContentLoaded', () => {
  // Player count
  document.querySelectorAll('.player-count').forEach(btn => {
    btn.classList.add(parseInt(btn.dataset.value) === playerCount ? 'btn-selected' : 'btn-unselected');
    btn.addEventListener('click', (e) => setPlayerCount(parseInt(e.target.dataset.value)));
  });

  // Player 1 color
  document.querySelectorAll('.config-item:not(#player2ColorItem) .color-button').forEach(btn => {
    btn.classList.add(btn.dataset.value === playerColor ? 'btn-selected' : 'btn-unselected');
    btn.addEventListener('click', (e) => setPlayerColor(e.target.dataset.value));
  });

  // Player 2 color
  document.querySelectorAll('#player2ColorItem .color-button').forEach(btn => {
    btn.classList.add(btn.dataset.value === player2Color ? 'btn-selected' : 'btn-unselected');
    btn.addEventListener('click', (e) => setPlayer2Color(e.target.dataset.value));
  });

  // Time control
  document.querySelectorAll('.time-button').forEach(btn => {
    btn.classList.add(btn.dataset.value === timeControl ? 'btn-selected' : 'btn-unselected');
    btn.addEventListener('click', (e) => setTimeControl(e.target.dataset.value));
  });

  // Start game button
  document.querySelector('.play-start-button').addEventListener('click', startGame);

  // Back to setup button
  const backBtn = document.getElementById('backToSetupBtn');
  if (backBtn) {
    backBtn.addEventListener('click', function() {
      document.querySelector('.result').classList.remove('show');
      
      if (typeof stopTimer === 'function') stopTimer();
      if (typeof clearHighlights === 'function') clearHighlights();
      
      showPage('setupPage');
    });
  }
});