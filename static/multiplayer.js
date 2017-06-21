/* global io */
var MultiplayerController = (function () {
    const readyState = {
        NOT_ESTABLISHED: 0,
        OPEN: 1,
        CLOSING: 2,
        CLOSED: 3
    }
    
    // Useful vars
    var socket = null;
    var listeners = [];
    
    function connect(url, _clientName) {
        socket = io(url, {
            transports: ['websocket'],
            query: "displayName="+_clientName,
        });
        
        // Generic Events
        socket.on('connect', onsocketOpen);
        socket.on('error', onsocketError);
        socket.on('disconnect', onsocketClosed);
    }
    
    function disconnect() {
        socket.disconnect();
    }
    
    function onsocketError(error) {
        console.log("socket Error: ", error);
        for (let i = 0; i < listeners.length; i++) {
            if (typeof listeners[i].socketError === 'function') {
                listeners[i].socketError(error);
            }
        }
    }
    function onsocketClosed() {
        console.log("socket Closed");
        for (let i = 0; i < listeners.length; i++) {
            if (typeof listeners[i].socketClosed === 'function') {
                listeners[i].socketClosed();
            }
        }
    }
    function onsocketOpen() {
        MultiplayerController.clientId = socket.io.engine.id;
        console.log("socket Opened: "+MultiplayerController.clientId);
        for (let i = 0; i < listeners.length; i++) {
            if (typeof listeners[i].socketOpened === 'function') {
                listeners[i].socketOpened(MultiplayerController.clientId);
            }
        }
    }
    
    function emitMessage(message, payload, ack) {
        if (!socket || socket.readyState !== readyState.OPEN) {
            console.log("Could not send message");
            return;
        }
        socket.emit(message,this.clientId, this.gameId, JSON.stringify(payload), ack);
    }
    function addListener(listener) {
        if (!listener || listeners.indexOf(listener) >= 0) {
            console.log("Could not add object as listener: ", listener);
            return;
        }
        listeners.push(listener);
        console.log("Added Object as a Socket Listener", listener);
    }
    function addEventListener(eventName, callback) {
        if (typeof callback === 'function') {
            socket.on(eventName, callback);
        }
    }
     
    /* ****************** *
     * To Server Messages *
     * ****************** */
    // -- Lobby Messages --
    // TODO: These actually belong elsewhere in another object
    // TODO: rename to create lobby or similar
    function createRoom(gameId) {
         socket.emit('createRoom', gameId);
    }
    function joinRoom(gameId) {
         socket.emit('joinRoom', gameId);
    }
    // -- In Game Messages -- 
    function leaveRoom() {
         socket.emit('leaveRoom');
    }
    function lostGame() {
         socket.emit('lostGame');
    }
    function penaltyLine(linesData) {
         socket.emit('penaltyLine', linesData);
    }
    function readyToStart() {
        socket.emit('readyToStart');
    }
    
    
    return {
        clientId: null,
        gameId: null,
        state: readyState,
        connect: connect,
        emit: emitMessage,
        addListener: addListener,
        addEventListener: addEventListener,
        createRoom: createRoom,
        joinRoom: joinRoom,
        leaveRoom: leaveRoom,
        lostGame: lostGame,
        penaltyLine: penaltyLine,
        readyToStart: readyToStart,
        disconnect: disconnect,
    };
})();