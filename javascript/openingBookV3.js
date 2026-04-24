/**
 * Loads the JSON file from the relative directory and returns the data.
 * Path navigated: ../opening/fromToPositionIndexed.json
 */
async function loadOpeningBook() {
  const filePath = '../opening/fromToPositionIndexed.json';

  try {
    const response = await fetch(filePath);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const openingBook = await response.json();
    console.log("Opening book loaded and parsed successfully.");
    return openingBook;
  } catch (error) {
    console.error("Failed to load opening book:", error);
    return null;
  }
}

// Example: Initializing your AI agent variable
let openingData = {};

loadOpeningBook().then(data => {
  if (data) {
    openingData = data;
    // You can now safely trigger your AI agent logic here
    console.log("AI Agent is ready to search FENs.");
  }
});


// adapter function conver game.fen() valid index in fromToPositionIndexed
function toBookIndex(fen) {
  return fen.split(' ')[0];
}


function getNextFens(fen) {
    var bookKey = toBookIndex(fen);
    return openingData.to[bookKey] || [];
}



/**
 * Loads all ECO JSON files (a-e) from the opening folder
 * and combines them into a single object.
 */
async function loadEcoDatabase() {
  const basePath = '../opening/';
 const files = ['ecoA.json', 'ecoB.json', 'ecoC.json', 'ecoD.json', 'ecoE.json'];

  try {
    // Map the filenames to fetch promises
    const promises = files.map(fileName => 
        fetch(basePath + fileName).then(response => {
        if (!response.ok) throw new Error(`Could not load ${fileName}`);
        return response.json();
    })
    );
    
    // Wait for all files to be fetched and parsed
    const results = await Promise.all(promises);
    
    // Combine all objects into one using the spread operator
    const ecoDatabase = Object.assign({}, ...results);
    
    console.log("All ECO files loaded and combined successfully.");
    return ecoDatabase;
  } catch (error) {
    console.error("Failed to load ECO database:", error);
    return null;
  }
}

// Example usage to save it as an object variable
let ecoData = {};

loadEcoDatabase().then(data => {
  if (data) {
    ecoData = data;
    // You can now search ecoData using the adapted FENs
  }
});


// get form eco files the move the needed to reach one of the next moves in the fromToPositionIndexed
function getAllPossibleMoves(nextFens, ecoData) {
    const allMoves = [];
    
    // Ensure nextFens is the array we saw in your console.log
    if (!nextFens || !Array.isArray(nextFens)) {
        console.warn("Input is not an array of FENs.");
        return [];
    }
    
    nextFens.forEach(fen => {
        const entry = ecoData[fen];
        if (entry && entry.moves) {
            // Your ECO moves look like: "1. d4 d5 2. e3"
            const moveHistory = entry.moves.trim().split(' ');
            // The last item is the move needed to reach this FEN
            const finalMove = moveHistory[moveHistory.length - 1];
            
            if (!allMoves.includes(finalMove)) {
                allMoves.push(finalMove);
            }
        }
    });
    
    return allMoves;
}
function pickRandomMove(moves) {
    if (!moves || moves.length === 0) {
        return null;
    }

    // Generate a random index between 0 and the length of the array
    const randomIndex = Math.floor(Math.random() * moves.length);
    
    return moves[randomIndex];
}

//getAllPossibleMoves(getNextFens(game.fen()), ecoData)

//*************************************************************** */