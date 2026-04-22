const board = document.getElementById('hero-board');

const startingPosition = [
    'bR', 'bN', 'bB', 'bQ', 'bK', 'bB', 'bN', 'bR',
    'bP', 'bP', 'bP', 'bP', 'bP', 'bP', 'bP', 'bP',
    null, null, null, null, null, null, null, null,
    null, null, null, null, null, null, null, null,
    null, null, null, null, null, null, null, null,
    null, null, null, null, null, null, null, null,
    'wP', 'wP', 'wP', 'wP', 'wP', 'wP', 'wP', 'wP',
    'wR', 'wN', 'wB', 'wQ', 'wK', 'wB', 'wN', 'wR',
];

for (let i = 0; i < 64; i++) {
    const square = document.createElement('div');
    square.classList.add('square');

    const row = Math.floor(i / 8);
    const col = i % 8;

    if ((row + col) % 2 !== 0) {
        square.classList.add('dark');
    }else{
      square.classList.add('white')
    }

    if (startingPosition[i]) {
        const piece = document.createElement('img');
        piece.src = `img/chesspieces/wikipedia/${startingPosition[i]}.png`;
        piece.alt = startingPosition[i];
        piece.classList.add('piece');

        const delay = (col + row) * 0.15;
        piece.style.animationDelay = `${delay}s`;

        square.appendChild(piece);
    }

    board.appendChild(square);
}