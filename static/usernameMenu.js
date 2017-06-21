/*
 global MultiplayerController, Phaser, jQuery, GameState, $, GameController, LobbyState, UsernameMenuState
 */
var UsernameMenuState = (function(_game) {
    var game = _game;

    /* ************** *
     *   Game  Vars   *
     /* ************** */
    var bmd = null;
    var usernameText = null;
    var username = "";
    var gameIdBx = $('#gameId');

    /* ************** *
     * Game Functions *
     /* ************** */
    function keyPress(char) {
        username += char;
        usernameText.setText(username);
    }
    function clearNameTxtInput(argument) {
        username = "";
        usernameText.setText("");
    }
    function setUsername() {
        $(gameIdBx).hide();
        GameController.connect(username);
    }

    return {
        /* ************** *
         * Game Callbacks *
         * ************** */
        preload: function() {
            // Load Images
            game.load.image('clearUsernameBtn', 'assets/images/clear-button-png-hi.png');
            game.load.image('connectBtn', 'assets/images/connectbutton.png');

            // Randomize Username
            let randomNames = ['Jellyfists', 'ArchLizard','SnailMail','Giraffiki','HeartBreaker',
                'TheNoob', 'Wombology','WomboCombo', 'Falco','Blondey','Snoops','Curator','Sparky',
                'Snookums', 'Pancake','Bacon','Vegeta', 'Goku','Zombie','Bulbasaur','Shorty','Troll',
                'SlimShady', 'Ganon', 'Bowser', 'Bowser Jr.', 'Hades', 'Zeus', 'Superman', 'Batman',
                'Ironman', 'Hulk', 'Strawberry', 'Icecream', 'Lieutenant Dan', 'Zorg', 'Zerg', 'Buzz', 'Woody',
                'Cid', 'Terra', 'Cloud', 'Sephiroth', 'Tidus', 'Ash', 'Brock', 'Colonel Mustang', 'Scooby',
                'Velma', 'Ghost', 'No One Important', 'Your Mom', 'Sassy Pants', 'Artanis', 'Tassadar',
                'Kerrigan', 'Raynar', 'Zeratul', 'Karax', 'Hoser', 'Tewtz', 'Mathias', 'Heed', 'BiggieK',
                'Pooh Bear', 'Eeyore', 'Piglett', 'Tigger', 'Richard', 'Link', 'Mufasa', 'Scar', 'Leeroy',
                'Arthas', 'Geralt', 'Vin', 'Elrond', 'Gandalf', 'Bilbo', 'Frodo', 'Golum', 'Smeagul',
                'Sarumon', 'Sauron', 'Arwen', 'Dumbledore', 'Harry', 'Malfoy', 'Dobby', 'Hermoine', 'Luna',
                'Zelda', 'Samus', 'Peach', 'Mario', 'Luigi', 'Starshine', 'Sparkles', 'Hodor', 'Wallace']
            username = randomNames[Math.floor(Math.random()*randomNames.length)];

            $(gameIdBx).show();
            $(gameIdBx).change(function () {
                GameController.setGameId($(this).val());
            })
        },
        create: function() {

            let enterUsernameLbl = game.add.text(0, 50, "Username:", { font: "65px Arial", fill: "#ff0044", align: "center" });
            usernameText = game.add.text(60, game.world.centerY-game.world.height/4, username,{ font: "46px Arial",fill: "#ff0044", align: "center" });

            // let clearUsernameBtn = game.add.button(game.world.centerX, game.world.centerY+75, 'clearUsernameBtn', clearNameTxtInput, this, 2, 1, 0);
            let connectBtn = game.add.button(0, game.world.centerY+100, 'connectBtn', setUsername, this, 2, 1, 0);
        },
        update: function() {
        }
    };
});