const express = require("express");
const http = require("http");
const WebSocket = require("ws");

const port = process.env.PORT || 3000;

const server = http.createServer(express);
const wss = new WebSocket.Server({server});

wss.on('connection', ws => {
  ws.on('message', data => {
    wss.clients.forEach(client => {
      if(client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(data.toString());
      }
    });
  });
});

server.listen(port, () => {
  console.log("Listening on port: " + port);
});