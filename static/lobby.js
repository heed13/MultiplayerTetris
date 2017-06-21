/* 
global MultiplayerController, Phaser, jQuery, GameState, $, GameController, LobbyState, UsernameMenuState
*/
var LobbyState = (function (_game) {
    var game = _game;
    var usernameTxts = [];
    var userReadySprites = [];
    var countdownTxt = null;
    var countdown = false;
    var countTime = 1;
    const WAITING_TEXT = "   waiting...";
    const READY_IMAGE_KEY = "readyCheck";
    
    /* ************** *
     * Game Functions *
    /* ************** */
    function fillUsernames(readyClients) {
        // Fill each in as they join
        let keys = Object.keys(GameController.players);
        let i = 0;
        for (i = 0; i < keys.length; i++) {
            if (readyClients && readyClients.indexOf(keys[i]) >= 0) {
                userReadySprites[i].visible = true;
            }
            usernameTxts[i].setText(GameController.players[keys[i]].displayName);
        }
        for (let j = i; j < usernameTxts.length; j++) {
            usernameTxts[j].setText(WAITING_TEXT);
            userReadySprites[j].visible = false;

        }
    }
    var timer;
    var timerEvent;
    function startCountdown() {
        // Start the timer
        timer.start();
    }
    function endTimer() {
        console.log("Timer Ended, Starting Game");
        timer.stop();
        game.state.start("GameState");
    }
    function formatTime(s) {
        // Convert seconds (s) to a nicely formatted and padded time string
        var minutes = "0" + Math.floor(s / 60);
        var seconds = "0" + (s - minutes * 60);
        return seconds.substr(-2); 
    }
    function readyToStartBtnPressed() {
        MultiplayerController.readyToStart();
    }
    
    return {
        /* ************** *
         * Game Callbacks *
         * ************** */
        preload: function() {
            game.stage.disableVisibilityChange = true;
            game.load.image('button','assets/images/startBtn.jpg');
            game.load.image(READY_IMAGE_KEY, 'assets/images/readyCheck.png');
        },
        create: function() {
            // Create a spot for each player
            let waitingStyle = { font: "46px Arial",fill: "#ff0044", align: "center" };
            let horizontalPos = 20;
            let verticalOffset = game.world.height/6;
            
            // TODO: base this off NUM_PLAYERS_PER_GAME;
            for (let i = 0; i < 4; i++) {
                usernameTxts.push(game.add.text(horizontalPos, i*verticalOffset, WAITING_TEXT, waitingStyle));
                userReadySprites.push(game.add.sprite(game.world.width-50, (i)*verticalOffset, READY_IMAGE_KEY));
                userReadySprites[i].visible = false;
            }
            
            let readyToStartBtn = game.add.button(0, game.world.height - 100, 'button', readyToStartBtnPressed, this, 2, 1, 0);
            
            waitingStyle.fill = "#e8f442";
            waitingStyle.font = "56px Arial";
            countdownTxt = game.add.text(game.world.centerX - 75, game.world.centerY -25, "", waitingStyle);
            
            fillUsernames();
            
            timer = game.time.create();
            timerEvent = timer.add(Phaser.Timer.SECOND * countTime, endTimer, this);
            
        },
        update: function() {
            
        },
        render: function () {
            if (timer.running) {
                game.debug.text(formatTime(Math.round((timerEvent.delay - timer.ms) / 1000)), 2, 14, "#ff0");
            }
            else {
                game.debug.text("--!", 2, 14, "#0f0");
            }
        },
        playerJoinedRoom: function (client) {
            fillUsernames();
        },
        playerLeftRoom: function (client) {
            fillUsernames();
        },
        startCountdown: startCountdown, 
        readyToStart: fillUsernames,
    };
})
