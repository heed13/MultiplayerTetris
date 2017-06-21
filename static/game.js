/* 
global MultiplayerController, Phaser, jQuery, GameState, $, GameController, LobbyState, UsernameMenuState
*/

var GameController = (function () {
    // consts
    const GAME_WINDOW_WIDTH = 320;
    const GAME_WINDOW_HEIGHT = 670;
    const DEV_URL = "ws://dev-sean.com:3000/";
    const LIVE_URL = "ws://tetris-heed.rhcloud.com:8000/";
    const SECURE_URL = "wss://tetris-heed.rhcloud.com:8443/";
    const myRoomId = null;
    
    // Vars
    var game = null;
    var client = null;
    var displayName = null;
    var connected = false;
    
    function init() {
        console.log("Starting Game...");
        
        console.log("Booting Phaser...");
        // Start up Phaser
        game = new Phaser.Game(
            GAME_WINDOW_WIDTH, 
            GAME_WINDOW_HEIGHT, 
            Phaser.AUTO, 
            document.getElementById("game")
        );
        
        game.state.add("UsernameMenuState", new UsernameMenuState(game));
        game.state.add("GameState", new GameState(game));
        game.state.add("LobbyState", new LobbyState(game));
        // Start Initial Game State
        // game.state.start("GameState");
        game.state.start("UsernameMenuState");
    }
    function connect(_displayName) {
        if (connected) {
            return;
        }
        
        displayName = _displayName;
        // Listen for basic responses (connect, error, disconnect)
        MultiplayerController.addListener(GameController);
        console.log("Connecting to Server...");
        
        // Connect
        MultiplayerController.connect(SECURE_URL, _displayName);
        
        // Listen for specific responses
        MultiplayerController.addEventListener('joinedRoom', joinedRoom);
        MultiplayerController.addEventListener('playerJoinedRoom', playerJoinedRoom);
        MultiplayerController.addEventListener('playerLeftRoom', playerLeftRoom);
        MultiplayerController.addEventListener('startGame', startGame);
        MultiplayerController.addEventListener('playerLost', playerLost);
        MultiplayerController.addEventListener('gameOver', gameOver);
        MultiplayerController.addEventListener('penaltyLine', penaltyLine);
        MultiplayerController.addEventListener('readyToStart', readyToStart);
    }
    
    /* **************** *
     * Socket Callbacks *
     * **************** */
    function socketOpened() {
        connected = true;
        let client = { 
            displayName: displayName, 
            socketId: MultiplayerController.clientId
        };
        MultiplayerController.joinRoom( myRoomId);
    }
    function socketClosed() {
    }
    function socketError(error) {
        
    }
    
     /* ******************** *
     * From Server Messages *
     * ******************** */
    function joinedRoom(gameInfo) {
        console.log("Joined Room", gameInfo);
        MultiplayerController.gameId = gameInfo.id;
        Math.seedrandom(gameInfo.seed);
        game.state.start("LobbyState");
        
        for (let i = 0; i < gameInfo.clients.length; i++) {
            GameController.players[gameInfo.clients[i].socketId] = gameInfo.clients[i];
        }
    }
    function playerJoinedRoom(clientInfo) {
        console.log("Player Joined", clientInfo);
        GameController.players[clientInfo.socketId] = clientInfo;
        let state = game.state.getCurrentState();
        if (typeof state.playerJoinedRoom === 'function') {
            state.playerJoinedRoom(clientInfo);
        } 
    }
    function playerLeftRoom(clientInfo) {
        console.log("Player Left", clientInfo);
        delete GameController.players[clientInfo.socketId];
        let state = game.state.getCurrentState();
        if (typeof state.playerLeftRoom === 'function') {
            state.playerLeftRoom(clientInfo);
        } 
    }
    function startGame() {
         console.log("Game Starting");
         
         let state = game.state.getCurrentState();
         state.startCountdown();
    }
    function playerLost(argument) {
         console.log("Player Lost", argument);
    }
    function gameOver(argument) {
        console.log("Game Over:",argument);
        let state = game.state.getCurrentState();
        if (typeof state.gameOver === 'function') {
            state.gameOver(argument);
        } 
    }
    function penaltyLine(lineData) {
        console.log("Receiving line:",lineData);
        let state = game.state.getCurrentState();
        if (typeof state.penaltyLine === 'function') {
            state.penaltyLine(lineData);
        } 
    }
    function readyToStart(readyClients) {
        console.log("Receiving ready to start:", readyClients);
        let state = game.state.getCurrentState();
        if (typeof state.readyToStart === 'function') {
            state.readyToStart(readyClients);
        } 
    }
    
    
    /* **************** *
     * Public Functions *
     * **************** */
    return {
        init: init,
        connect: connect,
        socketOpened: socketOpened,
        socketClosed: socketClosed,
        socketError: socketError,
        players: {},
        client: client,
        
    };
})();
