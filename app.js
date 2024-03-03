// Misc Helper
const playerColors = ["blue", "red", "orange", "yellow", "green", "purple"];
const mapData = {
    minX: 1,
    maxX: 14,
    minY: 4,
    maxY: 12,
    blockedSpaces: {
        "7x4": true,
        "1x11": true,
        "12x10": true,
        "4x7": true,
        "5x7": true,
        "6x7": true,
        "8x6": true,
        "9x6": true,
        "10x6": true,
        "7x9": true,
        "8x9": true,
        "9x9": true,
    },
};

// Helper function to get a random element from an array
function randomFromArray(array) {
    return array[Math.floor(Math.random() * array.length)];
}

// Helper function to generate a key string based on coordinates
function getKeyString(x, y) {
    return `${x}x${y}`;
}

// Helper function to check if a space is solid or blocked
function isSolid(x, y) {
    const blockedNextSpace = mapData.blockedSpaces[getKeyString(x, y)];
    return (
        blockedNextSpace ||
        x >= mapData.maxX ||
        x < mapData.minX ||
        y >= mapData.maxY ||
        y < mapData.minY
    );
}

// Function to create a random name
function createName() {
    const prefix = randomFromArray([
        "COOL", "SUPER", "HIP", "SMUG", "COOL", "SILKY", "GOOD", "SAFE", "DEAR", "DAMP", "WARM", "RICH", "LONG", "DARK", "SOFT", "BUFF", "DOPE"
    ]);
    const animal = randomFromArray([
        "BEAR", "DOG", "CAT", "FOX", "LAMB", "LION", "BOAR", "GOAT", "VOLE", "SEAL", "PUMA", "MULE", "BULL", "BIRD", "BUG"
    ]);
    return `${prefix} ${animal}`;
}

// Game Initialization
(function () {
    let playerId, playerRef, players = {}, playerElements = {};
    const gameContainer = document.querySelector(".game-container");
    const playerNameInput = document.querySelector("#player-name");
    const playerColorButton = document.querySelector("#player-color");

    // Handle arrow key press
    function handleArrowPress(xChange = 0, yChange = 0) {
        const newX = players[playerId].x + xChange;
        const newY = players[playerId].y + yChange;
        if (!isSolid(newX, newY)) {
            players[playerId].x = newX;
            players[playerId].y = newY;
            if (xChange === 1) {
                players[playerId].direction = "right";
            } else if (xChange === -1) {
                players[playerId].direction = "left";
            }

            playerRef.set(players[playerId]);
        }
    }

    // Initialize the game
    function initGame() {

        // Event listeners for arrow key presses
        new KeyPressListener("ArrowUp", () => handleArrowPress(0, -1));
        new KeyPressListener("ArrowDown", () => handleArrowPress(0, 1));
        new KeyPressListener("ArrowRight", () => handleArrowPress(1, 0));
        new KeyPressListener("ArrowLeft", () => handleArrowPress(-1, 0));

        // Set up Firebase references
        const allPlayerRef = firebase.database().ref(`players`);
        const allCoinsRef = firebase.database().ref(`coins`);

        // Update player information on value change
        allPlayerRef.on("value", (snapshot) => {
            players = snapshot.val() || {};
            // Update player elements in the game
            Object.keys(players).forEach((key) => {
                const characterState = players[key];
                let el = playerElements[key];
                el.querySelector(".Character_name").innerText = characterState.name;
                el.querySelector(".Character_coins").innerText = characterState.coins;
                el.setAttribute("data-color", characterState.color);
                el.setAttribute("data-direction", characterState.direction);
                const left = 16 * characterState.x + "px";
                const top = 16 * characterState.y - 4 + "px";
                el.style.transform = `translate3d(${left},${top},0)`;
            });
        });

        // Add new players to the game
        allPlayerRef.on("child_added", (snapshot) => {
            const addedPlayer = snapshot.val();
            const characterElement = document.createElement("div");
            characterElement.classList.add("Character", "grid-cell");
            if (addedPlayer.id === playerId) {
                characterElement.classList.add("you");
            }

            // HTML structure for each player character
            characterElement.innerHTML = (`
                <div class="Character_shadow grid-cell"></div>
                <div class="Character_sprite grid-cell"></div>
                <div class="Character_name-container">
                    <span class="Character_name"></span>
                    <span class="Character_coins">0</span>
                </div>
                <div class="Character_you-arrow"></div>
            `);
            playerElements[addedPlayer.id] = characterElement;

            // Fill initial state
            characterElement.querySelector(".Character_name").innerText = addedPlayer.name;
            characterElement.querySelector(".Character_coins").innerText = addedPlayer.coins;
            characterElement.setAttribute("data-color", addedPlayer.color);
            characterElement.setAttribute("data-direction", addedPlayer.direction);
            const left = 16 * addedPlayer.x + "px";
            const top = 16 * addedPlayer.y - 4 + "px";
            characterElement.style.transform = `translate3d(${left},${top},0)`;
            gameContainer.appendChild(characterElement);
        });

        // Remove players when they disconnect
        allPlayerRef.on("child_removed", (snapshot => {
            const removedKey = snapshot.val().id;
            gameContainer.removeChild(playerElements[removedKey]);
            delete playerElements[removedKey];
        }));

        // Update player name on input change
        playerNameInput.addEventListener("change", (e) => {
            const newName = e.target.value || createName();
            playerNameInput.value = newName;
            playerRef.update({
                name: newName
            });
        });

        // Change player color on button click
        playerColorButton.addEventListener("click", (e) => {
            const mySkinIndex = playerColors.indexOf(players[playerId].color);
            const nextColor = playerColors[mySkinIndex + 1] || playerColors[0];
            playerRef.update({
                color: nextColor
            });
        });
    }

    // Firebase authentication
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            // Logged in
            playerId = user.uid;
            playerRef = firebase.database().ref(`players/${playerId}`);

            const uniqueName = createName();
            playerNameInput.value = uniqueName;

            // Set initial player information
            playerRef.set({
                id: playerId,
                name: uniqueName,
                direction: "right",
                color: randomFromArray(playerColors),
                coins: 0,
                x: 3,
                y: 4
            });

            // Player disconnects
            playerRef.onDisconnect().remove();

            // Begin The Game
            initGame();
        } else {
            // Logged out
        }
    });

    // Sign in anonymously
    firebase.auth().signInAnonymously().catch((error) => {
        var errorCode = error.code;
        var errorMessage = error.errorMessage;

        console.log(errorCode, errorMessage);
    });
})();
