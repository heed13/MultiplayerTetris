const express      = require('express'),
      http         = require('http'),
      socketsio      = require('socket.io'),
	  fs           = require('fs'),
	  path         = require('path'),
	  contentTypes = require('./utils/content-types'),
	  sysInfo      = require('./utils/sys-info'),
	  env          = process.env;

/**
 * HTTP Server
 */
let server = http.createServer(function (req, res) {
    let url = req.url;
    if (url == '/') {
        url += 'index.html';
    }
    // IMPORTANT: Your application HAS to respond to GET /health with status 200
    //            for OpenShift health monitoring

    if (url == '/health') {
        res.writeHead(200);
        res.end();
    } else if (url == '/info/gen' || url == '/info/poll') {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-cache, no-store');
        res.end(JSON.stringify(sysInfo[url.slice(6)]()));
    } else {
        fs.readFile('./static' + url, function (err, data) {
            if (err) {
                res.writeHead(404);
                res.end('Not found');
            } else {
                let ext = path.extname(url).slice(1);
                if (contentTypes[ext]) {
                    res.setHeader('Content-Type', contentTypes[ext]);
                }
                if (ext === 'html') {
                    res.setHeader('Cache-Control', 'no-cache, no-store');}
                res.end(data);
            }
        });
    }
});
server.listen(env.NODE_PORT || 3000, env.NODE_IP || 'localhost', function () {
    console.log(`Application worker ${process.pid} started...`);
});

/**
 * WebSocket server
 */
// Vars
const PLAYERS_PER_GAME = 4;
var games = {};
var Game = {
    id: null,
    clients: [],
    seed: null,
    readies: [],
    lost: [],
    started: false,
};
var clients = {};
var Client = {
    socketId: null,
    displayName: null,
};

var io = socketsio.listen(server);

io.on('connection', function (socket) {
    var data = socket.request;
    var displayName = data._query['displayName'];
    console.log("New Connection: " + displayName);
    // Add new client
    var client = JSON.parse(JSON.stringify(Client));
    client.displayName = displayName;
    client.socketId = socket.id;
    clients[socket.id] = client;

    /* *************** *
     * Client Messages *
     * *************** */
    socket.on('disconnect', function () {
        console.log('Lost a connection:'+socket.id);

        // Loop through games
        let keys = Object.keys(games);
        gameLoop:
        for (let i = 0; i < keys.length; i++) {

            // Loop through clients
            clientLoop:
            for (let j = 0; j < games[keys[i]].clients.length; j++) {
                // Check if its our client that left
                if (games[keys[i]].clients[j] === clients[socket.id]) {
                    console.log("Removing Client:" + socket.id + " from game: "+games[keys[i]].id);
                    leaveGame(socket.id, games[keys[i]].id, socket);
                    break gameLoop;
                }
            }
        }
        delete clients[socket.id];
    });
    socket.on('joinRoom', function (gameId) {
        console.log("Join Lobby Request: clientId="+socket.id+"; gameId="+gameId);

        // Joined Specified Game
        if (gameId && games.hasOwnProperty(gameId)) {
            if (!gameFull(gameId)) {
                console.log("Joining Specific Lobby: gameId=" + gameId);
                joinGame(socket.id, gameId, socket);
                return;
            }
            // Game full
            console.log("Specific Lobby is full: gameId=" + gameId);
            socket.emit("gameFull", gameId);
            return;
        }

        // Join Random Game
        if (!gameId && games.length > 0) {
            for (let i = 0; i < games.length; i++) {
                if (games[i].clients.length < PLAYERS_PER_GAME) {
                    console.log("Joining Random Lobby: gameId="+games[i].id);
                    joinGame(socket.id, games[i].id, socket);
                    return;
                }
            }
        }

        // Start New Game
        let game = createGame(gameId);
        joinGame(socket.id, game.id, socket);
    });
    socket.on('createRoom', function () {
        console.log("Start Lobby Request: clientId="+socket.id);
        let game = createGame();
        joinGame(socket.id, game.id, socket);
    });
    socket.on('leaveRoom', function () {
        var game  = getGame(socket.id);
        console.log("Leave Lobby Request: clientId="+socket.id+"; gameId="+game.id);
        // Remove player from the game and lobby
        leaveGame(socket.id, game.id, socket);
    });
    socket.on('lostGame', function () {
        var game  = getGame(socket.id);
        console.log("Lost Game Request: clientId="+socket.id+"; gameId="+game.id);
        game.lost.push(socket.id);
        socket.broadcast.to(game.id).emit('playerLost', clients[socket.id]);
        if (isGameOver(game)) {
            endGame(game);
        }

    });
    socket.on('penaltyLine', function (lineData) {
        var game  = getGame(socket.id);
        console.log("Penalty Line from: "+socket.id +" Game: "+game.id);
        socket.broadcast.to(game.id).emit('penaltyLine', lineData);
        // io.in(game.id).emit('penaltyLine', lineData);
    });
    socket.on('readyToStart', function () {
        var game = getGame(socket.id);
        console.log("Ready to Start From " + clients[socket.id].displayName);

        // Set player as ready
        if (game.readies.indexOf(socket.id) < 0) {
            game.readies.push(socket.id);
        }

        // Tell everyone else this player has readied
        io.to(game.id).emit("readyToStart", game.readies);

        // Check if game should start
        if (game.readies.length >= game.clients.length) {
            startGame(game);
        }
    });
});

function leaveGame(clientId, gameId, socket) {
    socket.leave(gameId);
    if (games && games.hasOwnProperty(gameId)) {
        let index = games[gameId].clients.indexOf(clients[clientId]);
        if (index >= 0) {
            // if (!games[gameId].started) {
            games[gameId].clients.splice(index, 1);
            games[gameId].lost.push(clientId);
            // }
            socket.broadcast.to(gameId).emit('playerLeftRoom', clients[clientId]);

            if (games[gameId].clients.length <= 0) {
                console.log("Deleting Game: "+gameId);
                delete games[gameId];
            } else {
                if (isGameOver(games[gameId])) {
                    endGame(games[gameId]);
                }
            }
        } else {
            console.log("Client:"+clientId+" Tried to leave game:"+gameId+" but doesnt no belong to it");
        }
    } else {
        console.log("Tried to leave:"+gameId+" but no game found");
    }
}

function joinGame(clientId, gameId, socket) {
    if (games && games.hasOwnProperty(gameId)) {
        if (games[gameId].clients.indexOf(clients[clientId]) >= 0) {
            console.log("Client: "+clientId+" is already a part of game: "+gameId);
            return;
        }
        socket.join(gameId);
        games[gameId].clients.push(clients[socket.id]);
        socket.emit("joinedRoom", games[gameId]);
        socket.broadcast.to(gameId).emit('playerJoinedRoom', clients[socket.id]);

        if (games[gameId].clients.length >= PLAYERS_PER_GAME) {
            startGame(games[gameId]);
        }
    } else {
        console.log("Tried to join:"+gameId+" but no game found");
    }
}

function createGame(gameId) {

    // Create a new game object
    let g = JSON.parse(JSON.stringify(Game));
    g.id = gameId ? gameId : guid();
    g.seed = guid();

    console.log("Creating game: ", g);
    games[g.id] = g;
    return games[g.id];
}

function startGame(game) {
    console.log("Starting Game: "+game.id);
    game.started = true;
    io.in(game.id).emit('startGame');
}

function endGame(game) {
    console.log("Ending Game: "+game.id);
    var winner = getGameWinner(game);
    if (winner) {
        console.log("Winner of game: "+winner.displayName);
        io.in(game.id).emit("gameOver", {winner: winner});
    }
}

function getGameWinner(game) {
    console.log(game.clients);
    console.log(game.lost);

    for (var i = 0; i < game.clients.length; i++) {
        if (game.lost.indexOf(game.clients[i].socketId) < 0) {
            return game.clients[i];
        }
    }
    return null;
}

function isGameOver(game) {
    return (game.started && (game.lost.length >= game.clients.length-1));
}

function gameFull(gameId) {
    if (gameId && games && games.hasOwnProperty(gameId) && games[gameId].clients.length < PLAYERS_PER_GAME) {
        return false;
    }
    return true;
}
function getGame(clientId) {
    let keys = Object.keys(games);
    for (let i = 0; i < keys.length; i++) {
        for (let j = 0; j < games[keys[i]].clients.length; j++) {
            if (games[keys[i]].clients[j].socketId == clientId) {
                return games[keys[i]];
            }
        }
    }
    return null;
}

/* ***************** *
 * Utility Functions *
 * ***************** */
function guid() {
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
        s4() + '-' + s4() + s4() + s4();
}
function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
        .toString(16)
        .substring(1);
}

