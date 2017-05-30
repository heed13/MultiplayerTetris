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
const PLAYERS_PER_GAME = 4;
var people = {};
var games = {};
var Game = {
    id: null,
    clients: [],
    seed: null,
};

var io = socketsio.listen(server);

io.on('connection', function (socket) {
    console.log("New Connection");

    /*******************
     * Client Messages *
     ******************/
    socket.on('joinLobby', function (clientId, gameId) {
        console.log("Join Lobby Request: clientId="+clientId+"; gameId="+gameId);
        // Joined Specified Game
        if (gameId && games.hasOwnProperty(gameId)) {
            console.log("Joining Specific Lobby: gameId="+gameId);
            joinGame(clientId, gameId, socket);
            return;
        }
        // Join Random Game
        if (!gameId && games.length > 0) {
            for (let i = 0; i < games.length; i++) {
                if (games[i].clients.length < PLAYERS_PER_GAME) {
                    console.log("Joining Random Lobby: gameId="+games[i].id);
                    joinGame(clientId, games[i].id, socket);
                    return;
                }
            }
        }

        // Start New Game
        let game = createGame(gameId);
        console.log("Creating a Lobby: gameId="+game.id);
        joinGame(clientId, game.id, socket);
    });

    socket.on('lobbyStart', function (clientId) {
        console.log("Start Lobby Request: clientId="+clientId);
        let game = createGame();
        socket.join(game.id);
        joinGame(clientId, game.id);
        socket.emit("lobbyJoined", game);
    });
    socket.on('leaveGame', function (clientId, gameId) {
        console.log("Leave Lobby Request: clientId="+clientId+"; gameId="+gameId);
        // Remove player from the game and lobby
        socket.leave(gameId);
        let index = games[gameId].clients.indexOf(clientId);
        games[gameId].clients.splice(index,1);
        io.to(gameId).emit('playerLeft', clientId);
    });
    socket.on('lostGame', function (clientId, gameId) {
        console.log("Lost Game Request: clientId="+clientId+"; gameId="+gameId);
        io.to(gameId).emit('playerLost', clientId);
    });
    socket.on('sendLine', function (clientId, gameId) {
        console.log("Send Line Request: clientId="+clientId+"; gameId="+gameId);
        io.to(gameId).emit('receiveLine', clientId);
    });
});

function joinGame(clientId, gameId, socket) {
    if (games.hasOwnProperty(gameId)) {
        if (games[gameId].clients.indexOf(clientId) < 0) {
            console.log("Client: "+clientId+" is already a part of game: "+gameId);
        }
        socket.join(gameId);
        games[gameId].clients.push(clientId);
        socket.emit("lobbyJoined", games[gameId]);
        io.to(gameId).emit('playerJoined', clientId);
    }
    else {
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

function guid() {
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
        s4() + '-' + s4() + s4() + s4();
}
function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
        .toString(16)
        .substring(1);
}

