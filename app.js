const http         = require('http'),
	  WebSocket    = require('ws'),
	  fs           = require('fs'),
	  path         = require('path'),
	  contentTypes = require('./utils/content-types'),
	  sysInfo      = require('./utils/sys-info'),
	  env          = process.env;


/**
 * WebSocket server
 */
const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', function connection(ws) {
  ws.on('message', function incoming(message) {
    console.log('received: %s', message);
  });

  ws.send(JSON.stringify({"oh": "hello there"}));
});

wss.broadcast = function broadcast(data) {
  wss.clients.forEach(function each(client) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
};