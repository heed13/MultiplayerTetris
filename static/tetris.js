/* global MultiplayerController, GameController, Phaser */

// Tetris window
var scene = [];
var sceneSprites = [];

// Blocks
const BLOCK_SPRITESHEET_KEY = "blocks";
const NUM_BLOCKS_Y = 21; // make the grid 20 blocks high
const NUM_BLOCKS_X = 10; // make the grid 10 blocks wide
    
var blockSize = 32;
var BLOCKS_PER_TETROMINO = 4;
const placement = {
    empty: 0,
    block: 1,
    occupied: 3,
    outOfBounds: 4,
};
var numBlockTypes = 7;
const blockColors = {
    3: 0, // Z
    2: 1, // J
    4: 2, // S
    6: 3, // Block
    1: 4, // L
    0: 5, // Line
    5: 6, // T
    count: 7
};
const blockTypes = {
    line: 0,
    L: 1,
    J: 2,
    Z: 3,
    S: 4,
    T: 5,
    block: 6,
    count: 7,
};
const blockOffsets = {
    0 : [[-1,0],[0,0],[1,0],[2,0]], // line
    1 : [[0,-1],[0,0],[0,1],[1,1]], // L
    2 : [[0,-1],[0,0],[0,1],[-1,1]], // J
    3 : [[-1,-1],[0,-1],[0,0],[1,0]], // Z
    4 : [[-1,0],[0,0],[0,-1],[1,-1]],// S
    5 : [[-1,0],[0,0],[1,0],[0,1]], // T
    6 : [[-1,-1],[0,-1],[0,0],[-1,0]] // block
};
const Blocks = {
    0: [0x0F00, 0x2222, 0x00F0, 0x4444], // Line
    1: [0x4460, 0x0E80, 0xC440, 0x2E00], // L
    2: [0x44C0, 0x8E00, 0x6440, 0x0E20], // J
    3: [0x0C60, 0x4C80, 0xC600, 0x2640], // Z
    4: [0x06C0, 0x8C40, 0x6C00, 0x4620], // S
    5: [0x0E40, 0x4C40, 0x4E00, 0x4640], // T
    6: [0xCC00, 0xCC00, 0xCC00, 0xCC00], // Block
}

// Helpers
Array.prototype.rotate = function (dir) {
    let conflict = false;
    for (let i = 0; i < this.length; i++) {
        if (this[i].rotate(dir)) {
            conflict = true;
        }
    }
    return conflict;
}
Array.prototype.move = function (x,y) {
    for (let i = 0; i < this.length; i++) {
        this[i].move(x,y);
    }
}
Array.prototype.redraw = function () {
    for (let i = 0; i < this.length; i++) {
        this[i].redraw();
    }
}
Array.prototype.occupied = function () {
    let conflict = false;
    for (let i = 0; i < this.length; i++) {
        if (this[i].occupied()) {
            conflict = true;
        }
    }
    return conflict;
}
    
function getBlock(x, y) {
    if (x >= 0 && x < NUM_BLOCKS_X && y >= 0 && y < NUM_BLOCKS_Y) {
        return scene[x][y];
    }
    return placement.outOfBounds;
}

var GameState = (function(_game) {
    var game = _game;
    var _me = null;
    var gameActive = false;
    
    // Tetrominos
    var tetrominoQueue = [];
    var currentTetromino = [];
    var clearedLines = [];

    // Input Control Vars
    const DROP_LAG = 500;
    const QUICK_DROP_LAG = 80;
    const MOVEMENT_AUTO_DELAY = 300;
    const MOVEMENT_LAG = 80;
    
    var currentMovementTimer = 0;
    var currentMovementAutoTimer = 0;
    var moveKeyDown = false;
    var rotateKeyDown = false;
    var dropTime = 0;
    var dropLag = 500;
    
    
    // --- Sound ---
    // Consts
    const MOVE_SOUND_KEY = "move";
    const MOVE_CONFLICT_SOUND_KEY = "move_conflict";
    const ROTATE_SOUND_KEY = "rotate";
    const LINE_CLEAR_SOUND_KEY = "lineclear";
    const MUSIC_KEY = "music";
    
    // Sound Objects
    var moveSound = null;
    var moveConflictSound = null;
    var rotateSound = null;
    var lineClearSound = null;
    var music = null;
    
    // Text 
    const VICTORY_TEXT = "You Win!";
    const DEFEAT_TEXT = "You Lose";
    var youWinText = null;
    var youLoseText = null;

    /* ************** *
     * Game Functions *
     * ************** */
    function fillTetrominoQueue() {
        // TODO: instead of pure random do a random grab bag. I.e 3 of each type are in a bag. draw from the bag until empty
        const QUEUE_SIZE = 500;
        for (let i = 0; i < QUEUE_SIZE; i++) {
            let randomPiece = Math.floor(Math.random() * ((numBlockTypes)));
            tetrominoQueue.push(randomPiece);
        }
    }
    
    function getNextTetromino() {
        return tetrominoQueue.shift();
    }
    

    return {
        /* ************** *
         * Game Callbacks *
         * ************** */
        preload: function() {
            _me = this;
            game.stage.disableVisibilityChange = true;
            // Load images
            game.load.spritesheet(BLOCK_SPRITESHEET_KEY, "assets/images/sprites/blocks.png", blockSize, blockSize, 8);
            // Load audio
            game.load.audio(MOVE_SOUND_KEY, 'assets/audio/blaster.mp3');
            game.load.audio(MOVE_CONFLICT_SOUND_KEY, 'assets/audio/sword.mp3');
            game.load.audio(ROTATE_SOUND_KEY, 'assets/audio/lazer.wav');
            game.load.audio(MUSIC_KEY, 'assets/audio/Tetris.ogg');
            game.load.audio(LINE_CLEAR_SOUND_KEY, 'assets/audio/pusher.wav');
        },
        create: function() {
            // Game over Text
            let endGameTextStyle = { font: "65px Arial", fill: "#ff0044", align: "center" };
            youWinText = game.add.text(0, 50, VICTORY_TEXT, endGameTextStyle);
            youWinText.visible = false;
            youLoseText = game.add.text(0, 50, DEFEAT_TEXT, endGameTextStyle);
            youLoseText.visible = false;
            
            // Create sheet
            scene = [];
            sceneSprites = []; // same but stores sprites instead
            // Fills the two arrays with empty cells
            for (var i = 0; i < NUM_BLOCKS_X; i++){
                var col = [];
                var spriteCol = [];
                for (var j = 0; j < NUM_BLOCKS_Y; j++) {
                    col.push(placement.empty);
                    spriteCol.push(null);
                    // game.add.sprite(i * blockSize, j * blockSize, 'blocks', blockColors[0]); // Visualize Grid
                }
                scene.push(col);
                sceneSprites.push(spriteCol);
            }
            
            // Get Audio
            moveSound = game.add.audio(MOVE_SOUND_KEY);
            moveConflictSound = game.add.audio(MOVE_CONFLICT_SOUND_KEY);
            rotateSound = game.add.audio(ROTATE_SOUND_KEY);
            lineClearSound = game.add.audio(LINE_CLEAR_SOUND_KEY);
            music = game.add.audio("music");
            music.loop = true;
            // music.play();
            
            // Fill tetromino queue
            fillTetrominoQueue();
            
            // Start the game!
            this.serve();
            gameActive = true;
        },
        update: function() {
            if (!gameActive) return;
            
            // TODO: please rework this and pull out common code.
            if (currentTetromino.length) { 
               // Rotation
                if (game.input.keyboard.isDown(Phaser.Keyboard.W)) {
                    if (!rotateKeyDown) {
                        if (!currentTetromino.rotate()) {
                            rotateSound.play();
                            currentTetromino.redraw();
                        } else {
                            moveConflictSound.play();
                        }
                    }
                    rotateKeyDown = true;
                } else {
                    rotateKeyDown = false;
                }

                // Movement
                if (game.input.keyboard.isDown(Phaser.Keyboard.A)) {
                    if (!moveKeyDown) {
                        if (!this.move(-1)) {
                            moveSound.play();
                        }
                        moveKeyDown = true;
                    } else if (currentMovementAutoTimer >= MOVEMENT_AUTO_DELAY) {
                        currentMovementTimer += game.time.elapsed;
                        if (currentMovementTimer > MOVEMENT_LAG) {
                            if (!this.move(-1)) {
                                moveSound.play();
                            }
                            moveSound.play();
                            currentMovementTimer = 0;
                        }   
                    }
                    currentMovementAutoTimer += game.time.elapsed;
                } else if (game.input.keyboard.isDown(Phaser.Keyboard.D)) {
                    if (!moveKeyDown) { 
                        if (!this.move(1)) {
                            moveSound.play();
                        }
                        moveSound.play();
                        moveKeyDown = true;
                    } else if (currentMovementAutoTimer >= MOVEMENT_AUTO_DELAY) {
                        currentMovementTimer += game.time.elapsed;
                        if (currentMovementTimer > MOVEMENT_LAG) {
                            if (!this.move(1)) {
                                moveSound.play();
                            }
                            moveSound.play();
                            currentMovementTimer = 0;
                        }   
                    }
                    currentMovementAutoTimer += game.time.elapsed;
                } else {
                    moveKeyDown = false;
                    currentMovementAutoTimer = 0;
                }
                if (game.input.keyboard.isDown(Phaser.Keyboard.S)) {
                    dropLag = QUICK_DROP_LAG; 
                } else {
                    dropLag = DROP_LAG;
                }
                
                // Drop
                dropTime += game.time.elapsed;
                if (dropTime > dropLag) {
                    this.drop();
                    dropTime = 0;
                }
            }
           
        },
        /* ************** *
         * Game Functions *
         * ************** */
        serve: function (x) {
            x = typeof x !== 'undefined' ? x : (NUM_BLOCKS_X / 2 - 1);
            // Serve up the first piece
            let tetromino = new Tetromino(this,game,getNextTetromino(),x,0);
            currentTetromino.push(tetromino);
            if (tetromino.initialize(true)) {
                if (!gameActive) {
                    return;
                }
                music.stop();    
                gameActive = false;
                MultiplayerController.lostGame();
                youLoseText.visible = true;
            }
        },
        drop: function() {
            this.move(0,1);
        },
        checkLinesCleared: function(x,y) {
            for (let i = 0; i < NUM_BLOCKS_X; i++) {
                if (scene[i][y] === placement.empty) {
                    return false;
                }
            }
            return true;
        },
        clearLines: function() {
            let tween = null;
            clearedLines.forEach(function(line) {
                for (let i = 0; i < NUM_BLOCKS_X; i++) {
                    tween = game.add.tween(sceneSprites[i][line]).to( { alpha: 0 }, 300, Phaser.Easing.Linear.None, true);
                }
            });
            lineClearSound.play();
            tween.onComplete.add(_me.postTweenClear, _me)
            MultiplayerController.penaltyLine({count: clearedLines.length});
        },
        postTweenClear: function () {
            // Determine if lines are consecutive. 
            // Could save a lot of iterations if we know we just need to shift by x amount
            // for now hard lift it each time
            clearedLines.forEach(function(line) {
                for (let i = 0; i < scene.length; i++) {
                    for (let j = line; j >= 0; j--) {
                        scene[i][j] = (j === 0) ? placement.empty : scene[i][j-1];
                        sceneSprites[i][j] = (j === 0) ? null : sceneSprites[i][j-1];
                        // Move sprite to new position
                        if (sceneSprites[i][j]) {
                            sceneSprites[i][j].x = i * blockSize;
                            sceneSprites[i][j].y = j * blockSize;
                        }
                    }
                }
            });
            clearedLines = [];
        },
        place: function (tetro) {
            let spriteIndex = 0;
            tetro.eachBlock(function(x,y) {
                scene[x][y] = placement.occupied;
                if (sceneSprites[x][y] !== null) {
                    sceneSprites[x][y].destroy();
                    sceneSprites[x][y] = null;
                }
                sceneSprites[x][y] = tetro.sprites[spriteIndex];
                spriteIndex++;
                if (_me.checkLinesCleared(x, y)) {
                    clearedLines.push(y);
                }
            });
            if (clearedLines.length > 0) {
                this.clearLines(clearedLines);
            }
            let index = currentTetromino.indexOf(tetro)
            currentTetromino.splice(index,1);
            if (currentTetromino.length <= 0) {
                _me.serve();
            }
        },
        move: function(x, y) {
            let conflict = false;
            let checkPlaced = false;
            // If y is not passed ignore it
            if (!y) {
                y = 0;
                // If y is passed and blocked 1 down
            } else {
                checkPlaced = true;
            }
            currentTetromino.forEach(function(tetro) {
                if (checkPlaced) {
                    let placed = false;
                    tetro.eachBlock(function (x,y) {
                        if (placed) return;
                        let oneBlockDown = getBlock(x,y+1);
                        if (oneBlockDown === placement.occupied || oneBlockDown === placement.outOfBounds) {
                            // TODO pull out to own function
                            _me.place(tetro)
                            placed = true;
                            return;
                        }
                    });
                }
                tetro.move(x,y);
                if (tetro.occupied()) {
                    tetro.move(-x,-y);
                    conflict = true;
                } else {
                    tetro.redraw();
                }
            });
            
            return conflict
        },
        /* ********************* *
         * Multiplayer Callbacks *
         * ********************* */
        playerLeftRoom: function (clientInfo) {
            // TODO
        },
        playerLost: function (clientInfo) {
            // TODO
        },
        penaltyLine: function (lineInfo) {
            for (let i = 0; i < lineInfo.count; i++) {
                this.serve(Math.floor(10/lineInfo.count)*i); 
            }
        },
        gameOver: function (gameInfo) {
            gameActive = false;
            if (gameInfo.winner.socketId === MultiplayerController.clientId) {
                youWinText.bringToTop();
                youWinText.visible = true;
            } else {
                youLoseText.bringToTop()
                youLoseText.visible = true;
            }
            MultiplayerController.disconnect();
        }
    };
});

var Tetromino = (function (_c, _game, _type, leftX, topY) {
    var game = _game;

    return {
        type: _type,
        sprites: [],
        position: [leftX,topY],
        rotation: 0,
        x: function () { return this.position[0]; },
        y: function() { return this.position[1]; },
        eachBlock: function (fn) {
            let bit, result, row = 0, col = 0, blocks = Blocks[this.type][this.rotation];
            for (bit = 0x8000; bit > 0; bit = bit >> 1) {
                if (blocks & bit) {
                    if (typeof fn === 'function') {
                        fn(this.x() + col, this.y() + row);
                    }
                }
                // Wrap column to next row on overflow
                if (++col === BLOCKS_PER_TETROMINO) {
                    col = 0;
                    ++row;
                }
            }
        },
        initialize: function (inGame) {
            var conflict = false;
            this.sprites = [];
            
            this.eachBlock( (x, y) => {
                // Compute the coordinates of each block of the tetromino, using it's offset from the center
                var sprite = game.add.sprite(x * blockSize, y * blockSize, 'blocks', blockColors[this.type]);
                this.sprites.push(sprite);

                if (inGame) {
                    if(this.checkPos(x,y)){
                        conflict = true;
                    }
                }
            });
            return conflict;
        },
        rotate: function (dir) {
            let conflict = false;
            
            if (!dir) {
                dir = 1;
            }
            let oldDir = this.rotation;
            this.rotation = (this.rotation + 1*dir) % 4;
            if (this.occupied()) {
                this.rotation = oldDir;
                conflict = true;
            }
            return conflict;
        },
        move: function (x,y) {
            this.position = [this.position[0]+x, this.position[1]+y];
        },
        occupied: function() {
            let conflict = false;
            this.eachBlock( (x, y) => {
                if (this.checkPos(x,y)) {
                    conflict = true;
                }
            });
            return conflict;
        },
        checkPos: function (x,y) {
            let blockStatus = getBlock(x,y);
            if ((x < 0) // Wall Kicks?
                || (x >= NUM_BLOCKS_X) // Wall Kicks?
                || (y < 0) 
                || (y >= NUM_BLOCKS_Y) 
                || (blockStatus !== placement.empty)) {
                   return true;
           } 
           return false;
        },
        redraw: function () {
            let index = 0;
            this.eachBlock( (x, y) => {
                this.sprites[index].x = x * blockSize;
                this.sprites[index++].y = y * blockSize;
            });
        }
    };
});